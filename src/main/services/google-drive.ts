/**
 * Google Drive API - list, upload, download, create folder
 */

import { getValidAccessToken } from './google-auth';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  modifiedTime?: string;
  trashed?: boolean;
}

export interface DriveFolder {
  id: string;
  name: string;
  parentId?: string;
}

const DRIVE_API = 'https://www.googleapis.com/drive/v3';

async function driveFetch(
  accountId: string,
  url: string,
  opts: RequestInit = {}
): Promise<Response> {
  const token = await getValidAccessToken(accountId);
  if (!token) throw new Error('Not authenticated');
  return fetch(url, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      ...opts.headers,
    },
  });
}

/** List files and folders in a Drive folder (handles pagination) */
export async function listFiles(
  accountId: string,
  folderId: string = 'root'
): Promise<DriveFile[]> {
  const all: DriveFile[] = [];
  let pageToken: string | undefined;
  const pageSize = 1000; // max allowed by Drive API

  do {
    const q = `'${folderId}' in parents and trashed = false`;
    const params = new URLSearchParams({
      q,
      pageSize: String(pageSize),
      fields: 'nextPageToken,files(id,name,mimeType,size,modifiedTime,trashed)',
      orderBy: 'folder,name',
    });
    if (pageToken) params.set('pageToken', pageToken);

    const res = await driveFetch(
      accountId,
      `${DRIVE_API}/files?${params}`
    );
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      throw new Error(err.error?.message || `Drive API: ${res.status}`);
    }
    const data = (await res.json()) as { files?: DriveFile[]; nextPageToken?: string };
    const page = data.files ?? [];
    if (page.length) all.push(...page);
    pageToken = data.nextPageToken;
  } while (pageToken);

  return all;
}

/** Get folder info by ID */
export async function getFile(
  accountId: string,
  fileId: string
): Promise<DriveFile | null> {
  const params = new URLSearchParams({
    fields: 'id,name,mimeType,size,modifiedTime,trashed,parents',
  });
  const res = await driveFetch(
    accountId,
    `${DRIVE_API}/files/${fileId}?${params}`
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(err.error?.message || `Drive API: ${res.status}`);
  }
  return (await res.json()) as DriveFile;
}

/** Create a folder in Drive */
export async function createFolder(
  accountId: string,
  parentId: string,
  name: string
): Promise<DriveFile> {
  const res = await driveFetch(accountId, `${DRIVE_API}/files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(err.error?.message || `Drive API: ${res.status}`);
  }
  return (await res.json()) as DriveFile;
}

export interface UploadOptions {
  modifiedTime?: string; // RFC 3339 (e.g. from Date.toISOString())
}

/** Upload a new file to Drive (preserves original modifiedTime when provided) */
export async function uploadFile(
  accountId: string,
  parentId: string,
  localPath: string,
  content: Buffer,
  options: UploadOptions = {}
): Promise<DriveFile> {
  const filename = localPath.split(/[/\\]/).pop() || 'file';
  const metadata: Record<string, unknown> = { name: filename, parents: [parentId] };
  if (options.modifiedTime) metadata.modifiedTime = options.modifiedTime;

  const payload = buildMultipartPayload(metadata, content);
  const token = await getValidAccessToken(accountId);
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${payload.boundary}`,
        'Content-Length': String(payload.body.length),
      },
      body: payload.body,
    }
  );

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(err.error?.message || `Upload failed: ${res.status}`);
  }
  return (await res.json()) as DriveFile;
}

/** Update an existing Drive file's content (avoids duplicates, preserves original modifiedTime) */
export async function updateFile(
  accountId: string,
  fileId: string,
  content: Buffer,
  options: UploadOptions = {}
): Promise<DriveFile> {
  const metadata: Record<string, unknown> = {};
  if (options.modifiedTime) metadata.modifiedTime = options.modifiedTime;

  const payload = buildMultipartPayload(metadata, content);
  const token = await getValidAccessToken(accountId);
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${payload.boundary}`,
        'Content-Length': String(payload.body.length),
      },
      body: payload.body,
    }
  );

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(err.error?.message || `Update failed: ${res.status}`);
  }
  return (await res.json()) as DriveFile;
}

function buildMultipartPayload(
  metadata: Record<string, unknown>,
  content: Buffer
): { boundary: string; body: Buffer } {
  const boundary = '-------' + Date.now().toString(36) + Math.random().toString(36);

  const metadataPart = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
  ].join('\r\n');

  const filePart = [
    '',
    `--${boundary}`,
    'Content-Type: application/octet-stream',
    '',
    '',
  ].join('\r\n');

  const ending = `\r\n--${boundary}--`;

  const body = Buffer.concat([
    Buffer.from(metadataPart, 'utf8'),
    Buffer.from(filePart, 'utf8'),
    content,
    Buffer.from(ending, 'utf8'),
  ]);

  return { boundary, body };
}

/** Download file content from Drive */
export async function downloadFile(
  accountId: string,
  fileId: string
): Promise<Buffer> {
  const res = await driveFetch(
    accountId,
    `${DRIVE_API}/files/${fileId}?alt=media`
  );
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(err.error?.message || `Drive API: ${res.status}`);
  }
  const arr = await res.arrayBuffer();
  return Buffer.from(arr);
}

/** Delete a file in Drive */
export async function deleteFile(
  accountId: string,
  fileId: string
): Promise<void> {
  const res = await driveFetch(accountId, `${DRIVE_API}/files/${fileId}`, {
    method: 'DELETE',
  });
  if (!res.ok && res.status !== 404) {
    const err = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(err.error?.message || `Drive API: ${res.status}`);
  }
}
