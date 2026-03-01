import { useEffect } from "react";
import { useGitStore } from "./store";
import type { GitCommitInfo } from "../constants";

/**
 * History tab component.
 * Displays commit history as a timeline with hash, message, author, and date.
 */
export function HistoryTab(): React.JSX.Element {
  const commits = useGitStore((s) => s.commits);
  const isLoading = useGitStore((s) => s.isLoading);
  const refreshHistory = useGitStore((s) => s.refreshHistory);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  if (isLoading && commits.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-full text-sm text-muted-foreground"
        data-testid="history-tab"
      >
        加载历史...
      </div>
    );
  }

  if (commits.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-full text-sm text-muted-foreground"
        data-testid="history-tab"
      >
        没有提交历史
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full" data-testid="history-tab">
      <div className="p-2">
        {commits.map((commit) => (
          <CommitRow key={commit.hash} commit={commit} />
        ))}
      </div>
    </div>
  );
}

/** Format ISO date to a readable format */
function formatDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "今天";
    if (days === 1) return "昨天";
    if (days < 7) return `${days} 天前`;
    if (days < 30) return `${Math.floor(days / 7)} 周前`;

    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
  } catch {
    return isoDate;
  }
}

/** Single commit row in the timeline */
function CommitRow({ commit }: { commit: GitCommitInfo }): React.JSX.Element {
  return (
    <div
      className="flex items-start gap-3 px-2 py-2 border-b last:border-b-0"
      data-testid={`commit-${commit.shortHash}`}
    >
      {/* Timeline dot */}
      <div className="mt-1.5 shrink-0">
        <div className="w-2 h-2 rounded-full bg-primary" />
      </div>

      {/* Commit details */}
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{commit.message}</p>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
          <span className="font-mono text-primary/70">{commit.shortHash}</span>
          <span>{commit.author}</span>
          <span className="ml-auto">{formatDate(commit.date)}</span>
        </div>
      </div>
    </div>
  );
}
