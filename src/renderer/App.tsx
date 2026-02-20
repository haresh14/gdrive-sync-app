import { useState, useEffect } from 'react';
import Toolbar from './components/Toolbar';
import FolderPairs from './components/FolderPairs';
import SyncModeSelector from './components/SyncModeSelector';
import StatusBar from './components/StatusBar';
import AccountManager from './components/AccountManager';
import CompareResult from './components/CompareResult';
import type { SyncConfig, SyncPath, GoogleAccount, FileDiff } from '../../shared/types';

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
  const [compareResult, setCompareResult] = useState<{
    diffs: FileDiff[];
    sourceCount: number;
    targetCount: number;
    source: SyncPath;
    target: SyncPath;
  } | null>(null);
  const [syncing, setSyncing] = useState(false);

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

  const handleCompare = async () => {
    const pair = config.folderPairs.find(
      (p) =>
        (p.source.type === 'local' ? p.source.path : p.source.accountId) &&
        (p.target.type === 'local' ? p.target.path : p.target.accountId)
    );
    if (!pair) {
      setStatus('Add a folder pair with valid source and target');
      return;
    }
    setStatus('Comparing...');
    try {
      const result = await window.electronAPI?.sync.compare(
        pair.source,
        pair.target,
        config.syncMode
      );
      if (result) {
        setCompareResult({
          ...result,
          source: pair.source,
          target: pair.target,
        });
        setStatus(`Found ${result.diffs.length} differences`);
      }
    } catch (e) {
      setStatus(`Compare failed: ${(e as Error).message}`);
    }
  };

  const handleSyncFromCompare = async () => {
    if (!compareResult) return;
    setSyncing(true);
    setStatus('Syncing...');
    const unsub = window.electronAPI?.sync.onProgress(({ done, total }) => {
      setStatus(`Syncing ${done}/${total}...`);
    });
    try {
      const result = await window.electronAPI?.sync.run(
        compareResult.source,
        compareResult.target,
        compareResult.diffs,
        config.syncMode
      );
      if (result?.errors.length) {
        setStatus(`Sync done with ${result.errors.length} errors`);
      } else {
        setStatus(`Synced ${result?.done ?? 0} items`);
      }
      setCompareResult(null);
    } catch (e) {
      setStatus(`Sync failed: ${(e as Error).message}`);
    } finally {
      unsub?.();
      setSyncing(false);
    }
  };

  const handleSync = () => {
    handleCompare(); // Opens compare result modal; user clicks Sync there
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
      {compareResult && (
        <CompareResult
          diffs={compareResult.diffs}
          sourceCount={compareResult.sourceCount}
          targetCount={compareResult.targetCount}
          onSync={handleSyncFromCompare}
          onClose={() => setCompareResult(null)}
          syncing={syncing}
        />
      )}
    </div>
  );
}
