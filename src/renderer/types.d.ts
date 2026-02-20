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
  drive: {
    listFiles: (accountId: string, folderId?: string) => Promise<{ id: string; name: string; mimeType: string; size?: number; modifiedTime?: string }[]>;
    getFile: (accountId: string, fileId: string) => Promise<{ id: string; name: string; mimeType: string } | null>;
  };
  sync: {
    compare: (source: object, target: object, syncMode: string) => Promise<{ diffs: import('../../shared/types').FileDiff[]; sourceCount: number; targetCount: number }>;
    run: (source: object, target: object, diffs: object[], syncMode: string) => Promise<{ done: number; errors: string[]; cancelled: boolean }>;
    cancel: () => Promise<void>;
    pause: () => Promise<void>;
    resume: () => Promise<void>;
    onProgress: (cb: (data: { done: number; total: number; filePath: string }) => void) => () => void;
  };
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
