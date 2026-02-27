import { useEffect } from "react";
import { useTerminalStore } from "./store";
import { TerminalTabs } from "./TerminalTabs";
import { TerminalInstance } from "./TerminalInstance";

/** 终端面板主组件，管理 Tab 列表和终端实例 */
export function TerminalPanel(): React.JSX.Element {
  const { tabs, activeTabId, createTab, closeTab, setActiveTab } = useTerminalStore();

  // 首次挂载时自动创建一个终端 Tab
  useEffect(() => {
    if (tabs.length === 0) {
      createTab();
    }
  }, []);

  return (
    <div data-testid="terminal-panel" className="flex h-full flex-col">
      <TerminalTabs
        tabs={tabs}
        activeTabId={activeTabId}
        onCreateTab={createTab}
        onSelectTab={setActiveTab}
        onCloseTab={closeTab}
      />
      <div className="relative flex-1">
        {tabs.map((tab) => (
          <TerminalInstance
            key={tab.id}
            sessionId={tab.sessionId}
            isActive={tab.id === activeTabId}
          />
        ))}
        {tabs.length === 0 && (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <button
              onClick={() => createTab()}
              className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
            >
              新建终端
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
