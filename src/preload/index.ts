import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('app:ping'),

  // Settings
  settings: {
    getDefaultDir: () => ipcRenderer.invoke('settings:getDefaultDir'),
    save: (config: object) => ipcRenderer.invoke('settings:save', config),
    load: (filePath: string) => ipcRenderer.invoke('settings:load', filePath),
    list: () => ipcRenderer.invoke('settings:list'),
  },

  // Dialogs
  dialog: {
    selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
    selectConfigFile: () => ipcRenderer.invoke('dialog:selectConfigFile'),
  },

  // Accounts
  accounts: {
    list: () => ipcRenderer.invoke('accounts:list'),
    add: (accountId: string) => ipcRenderer.invoke('accounts:add', accountId),
    remove: (accountId: string) => ipcRenderer.invoke('accounts:remove', accountId),
  },

  // Google Drive
  drive: {
    listFiles: (accountId: string, folderId?: string) =>
      ipcRenderer.invoke('drive:listFiles', accountId, folderId),
    getFile: (accountId: string, fileId: string) =>
      ipcRenderer.invoke('drive:getFile', accountId, fileId),
  },

  // Sync
  sync: {
    compare: (source: object, target: object, syncMode: string) =>
      ipcRenderer.invoke('sync:compare', source, target, syncMode),
    run: (source: object, target: object, diffs: object[], syncMode: string) =>
      ipcRenderer.invoke('sync:run', source, target, diffs, syncMode),
    cancel: () => ipcRenderer.invoke('sync:cancel'),
    pause: () => ipcRenderer.invoke('sync:pause'),
    resume: () => ipcRenderer.invoke('sync:resume'),
    onProgress: (cb: (data: { done: number; total: number; filePath: string }) => void) => {
      const sub = (_: unknown, data: { done: number; total: number; filePath: string }) => cb(data);
      ipcRenderer.on('sync:progress', sub);
      return () => ipcRenderer.removeListener('sync:progress', sub);
    },
  },
});
