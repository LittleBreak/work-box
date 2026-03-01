import { useCallback } from "react";

/** Props for CommitInput component */
interface CommitInputProps {
  /** Current commit message */
  message: string;
  /** Called when message text changes */
  onMessageChange: (msg: string) => void;
  /** Called when user submits commit */
  onCommit: () => void;
  /** Whether a commit operation is in progress */
  isLoading: boolean;
  /** Whether there are staged files to commit */
  hasStagedFiles: boolean;
}

/**
 * Commit message input with submit button.
 * Validates that message is non-empty and staged files exist before enabling submit.
 */
export function CommitInput({
  message,
  onMessageChange,
  onCommit,
  isLoading,
  hasStagedFiles
}: CommitInputProps): React.JSX.Element {
  const canCommit = message.trim().length > 0 && hasStagedFiles && !isLoading;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canCommit) {
        e.preventDefault();
        onCommit();
      }
    },
    [canCommit, onCommit]
  );

  return (
    <div className="border-t p-2 space-y-2" data-testid="commit-input">
      <textarea
        className="w-full resize-none rounded-md border bg-background px-2 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        rows={3}
        placeholder="提交信息..."
        value={message}
        onChange={(e) => onMessageChange(e.target.value)}
        onKeyDown={handleKeyDown}
        data-testid="commit-message"
      />
      <button
        className="w-full rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={onCommit}
        disabled={!canCommit}
        data-testid="commit-button"
      >
        {isLoading ? "提交中..." : "提交"}
      </button>
      {!hasStagedFiles && message.trim().length > 0 && (
        <p className="text-xs text-muted-foreground text-center">请先暂存文件再提交</p>
      )}
    </div>
  );
}
