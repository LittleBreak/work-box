import { useState, useCallback } from "react";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  FileCode,
  File
} from "lucide-react";
import type { FileNode } from "./store";

/** Code file extensions for icon display */
const CODE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".c",
  ".cpp",
  ".h",
  ".hpp",
  ".rb",
  ".swift",
  ".kt",
  ".dart"
]);

/** Get appropriate icon for a file node */
function getFileIcon(node: FileNode, isExpanded: boolean): React.JSX.Element {
  if (node.isDirectory) {
    return isExpanded ? (
      <FolderOpen size={16} className="shrink-0 text-yellow-500" />
    ) : (
      <Folder size={16} className="shrink-0 text-yellow-500" />
    );
  }

  const dotIndex = node.name.lastIndexOf(".");
  const ext = dotIndex !== -1 ? node.name.slice(dotIndex).toLowerCase() : "";

  if (CODE_EXTENSIONS.has(ext)) {
    return <FileCode size={16} className="shrink-0 text-blue-400" />;
  }
  if (ext === ".json" || ext === ".md" || ext === ".txt" || ext === ".yml" || ext === ".yaml") {
    return <FileText size={16} className="shrink-0 text-gray-400" />;
  }
  return <File size={16} className="shrink-0 text-gray-400" />;
}

/** File tree node component props */
interface FileTreeNodeProps {
  /** File/directory node data */
  node: FileNode;
  /** Nesting depth (for indentation) */
  depth: number;
  /** Whether this directory is expanded */
  isExpanded: boolean;
  /** Whether this node is currently selected */
  isSelected: boolean;
  /** Called when a directory is expanded/collapsed */
  onToggleExpand: (dirPath: string) => void;
  /** Called when a file is selected */
  onSelectFile: (filePath: string) => void;
  /** Called when context menu is triggered */
  onContextMenu: (node: FileNode, position: { x: number; y: number }) => void;
}

/** Single node in the file tree */
export function FileTreeNode({
  node,
  depth,
  isExpanded,
  isSelected,
  onToggleExpand,
  onSelectFile,
  onContextMenu
}: FileTreeNodeProps): React.JSX.Element {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = useCallback(() => {
    if (node.isDirectory) {
      onToggleExpand(node.path);
    } else {
      onSelectFile(node.path);
    }
  }, [node, onToggleExpand, onSelectFile]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onContextMenu(node, { x: e.clientX, y: e.clientY });
    },
    [node, onContextMenu]
  );

  return (
    <div
      className={`flex cursor-pointer items-center gap-1 px-2 py-0.5 text-sm select-none ${
        isSelected ? "bg-accent text-accent-foreground" : isHovered ? "bg-muted/50" : ""
      }`}
      style={{ paddingLeft: `${depth * 16 + 4}px` }}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`tree-node-${node.name}`}
    >
      {/* Expand/collapse arrow for directories */}
      {node.isDirectory ? (
        <span className="flex shrink-0 items-center justify-center w-4">
          {isExpanded ? (
            <ChevronDown size={14} className="text-muted-foreground" />
          ) : (
            <ChevronRight size={14} className="text-muted-foreground" />
          )}
        </span>
      ) : (
        <span className="w-4 shrink-0" />
      )}

      {/* File/folder icon */}
      {getFileIcon(node, isExpanded)}

      {/* Name */}
      <span className="truncate ml-1">{node.name}</span>
    </div>
  );
}
