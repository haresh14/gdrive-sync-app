interface Props {
  addCount?: number;
  deleteCount?: number;
  sizeStr?: string;
  message?: string;
}

export default function StatusBar({ addCount = 0, deleteCount = 0, sizeStr = '0 B', message }: Props) {
  return (
    <div className="h-9 flex items-center gap-4 px-4 bg-zinc-100 dark:bg-zinc-800/80 border-t border-zinc-200 dark:border-zinc-700 text-sm shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-zinc-500">Statistics:</span>
        <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
          <span aria-hidden>+</span>
          <span>{addCount}</span>
        </span>
        <span className="flex items-center gap-1.5 text-red-500">
          <span aria-hidden>−</span>
          <span>{deleteCount}</span>
        </span>
        <span className="text-zinc-500">{sizeStr}</span>
      </div>
      <div className="flex-1 truncate text-zinc-500" title={message}>
        {message || 'Ready'}
      </div>
    </div>
  );
}
