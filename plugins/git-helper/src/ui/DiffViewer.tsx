import type { GitFileDiff, GitDiffHunk, GitDiffLine } from "../constants";

/** Props for DiffViewer component */
interface DiffViewerProps {
  /** Diff data for a single file */
  diff: GitFileDiff | null;
}

/**
 * Diff viewer component.
 * Renders unified diff with color-coded additions, removals, and context lines.
 */
export function DiffViewer({ diff }: DiffViewerProps): React.JSX.Element {
  if (!diff) {
    return (
      <div
        className="flex items-center justify-center h-full text-sm text-muted-foreground"
        data-testid="diff-empty"
      >
        选择文件以查看差异
      </div>
    );
  }

  if (diff.hunks.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-full text-sm text-muted-foreground"
        data-testid="diff-no-changes"
      >
        没有差异
      </div>
    );
  }

  return (
    <div className="overflow-auto h-full" data-testid="diff-viewer">
      {/* File path header */}
      <div className="sticky top-0 bg-muted px-3 py-1.5 text-xs font-mono border-b">
        {diff.filePath}
      </div>

      {/* Hunks */}
      <div className="font-mono text-xs leading-5">
        {diff.hunks.map((hunk, hunkIndex) => (
          <DiffHunkView key={hunkIndex} hunk={hunk} />
        ))}
      </div>
    </div>
  );
}

/** Renders a single diff hunk */
function DiffHunkView({ hunk }: { hunk: GitDiffHunk }): React.JSX.Element {
  return (
    <div>
      {/* Hunk header */}
      <div className="bg-blue-500/10 text-blue-400 px-3 py-0.5" data-testid="hunk-header">
        @@ -{hunk.oldStart},{hunk.oldCount} +{hunk.newStart},{hunk.newCount} @@
      </div>

      {/* Diff lines */}
      {hunk.lines.map((line, lineIndex) => (
        <DiffLineView key={lineIndex} line={line} />
      ))}
    </div>
  );
}

/** Renders a single diff line */
function DiffLineView({ line }: { line: GitDiffLine }): React.JSX.Element {
  const bgColor =
    line.type === "add" ? "bg-green-500/10" : line.type === "remove" ? "bg-red-500/10" : "";

  const textColor =
    line.type === "add"
      ? "text-green-400"
      : line.type === "remove"
        ? "text-red-400"
        : "text-muted-foreground";

  const prefix = line.type === "add" ? "+" : line.type === "remove" ? "-" : " ";

  return (
    <div
      className={`px-3 whitespace-pre-wrap ${bgColor} ${textColor}`}
      data-testid={`diff-line-${line.type}`}
    >
      <span className="select-none inline-block w-4">{prefix}</span>
      {line.content}
    </div>
  );
}
