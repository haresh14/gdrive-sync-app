import { useState, useEffect } from 'react';
import Toolbar from './components/Toolbar';
import PanePathRow from './components/PanePathRow';
import FileTreePane from './components/FileTreePane';
import StatusBar from './components/StatusBar';
import AccountManager from './components/AccountManager';
import SyncConfirmModal from './components/SyncConfirmModal';
import type { SyncConfig, SyncPath, GoogleAccount, FileDiff } from '../../shared/types';

export type { SyncConfig, SyncPath, GoogleAccount };

const defaultConfig: SyncConfig = {
  version: 1,
  name: 'Untitled',
  folderPairs: [],
  syncMode: 'mirror',
};

function formatSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(1)} KB`;
  return `${bytes} B`;
}

export default function App() {
  const [config, setConfig] = useState<SyncConfig>(defaultConfig);
  const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
  const [status, setStatus] = useState('');
  const [showAccounts, setShowAccounts] = useState(false);

  const [selectedPairIndex, setSelectedPairIndex] = useState(0);
  const [source, setSource] = useState<SyncPath>({ type: 'local', path: '' });
  const [target, setTarget] = useState<SyncPath>({ type: 'local', path: '' });

  const [compareResult, setCompareResult] = useState<{
    diffs: FileDiff[];
    sourceCount: number;
    targetCount: number;
    source: SyncPath;
    target: SyncPath;
  } | null>(null);

  const [showSyncConfirm, setShowSyncConfirm] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const loadAccounts = async () => {
    const list = (await window.electronAPI?.accounts.list()) ?? [];
    setAccounts(list);
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    const pairs = config.folderPairs;
    if (pairs.length === 0) {
      setSource({ type: 'local', path: '' });
      setTarget({ type: 'local', path: '' });
      return;
    }
  }, [config.folderPairs.length]);

  useEffect(() => {
    const pairs = config.folderPairs;
    if (pairs.length === 0) return;
    const idx = Math.min(selectedPairIndex, pairs.length - 1);
    setSource(pairs[idx].source);
    setTarget(pairs[idx].target);
  }, [config.folderPairs, selectedPairIndex]);

  const handlePairSelect = (index: number) => {
    const pairs = config.folderPairs;
    if (index >= 0 && index < pairs.length) {
      setSelectedPairIndex(index);
      setSource(pairs[index].source);
      setTarget(pairs[index].target);
      setCompareResult(null);
    }
  };

  const handleAddPair = () => {
    const newPair = {
      source: { type: 'local' as const, path: '' },
      target: { type: 'local' as const, path: '' },
    };
    const newIndex = config.folderPairs.length;
    setConfig((c) => ({
      ...c,
      folderPairs: [...c.folderPairs, newPair],
    }));
    setSelectedPairIndex(newIndex);
    setSource(newPair.source);
    setTarget(newPair.target);
    setCompareResult(null);
  };

  const handleRemovePair = () => {
    if (config.folderPairs.length <= 1) return;
    const newPairs = config.folderPairs.filter((_, i) => i !== selectedPairIndex);
    const newIndex = Math.min(selectedPairIndex, newPairs.length - 1);
    setConfig((c) => ({ ...c, folderPairs: newPairs }));
    setSelectedPairIndex(newIndex);
    setSource(newPairs[newIndex].source);
    setTarget(newPairs[newIndex].target);
    setCompareResult(null);
  };

  const updatePairPaths = (s: SyncPath, t: SyncPath) => {
    setSource(s);
    setTarget(t);
    setConfig((c) => {
      const pairs = [...c.folderPairs];
      if (pairs.length === 0) {
        return { ...c, folderPairs: [{ source: s, target: t }] };
      }
      const idx = Math.min(selectedPairIndex, pairs.length - 1);
      pairs[idx] = { ...pairs[idx], source: s, target: t };
      return { ...c, folderPairs: pairs };
    });
  };

  const handleCompare = async () => {
    const valid =
      (source.type === 'local' ? source.path : source.accountId) &&
      (target.type === 'local' ? target.path : target.accountId);
    if (!valid) {
      setStatus('Select source and target folders');
      return;
    }
    setStatus('Comparing...');
    try {
      const result = await window.electronAPI?.sync.compare(
        source,
        target,
        config.syncMode
      );
      if (result) {
        setCompareResult({ ...result, source, target });
        setConfig((c) => ({
          ...c,
          folderPairs: c.folderPairs.length
            ? [{ source, target, ...c.folderPairs[0] }]
            : [{ source, target }],
        }));
        setStatus(`Found ${result.diffs.length} differences`);
      }
    } catch (e) {
      setStatus(`Compare failed: ${(e as Error).message}`);
    }
  };

  const handleSyncClick = async () => {
    if (!compareResult) {
      const valid =
        (source.type === 'local' ? source.path : source.accountId) &&
        (target.type === 'local' ? target.path : target.accountId);
      if (!valid) {
        setStatus('Select source and target folders');
        return;
      }
      setStatus('Comparing...');
      try {
        const result = await window.electronAPI?.sync.compare(source, target, config.syncMode);
        if (result) {
          setCompareResult({ ...result, source, target });
          setConfig((c) => ({
            ...c,
            folderPairs: c.folderPairs.length ? [{ source, target }] : [{ source, target }],
          }));
          setStatus(`Found ${result.diffs.length} differences`);
          setShowSyncConfirm(true);
        }
      } catch (e) {
        setStatus(`Compare failed: ${(e as Error).message}`);
      }
      return;
    }
    setShowSyncConfirm(true);
  };

  const handleSyncConfirm = async () => {
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
      setShowSyncConfirm(false);
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

  const addCount = compareResult?.diffs.filter(
    (d) => d.action === 'create' || d.action === 'update'
  ).length ?? 0;
  const deleteCount = compareResult?.diffs.filter((d) => d.action === 'delete').length ?? 0;
  const totalBytes =
    compareResult?.diffs.reduce(
      (s, d) => s + (d.sourceSize ?? d.targetSize ?? 0),
      0
    ) ?? 0;

  return (
    <div className="h-screen flex flex-col bg-zinc-100 dark:bg-[#1a1a1e]">
      <Toolbar
        syncMode={config.syncMode}
        onSyncModeChange={(syncMode) => setConfig((c) => ({ ...c, syncMode }))}
        pairCount={Math.max(1, config.folderPairs.length)}
        selectedPairIndex={selectedPairIndex}
        onPairSelect={handlePairSelect}
        onAddPair={handleAddPair}
        onRemovePair={config.folderPairs.length > 1 ? handleRemovePair : undefined}
        onCompare={handleCompare}
        onSync={handleSyncClick}
        onSave={async () => {
          const pairs = config.folderPairs.length
            ? config.folderPairs.map((p, i) =>
                i === selectedPairIndex ? { source, target } : p
              )
            : [{ source, target }];
          const cfg = { ...config, folderPairs: pairs };
          try {
            const p = await window.electronAPI?.settings.save(cfg);
            setStatus(`Saved: ${p}`);
          } catch (e) {
            setStatus(`Error: ${(e as Error).message}`);
          }
        }}
        onLoad={async () => {
          const fp = await window.electronAPI?.dialog.selectConfigFile();
          if (!fp) return;
          try {
            const loaded = await window.electronAPI?.settings.load(fp);
            setConfig(loaded);
            if (loaded.folderPairs.length > 0) {
              setSelectedPairIndex(0);
              setSource(loaded.folderPairs[0].source);
              setTarget(loaded.folderPairs[0].target);
            }
            setStatus(`Loaded: ${loaded.name}`);
          } catch (e) {
            setStatus(`Error: ${(e as Error).message}`);
          }
        }}
        onAccounts={() => setShowAccounts(true)}
      />

      <div className="flex-1 flex min-h-0">
        {/* Left pane */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/50">
          <div className="p-3 border-b border-zinc-200 dark:border-zinc-700 shrink-0">
            <PanePathRow value={source} onChange={(p) => updatePairPaths(p, target)} accounts={accounts} />
          </div>
          <FileTreePane
            diffs={compareResult?.diffs.filter((d) => d.action !== 'delete') ?? []}
            side="left"
            emptyMessage="Select folder and click Compare"
          />
        </div>

        {/* Right pane */}
        <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-zinc-900/50">
          <div className="p-3 border-b border-zinc-200 dark:border-zinc-700 shrink-0">
            <PanePathRow value={target} onChange={(p) => updatePairPaths(source, p)} accounts={accounts} />
          </div>
          <FileTreePane
            diffs={compareResult?.diffs ?? []}
            side="right"
            emptyMessage="Select folder and click Compare"
          />
        </div>
      </div>

      <StatusBar
        addCount={addCount}
        deleteCount={deleteCount}
        sizeStr={formatSize(totalBytes)}
        message={status}
      />

      {showAccounts && (
        <AccountManager
          accounts={accounts}
          onClose={() => setShowAccounts(false)}
          onRefresh={loadAccounts}
        />
      )}

      {showSyncConfirm && compareResult && (
        <SyncConfirmModal
          syncMode={config.syncMode}
          addCount={addCount}
          deleteCount={deleteCount}
          sizeStr={formatSize(totalBytes)}
          onStart={handleSyncConfirm}
          onCancel={() => setShowSyncConfirm(false)}
          syncing={syncing}
        />
      )}
    </div>
  );
}
