import { useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { useGitStore } from "./store";
import type { GitTab } from "./store";
import { StatusTab } from "./StatusTab";
import { BranchTab } from "./BranchTab";
import { HistoryTab } from "./HistoryTab";

/** Tab definition for the Git panel */
interface TabDef {
  id: GitTab;
  label: string;
}

const TABS: TabDef[] = [
  { id: "status", label: "状态" },
  { id: "branches", label: "分支" },
  { id: "history", label: "历史" }
];

/**
 * Git Helper panel main component.
 * Tab-based layout with Status / Branches / History tabs.
 */
export default function GitPanel(): React.JSX.Element {
  const activeTab = useGitStore((s) => s.activeTab);
  const isLoading = useGitStore((s) => s.isLoading);
  const setActiveTab = useGitStore((s) => s.setActiveTab);
  const refreshStatus = useGitStore((s) => s.refreshStatus);
  const refreshBranches = useGitStore((s) => s.refreshBranches);
  const refreshHistory = useGitStore((s) => s.refreshHistory);

  const handleTabChange = useCallback(
    (tab: GitTab) => {
      setActiveTab(tab);
    },
    [setActiveTab]
  );

  const handleRefresh = useCallback(() => {
    switch (activeTab) {
      case "status":
        refreshStatus();
        break;
      case "branches":
        refreshBranches();
        break;
      case "history":
        refreshHistory();
        break;
    }
  }, [activeTab, refreshStatus, refreshBranches, refreshHistory]);

  return (
    <div className="flex h-full flex-col" data-testid="git-panel">
      {/* Tab bar */}
      <div className="flex items-center border-b px-2">
        <div className="flex flex-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => handleTabChange(tab.id)}
              data-testid={`tab-${tab.id}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          className="rounded-sm p-1 hover:bg-muted disabled:opacity-50"
          onClick={handleRefresh}
          disabled={isLoading}
          title="刷新"
          data-testid="refresh-button"
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "status" && <StatusTab />}
        {activeTab === "branches" && <BranchTab />}
        {activeTab === "history" && <HistoryTab />}
      </div>
    </div>
  );
}
