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
});
