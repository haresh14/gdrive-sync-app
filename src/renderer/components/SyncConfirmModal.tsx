import type { SyncMode } from '../../shared/types';

const SYNC_MODE_LABELS: Record<SyncMode, string> = {
  mirror: 'Mirror →',
  'one-way-lr': 'One-way (Left → Right)',
  'one-way-rl': 'One-way (Right → Left)',
  'two-way': 'Two-way',
};

interface Props {
  syncMode: SyncMode;
  addCount: number;
  deleteCount: number;
  sizeStr: string;
  onStart: () => void;
  onCancel: () => void;
  syncing?: boolean;
}

export default function SyncConfirmModal({
  syncMode,
  addCount,
  deleteCount,
  sizeStr,
  onStart,
  onCancel,
  syncing = false,
}: Props) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-2xl w-full max-w-md p-6 border border-zinc-200 dark:border-zinc-700">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
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
              {syncing ? 'Syncing...' : 'Start'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
