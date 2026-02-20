import type { SyncMode } from '../../shared/types';

const SYNC_MODE_LABELS: Record<SyncMode, string> = {
  mirror: 'Mirror →',
  'one-way-lr': 'One-way (Left → Right)',
  'one-way-rl': 'One-way (Right → Left)',
  'two-way': 'Two-way',
};

interface ToolbarProps {
  syncMode: SyncMode;
  onSyncModeChange: (m: SyncMode) => void;
  pairCount: number;
  selectedPairIndex: number;
  onPairSelect: (index: number) => void;
  onAddPair: () => void;
  onRemovePair?: () => void;
  onCompare: () => void;
  onSync: () => void;
  onSave: () => void;
  onLoad: () => void;
  onAccounts: () => void;
}

export default function Toolbar({
  syncMode,
  onSyncModeChange,
  pairCount,
  selectedPairIndex,
  onPairSelect,
  onAddPair,
  onRemovePair,
  onCompare,
  onSync,
  onSave,
  onLoad,
  onAccounts,
}: ToolbarProps) {
  return (
    <header className="h-14 flex items-center px-4 bg-[#f5f5f7] dark:bg-zinc-800/95 border-b border-zinc-200 dark:border-zinc-700 shrink-0">
      {/* Left: Pair selector + Compare */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <select
            value={selectedPairIndex}
            onChange={(e) => onPairSelect(Number(e.target.value))}
            className="px-2 py-1.5 rounded border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-sm"
          >
            {Array.from({ length: Math.max(1, pairCount) }, (_, i) => (
              <option key={i} value={i}>Pair {i + 1}</option>
            ))}
          </select>
          <button
            onClick={onAddPair}
            className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400"
            title="Add folder pair"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          {pairCount > 1 && onRemovePair && (
            <button
              onClick={onRemovePair}
              className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
              title="Remove folder pair"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <button
          onClick={onCompare}
          className="flex items-center gap-2 px-3 py-2 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Compare
        </button>
        <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <input type="checkbox" defaultChecked className="rounded" />
          File time and size
        </label>
      </div>

      {/* Center: Sync button */}
      <div className="flex-1 flex justify-center">
        <button
          onClick={onSync}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Synchronize {SYNC_MODE_LABELS[syncMode]}
        </button>
      </div>

      {/* Right: Sync mode, config, accounts */}
      <div className="flex items-center gap-3">
        <select
          value={syncMode}
          onChange={(e) => onSyncModeChange(e.target.value as SyncMode)}
          className="px-3 py-2 rounded bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200 text-sm"
        >
          {Object.entries(SYNC_MODE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <button onClick={onSave} className="p-2 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400" title="Save Config">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </button>
        <button onClick={onLoad} className="p-2 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400" title="Load Config">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        </button>
        <button onClick={onAccounts} className="p-2 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400" title="Accounts">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </button>
      </div>
    </header>
  );
}
