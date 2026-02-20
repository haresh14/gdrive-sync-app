/**
 * Shared types for GDrive Sync App
 */

export type SyncMode = 'mirror' | 'one-way-lr' | 'one-way-rl' | 'two-way';

export type PathType = 'local' | 'drive';

export interface LocalPath {
  type: 'local';
  path: string;
}

export interface DrivePath {
  type: 'drive';
  accountId: string;
  folderId: string;
  folderName?: string;
}

export type SyncPath = LocalPath | DrivePath;

export interface FolderPair {
  source: SyncPath;
  target: SyncPath;
}

export interface GoogleAccount {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}

export interface SyncConfig {
  version: number;
  name: string;
  folderPairs: FolderPair[];
  syncMode: SyncMode;
  settingsPath?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FileDiff {
  path: string;
  action: 'create' | 'update' | 'delete' | 'conflict';
  sourceSize?: number;
  targetSize?: number;
  sourceModified?: string;
  targetModified?: string;
  isFolder?: boolean;
}
