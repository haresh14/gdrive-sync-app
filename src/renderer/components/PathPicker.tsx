import { useState } from 'react';
import type { SyncPath, GoogleAccount } from '../../shared/types';

interface Props {
  value: SyncPath;
  onChange: (p: SyncPath) => void;
  accounts: GoogleAccount[];
  label: string;
}

export default function PathPicker({ value, onChange, accounts, label }: Props) {
  const [type, setType] = useState<'local' | 'drive'>(value.type);

  const handleLocalBrowse = async () => {
    const path = await window.electronAPI?.dialog.selectFolder();
    if (path) onChange({ type: 'local', path });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-zinc-400 text-xs w-12">{label}</span>
        <select
          value={type}
          onChange={(e) => {
            const t = e.target.value as 'local' | 'drive';
            setType(t);
            if (t === 'local') onChange({ type: 'local', path: '' });
            else onChange({ type: 'drive', accountId: '', folderId: 'root', folderName: 'My Drive' });
          }}
          className="px-2 py-1 rounded bg-zinc-800 border border-zinc-600 text-zinc-200 text-xs"
        >
          <option value="local">Local</option>
          <option value="drive">Google Drive</option>
        </select>
      </div>

      {type === 'local' ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={value.type === 'local' ? value.path : ''}
            onChange={(e) => onChange({ type: 'local', path: e.target.value })}
            placeholder="/path/to/folder"
            className="flex-1 px-3 py-2 rounded bg-zinc-800 border border-zinc-600 text-zinc-200 text-sm placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <button
            onClick={handleLocalBrowse}
            className="px-3 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-sm"
          >
            Browse
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <select
            value={value.type === 'drive' ? value.accountId : ''}
            onChange={(e) => {
              const id = e.target.value;
              onChange({
                type: 'drive',
                accountId: id,
                folderId: 'root',
                folderName: 'My Drive',
              });
            }}
            className="flex-1 px-3 py-2 rounded bg-zinc-800 border border-zinc-600 text-zinc-200 text-sm"
          >
            <option value="">Select account</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.email}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={value.type === 'drive' ? value.folderName ?? '' : ''}
            placeholder="Drive folder"
            readOnly
            className="flex-1 px-3 py-2 rounded bg-zinc-800/50 border border-zinc-600 text-zinc-400 text-sm cursor-not-allowed"
          />
        </div>
      )}
    </div>
  );
}
