import { ipcMain, dialog, BrowserWindow } from 'electron';
import * as path from 'path';
import {
  getDefaultSettingsDir,
  saveConfig,
  loadConfig,
  listConfigs,
} from './services/settings';
import { getAccounts, addAccount, removeAccount } from './services/google-auth';
import * as drive from './services/google-drive';
import * as syncEngine from './services/sync-engine';
import type { SyncConfig } from '../shared/types';

export function setupIpcHandlers(): void {
  ipcMain.handle('app:ping', () => 'pong');

  // Settings
  ipcMain.handle('settings:getDefaultDir', async () => getDefaultSettingsDir());

  ipcMain.handle('settings:save', async (_, config: SyncConfig) => {
    return saveConfig(config);
  });

  ipcMain.handle('settings:load', async (_, filePath: string) => {
    return loadConfig(filePath);
  });

  ipcMain.handle('settings:list', async (_, settingsDir?: string) => {
    return listConfigs(settingsDir);
  });

  // Folder picker
  ipcMain.handle('dialog:selectFolder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('dialog:selectConfigFile', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'GDrive Sync Config', extensions: ['gdsync.json'] },
        { name: 'All', extensions: ['*'] },
      ],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  // Google accounts
  ipcMain.handle('accounts:list', () => getAccounts());

  ipcMain.handle('accounts:add', async (_, accountId: string) =>
    addAccount(accountId)
  );

  ipcMain.handle('accounts:remove', (_, accountId: string) => {
    removeAccount(accountId);
  });

  // Google Drive
  ipcMain.handle('drive:listFiles', async (_, accountId: string, folderId?: string) =>
    drive.listFiles(accountId, folderId || 'root')
  );

  ipcMain.handle('drive:getFile', async (_, accountId: string, fileId: string) =>
    drive.getFile(accountId, fileId)
  );

  // Sync
  ipcMain.handle(
    'sync:compare',
    async (_, source, target, syncMode) =>
      syncEngine.compare(source, target, syncMode)
  );

  ipcMain.handle(
    'sync:run',
    async (event, source, target, diffs, syncMode) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      return syncEngine.sync(source, target, diffs, syncMode, (done, total, filePath) => {
        win?.webContents.send('sync:progress', { done, total, filePath });
      });
    }
  );
}
