interface ToolbarProps {
  onCompare: () => void;
  onSync: () => void;
  onSave: () => void;
  onLoad: () => void;
  onAccounts: () => void;
}

export default function Toolbar({
  onCompare,
  onSync,
  onSave,
  onLoad,
  onAccounts,
}: ToolbarProps) {
  return (
    <header className="h-12 flex items-center gap-2 px-4 bg-zinc-800/80 border-b border-zinc-700 shrink-0">
      <button
        onClick={onCompare}
        className="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium"
      >
        Compare
      </button>
      <button
        onClick={onSync}
        className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium"
      >
        Sync
      </button>
      <div className="w-px h-6 bg-zinc-600" />
      <button
        onClick={onSave}
        className="px-3 py-1.5 rounded bg-zinc-600 hover:bg-zinc-500 text-zinc-200 text-sm"
      >
        Save Config
      </button>
      <button
        onClick={onLoad}
        className="px-3 py-1.5 rounded bg-zinc-600 hover:bg-zinc-500 text-zinc-200 text-sm"
      >
        Load Config
      </button>
      <div className="flex-1" />
      <button
        onClick={onAccounts}
        className="px-3 py-1.5 rounded bg-zinc-600 hover:bg-zinc-500 text-zinc-200 text-sm"
      >
        Accounts
      </button>
    </header>
  );
}
