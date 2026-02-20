import { useState, useEffect } from 'react';
import Toolbar from './components/Toolbar';
import FolderPairRows from './components/FolderPairRows';
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

  const [compareResult, setCompareResult] = useState<{
    pairResults: Array<{ source: SyncPath; target: SyncPath; diffs: FileDiff[] }>;
    allDiffs: FileDiff[];
  } | null>(null);

  const [showSyncConfirm, setShowSyncConfirm] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncComplete, setSyncComplete] = useState(false);
  const [syncCancelled, setSyncCancelled] = useState(false);
  const [syncPaused, setSyncPaused] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ done: number; total: number; filePath?: string } | null>(null);

  const loadAccounts = async () => {
    const list = (await window.electronAPI?.accounts.list()) ?? [];
    setAccounts(list);
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleAddPair = () => {
    const newPair = {
      source: { type: 'local' as const, path: '' },
      target: { type: 'local' as const, path: '' },
    };
    setConfig((c) => ({
      ...c,
      folderPairs: [...c.folderPairs, newPair],
    }));
    setCompareResult(null);
  };

  const handleRemovePairAt = (index: number) => {
    if (config.folderPairs.length <= 1) return;
    const newPairs = config.folderPairs.filter((_, i) => i !== index);
    setConfig((c) => ({ ...c, folderPairs: newPairs }));
    setCompareResult(null);
  };

  const handleUpdatePair = (index: number, s: SyncPath, t: SyncPath) => {
    setConfig((c) => {
      const pairs = [...c.folderPairs];
      if (pairs.length === 0) return { ...c, folderPairs: [{ source: s, target: t }] };
      if (index >= pairs.length) return c;
      pairs[index] = { source: s, target: t };
      return { ...c, folderPairs: pairs };
    });
  };

  const handleCompare = async (): Promise<boolean> => {
    const pairs = config.folderPairs.length ? config.folderPairs : [];
    const validPairs = pairs.filter(
      (p) =>
        (p.source.type === 'local' ? p.source.path : p.source.accountId) &&
        (p.target.type === 'local' ? p.target.path : p.target.accountId)
    );
    if (validPairs.length === 0) {
      setStatus('Add at least one folder pair with source and target');
      return false;
    }
    setStatus('Comparing...');
    try {
      const pairResults: Array<{ source: SyncPath; target: SyncPath; diffs: FileDiff[] }> = [];
      for (const pair of validPairs) {
        const result = await window.electronAPI?.sync.compare(
          pair.source,
          pair.target,
          config.syncMode
        );
        if (result) {
          pairResults.push({ source: pair.source, target: pair.target, diffs: result.diffs });
        }
      }
      if (pairResults.length > 0) {
        const allDiffs: FileDiff[] = [];
        pairResults.forEach((pr, i) => {
          const prefix = pairResults.length > 1 ? `Pair ${i + 1}/` : '';
          for (const d of pr.diffs) {
            allDiffs.push({ ...d, path: prefix + d.path });
          }
        });
        setCompareResult({ pairResults, allDiffs });
        setStatus(`Found ${allDiffs.length} differences across ${pairResults.length} pair(s)`);
        return true;
      }
      return false;
    } catch (e) {
      setStatus(`Compare failed: ${(e as Error).message}`);
      return false;
    }
  };

  const handleSyncClick = async () => {
    if (!compareResult) {
      const ok = await handleCompare();
      if (ok) setShowSyncConfirm(true);
      return;
    }
    setShowSyncConfirm(true);
  };

  const handleSyncConfirm = async () => {
    if (!compareResult) return;
    const totalDiffs = compareResult.allDiffs.length;
    setSyncing(true);
    setSyncComplete(false);
    setSyncCancelled(false);
    setSyncPaused(false);
    setSyncProgress({ done: 0, total: totalDiffs, filePath: '' });
    setStatus('Syncing...');
    let completedBeforeCurrent = 0;
    let wasCancelled = false;
    const unsub = window.electronAPI?.sync.onProgress(({ done, filePath }) => {
      const overallDone = completedBeforeCurrent + done;
      setSyncProgress((p) => (p ? { ...p, done: overallDone, total: p.total, filePath } : { done: overallDone, total: totalDiffs, filePath }));
      setStatus(`Syncing ${overallDone}/${totalDiffs}...`);
    });
    try {
      let totalDone = 0;
      for (const pr of compareResult.pairResults) {
        if (pr.diffs.length === 0) continue;
        const result = await window.electronAPI?.sync.run(
          pr.source,
          pr.target,
          pr.diffs,
          config.syncMode
        );
        const pairDone = result?.done ?? pr.diffs.length;
        totalDone += pairDone;
        completedBeforeCurrent += pairDone;
        if (result?.cancelled) {
          wasCancelled = true;
          break;
        }
      }
      setSyncProgress((p) => (p ? { ...p, done: totalDone, total: p.total } : { done: totalDone, total: totalDiffs }));
      setSyncing(false);
      setSyncPaused(false);
      if (wasCancelled) {
        setSyncCancelled(true);
        setStatus(`Sync cancelled after ${totalDone} items`);
      } else {
        setSyncComplete(true);
        setStatus(`Synced ${totalDone} items`);
      }
      setCompareResult(null);
    } catch (e) {
      setStatus(`Sync failed: ${(e as Error).message}`);
      setShowSyncConfirm(false);
      setSyncing(false);
      setSyncComplete(false);
      setSyncCancelled(false);
    } finally {
      unsub?.();
    }
  };

  const handlePauseSync = () => {
    window.electronAPI?.sync.pause();
    setSyncPaused(true);
    setStatus('Sync paused');
  };

  const handleResumeSync = () => {
    window.electronAPI?.sync.resume();
    setSyncPaused(false);
    setStatus('Syncing...');
  };

  const handleCancelSync = () => {
    window.electronAPI?.sync.cancel();
  };

  const handleCloseSyncComplete = () => {
    setShowSyncConfirm(false);
    setSyncComplete(false);
    setSyncCancelled(false);
    setSyncPaused(false);
    setSyncProgress(null);
  };

  const addCount = compareResult?.allDiffs.filter(
    (d) => d.action === 'create' || d.action === 'update'
  ).length ?? 0;
  const deleteCount = compareResult?.allDiffs.filter((d) => d.action === 'delete').length ?? 0;
  const totalBytes =
    compareResult?.allDiffs.reduce(
      (s, d) => s + (d.sourceSize ?? d.targetSize ?? 0),
      0
    ) ?? 0;

  return (
    <div className="h-screen flex flex-col bg-zinc-100 dark:bg-[#1a1a1e]">
      <Toolbar
        syncMode={config.syncMode}
        onSyncModeChange={(syncMode) => setConfig((c) => ({ ...c, syncMode }))}
        onCompare={handleCompare}
        onSync={handleSyncClick}
        onSave={async () => {
          try {
            const p = await window.electronAPI?.settings.save(config);
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
            setCompareResult(null);
            setStatus(`Loaded: ${loaded.name}`);
          } catch (e) {
            setStatus(`Error: ${(e as Error).message}`);
          }
        }}
        onAccounts={() => setShowAccounts(true)}
      />

      <div className="flex-1 flex flex-col min-h-0">
        <FolderPairRows
          pairs={config.folderPairs.length ? config.folderPairs : [{ source: { type: 'local', path: '' }, target: { type: 'local', path: '' } }]}
          accounts={accounts}
          onAdd={handleAddPair}
          onRemoveAt={handleRemovePairAt}
          onUpdatePair={handleUpdatePair}
        />
        <div className="flex-1 flex min-h-0 border-t border-zinc-200 bg-white overflow-hidden">
          <div className="flex-1 min-w-0 flex flex-col min-h-0 border-r border-zinc-200">
            <FileTreePane
              diffs={compareResult?.allDiffs.filter((d) => d.action !== 'delete') ?? []}
              side="left"
              emptyMessage="Select folders and click Compare"
            />
          </div>
          <div className="flex-1 min-w-0 flex flex-col min-h-0">
            <FileTreePane
              diffs={compareResult?.allDiffs ?? []}
              side="right"
              emptyMessage="Select folders and click Compare"
            />
          </div>
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

      {(showSyncConfirm || syncing || syncComplete || syncCancelled) && (
        <SyncConfirmModal
          syncMode={config.syncMode}
          addCount={addCount}
          deleteCount={deleteCount}
          sizeStr={formatSize(totalBytes)}
          onStart={handleSyncConfirm}
          onCancel={() => !syncing && handleCloseSyncComplete()}
          syncing={syncing}
          syncComplete={syncComplete}
          syncCancelled={syncCancelled}
          syncPaused={syncPaused}
          syncProgress={syncProgress ?? undefined}
          onCloseComplete={handleCloseSyncComplete}
          onPause={handlePauseSync}
          onResume={handleResumeSync}
          onCancelSync={handleCancelSync}
        />
      )}
    </div>
  );
}
