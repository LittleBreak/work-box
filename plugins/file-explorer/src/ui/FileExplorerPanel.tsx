import { useEffect, useState, useCallback, useRef } from "react";
import { FolderPlus, FilePlus, Pencil, Trash2, Copy, RefreshCw } from "lucide-react";
import { useFileExplorerStore } from "./store";
import type { FileNode } from "./store";
import { FileTree } from "./FileTree";
import { FilePreview } from "./FilePreview";
import { SearchBar } from "./SearchBar";

/**
 * File Explorer 面板主组件。
 * 三区布局：搜索栏 + 文件树（左侧边栏） + 预览面板（右侧）。
 */
export function FileExplorerPanel(): React.JSX.Element {
  const init = useFileExplorerStore((s) => s.init);
  const rootPath = useFileExplorerStore((s) => s.rootPath);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    node: FileNode;
    position: { x: number; y: number };
  } | null>(null);

  // Initialize on mount
  useEffect(() => {
    init();
  }, [init]);

  const handleContextMenu = useCallback((node: FileNode, position: { x: number; y: number }) => {
    setContextMenu({ node, position });
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu) return;
    const handler = (): void => setContextMenu(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [contextMenu]);

  if (!rootPath) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        正在加载文件浏览器...
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col" data-testid="file-explorer-panel">
      {/* Main content: sidebar + preview */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar: search + file tree */}
        <div className="flex w-64 shrink-0 flex-col border-r">
          <SearchBar />
          <div className="flex-1 overflow-y-auto">
            <FileTree onContextMenu={handleContextMenu} />
          </div>
          <SidebarFooter />
        </div>

        {/* Right: preview panel */}
        <div className="flex-1 overflow-hidden">
          <FilePreview />
        </div>
      </div>

      {/* Context menu overlay */}
      {contextMenu && (
        <ContextMenu
          node={contextMenu.node}
          position={contextMenu.position}
          onClose={handleCloseContextMenu}
        />
      )}
    </div>
  );
}

/** Sidebar footer with root path and refresh */
function SidebarFooter(): React.JSX.Element {
  const rootPath = useFileExplorerStore((s) => s.rootPath);
  const refreshDir = useFileExplorerStore((s) => s.refreshDir);

  const rootName = rootPath.split("/").pop() ?? rootPath;

  return (
    <div className="flex items-center justify-between border-t px-2 py-1 text-xs text-muted-foreground">
      <span className="truncate" title={rootPath}>
        {rootName}
      </span>
      <button
        onClick={() => refreshDir(rootPath)}
        className="rounded-sm p-0.5 hover:bg-muted"
        title="刷新"
      >
        <RefreshCw size={12} />
      </button>
    </div>
  );
}

/** Context menu for file/directory operations */
function ContextMenu({
  node,
  position,
  onClose
}: {
  node: FileNode;
  position: { x: number; y: number };
  onClose: () => void;
}): React.JSX.Element {
  const createFile = useFileExplorerStore((s) => s.createFile);
  const createDir = useFileExplorerStore((s) => s.createDir);
  const renameItem = useFileExplorerStore((s) => s.renameItem);
  const deleteItem = useFileExplorerStore((s) => s.deleteItem);
  const menuRef = useRef<HTMLDivElement>(null);

  const parentPath = node.isDirectory
    ? node.path
    : node.path.substring(0, node.path.lastIndexOf("/"));

  const handleNewFile = useCallback(async () => {
    const name = prompt("新文件名：");
    if (!name) return;
    await createFile(`${parentPath}/${name}`);
    onClose();
  }, [parentPath, createFile, onClose]);

  const handleNewDir = useCallback(async () => {
    const name = prompt("新文件夹名：");
    if (!name) return;
    await createDir(`${parentPath}/${name}`);
    onClose();
  }, [parentPath, createDir, onClose]);

  const handleRename = useCallback(async () => {
    const newName = prompt("重命名为：", node.name);
    if (!newName || newName === node.name) return;
    const parent = node.path.substring(0, node.path.lastIndexOf("/"));
    await renameItem(node.path, `${parent}/${newName}`);
    onClose();
  }, [node, renameItem, onClose]);

  const handleDelete = useCallback(async () => {
    const confirmed = confirm(`确定删除 "${node.name}" 吗？`);
    if (!confirmed) return;
    await deleteItem(node.path);
    onClose();
  }, [node, deleteItem, onClose]);

  const handleCopyPath = useCallback(async () => {
    await navigator.clipboard.writeText(node.path);
    onClose();
  }, [node.path, onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[160px] rounded-md border bg-popover p-1 shadow-md"
      style={{ left: position.x, top: position.y }}
      data-testid="context-menu"
    >
      <ContextMenuItem icon={FilePlus} label="新建文件" onClick={handleNewFile} />
      <ContextMenuItem icon={FolderPlus} label="新建文件夹" onClick={handleNewDir} />
      <div className="my-1 h-px bg-border" />
      <ContextMenuItem icon={Pencil} label="重命名" onClick={handleRename} />
      <ContextMenuItem icon={Copy} label="复制路径" onClick={handleCopyPath} />
      <div className="my-1 h-px bg-border" />
      <ContextMenuItem icon={Trash2} label="删除" onClick={handleDelete} destructive />
    </div>
  );
}

/** Single context menu item */
function ContextMenuItem({
  icon: Icon,
  label,
  onClick,
  destructive = false
}: {
  icon: React.ComponentType<{ size: number; className?: string }>;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}): React.JSX.Element {
  return (
    <button
      className={`flex w-full items-center gap-2 rounded-sm px-2 py-1 text-xs ${
        destructive
          ? "text-destructive hover:bg-destructive/10"
          : "hover:bg-accent hover:text-accent-foreground"
      }`}
      onClick={onClick}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}
