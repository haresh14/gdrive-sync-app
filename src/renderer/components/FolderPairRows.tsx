import type { FolderPair, SyncPath, GoogleAccount } from '../../shared/types';
import PanePathRow from './PanePathRow';

interface Props {
  pairs: FolderPair[];
  accounts: GoogleAccount[];
  onAdd: () => void;
  onRemoveAt: (index: number) => void;
  onUpdatePair: (index: number, source: SyncPath, target: SyncPath) => void;
}

export default function FolderPairRows({
  pairs,
  accounts,
  onAdd,
  onRemoveAt,
  onUpdatePair,
}: Props) {
  const displayPairs = pairs.length > 0 ? pairs : [{ source: { type: 'local' as const, path: '' }, target: { type: 'local' as const, path: '' } }];

  return (
    <div className="flex flex-col border-b border-zinc-200 bg-white shrink-0">
      {/* Add button row */}
      <div className="flex items-start gap-1 px-2 py-1.5 bg-zinc-50/80">
        <div className="w-8 shrink-0 flex justify-center">
          <button
            onClick={onAdd}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-emerald-100 text-emerald-600"
            title="Add folder pair"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto_1fr] gap-2 items-start">
          <div className="min-w-0" />
          <div className="w-8 flex items-center justify-center pt-5">
            <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div className="min-w-0" />
        </div>
      </div>

      {/* Pair rows */}
      {displayPairs.map((pair, i) => (
        <div
          key={i}
          className="flex items-start gap-1 px-2 py-1.5 border-t border-zinc-100 hover:bg-zinc-50/50"
        >
          <div className="w-8 shrink-0 flex items-center gap-0.5 pt-5">
            {displayPairs.length > 1 ? (
              <button
                onClick={(e) => { e.stopPropagation(); onRemoveAt(i); }}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-100 text-red-500"
                title="Remove this pair"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
            ) : (
              <div className="w-6" />
            )}
          </div>
          <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto_1fr] gap-2 items-start">
            <div className="min-w-0">
              <PanePathRow
                value={pair.source}
                onChange={(p) => onUpdatePair(i, p, pair.target)}
                accounts={accounts}
                compact
              />
            </div>
            <div className="w-8 flex items-center justify-center pt-5">
              <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div className="min-w-0">
              <PanePathRow
                value={pair.target}
                onChange={(p) => onUpdatePair(i, pair.source, p)}
                accounts={accounts}
                compact
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
