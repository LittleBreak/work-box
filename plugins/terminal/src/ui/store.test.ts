import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock window.workbox.terminal
const mockTerminal = {
  create: vi.fn(() => Promise.resolve("session-1")),
  close: vi.fn(() => Promise.resolve()),
  write: vi.fn(() => Promise.resolve()),
  resize: vi.fn(() => Promise.resolve()),
  list: vi.fn(() => Promise.resolve([])),
  onData: vi.fn(() => () => {}),
  onExit: vi.fn(() => () => {})
};
vi.stubGlobal("window", { workbox: { terminal: mockTerminal } });

import { useTerminalStore } from "./store";

describe("useTerminalStore", () => {
  beforeEach(() => {
    useTerminalStore.setState({
      tabs: [],
      activeTabId: null
    });
    vi.clearAllMocks();
    mockTerminal.create.mockResolvedValue("session-1");
  });

  // 正常路径：初始状态
  it("初始状态包含空 tab 列表和无活跃 tab", () => {
    const state = useTerminalStore.getState();
    expect(state.tabs).toEqual([]);
    expect(state.activeTabId).toBeNull();
  });

  // 正常路径：创建 tab
  it("createTab 创建新 tab 并设为活跃", async () => {
    const store = useTerminalStore.getState();
    await store.createTab();

    const state = useTerminalStore.getState();
    expect(state.tabs).toHaveLength(1);
    expect(state.tabs[0].sessionId).toBe("session-1");
    expect(state.tabs[0].title).toBe("Terminal 1");
    expect(state.activeTabId).toBe(state.tabs[0].id);
  });

  // 正常路径：创建 tab 调用 IPC
  it("createTab 调用 window.workbox.terminal.create", async () => {
    const store = useTerminalStore.getState();
    await store.createTab();
    expect(mockTerminal.create).toHaveBeenCalledOnce();
  });

  // 正常路径：创建多个 tab 标题递增
  it("创建多个 tab 标题递增（Terminal 1, Terminal 2）", async () => {
    mockTerminal.create.mockResolvedValueOnce("session-1").mockResolvedValueOnce("session-2");

    const store = useTerminalStore.getState();
    await store.createTab();
    await store.createTab();

    const state = useTerminalStore.getState();
    expect(state.tabs).toHaveLength(2);
    expect(state.tabs[0].title).toBe("Terminal 1");
    expect(state.tabs[1].title).toBe("Terminal 2");
  });

  // 正常路径：关闭 tab
  it("closeTab 关闭指定 tab 并调用 IPC close", async () => {
    mockTerminal.create.mockResolvedValue("session-1");
    const store = useTerminalStore.getState();
    await store.createTab();

    const tabId = useTerminalStore.getState().tabs[0].id;
    await store.closeTab(tabId);

    const state = useTerminalStore.getState();
    expect(state.tabs).toHaveLength(0);
    expect(mockTerminal.close).toHaveBeenCalledWith("session-1");
  });

  // 正常路径：关闭活跃 tab 后切换到其他 tab
  it("关闭活跃 tab 后自动切换到相邻 tab", async () => {
    mockTerminal.create.mockResolvedValueOnce("session-1").mockResolvedValueOnce("session-2");

    const store = useTerminalStore.getState();
    await store.createTab();
    await store.createTab();

    const tabs = useTerminalStore.getState().tabs;
    // 第二个 tab 是活跃的
    expect(useTerminalStore.getState().activeTabId).toBe(tabs[1].id);

    // 关闭第二个 tab
    await store.closeTab(tabs[1].id);

    const state = useTerminalStore.getState();
    expect(state.tabs).toHaveLength(1);
    expect(state.activeTabId).toBe(tabs[0].id);
  });

  // 正常路径：关闭最后一个 tab
  it("关闭最后一个 tab 后 activeTabId 为 null", async () => {
    const store = useTerminalStore.getState();
    await store.createTab();

    const tabId = useTerminalStore.getState().tabs[0].id;
    await store.closeTab(tabId);

    expect(useTerminalStore.getState().activeTabId).toBeNull();
  });

  // 正常路径：切换 tab
  it("setActiveTab 切换活跃 tab", async () => {
    mockTerminal.create.mockResolvedValueOnce("session-1").mockResolvedValueOnce("session-2");

    const store = useTerminalStore.getState();
    await store.createTab();
    await store.createTab();

    const tabs = useTerminalStore.getState().tabs;
    store.setActiveTab(tabs[0].id);
    expect(useTerminalStore.getState().activeTabId).toBe(tabs[0].id);
  });

  // 正常路径：更新 tab 标题
  it("updateTabTitle 更新指定 tab 的标题", async () => {
    const store = useTerminalStore.getState();
    await store.createTab();

    const tabId = useTerminalStore.getState().tabs[0].id;
    store.updateTabTitle(tabId, "My Terminal");

    expect(useTerminalStore.getState().tabs[0].title).toBe("My Terminal");
  });

  // 边界条件：关闭不存在的 tab
  it("关闭不存在的 tab 不影响状态", async () => {
    const store = useTerminalStore.getState();
    await store.createTab();

    const tabsBefore = useTerminalStore.getState().tabs;
    await store.closeTab("nonexistent-tab");

    expect(useTerminalStore.getState().tabs).toEqual(tabsBefore);
    expect(mockTerminal.close).not.toHaveBeenCalled();
  });

  // 边界条件：更新不存在的 tab 标题
  it("更新不存在的 tab 标题不影响状态", async () => {
    const store = useTerminalStore.getState();
    await store.createTab();

    const tabsBefore = useTerminalStore.getState().tabs;
    store.updateTabTitle("nonexistent-tab", "New Title");

    expect(useTerminalStore.getState().tabs).toEqual(tabsBefore);
  });

  // 边界条件：关闭非活跃 tab 不改变 activeTabId
  it("关闭非活跃 tab 不影响 activeTabId", async () => {
    mockTerminal.create.mockResolvedValueOnce("session-1").mockResolvedValueOnce("session-2");

    const store = useTerminalStore.getState();
    await store.createTab();
    await store.createTab();

    const tabs = useTerminalStore.getState().tabs;
    // 活跃的是第二个 tab
    expect(useTerminalStore.getState().activeTabId).toBe(tabs[1].id);

    // 关闭第一个 tab（非活跃）
    await store.closeTab(tabs[0].id);

    expect(useTerminalStore.getState().activeTabId).toBe(tabs[1].id);
  });
});
