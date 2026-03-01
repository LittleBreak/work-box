import { useEffect, useCallback } from "react";
import { GitBranch as GitBranchIcon } from "lucide-react";
import { useGitStore } from "./store";
import type { GitBranch } from "../constants";

/**
 * Branch tab component.
 * Displays local branches with the current branch highlighted.
 * Click to checkout a different branch.
 */
export function BranchTab(): React.JSX.Element {
  const branches = useGitStore((s) => s.branches);
  const files = useGitStore((s) => s.files);
  const isLoading = useGitStore((s) => s.isLoading);
  const refreshBranches = useGitStore((s) => s.refreshBranches);
  const checkout = useGitStore((s) => s.checkout);

  const hasUncommittedChanges = files.length > 0;

  useEffect(() => {
    refreshBranches();
  }, [refreshBranches]);

  const handleCheckout = useCallback(
    async (branch: GitBranch) => {
      if (branch.current) return;

      if (hasUncommittedChanges) {
        const confirmed = confirm(
          `当前有未提交的更改。确定要切换到分支 "${branch.name}" 吗？\n未提交的更改可能会丢失。`
        );
        if (!confirmed) return;
      }

      await checkout(branch.name);
    },
    [checkout, hasUncommittedChanges]
  );

  if (isLoading && branches.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-full text-sm text-muted-foreground"
        data-testid="branch-tab"
      >
        加载分支...
      </div>
    );
  }

  if (branches.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-full text-sm text-muted-foreground"
        data-testid="branch-tab"
      >
        没有分支信息
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full" data-testid="branch-tab">
      <div className="p-2">
        {branches.map((branch) => (
          <BranchRow key={branch.name} branch={branch} onCheckout={() => handleCheckout(branch)} />
        ))}
      </div>
    </div>
  );
}

/** Single branch row */
function BranchRow({
  branch,
  onCheckout
}: {
  branch: GitBranch;
  onCheckout: () => void;
}): React.JSX.Element {
  return (
    <div
      className={`flex items-center gap-2 px-2 py-1.5 text-sm rounded-md cursor-pointer select-none ${
        branch.current ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50"
      }`}
      onClick={onCheckout}
      data-testid={`branch-${branch.name}`}
    >
      <GitBranchIcon
        size={14}
        className={branch.current ? "text-primary" : "text-muted-foreground"}
      />
      <span className="truncate">{branch.name}</span>
      {branch.current && <span className="ml-auto text-xs text-primary/70">当前</span>}
      {branch.remote && (
        <span className="ml-auto text-xs text-muted-foreground truncate">{branch.remote}</span>
      )}
    </div>
  );
}
