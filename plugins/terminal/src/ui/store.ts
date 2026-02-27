import { create } from "zustand";

/** Terminal Tab 数据 */
export interface TerminalTab {
  /** Tab 唯一标识 */
  id: string;
  /** 对应的 PTY session ID */
  sessionId: string;
  /** 显示标题 */
  title: string;
}

/** Terminal UI 状态 */
interface TerminalState {
  tabs: TerminalTab[];
  activeTabId: string | null;

  /** 创建新终端 Tab */
  createTab: () => Promise<void>;
  /** 关闭指定 Tab */
  closeTab: (tabId: string) => Promise<void>;
  /** 切换活跃 Tab */
  setActiveTab: (tabId: string) => void;
  /** 更新 Tab 标题 */
  updateTabTitle: (tabId: string, title: string) => void;
}

/** Terminal UI Zustand Store */
export const useTerminalStore = create<TerminalState>((set, get) => ({
  tabs: [],
  activeTabId: null,

  async createTab() {
    const sessionId = await window.workbox.terminal.create();
    const tabId = crypto.randomUUID();
    const tabNumber = get().tabs.length + 1;

    set((state) => ({
      tabs: [...state.tabs, { id: tabId, sessionId, title: `Terminal ${tabNumber}` }],
      activeTabId: tabId
    }));
  },

  async closeTab(tabId) {
    const tab = get().tabs.find((t) => t.id === tabId);
    if (!tab) return;

    await window.workbox.terminal.close(tab.sessionId);

    set((state) => {
      const remaining = state.tabs.filter((t) => t.id !== tabId);
      let nextActiveId = state.activeTabId;

      if (state.activeTabId === tabId) {
        const closedIndex = state.tabs.findIndex((t) => t.id === tabId);
        if (remaining.length === 0) {
          nextActiveId = null;
        } else if (closedIndex >= remaining.length) {
          nextActiveId = remaining[remaining.length - 1].id;
        } else {
          nextActiveId = remaining[closedIndex].id;
        }
      }

      return { tabs: remaining, activeTabId: nextActiveId };
    });
  },

  setActiveTab(tabId) {
    set({ activeTabId: tabId });
  },

  updateTabTitle(tabId, title) {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, title } : t))
    }));
  }
}));
