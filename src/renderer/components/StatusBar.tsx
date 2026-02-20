interface Props {
  message: string;
}

export default function StatusBar({ message }: Props) {
  return (
    <div className="h-8 flex items-center px-4 bg-zinc-800/60 border-t border-zinc-700 text-zinc-400 text-sm shrink-0">
      {message || 'Ready'}
    </div>
  );
}
