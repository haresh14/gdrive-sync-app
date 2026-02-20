import { useState } from 'react';
import type { GoogleAccount } from '../../shared/types';

interface Props {
  accounts: GoogleAccount[];
  onClose: () => void;
  onRefresh: () => void;
}

export default function AccountManager({ accounts, onClose, onRefresh }: Props) {
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddAccount = async () => {
    setAdding(true);
    setError(null);
    try {
      const id = `account_${Date.now()}`;
      const result = await window.electronAPI?.accounts.add(id);
      if (result?.success) {
        onRefresh();
      } else {
        setError(result?.error || 'Failed to add account');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (id: string) => {
    await window.electronAPI?.accounts.remove(id);
    onRefresh();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-zinc-800 rounded-xl shadow-xl w-full max-w-md p-6 border border-zinc-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-zinc-200">Google Accounts</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 text-2xl leading-none"
          >
            ×
          </button>
        </div>
        <p className="text-zinc-400 text-sm mb-4">
          Add Google accounts to sync with Drive. You can use different accounts for source and target.
        </p>
        {error && (
          <div className="mb-4 p-3 rounded bg-red-900/30 border border-red-700 text-red-300 text-sm">
            {error}
          </div>
        )}
        <div className="space-y-2 mb-4">
          {accounts.length === 0 ? (
            <p className="text-zinc-500 text-sm">No accounts added yet.</p>
          ) : (
            accounts.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between p-3 rounded bg-zinc-700/50"
              >
                <span className="text-zinc-200 text-sm">{a.email}</span>
                <button
                  onClick={() => handleRemove(a.id)}
                  className="text-red-400 hover:text-red-300 text-xs"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
        <button
          onClick={handleAddAccount}
          disabled={adding}
          className="w-full py-2.5 rounded bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium"
        >
          {adding ? 'Sign in via browser...' : 'Add Google Account'}
        </button>
      </div>
    </div>
  );
}
