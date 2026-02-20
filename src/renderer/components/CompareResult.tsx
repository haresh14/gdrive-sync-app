import type { FileDiff } from '../../shared/types';

interface Props {
  diffs: FileDiff[];
  sourceCount: number;
  targetCount: number;
  onSync: () => void;
  syncing?: boolean;
  onClose: () => void;
}

export default function CompareResult({
  diffs,
  sourceCount,
  targetCount,
  onSync,
  onClose,
  syncing = false,
}: Props) {
  const actionColor = (action: string) => {
    if (action === 'create') return 'text-emerald-400';
    if (action === 'update') return 'text-amber-400';
    if (action === 'delete') return 'text-red-400';
    return 'text-zinc-400';
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-zinc-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-zinc-700">
        <div className="flex justify-between items-center p-4 border-b border-zinc-700">
          <h2 className="text-lg font-semibold text-zinc-200">Compare Result</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 text-2xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="p-4 border-b border-zinc-700 text-sm text-zinc-400">
          Source: {sourceCount} files · Target: {targetCount} files ·{' '}
          <span className="text-amber-400">{diffs.length} changes</span>
        </div>
        <div className="flex-1 overflow-auto p-4 min-h-[200px]">
          {diffs.length === 0 ? (
            <div className="text-zinc-500 text-sm">No differences found.</div>
          ) : (
            <div className="space-y-1">
              {diffs.map((d, i) => (
                <div
                  key={`${d.path}-${i}`}
                  className="flex items-center gap-2 px-2 py-1 rounded hover:bg-zinc-700/50 text-sm"
                >
                  <span className={`w-16 shrink-0 ${actionColor(d.action)}`}>
                    {d.action}
                  </span>
                  <span className="text-zinc-300 truncate">{d.path}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-4 border-t border-zinc-700 flex gap-2">
          <button
            onClick={onSync}
            disabled={diffs.length === 0 || syncing}
            className="flex-1 py-2 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium"
          >
            {syncing ? 'Syncing...' : `Sync (${diffs.length} items)`}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-zinc-600 hover:bg-zinc-500 text-zinc-200 text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
