import PathPicker from './PathPicker';
import type { FolderPair, SyncPath, GoogleAccount } from '../../shared/types';

interface Props {
  pairs: FolderPair[];
  accounts: GoogleAccount[];
  onAdd: () => void;
  onUpdate: (index: number, side: 'source' | 'target', path: SyncPath) => void;
  onRemove: (index: number) => void;
}

export default function FolderPairs({ pairs, accounts, onAdd, onUpdate, onRemove }: Props) {
  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-auto p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium text-zinc-300">Folder pairs</h3>
        <button
          onClick={onAdd}
          className="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white text-sm"
        >
          + Add pair
        </button>
      </div>

      {pairs.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
          No folder pairs. Click &quot;Add pair&quot; to add a source and target.
        </div>
      ) : (
        <div className="space-y-6">
          {pairs.map((pair, i) => (
            <div
              key={i}
              className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700"
            >
              <div className="flex justify-between items-center mb-3">
                <span className="text-zinc-500 text-xs">Pair {i + 1}</span>
                <button
                  onClick={() => onRemove(i)}
                  className="text-zinc-500 hover:text-red-400 text-xs"
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <PathPicker
                  label="Source"
                  value={pair.source}
                  onChange={(p) => onUpdate(i, 'source', p)}
                  accounts={accounts}
                />
                <PathPicker
                  label="Target"
                  value={pair.target}
                  onChange={(p) => onUpdate(i, 'target', p)}
                  accounts={accounts}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
