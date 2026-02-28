import { useFileExplorerStore } from "./store";
import { FileTreeNode } from "./FileTreeNode";
import type { FileNode } from "./store";

/** File tree component props */
interface FileTreeProps {
  /** Called when context menu is triggered on a node */
  onContextMenu: (node: FileNode, position: { x: number; y: number }) => void;
}

/** Recursive file tree component */
export function FileTree({ onContextMenu }: FileTreeProps): React.JSX.Element {
  const rootPath = useFileExplorerStore((s) => s.rootPath);
  const expandedPaths = useFileExplorerStore((s) => s.expandedPaths);
  const selectedPath = useFileExplorerStore((s) => s.selectedPath);
  const treeData = useFileExplorerStore((s) => s.treeData);
  const toggleExpand = useFileExplorerStore((s) => s.toggleExpand);
  const selectFile = useFileExplorerStore((s) => s.selectFile);

  if (!rootPath) {
    return (
      <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
        正在加载...
      </div>
    );
  }

  const rootChildren = treeData[rootPath] ?? [];

  return (
    <div className="overflow-y-auto" data-testid="file-tree">
      {rootChildren.length === 0 ? (
        <div className="p-4 text-sm text-muted-foreground">空目录</div>
      ) : (
        rootChildren.map((node) => (
          <TreeNodeRecursive
            key={node.path}
            node={node}
            depth={0}
            expandedPaths={expandedPaths}
            selectedPath={selectedPath}
            treeData={treeData}
            onToggleExpand={toggleExpand}
            onSelectFile={selectFile}
            onContextMenu={onContextMenu}
          />
        ))
      )}
    </div>
  );
}

/** Recursively render a tree node and its children */
function TreeNodeRecursive({
  node,
  depth,
  expandedPaths,
  selectedPath,
  treeData,
  onToggleExpand,
  onSelectFile,
  onContextMenu
}: {
  node: FileNode;
  depth: number;
  expandedPaths: string[];
  selectedPath: string | null;
  treeData: Record<string, FileNode[]>;
  onToggleExpand: (dirPath: string) => void;
  onSelectFile: (filePath: string) => void;
  onContextMenu: (node: FileNode, position: { x: number; y: number }) => void;
}): React.JSX.Element {
  const isExpanded = expandedPaths.includes(node.path);
  const isSelected = selectedPath === node.path;
  const children = node.isDirectory && isExpanded ? (treeData[node.path] ?? []) : [];

  return (
    <>
      <FileTreeNode
        node={node}
        depth={depth}
        isExpanded={isExpanded}
        isSelected={isSelected}
        onToggleExpand={onToggleExpand}
        onSelectFile={onSelectFile}
        onContextMenu={onContextMenu}
      />
      {children.map((child) => (
        <TreeNodeRecursive
          key={child.path}
          node={child}
          depth={depth + 1}
          expandedPaths={expandedPaths}
          selectedPath={selectedPath}
          treeData={treeData}
          onToggleExpand={onToggleExpand}
          onSelectFile={onSelectFile}
          onContextMenu={onContextMenu}
        />
      ))}
    </>
  );
}
