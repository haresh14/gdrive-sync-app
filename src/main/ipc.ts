import { ipcMain, dialog } from 'electron';
import * as path from 'path';
import {
  getDefaultSettingsDir,
  saveConfig,
  loadConfig,
  listConfigs,
} from './services/settings';
import { getAccounts, addAccount, removeAccount } from './services/google-auth';
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
}
