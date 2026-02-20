import type { SyncPath, GoogleAccount } from '../../shared/types';
import DriveFolderBrowser from './DriveFolderBrowser';
import { useState } from 'react';

interface Props {
  value: SyncPath;
  onChange: (p: SyncPath) => void;
  accounts: GoogleAccount[];
}

export default function PanePathRow({ value, onChange, accounts }: Props) {
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

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-zinc-500 dark:text-zinc-400">Drag &amp; drop</span>
      <div className="flex gap-1 items-center">
        <select
          value={value.type}
          onChange={(e) => {
            const t = e.target.value as 'local' | 'drive';
            if (t === 'local') onChange({ type: 'local', path: '' });
            else onChange({ type: 'drive', accountId: accounts[0]?.id ?? '', folderId: 'root', folderName: 'My Drive' });
          }}
          className="shrink-0 w-24 px-2 py-1.5 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-sm"
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
              className="flex-1 min-w-0 px-2 py-1.5 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-200 text-sm"
            />
            <button
              onClick={handleLocalBrowse}
              className="px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-sm shrink-0"
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
              className="shrink-0 w-40 px-2 py-1.5 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-sm"
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
              className="flex-1 min-w-0 px-2 py-1.5 rounded border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 text-sm"
            />
            <button
              onClick={() => value.accountId && setShowDriveBrowser(true)}
              disabled={!value.accountId}
              className="px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-50 text-sm shrink-0"
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
