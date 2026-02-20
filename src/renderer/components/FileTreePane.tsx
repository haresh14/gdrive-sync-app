import type { FileDiff } from '../../shared/types';

interface Props {
  diffs: FileDiff[];
  side: 'left' | 'right';
  emptyMessage?: string;
}

interface TreeNode {
  children: Map<string, TreeNode>;
  diffs: FileDiff[];
}

function buildTree(diffs: FileDiff[]): Map<string, TreeNode> {
  const root: TreeNode = { children: new Map(), diffs: [] };

  for (const d of diffs) {
    const parts = d.path.split(/[/\\]/).filter(Boolean);
    let current: TreeNode = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLeaf = i === parts.length - 1;
      if (!current.children.has(part)) {
        current.children.set(part, { children: new Map(), diffs: [] });
      }
      const node = current.children.get(part)!;
      if (isLeaf) node.diffs.push(d);
      current = node;
    }
  }
  return root.children;
}

function TreeItem({ name, node, depth }: { name: string; node: TreeNode; depth: number }) {
  const hasDiffs = node.diffs.length > 0;
  const action = node.diffs[0]?.action;
  const isFolder = node.children.size > 0;

  const actionBg = action === 'create' ? 'bg-emerald-500/20' : action === 'delete' ? 'bg-red-500/20' : action === 'update' ? 'bg-amber-500/20' : '';

  return (
    <div className="select-none">
      <div
        className={`flex items-center gap-2 py-1 px-2 rounded text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700/50 ${actionBg}`}
        style={{ paddingLeft: depth * 12 + 8 }}
      >
        <span className="text-zinc-500 w-4">{isFolder ? '📁' : '📄'}</span>
        <span className="flex-1 truncate text-zinc-700 dark:text-zinc-300">{name}</span>
        {hasDiffs && (
          <span className={`text-xs shrink-0 ${
            action === 'create' ? 'text-emerald-600' :
            action === 'delete' ? 'text-red-600' :
            'text-amber-600'
          }`}>
            {action === 'create' && '+'}
            {action === 'delete' && '−'}
            {action === 'update' && '↔'}
          </span>
        )}
      </div>
      {Array.from(node.children.entries()).map(([childName, childNode]) => (
        <TreeItem key={childName} name={childName} node={childNode} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function FileTreePane({ diffs, side, emptyMessage = 'Select folders and click Compare' }: Props) {
  const tree = buildTree(diffs);
  const fileCount = diffs.length;
  const totalBytes = diffs.reduce((s, d) => s + (d.sourceSize ?? d.targetSize ?? 0), 0);
  const sizeStr = totalBytes >= 1e6 ? `${(totalBytes / 1e6).toFixed(1)} MB` : totalBytes >= 1e3 ? `${(totalBytes / 1e3).toFixed(1)} KB` : `${totalBytes} B`;

  return (
    <div className="flex flex-col h-full min-h-0 border-r border-zinc-200 dark:border-zinc-700 last:border-r-0">
      <div className="flex-1 overflow-auto p-2">
        {diffs.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-zinc-500 text-sm">
            {emptyMessage}
          </div>
        ) : (
          <div className="text-xs">
            {Array.from(tree.entries()).map(([name, node]) => (
              <TreeItem key={name} name={name} node={node} depth={0} />
            ))}
          </div>
        )}
      </div>
      <div className="px-2 py-1.5 border-t border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500 dark:text-zinc-400">
        {fileCount > 0 ? `${fileCount} files (${sizeStr})` : '—'}
      </div>
    </div>
  );
}
