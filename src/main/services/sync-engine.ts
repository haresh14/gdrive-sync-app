/**
 * Sync engine: compare and sync between local and Google Drive
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { SyncPath, SyncMode, FileDiff } from '../../shared/types';
import * as drive from './google-drive';

/** Normalize path for consistent comparison (always forward slashes) */
function normalizeRelPath(rel: string): string {
  return rel.replace(/\\/g, '/').replace(/\/+/g, '/');
}

/** Canonical key for case-insensitive path matching (e.g. Windows vs Drive) */
function canonicalPath(rel: string): string {
  return normalizeRelPath(rel).toLowerCase();
}

export interface CompareResult {
  diffs: FileDiff[];
  sourceCount: number;
  targetCount: number;
}

interface FileMeta {
  size: number;
  mtime: string;
  id?: string;
  isFolder?: boolean;
  originalPath: string;
}

/** Recursively list local files with relative paths (keys = canonical for comparison) */
async function listLocalFiles(dirPath: string, base = ''): Promise<Map<string, FileMeta>> {
  const result = new Map<string, FileMeta>();
  let names: string[];
  try {
    names = await fs.readdir(dirPath);
  } catch {
    return result;
  }

  for (const name of names) {
    const rel = normalizeRelPath(base ? `${base}/${name}` : name);
    const key = canonicalPath(rel);
    const full = path.join(dirPath, name);

    let stat: import('fs').Stats;
    try {
      stat = await fs.stat(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      result.set(key, { size: 0, mtime: stat.mtime.toISOString(), isFolder: true, originalPath: rel });
      const sub = await listLocalFiles(full, rel);
      for (const [k, meta] of sub) result.set(k, meta);
    } else {
      result.set(key, {
        size: stat.size,
        mtime: stat.mtime.toISOString(),
        originalPath: rel,
      });
    }
  }
  return result;
}

/** Recursively list Drive files (keys = canonical for comparison; propagates API errors) */
async function listDriveFiles(
  accountId: string,
  folderId: string,
  base = ''
): Promise<Map<string, FileMeta>> {
  const result = new Map<string, FileMeta>();
  const effectiveFolderId = folderId || 'root';
  const files = await drive.listFiles(accountId, effectiveFolderId);

  const folderMime = 'application/vnd.google-apps.folder';
  for (const f of files) {
    const rel = normalizeRelPath(base ? `${base}/${f.name}` : f.name);
    const key = canonicalPath(rel);

    if (f.mimeType === folderMime) {
      result.set(key, { size: 0, mtime: f.modifiedTime ?? '', id: f.id, isFolder: true, originalPath: rel });
      const sub = await listDriveFiles(accountId, f.id, rel);
      for (const [k, meta] of sub) result.set(k, meta);
    } else {
      result.set(key, {
        size: f.size ?? 0,
        mtime: f.modifiedTime ?? '',
        id: f.id,
        originalPath: rel,
      });
    }
  }
  return result;
}

/** Get file listing for a path */
async function getFileMap(p: SyncPath): Promise<{
  files: Map<string, FileMeta>;
  type: 'local' | 'drive';
  accountId?: string;
  folderId?: string;
  basePath?: string;
}> {
  if (p.type === 'local') {
    const files = await listLocalFiles(p.path);
    return { files, type: 'local', basePath: p.path };
  } else {
    const folderId = (p as { folderId?: string }).folderId ?? 'root';
    const files = await listDriveFiles(p.accountId, folderId);
    return {
      files,
      type: 'drive',
      accountId: p.accountId,
      folderId,
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
  const allPaths = new Set<string>();
  for (const k of src.files.keys()) allPaths.add(k);
  for (const k of tgt.files.keys()) allPaths.add(k);

  for (const key of allPaths) {
    const s = src.files.get(key);
    const t = tgt.files.get(key);
    const pathForDiff = (s || t)!.originalPath;

    if (!s && t) {
      if (syncMode === 'mirror') diffs.push({ path: pathForDiff, action: 'delete', isFolder: t.isFolder });
      else if (syncMode === 'one-way-rl' && !t.isFolder)
        diffs.push({ path: pathForDiff, action: 'create', targetSize: t.size, targetModified: t.mtime });
    } else if (s && !t) {
      if (syncMode !== 'one-way-rl' && !s.isFolder)
        diffs.push({ path: pathForDiff, action: 'create', sourceSize: s.size, sourceModified: s.mtime });
    } else if (s && t) {
      // Only re-sync when size differs (e.g. partial upload); skip if size matches (already synced)
      const srcSize = Number(s.size) || 0;
      const tgtSize = Number(t.size) || 0;
      if (!s.isFolder && !t.isFolder && srcSize !== tgtSize) {
        const srcNewer = !s.mtime || !t.mtime || s.mtime > t.mtime;
        if (syncMode === 'two-way') {
          diffs.push({
            path: pathForDiff,
            action: 'update',
            sourceSize: s.size,
            targetSize: t.size,
            sourceModified: s.mtime,
            targetModified: t.mtime,
          });
        } else if (syncMode === 'mirror' || syncMode === 'one-way-lr') {
          diffs.push({ path: pathForDiff, action: 'update', sourceSize: s.size, sourceModified: s.mtime });
        } else if (syncMode === 'one-way-rl') {
          diffs.push({ path: pathForDiff, action: 'update', targetSize: t.size, targetModified: t.mtime });
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
    const stat = await fs.stat(src);
    const modifiedTime = stat.mtime.toISOString();

    const existingId = await getDriveFileId(to.accountId, to.folderId, relPath);
    if (existingId) {
      await drive.updateFile(to.accountId, existingId, content, { modifiedTime });
    } else {
      const parentId = await ensureParentFolder(to.accountId, to.folderId, path.dirname(relPath));
      await drive.uploadFile(to.accountId, parentId, relPath, content, { modifiedTime });
    }
  } else if (from.type === 'drive' && to.type === 'local') {
    const fileId = await getDriveFileId(from.accountId, from.folderId, relPath);
    if (!fileId) throw new Error(`File not found: ${relPath}`);
    const [content, meta] = await Promise.all([
      drive.downloadFile(from.accountId, fileId),
      drive.getFile(from.accountId, fileId),
    ]);
    const dest = path.join(to.path, relPath);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, content);
    if (meta?.modifiedTime) {
      const mtime = new Date(meta.modifiedTime).getTime() / 1000;
      await fs.utimes(dest, mtime, mtime);
    }
  } else if (from.type === 'drive' && to.type === 'drive') {
    const fileId = await getDriveFileId(from.accountId, from.folderId, relPath);
    if (!fileId) throw new Error(`File not found: ${relPath}`);
    const [content, meta] = await Promise.all([
      drive.downloadFile(from.accountId, fileId),
      drive.getFile(from.accountId, fileId),
    ]);
    const modifiedTime = meta?.modifiedTime;
    const existingId = await getDriveFileId(to.accountId, to.folderId, relPath);
    if (existingId) {
      await drive.updateFile(to.accountId, existingId, content, modifiedTime ? { modifiedTime } : {});
    } else {
      const parentId = await ensureParentFolder(to.accountId, to.folderId, path.dirname(relPath));
      await drive.uploadFile(to.accountId, parentId, relPath, content, modifiedTime ? { modifiedTime } : {});
    }
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
