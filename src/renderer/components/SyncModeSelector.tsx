import type { SyncMode } from '../../../shared/types';

const MODES: { value: SyncMode; label: string }[] = [
  { value: 'mirror', label: 'Mirror' },
  { value: 'one-way-lr', label: 'One-way (Left → Right)' },
  { value: 'one-way-rl', label: 'One-way (Right → Left)' },
  { value: 'two-way', label: 'Two-way' },
];

interface Props {
  value: SyncMode;
  onChange: (v: SyncMode) => void;
}

export default function SyncModeSelector({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-3 shrink-0">
      <span className="text-zinc-400 text-sm">Sync mode:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SyncMode)}
        className="px-3 py-1.5 rounded bg-zinc-800 border border-zinc-600 text-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
      >
        {MODES.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
    </div>
  );
}
