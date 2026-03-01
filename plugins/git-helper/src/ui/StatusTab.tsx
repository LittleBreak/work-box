import { useEffect } from "react";
import { useGitStore } from "./store";
import { StatusList } from "./StatusList";
import { DiffViewer } from "./DiffViewer";
import { CommitInput } from "./CommitInput";

/**
 * Status tab component.
 * Shows file status list on the left and diff viewer on the right,
 * with a commit input at the bottom of the file list.
 */
export function StatusTab(): React.JSX.Element {
  const files = useGitStore((s) => s.files);
  const selectedFilePath = useGitStore((s) => s.selectedFilePath);
  const fileDiff = useGitStore((s) => s.fileDiff);
  const commitMessage = useGitStore((s) => s.commitMessage);
  const isLoading = useGitStore((s) => s.isLoading);
  const refreshStatus = useGitStore((s) => s.refreshStatus);
  const toggleStage = useGitStore((s) => s.toggleStage);
  const selectFile = useGitStore((s) => s.selectFile);
  const commit = useGitStore((s) => s.commit);
  const setCommitMessage = useGitStore((s) => s.setCommitMessage);

  const hasStagedFiles = files.some((f) => f.staged);

  // Load status on mount
  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  return (
    <div className="flex h-full" data-testid="status-tab">
      {/* Left: file list + commit input */}
      <div className="flex w-72 shrink-0 flex-col border-r">
        <div className="flex-1 overflow-y-auto">
          <StatusList
            files={files}
            selectedPath={selectedFilePath}
            onSelectFile={selectFile}
            onToggleStage={toggleStage}
          />
        </div>
        <CommitInput
          message={commitMessage}
          onMessageChange={setCommitMessage}
          onCommit={commit}
          isLoading={isLoading}
          hasStagedFiles={hasStagedFiles}
        />
      </div>

      {/* Right: diff viewer */}
      <div className="flex-1 overflow-hidden">
        <DiffViewer diff={fileDiff} />
      </div>
    </div>
  );
}
