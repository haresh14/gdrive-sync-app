import * as fs from 'fs/promises';
import * as path from 'path';
import { app } from 'electron';
import { SyncConfig } from '../../shared/types';
import { SyncConfigSchema } from '../../shared/schema';

const APP_FOLDER = 'GDriveSyncApp';
const DEFAULT_CONFIG_NAME = 'default.gdsync.json';

function getDefaultSettingsPath(): string {
  const documents = app.getPath('documents');
  return path.join(documents, APP_FOLDER);
}

export async function getDefaultSettingsDir(): Promise<string> {
  const dir = getDefaultSettingsPath();
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function saveConfig(
  config: SyncConfig,
  settingsDir?: string
): Promise<string> {
  const dir = settingsDir || (await getDefaultSettingsDir());
  const fileName = config.name.replace(/[^a-zA-Z0-9-_]/g, '_') + '.gdsync.json';
  const filePath = path.join(dir, fileName);

  const toSave = {
    ...config,
    updatedAt: new Date().toISOString(),
  };
  if (!toSave.createdAt) toSave.createdAt = toSave.updatedAt;

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(toSave, null, 2), 'utf-8');
  return filePath;
}

export async function saveConfigAs(
  config: SyncConfig,
  filePath: string
): Promise<string> {
  const dir = path.dirname(filePath);
  const baseName = path.basename(filePath, '.gdsync.json');

  const toSave = {
    ...config,
    name: baseName,
    updatedAt: new Date().toISOString(),
  };
  if (!toSave.createdAt) toSave.createdAt = toSave.updatedAt;

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(toSave, null, 2), 'utf-8');
  return filePath;
}

export async function loadConfig(filePath: string): Promise<SyncConfig> {
  const data = await fs.readFile(filePath, 'utf-8');
  const parsed = JSON.parse(data);
  return SyncConfigSchema.parse(parsed) as SyncConfig;
}

export async function listConfigs(settingsDir?: string): Promise<string[]> {
  const dir = settingsDir || (await getDefaultSettingsDir());
  try {
    const files = await fs.readdir(dir);
    return files
      .filter((f) => f.endsWith('.gdsync.json'))
      .map((f) => path.join(dir, f));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
}
