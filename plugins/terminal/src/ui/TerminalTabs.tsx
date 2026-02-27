import type { TerminalTab } from "./store";

/** TerminalTabs 组件属性 */
interface TerminalTabsProps {
  /** Tab 列表 */
  tabs: TerminalTab[];
  /** 当前活跃 Tab ID */
  activeTabId: string | null;
  /** 创建新 Tab */
  onCreateTab: () => void;
  /** 切换 Tab */
  onSelectTab: (tabId: string) => void;
  /** 关闭 Tab */
  onCloseTab: (tabId: string) => void;
}

/** 终端 Tab 栏组件 */
export function TerminalTabs({
  tabs,
  activeTabId,
  onCreateTab,
  onSelectTab,
  onCloseTab
}: TerminalTabsProps): React.JSX.Element {
  return (
    <div data-testid="terminal-tabs" className="flex items-center border-b bg-muted/30">
      <div className="flex flex-1 overflow-x-auto">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            data-testid={`terminal-tab-${tab.id}`}
            onClick={() => onSelectTab(tab.id)}
            className={`flex cursor-pointer items-center gap-1 border-r px-3 py-1.5 text-xs ${
              tab.id === activeTabId
                ? "bg-background text-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <span className="truncate max-w-[120px]">{tab.title}</span>
            <button
              data-testid={`terminal-tab-close-${tab.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(tab.id);
              }}
              className="ml-1 rounded-sm p-0.5 text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
      <button
        data-testid="terminal-new-tab"
        onClick={onCreateTab}
        className="px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        title="新建终端"
      >
        +
      </button>
    </div>
  );
}
