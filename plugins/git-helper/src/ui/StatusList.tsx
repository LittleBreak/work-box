import type { GitFileStatus } from "../constants";

/** Color mapping for file status types */
const STATUS_COLORS: Record<GitFileStatus["status"], string> = {
  modified: "text-yellow-500",
  added: "text-green-500",
  deleted: "text-red-500",
  untracked: "text-gray-400",
  renamed: "text-blue-400",
  copied: "text-blue-400"
};

/** Short label mapping for file status types */
const STATUS_LABELS: Record<GitFileStatus["status"], string> = {
  modified: "M",
  added: "A",
  deleted: "D",
  untracked: "?",
  renamed: "R",
  copied: "C"
};

/** Props for StatusList component */
interface StatusListProps {
  /** List of file statuses to display */
  files: GitFileStatus[];
  /** Currently selected file path */
  selectedPath: string | null;
  /** Called when a file is clicked to view diff */
  onSelectFile: (path: string) => void;
  /** Called to toggle stage/unstage */
  onToggleStage: (path: string, staged: boolean) => void;
}

/**
 * File status list component.
 * Renders git status entries with stage/unstage checkboxes and status indicators.
 */
export function StatusList({
  files,
  selectedPath,
  onSelectFile,
  onToggleStage
}: StatusListProps): React.JSX.Element {
  if (files.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        工作区干净，没有更改
      </div>
    );
  }

  const stagedFiles = files.filter((f) => f.staged);
  const unstagedFiles = files.filter((f) => !f.staged);

  return (
    <div className="flex flex-col" data-testid="status-list">
      {stagedFiles.length > 0 && (
        <FileGroup
          title="已暂存的更改"
          files={stagedFiles}
          selectedPath={selectedPath}
          onSelectFile={onSelectFile}
          onToggleStage={onToggleStage}
        />
      )}
      {unstagedFiles.length > 0 && (
        <FileGroup
          title="未暂存的更改"
          files={unstagedFiles}
          selectedPath={selectedPath}
          onSelectFile={onSelectFile}
          onToggleStage={onToggleStage}
        />
      )}
    </div>
  );
}

/** A group of files under a header */
function FileGroup({
  title,
  files,
  selectedPath,
  onSelectFile,
  onToggleStage
}: {
  title: string;
  files: GitFileStatus[];
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
  onToggleStage: (path: string, staged: boolean) => void;
}): React.JSX.Element {
  return (
    <div className="mb-2">
      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {title} ({files.length})
      </div>
      {files.map((file) => (
        <StatusRow
          key={`${file.path}-${file.staged}`}
          file={file}
          isSelected={selectedPath === file.path}
          onSelect={() => onSelectFile(file.path)}
          onToggleStage={() => onToggleStage(file.path, file.staged)}
        />
      ))}
    </div>
  );
}

/** A single file status row */
function StatusRow({
  file,
  isSelected,
  onSelect,
  onToggleStage
}: {
  file: GitFileStatus;
  isSelected: boolean;
  onSelect: () => void;
  onToggleStage: () => void;
}): React.JSX.Element {
  const fileName = file.path.split("/").pop() ?? file.path;

  return (
    <div
      className={`flex items-center gap-2 px-2 py-1 text-sm cursor-pointer select-none ${
        isSelected ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"
      }`}
      onClick={onSelect}
      data-testid={`status-row-${file.path}`}
    >
      {/* Stage/unstage checkbox */}
      <input
        type="checkbox"
        checked={file.staged}
        onChange={(e) => {
          e.stopPropagation();
          onToggleStage();
        }}
        onClick={(e) => e.stopPropagation()}
        className="shrink-0 accent-primary"
        title={file.staged ? "取消暂存" : "暂存"}
      />

      {/* Status badge */}
      <span
        className={`shrink-0 font-mono text-xs font-bold ${STATUS_COLORS[file.status]}`}
        title={file.status}
      >
        {STATUS_LABELS[file.status]}
      </span>

      {/* File name + path */}
      <span className="truncate" title={file.path}>
        <span className="text-foreground">{fileName}</span>
        {fileName !== file.path && (
          <span className="ml-1 text-muted-foreground text-xs">
            {file.path.substring(0, file.path.length - fileName.length)}
          </span>
        )}
      </span>
    </div>
  );
}
