import { useState, useEffect } from 'react';
import Toolbar from './components/Toolbar';
import FolderPairs from './components/FolderPairs';
import SyncModeSelector from './components/SyncModeSelector';
import StatusBar from './components/StatusBar';
import AccountManager from './components/AccountManager';
import type { SyncConfig, SyncPath, GoogleAccount } from '../../shared/types';

export type { SyncConfig, SyncPath, GoogleAccount };

const defaultConfig: SyncConfig = {
  version: 1,
  name: 'Untitled',
  folderPairs: [],
  syncMode: 'mirror',
};

export default function App() {
  const [config, setConfig] = useState<SyncConfig>(defaultConfig);
  const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
  const [status, setStatus] = useState('');
  const [showAccounts, setShowAccounts] = useState(false);

  const loadAccounts = async () => {
    const list = await window.electronAPI?.accounts.list() ?? [];
    setAccounts(list);
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const addFolderPair = () => {
    setConfig((c) => ({
      ...c,
      folderPairs: [
        ...c.folderPairs,
        {
          source: { type: 'local', path: '' },
          target: { type: 'local', path: '' },
        },
      ],
    }));
  };

  const updatePair = (index: number, side: 'source' | 'target', path: SyncPath) => {
    setConfig((c) => {
      const next = [...c.folderPairs];
      next[index] = { ...next[index], [side]: path };
      return { ...c, folderPairs: next };
    });
  };

  const removePair = (index: number) => {
    setConfig((c) => ({
      ...c,
      folderPairs: c.folderPairs.filter((_, i) => i !== index),
    }));
  };

  const handleCompare = () => {
    setStatus('Compare not implemented yet');
  };

  const handleSync = () => {
    setStatus('Sync not implemented yet');
  };

  const handleSave = async () => {
    try {
      const path = await window.electronAPI?.settings.save(config);
      setStatus(`Saved: ${path}`);
    } catch (e) {
      setStatus(`Error: ${(e as Error).message}`);
    }
  };

  const handleLoad = async () => {
    const filePath = await window.electronAPI?.dialog.selectConfigFile();
    if (!filePath) return;
    try {
      const loaded = await window.electronAPI?.settings.load(filePath);
      setConfig(loaded);
      setStatus(`Loaded: ${loaded.name}`);
    } catch (e) {
      setStatus(`Error: ${(e as Error).message}`);
    }
  };


  return (
    <div className="h-screen flex flex-col bg-[#1a1a1e]">
      <Toolbar
        onCompare={handleCompare}
        onSync={handleSync}
        onSave={handleSave}
        onLoad={handleLoad}
        onAccounts={() => setShowAccounts(true)}
      />

      <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
        <div className="flex items-center gap-3 shrink-0">
          <label className="text-zinc-400 text-sm">Config name:</label>
          <input
            type="text"
            value={config.name}
            onChange={(e) => setConfig((c) => ({ ...c, name: e.target.value }))}
            placeholder="Untitled"
            className="px-3 py-1.5 rounded bg-zinc-800 border border-zinc-600 text-zinc-200 text-sm w-48 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <SyncModeSelector
          value={config.syncMode}
          onChange={(syncMode) => setConfig((c) => ({ ...c, syncMode }))}
        />

        <div className="flex-1 flex flex-col min-h-0 border border-zinc-700 rounded-lg overflow-hidden">
          <FolderPairs
            pairs={config.folderPairs}
            accounts={accounts}
            onAdd={addFolderPair}
            onUpdate={updatePair}
            onRemove={removePair}
          />
        </div>
      </div>

      <StatusBar message={status} />

      {showAccounts && (
        <AccountManager
          accounts={accounts}
          onClose={() => setShowAccounts(false)}
          onRefresh={loadAccounts}
        />
      )}
    </div>
  );
}
