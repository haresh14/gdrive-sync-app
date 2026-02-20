import type { SyncPath, GoogleAccount } from '../../shared/types';
import DriveFolderBrowser from './DriveFolderBrowser';
import { useState } from 'react';

interface Props {
  value: SyncPath;
  onChange: (p: SyncPath) => void;
  accounts: GoogleAccount[];
  compact?: boolean;
}

export default function PanePathRow({ value, onChange, accounts, compact = false }: Props) {
  const [showDriveBrowser, setShowDriveBrowser] = useState(false);

  const handleLocalBrowse = async () => {
    const path = await window.electronAPI?.dialog.selectFolder();
    if (path) onChange({ type: 'local', path });
  };

  const handleDriveSelect = (folderId: string, folderName: string) => {
    if (value.type === 'drive') {
      onChange({ type: 'drive', accountId: value.accountId, folderId, folderName });
    }
    setShowDriveBrowser(false);
  };

  const pad = compact ? 'py-1 px-1.5 text-xs' : 'py-1.5 px-2 text-sm';
  const inputPad = compact ? 'py-1 px-2 text-xs' : 'py-1.5 px-2 text-sm';

  return (
    <div className={`flex flex-col ${compact ? 'gap-0.5' : 'gap-1'}`}>
      <span className={`text-zinc-500 ${compact ? 'text-[10px]' : 'text-xs'}`}>Drag &amp; drop</span>
      <div className="flex gap-1 items-center">
        <select
          value={value.type}
          onChange={(e) => {
            const t = e.target.value as 'local' | 'drive';
            if (t === 'local') onChange({ type: 'local', path: '' });
            else onChange({ type: 'drive', accountId: accounts[0]?.id ?? '', folderId: 'root', folderName: 'My Drive' });
          }}
          className={`shrink-0 w-20 rounded border border-zinc-300 bg-white ${pad}`}
        >
          <option value="local">Local</option>
          <option value="drive">Drive</option>
        </select>
        {value.type === 'local' ? (
          <>
            <input
              type="text"
              value={value.type === 'local' ? value.path : ''}
              onChange={(e) => onChange({ type: 'local', path: e.target.value })}
              placeholder="/path/to/folder"
              className={`flex-1 min-w-0 rounded border border-zinc-300 bg-white text-zinc-900 ${inputPad}`}
            />
            <button
              onClick={handleLocalBrowse}
              className={`rounded border border-zinc-300 hover:bg-zinc-100 shrink-0 ${compact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'}`}
            >
              Browse
            </button>
          </>
        ) : (
          <>
            <select
              value={value.type === 'drive' ? value.accountId : ''}
              onChange={(e) => onChange({
                type: 'drive',
                accountId: e.target.value,
                folderId: 'root',
                folderName: 'My Drive',
              })}
              className={`shrink-0 rounded border border-zinc-300 bg-white ${compact ? 'w-32' : 'w-40'} ${pad}`}
            >
              <option value="">Account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.email}</option>
              ))}
            </select>
            <input
              type="text"
              value={value.folderName ?? ''}
              readOnly
              placeholder="Drive folder"
              className={`flex-1 min-w-0 rounded border border-zinc-300 bg-zinc-50 text-zinc-600 ${inputPad}`}
            />
            <button
              onClick={() => value.accountId && setShowDriveBrowser(true)}
              disabled={!value.accountId}
              className={`rounded border border-zinc-300 hover:bg-zinc-100 disabled:opacity-50 shrink-0 ${compact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'}`}
            >
              Browse
            </button>
          </>
        )}
      </div>
      {showDriveBrowser && value.type === 'drive' && value.accountId && (
        <DriveFolderBrowser
          accountId={value.accountId}
          onSelect={handleDriveSelect}
          onClose={() => setShowDriveBrowser(false)}
        />
      )}
    </div>
  );
}
