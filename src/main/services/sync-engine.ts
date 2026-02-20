/**
 * Sync engine: compare and sync between local and Google Drive
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { SyncPath, SyncMode, FileDiff } from '../../shared/types';
import * as drive from './google-drive';

export interface CompareResult {
  diffs: FileDiff[];
  sourceCount: number;
  targetCount: number;
}

/** Recursively list local files with relative paths */
async function listLocalFiles(dirPath: string, base = ''): Promise<Map<string, { size: number; mtime: string; isFolder?: boolean }>> {
  const result = new Map<string, { size: number; mtime: string; isFolder?: boolean }>();
  let names: string[];
  try {
    names = await fs.readdir(dirPath);
  } catch {
    return result;
  }

  for (const name of names) {
    const rel = base ? `${base}/${name}` : name;
    const full = path.join(dirPath, name);

    let stat: import('fs').Stats;
    try {
      stat = await fs.stat(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      result.set(rel, { size: 0, mtime: stat.mtime.toISOString(), isFolder: true });
      const sub = await listLocalFiles(full, rel);
      for (const [p, meta] of sub) result.set(p, meta);
    } else {
      result.set(rel, {
        size: stat.size,
        mtime: stat.mtime.toISOString(),
      });
    }
  }
  return result;
}

/** Recursively list Drive files */
async function listDriveFiles(
  accountId: string,
  folderId: string,
  base = ''
): Promise<Map<string, { size: number; mtime: string; id: string; isFolder?: boolean }>> {
  const result = new Map<string, { size: number; mtime: string; id: string; isFolder?: boolean }>();
  let files: { id: string; name: string; mimeType: string; size?: number; modifiedTime?: string }[];
  try {
    files = await drive.listFiles(accountId, folderId);
  } catch {
    return result;
  }

  const folderMime = 'application/vnd.google-apps.folder';
  for (const f of files) {
    const rel = base ? `${base}/${f.name}` : f.name;

    if (f.mimeType === folderMime) {
      result.set(rel, { size: 0, mtime: f.modifiedTime ?? '', id: f.id, isFolder: true });
      const sub = await listDriveFiles(accountId, f.id, rel);
      for (const [p, meta] of sub) result.set(p, meta);
    } else {
      result.set(rel, {
        size: f.size ?? 0,
        mtime: f.modifiedTime ?? '',
        id: f.id,
      });
    }
  }
  return result;
}

/** Get file listing for a path */
async function getFileMap(p: SyncPath): Promise<{
  files: Map<string, { size: number; mtime: string; id?: string; isFolder?: boolean }>;
  type: 'local' | 'drive';
  accountId?: string;
  folderId?: string;
  basePath?: string;
}> {
  if (p.type === 'local') {
    const files = await listLocalFiles(p.path);
    const map = new Map<string, { size: number; mtime: string; id?: string; isFolder?: boolean }>();
    for (const [k, v] of files) map.set(k, v);
    return { files: map, type: 'local', basePath: p.path };
  } else {
    const files = await listDriveFiles(p.accountId, p.folderId);
    const map = new Map<string, { size: number; mtime: string; id?: string; isFolder?: boolean }>();
    for (const [k, v] of files) map.set(k, { ...v, id: v.id });
    return {
      files: map,
      type: 'drive',
      accountId: p.accountId,
      folderId: p.folderId,
    };
  }
}

/** Compare source and target, return diffs */
export async function compare(
  source: SyncPath,
  target: SyncPath,
  syncMode: SyncMode
): Promise<CompareResult> {
  const [src, tgt] = await Promise.all([getFileMap(source), getFileMap(target)]);

  const diffs: FileDiff[] = [];
  const allPaths = new Set([
    ...src.files.keys(),
    ...tgt.files.keys(),
  ]);

  for (const rel of allPaths) {
    const s = src.files.get(rel);
    const t = tgt.files.get(rel);

    if (!s && t) {
      // only on target
      if (syncMode === 'mirror') diffs.push({ path: rel, action: 'delete', isFolder: t.isFolder });
      else if (syncMode === 'one-way-rl' && !t.isFolder)
        diffs.push({ path: rel, action: 'create', targetSize: t.size, targetModified: t.mtime });
    } else if (s && !t) {
      // only on source (don't create folder entries, they're created implicitly)
      if (syncMode !== 'one-way-rl' && !s.isFolder)
        diffs.push({ path: rel, action: 'create', sourceSize: s.size, sourceModified: s.mtime });
    } else if (s && t) {
      // both - check if different (skip folders for update comparison)
      if (!s.isFolder && !t.isFolder && (s.size !== t.size || s.mtime !== t.mtime)) {
        const srcNewer = !s.mtime || !t.mtime || s.mtime > t.mtime;
        if (syncMode === 'two-way') {
          diffs.push({
            path: rel,
            action: srcNewer ? 'update' : 'update', // conflict: pick source for now
            sourceSize: s.size,
            targetSize: t.size,
            sourceModified: s.mtime,
            targetModified: t.mtime,
          });
        } else if (syncMode === 'mirror' || syncMode === 'one-way-lr') {
          if (srcNewer) diffs.push({ path: rel, action: 'update', sourceSize: s.size, sourceModified: s.mtime });
        } else if (syncMode === 'one-way-rl' && !srcNewer) {
          diffs.push({ path: rel, action: 'update', targetSize: t.size, targetModified: t.mtime });
        }
      }
    }
  }

  return {
    diffs,
    sourceCount: src.files.size,
    targetCount: tgt.files.size,
  };
}

export interface SyncControl {
  isCancelled: () => boolean;
  isPaused: () => boolean;
}

async function waitWhilePaused(control: SyncControl): Promise<boolean> {
  while (control.isPaused() && !control.isCancelled()) {
    await new Promise((r) => setTimeout(r, 200));
  }
  return control.isCancelled();
}

/** Execute sync based on diffs */
export async function sync(
  source: SyncPath,
  target: SyncPath,
  diffs: FileDiff[],
  syncMode: SyncMode,
  onProgress?: (current: number, total: number, path: string) => void,
  control?: SyncControl
): Promise<{ done: number; errors: string[]; cancelled: boolean }> {
  const errors: string[] = [];
  let done = 0;

  // Sort diffs: folder deletions first (shorter paths first for parent-before-child),
  // then file deletions, then creates/updates
  const sortedDiffs = [...diffs].sort((a, b) => {
    const aIsDelete = a.action === 'delete';
    const bIsDelete = b.action === 'delete';
    if (aIsDelete && !bIsDelete) return -1;
    if (!aIsDelete && bIsDelete) return 1;
    if (aIsDelete && bIsDelete) {
      const aIsFolder = a.isFolder ?? false;
      const bIsFolder = b.isFolder ?? false;
      if (aIsFolder && !bIsFolder) return -1;
      if (!aIsFolder && bIsFolder) return 1;
      // For folders, delete shorter paths first (parents before children)
      if (aIsFolder && bIsFolder) return a.path.length - b.path.length;
    }
    return 0;
  });

  // Track deleted folders to skip children
  const deletedFolders: string[] = [];
  const total = sortedDiffs.length;

  for (const d of sortedDiffs) {
    if (control?.isCancelled()) {
      return { done, errors, cancelled: true };
    }
    if (control?.isPaused()) {
      const wasCancelled = await waitWhilePaused(control);
      if (wasCancelled) return { done, errors, cancelled: true };
    }

    // Skip items under already-deleted folders
    const isUnderDeletedFolder = deletedFolders.some(
      (folder) => d.path.startsWith(folder + '/')
    );
    if (isUnderDeletedFolder && d.action === 'delete') {
      done++;
      onProgress?.(done, total, d.path);
      continue;
    }

    try {
      const srcNewer =
        !d.sourceModified ||
        !d.targetModified ||
        d.sourceModified >= d.targetModified;

      if (d.action === 'create' && syncMode !== 'one-way-rl') {
        await copyFile(source, target, d.path);
      } else if (d.action === 'create' && syncMode === 'one-way-rl') {
        await copyFile(target, source, d.path);
      } else if (d.action === 'update' && syncMode === 'one-way-lr') {
        await copyFile(source, target, d.path);
      } else if (d.action === 'update' && syncMode === 'one-way-rl') {
        await copyFile(target, source, d.path);
      } else if (d.action === 'update' && syncMode === 'two-way') {
        if (srcNewer) await copyFile(source, target, d.path);
        else await copyFile(target, source, d.path);
      } else if (d.action === 'update' && syncMode === 'mirror') {
        await copyFile(source, target, d.path);
      } else if (d.action === 'delete' && syncMode === 'mirror') {
        await deleteFile(target, d.path, d.isFolder);
        if (d.isFolder) deletedFolders.push(d.path);
      }
    } catch (e) {
      errors.push(`${d.path}: ${(e as Error).message}`);
    }
    done++;
    onProgress?.(done, total, d.path);
  }

  return { done, errors, cancelled: false };
}

async function copyFile(
  from: SyncPath,
  to: SyncPath,
  relPath: string
): Promise<void> {
  if (from.type === 'local' && to.type === 'local') {
    const src = path.join(from.path, relPath);
    const dest = path.join(to.path, relPath);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(src, dest);
  } else if (from.type === 'local' && to.type === 'drive') {
    const src = path.join(from.path, relPath);
    const content = await fs.readFile(src);
    const parentId = await ensureParentFolder(to.accountId, to.folderId, path.dirname(relPath));
    await drive.uploadFile(to.accountId, parentId, relPath, content);
  } else if (from.type === 'drive' && to.type === 'local') {
    const fileId = await getDriveFileId(from.accountId, from.folderId, relPath);
    if (!fileId) throw new Error(`File not found: ${relPath}`);
    const content = await drive.downloadFile(from.accountId, fileId);
    const dest = path.join(to.path, relPath);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, content);
  } else if (from.type === 'drive' && to.type === 'drive') {
    const fileId = await getDriveFileId(from.accountId, from.folderId, relPath);
    if (!fileId) throw new Error(`File not found: ${relPath}`);
    const content = await drive.downloadFile(from.accountId, fileId);
    const parentId = await ensureParentFolder(to.accountId, to.folderId, path.dirname(relPath));
    await drive.uploadFile(to.accountId, parentId, relPath, content);
  }
}

async function deleteFile(p: SyncPath, relPath: string, isFolder?: boolean): Promise<void> {
  if (p.type === 'local') {
    const full = path.join(p.path, relPath);
    if (isFolder) {
      await fs.rm(full, { recursive: true, force: true });
    } else {
      await fs.unlink(full);
    }
  } else {
    const fileId = await getDriveFileId(p.accountId!, p.folderId, relPath);
    if (fileId) await drive.deleteFile(p.accountId!, fileId);
  }
}

async function getDriveFileId(
  accountId: string,
  folderId: string,
  relPath: string
): Promise<string | null> {
  const parts = relPath.split(/[/\\]/).filter(Boolean);
  if (parts.length === 0) return null;
  let currentId = folderId;
  const folderMime = 'application/vnd.google-apps.folder';
  for (let i = 0; i < parts.length; i++) {
    const files = await drive.listFiles(accountId, currentId);
    const f = files.find((x) => x.name === parts[i]);
    if (!f) return null;
    if (i < parts.length - 1) {
      if (f.mimeType !== folderMime) return null;
    }
    currentId = f.id;
  }
  return currentId;
}

async function ensureParentFolder(
  accountId: string,
  rootId: string,
  dirPath: string
): Promise<string> {
  const parts = dirPath.split(/[/\\]/).filter((p) => p && p !== '.');
  if (parts.length === 0) return rootId;
  let currentId = rootId;
  for (const part of parts) {
    const files = await drive.listFiles(accountId, currentId);
    const folder = files.find(
      (f) =>
        f.name === part &&
        (f.mimeType === 'application/vnd.google-apps.folder' ||
          f.mimeType === 'application/vnd.google-apps.shortcut')
    );
    if (folder) {
      currentId = folder.id;
    } else {
      const created = await drive.createFolder(accountId, currentId, part);
      currentId = created.id;
    }
  }
  return currentId;
}
