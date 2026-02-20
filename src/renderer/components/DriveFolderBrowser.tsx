import { useState, useEffect } from 'react';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  modifiedTime?: string;
}

interface Breadcrumb {
  id: string;
  name: string;
}

interface Props {
  accountId: string;
  onSelect: (folderId: string, folderName: string) => void;
  onClose: () => void;
}

export default function DriveFolderBrowser({
  accountId,
  onSelect,
  onClose,
}: Props) {
  const [breadcrumb, setBreadcrumb] = useState<Breadcrumb[]>([
    { id: 'root', name: 'My Drive' },
  ]);
  const [items, setItems] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentFolderId = breadcrumb[breadcrumb.length - 1]?.id ?? 'root';

  useEffect(() => {
    if (!accountId) return;
    setLoading(true);
    setError(null);
    window.electronAPI?.drive
      .listFiles(accountId, currentFolderId === 'My Drive' ? 'root' : currentFolderId)
      .then((files) => {
        // Only show folders
        setItems(
          (files || []).filter(
            (f) =>
              f.mimeType === 'application/vnd.google-apps.folder' ||
              f.mimeType === 'application/vnd.google-apps.shortcut'
          )
        );
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [accountId, currentFolderId]);

  const handleNavigate = (id: string, name: string) => {
    setBreadcrumb((prev) => [...prev, { id, name }]);
  };

  const handleBreadcrumbClick = (index: number) => {
    setBreadcrumb((prev) => prev.slice(0, index + 1));
  };

  const displayFolderId = (id: string) =>
    id === 'root' ? 'root' : id;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-zinc-800 rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col border border-zinc-700">
        <div className="flex justify-between items-center p-4 border-b border-zinc-700">
          <h2 className="text-lg font-semibold text-zinc-200">
            Browse Google Drive
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 text-2xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="p-2 border-b border-zinc-700 flex items-center gap-1 flex-wrap text-sm">
          {breadcrumb.map((b, i) => (
            <span key={b.id}>
              <button
                onClick={() => handleBreadcrumbClick(i)}
                className="text-amber-500 hover:text-amber-400"
              >
                {b.name}
              </button>
              {i < breadcrumb.length - 1 && (
                <span className="text-zinc-500 mx-1">/</span>
              )}
            </span>
          ))}
        </div>
        <div className="flex-1 overflow-auto p-4 min-h-[200px]">
          {error && (
            <div className="text-red-400 text-sm mb-2">{error}</div>
          )}
          {loading ? (
            <div className="text-zinc-400 text-sm">Loading...</div>
          ) : (
            <div className="space-y-1">
              {breadcrumb.length > 1 && (
                <button
                  onClick={() => handleBreadcrumbClick(breadcrumb.length - 2)}
                  className="w-full text-left px-3 py-2 rounded hover:bg-zinc-700 text-zinc-300 text-sm flex items-center gap-2"
                >
                  <span>📁</span> ..
                </button>
              )}
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id, item.name)}
                  className="w-full text-left px-3 py-2 rounded hover:bg-zinc-700 text-zinc-200 text-sm flex items-center gap-2"
                >
                  <span>📁</span> {item.name}
                </button>
              ))}
              {items.length === 0 && breadcrumb.length <= 1 && !loading && (
                <div className="text-zinc-500 text-sm">No subfolders</div>
              )}
            </div>
          )}
        </div>
        <div className="p-4 border-t border-zinc-700 flex gap-2">
          <button
            onClick={() =>
              onSelect(displayFolderId(currentFolderId), breadcrumb[breadcrumb.length - 1]?.name ?? 'My Drive')
            }
            className="flex-1 py-2 rounded bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium"
          >
            Select this folder
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-zinc-600 hover:bg-zinc-500 text-zinc-200 text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
