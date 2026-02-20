export interface ElectronAPI {
  ping: () => Promise<string>;
  settings: {
    getDefaultDir: () => Promise<string>;
    save: (config: object) => Promise<string>;
    load: (filePath: string) => Promise<import('../../shared/types').SyncConfig>;
    list: () => Promise<string[]>;
  };
  dialog: {
    selectFolder: () => Promise<string | null>;
    selectConfigFile: () => Promise<string | null>;
  };
  accounts: {
    list: () => Promise<import('../../shared/types').GoogleAccount[]>;
    add: (accountId: string) => Promise<{ success: boolean; account?: import('../../shared/types').GoogleAccount; error?: string }>;
    remove: (accountId: string) => Promise<void>;
  };
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
