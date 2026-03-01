import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppLayout } from "./AppLayout";
import { useAppStore, initialAppState } from "../../stores/app.store";
import { usePluginStore } from "../../stores/plugin.store";

// Mock plugin panel components to avoid importing real implementations
vi.mock("../../features/plugins/plugin-panels", () => ({
  PLUGIN_PANELS: {},
  getPluginPanel: vi.fn()
}));

import { getPluginPanel } from "../../features/plugins/plugin-panels";
const mockGetPluginPanel = vi.mocked(getPluginPanel);

describe("AppLayout", () => {
  beforeEach(() => {
    useAppStore.setState(initialAppState);
    usePluginStore.setState({ plugins: [], loading: false, selectedPluginId: null });
    mockGetPluginPanel.mockReturnValue(undefined);
    // SettingsView 需要 window.workbox.settings; Sidebar needs plugin.list
    Object.defineProperty(window, "workbox", {
      value: {
        settings: {
          get: vi.fn().mockResolvedValue({
            theme: "dark",
            language: "zh",
            aiProvider: "openai",
            aiApiKey: "",
            aiBaseUrl: "https://api.openai.com/v1",
            aiModel: "gpt-4o",
            aiTemperature: 0.7,
            pluginDir: "~/.workbox/plugins"
          }),
          update: vi.fn().mockResolvedValue(undefined),
          reset: vi.fn().mockResolvedValue(undefined)
        },
        plugin: {
          list: vi.fn().mockResolvedValue([]),
          enable: vi.fn().mockResolvedValue(undefined),
          disable: vi.fn().mockResolvedValue(undefined)
        }
      },
      writable: true,
      configurable: true
    });
  });

  // 正常路径
  it("渲染侧边栏和内容区域", () => {
    render(<AppLayout />);
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  // 页面切换：根据 currentPage 渲染对应组件
  it("默认渲染 Home 页面", () => {
    render(<AppLayout />);
    expect(screen.getByTestId("page-home")).toBeInTheDocument();
  });

  it("currentPage 为 chat 时渲染 ChatView", () => {
    useAppStore.setState({ currentPage: "chat" });
    render(<AppLayout />);
    expect(screen.getByTestId("page-chat")).toBeInTheDocument();
  });

  it("currentPage 为 plugins 时渲染 PluginListView", () => {
    useAppStore.setState({ currentPage: "plugins" });
    render(<AppLayout />);
    expect(screen.getByTestId("page-plugins")).toBeInTheDocument();
  });

  it("currentPage 为 settings 时渲染 SettingsView", () => {
    useAppStore.setState({ currentPage: "settings" });
    render(<AppLayout />);
    expect(screen.getByTestId("page-settings")).toBeInTheDocument();
  });

  // ---- 插件页面路由测试 ----

  it("插件页面渲染对应的插件组件", () => {
    function MockTerminal(): React.JSX.Element {
      return <div data-testid="mock-terminal">Terminal</div>;
    }
    mockGetPluginPanel.mockReturnValue({
      component: MockTerminal,
      icon: () => null
    });

    useAppStore.setState({ currentPage: "plugin:@workbox/plugin-terminal" });
    render(<AppLayout />);
    expect(screen.getByTestId("mock-terminal")).toBeInTheDocument();
  });

  it("未注册的插件页面 fallback 到 HomeView", () => {
    mockGetPluginPanel.mockReturnValue(undefined);
    useAppStore.setState({ currentPage: "plugin:unknown-plugin" });
    render(<AppLayout />);
    expect(screen.getByTestId("page-home")).toBeInTheDocument();
  });
});
