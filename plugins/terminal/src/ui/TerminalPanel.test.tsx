import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";

// Mock xterm.js modules
vi.mock("@xterm/xterm", () => ({
  Terminal: vi.fn().mockImplementation(() => ({
    loadAddon: vi.fn(),
    open: vi.fn(),
    onData: vi.fn(() => ({ dispose: vi.fn() })),
    write: vi.fn(),
    dispose: vi.fn()
  }))
}));

vi.mock("@xterm/addon-fit", () => ({
  FitAddon: vi.fn().mockImplementation(() => ({
    fit: vi.fn(),
    proposeDimensions: vi.fn(() => ({ cols: 80, rows: 30 }))
  }))
}));

vi.mock("@xterm/xterm/css/xterm.css", () => ({}));

// Mock window.workbox.terminal on the existing window
let sessionCounter = 0;
const mockTerminal = {
  create: vi.fn(() => Promise.resolve(`session-${++sessionCounter}`)),
  close: vi.fn(() => Promise.resolve()),
  write: vi.fn(() => Promise.resolve()),
  resize: vi.fn(() => Promise.resolve()),
  list: vi.fn(() => Promise.resolve([])),
  onData: vi.fn(() => () => {}),
  onExit: vi.fn(() => () => {})
};

Object.defineProperty(window, "workbox", {
  value: { terminal: mockTerminal },
  writable: true,
  configurable: true
});

// Mock ResizeObserver if not available
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  })) as unknown as typeof ResizeObserver;
}

import { TerminalPanel } from "./TerminalPanel";
import { useTerminalStore } from "./store";

describe("TerminalPanel", () => {
  beforeEach(() => {
    sessionCounter = 0;
    useTerminalStore.setState({ tabs: [], activeTabId: null });
    vi.clearAllMocks();
    mockTerminal.create.mockImplementation(() => Promise.resolve(`session-${++sessionCounter}`));
    cleanup();
  });

  it("渲染终端面板容器", () => {
    render(<TerminalPanel />);
    expect(screen.getByTestId("terminal-panel")).toBeInTheDocument();
  });

  it("渲染 Tab 栏和新建按钮", () => {
    render(<TerminalPanel />);
    expect(screen.getByTestId("terminal-tabs")).toBeInTheDocument();
    expect(screen.getByTestId("terminal-new-tab")).toBeInTheDocument();
  });

  it("首次挂载自动创建一个终端 Tab", async () => {
    render(<TerminalPanel />);
    await waitFor(() => {
      expect(mockTerminal.create).toHaveBeenCalledOnce();
    });
    await waitFor(() => {
      expect(useTerminalStore.getState().tabs).toHaveLength(1);
    });
  });

  it("点击新建按钮创建新 Tab", async () => {
    render(<TerminalPanel />);

    // 等待自动创建的第一个 tab
    await waitFor(() => {
      expect(useTerminalStore.getState().tabs).toHaveLength(1);
    });

    // 点击新建按钮
    fireEvent.click(screen.getByTestId("terminal-new-tab"));

    await waitFor(() => {
      expect(useTerminalStore.getState().tabs).toHaveLength(2);
    });
  });

  it("点击 Tab 切换活跃 Tab", async () => {
    render(<TerminalPanel />);

    // 等待第一个 tab
    await waitFor(() => {
      expect(useTerminalStore.getState().tabs).toHaveLength(1);
    });

    // 创建第二个 tab
    fireEvent.click(screen.getByTestId("terminal-new-tab"));
    await waitFor(() => {
      expect(useTerminalStore.getState().tabs).toHaveLength(2);
    });

    const tabs = useTerminalStore.getState().tabs;
    // 点击第一个 tab
    fireEvent.click(screen.getByTestId(`terminal-tab-${tabs[0].id}`));
    expect(useTerminalStore.getState().activeTabId).toBe(tabs[0].id);
  });

  it("点击关闭按钮关闭 Tab", async () => {
    render(<TerminalPanel />);

    await waitFor(() => {
      expect(useTerminalStore.getState().tabs).toHaveLength(1);
    });

    const tab = useTerminalStore.getState().tabs[0];
    fireEvent.click(screen.getByTestId(`terminal-tab-close-${tab.id}`));

    await waitFor(() => {
      expect(useTerminalStore.getState().tabs).toHaveLength(0);
    });
    expect(mockTerminal.close).toHaveBeenCalledWith(tab.sessionId);
  });
});
