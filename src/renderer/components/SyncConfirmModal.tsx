import type { SyncMode } from '../../shared/types';

const SYNC_MODE_LABELS: Record<SyncMode, string> = {
  mirror: 'Mirror →',
  'one-way-lr': 'One-way (Left → Right)',
  'one-way-rl': 'One-way (Right → Left)',
  'two-way': 'Two-way',
};

interface SyncProgress {
  done: number;
  total: number;
  filePath?: string;
}

interface Props {
  syncMode: SyncMode;
  addCount: number;
  deleteCount: number;
  sizeStr: string;
  onStart: () => void;
  onCancel: () => void;
  syncing?: boolean;
  syncComplete?: boolean;
  syncCancelled?: boolean;
  syncPaused?: boolean;
  syncProgress?: SyncProgress;
  onCloseComplete?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onCancelSync?: () => void;
}

function truncatePath(p: string, maxLen = 50): string {
  if (p.length <= maxLen) return p;
  return '...' + p.slice(-maxLen + 3);
}

export default function SyncConfirmModal({
  syncMode,
  addCount,
  deleteCount,
  sizeStr,
  onStart,
  onCancel,
  syncing = false,
  syncComplete = false,
  syncCancelled = false,
  syncPaused = false,
  syncProgress,
  onCloseComplete,
  onPause,
  onResume,
  onCancelSync,
}: Props) {
  const showProgress = syncing || syncComplete || syncCancelled;
  const total = syncProgress?.total ?? 0;
  const done = syncProgress?.done ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-2xl w-full max-w-md p-6 border border-zinc-200 dark:border-zinc-700">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>

          {syncCancelled ? (
            <>
              <h2 className="text-xl font-semibold text-zinc-900">
                Sync cancelled
              </h2>
              <p className="text-sm text-zinc-600">
                {done} of {total} files synced before cancellation
              </p>
              {onCloseComplete && (
                <button
                  onClick={onCloseComplete}
                  className="w-full py-2.5 rounded-lg bg-zinc-600 hover:bg-zinc-500 text-white font-medium text-sm"
                >
                  Close
                </button>
              )}
            </>
          ) : syncComplete ? (
            <>
              <h2 className="text-xl font-semibold text-zinc-900">
                Sync complete
              </h2>
              <p className="text-sm text-zinc-600">
                {done} of {total} files synced
              </p>
              {onCloseComplete && (
                <button
                  onClick={onCloseComplete}
                  className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm"
                >
                  Close
                </button>
              )}
            </>
          ) : showProgress ? (
            <>
              <h2 className="text-xl font-semibold text-zinc-900">
                {syncPaused ? 'Sync paused' : 'Syncing...'}
              </h2>
              <div className="w-full space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600">
                    {done} of {total} files
                  </span>
                  <span className="font-medium text-zinc-900">
                    {pct}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-zinc-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${syncPaused ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {syncProgress?.filePath && (
                  <p className="text-xs text-zinc-500 truncate" title={syncProgress.filePath}>
                    {truncatePath(syncProgress.filePath)}
                  </p>
                )}
              </div>
              <div className="flex gap-3 w-full pt-2">
                {syncPaused ? (
                  <button
                    onClick={onResume}
                    className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm"
                  >
                    Resume
                  </button>
                ) : (
                  <button
                    onClick={onPause}
                    className="flex-1 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white font-medium text-sm"
                  >
                    Pause
                  </button>
                )}
                <button
                  onClick={onCancelSync}
                  className="flex-1 py-2.5 rounded-lg border border-red-300 hover:bg-red-50 text-red-600 font-medium text-sm"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                Start synchronization now?
              </h2>
              <div className="w-full space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">Variant:</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-200">{SYNC_MODE_LABELS[syncMode]}</span>
                </div>
                <div className="flex items-center gap-4 py-2 border-t border-zinc-200 dark:border-zinc-700">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500">+</span>
                    <span className="text-zinc-700 dark:text-zinc-300">{addCount}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-red-500">−</span>
                    <span className="text-zinc-700 dark:text-zinc-300">{deleteCount}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500">{sizeStr}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 w-full pt-2">
                <button
                  onClick={onCancel}
                  disabled={syncing}
                  className="flex-1 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={onStart}
                  disabled={syncing}
                  className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-sm"
                >
                  Start
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
