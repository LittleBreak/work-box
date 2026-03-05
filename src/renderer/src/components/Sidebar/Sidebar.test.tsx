import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Sidebar } from "./Sidebar";
import { useAppStore, initialAppState } from "../../stores/app.store";
import { usePluginStore } from "../../stores/plugin.store";
import type { PluginInfo } from "@shared/types";

/** Mock active plugins with UI */
const activePluginsWithUI: PluginInfo[] = [
  {
    id: "@workbox/plugin-terminal",
    name: "Terminal",
    version: "1.0.0",
    status: "active",
    permissions: [],
    hasUI: true,
    icon: "terminal"
  },
  {
    id: "@workbox/plugin-file-explorer",
    name: "File Explorer",
    version: "1.0.0",
    status: "active",
    permissions: [],
    hasUI: true,
    icon: "folder-open"
  }
];

/** Helper to set up window.workbox mock with given plugin list */
function mockWorkbox(plugins: PluginInfo[] = []): void {
  Object.defineProperty(window, "workbox", {
    value: {
      plugin: {
        list: vi.fn().mockResolvedValue(plugins),
        enable: vi.fn().mockResolvedValue(undefined),
        disable: vi.fn().mockResolvedValue(undefined)
      }
    },
    writable: true,
    configurable: true
  });
}

beforeEach(() => {
  mockWorkbox();
});

describe("Sidebar", () => {
  beforeEach(() => {
    useAppStore.setState(initialAppState);
    usePluginStore.setState({ plugins: [], loading: false, selectedPluginId: null });
  });

  // 正常路径：通过 data-testid 定位导航项
  it("渲染所有核心导航项", () => {
    render(<Sidebar />);
    expect(screen.getByTestId("nav-home")).toBeInTheDocument();
    expect(screen.getByTestId("nav-chat")).toBeInTheDocument();
    expect(screen.getByTestId("nav-plugins")).toBeInTheDocument();
    expect(screen.getByTestId("nav-settings")).toBeInTheDocument();
  });

  // 交互验证：点击导航项更新 store
  it("点击导航项切换当前页面", async () => {
    render(<Sidebar />);
    await userEvent.click(screen.getByTestId("nav-chat"));
    expect(useAppStore.getState().currentPage).toBe("chat");
  });

  // 高亮当前活跃项
  it("当前页面的导航项具有 active 样式", () => {
    useAppStore.setState({ currentPage: "settings" });
    render(<Sidebar />);
    expect(screen.getByTestId("nav-settings")).toHaveAttribute("data-active", "true");
    expect(screen.getByTestId("nav-home")).toHaveAttribute("data-active", "false");
  });

  // 边界条件：折叠状态下文字标签用 sr-only 隐藏
  it("折叠状态下导航项文字标签不可见", () => {
    useAppStore.setState({ sidebarCollapsed: true });
    render(<Sidebar />);
    // 文字仍在 DOM 中（sr-only），但视觉不可见
    const label = screen.getByTestId("nav-home").querySelector('[class*="sr-only"]');
    expect(label).toBeInTheDocument();
  });

  // 折叠切换按钮
  it("点击折叠按钮切换侧边栏状态", async () => {
    render(<Sidebar />);
    const toggleBtn = screen.getByTestId("sidebar-toggle");
    await userEvent.click(toggleBtn);
    expect(useAppStore.getState().sidebarCollapsed).toBe(true);
  });

  // ---- 插件导航项测试 ----

  it("无活跃插件时不显示分割线", () => {
    render(<Sidebar />);
    expect(screen.queryByTestId("divider-top")).not.toBeInTheDocument();
    expect(screen.queryByTestId("divider-bottom")).not.toBeInTheDocument();
  });

  it("有活跃 UI 插件时显示对应导航项和分割线", () => {
    mockWorkbox(activePluginsWithUI);
    usePluginStore.setState({ plugins: activePluginsWithUI });
    render(<Sidebar />);
    expect(screen.getByTestId("nav-plugin:@workbox/plugin-terminal")).toBeInTheDocument();
    expect(screen.getByTestId("nav-plugin:@workbox/plugin-file-explorer")).toBeInTheDocument();
    expect(screen.getByTestId("divider-top")).toBeInTheDocument();
    expect(screen.getByTestId("divider-bottom")).toBeInTheDocument();
  });

  it("disabled 插件不显示导航项", () => {
    const disabledPlugin: PluginInfo = {
      id: "@workbox/plugin-terminal",
      name: "Terminal",
      version: "1.0.0",
      status: "disabled",
      permissions: [],
      hasUI: true,
      icon: "terminal"
    };
    mockWorkbox([disabledPlugin]);
    usePluginStore.setState({ plugins: [disabledPlugin] });
    render(<Sidebar />);
    expect(screen.queryByTestId("nav-plugin:@workbox/plugin-terminal")).not.toBeInTheDocument();
  });

  it("hasUI: false 的插件不显示导航项", () => {
    const noUIPlugin: PluginInfo = {
      id: "@workbox/plugin-terminal",
      name: "Terminal",
      version: "1.0.0",
      status: "active",
      permissions: [],
      hasUI: false,
      icon: "terminal"
    };
    mockWorkbox([noUIPlugin]);
    usePluginStore.setState({ plugins: [noUIPlugin] });
    render(<Sidebar />);
    expect(screen.queryByTestId("nav-plugin:@workbox/plugin-terminal")).not.toBeInTheDocument();
  });

  it("点击插件导航项设置 currentPage 为 plugin:xxx", async () => {
    mockWorkbox(activePluginsWithUI);
    usePluginStore.setState({ plugins: activePluginsWithUI });
    render(<Sidebar />);
    await userEvent.click(screen.getByTestId("nav-plugin:@workbox/plugin-terminal"));
    expect(useAppStore.getState().currentPage).toBe("plugin:@workbox/plugin-terminal");
  });

  it("插件导航项支持 data-active 高亮", () => {
    mockWorkbox(activePluginsWithUI);
    usePluginStore.setState({ plugins: activePluginsWithUI });
    useAppStore.setState({ currentPage: "plugin:@workbox/plugin-terminal" });
    render(<Sidebar />);
    expect(screen.getByTestId("nav-plugin:@workbox/plugin-terminal")).toHaveAttribute(
      "data-active",
      "true"
    );
    expect(screen.getByTestId("nav-plugin:@workbox/plugin-file-explorer")).toHaveAttribute(
      "data-active",
      "false"
    );
  });

  // ---- 新增：自动发现相关测试 ----

  it("未在 PLUGIN_PANELS 注册的插件（如 json-formatter）只要 active+hasUI 也能显示", () => {
    const jsonPlugin: PluginInfo = {
      id: "@workbox/plugin-json-formatter",
      name: "JSON Formatter",
      version: "1.0.0",
      status: "active",
      permissions: [],
      hasUI: true,
      icon: "braces"
    };
    mockWorkbox([jsonPlugin]);
    usePluginStore.setState({ plugins: [jsonPlugin] });
    render(<Sidebar />);
    expect(screen.getByTestId("nav-plugin:@workbox/plugin-json-formatter")).toBeInTheDocument();
  });

  it("无 icon 字段的插件使用默认图标，不崩溃", () => {
    const noIconPlugin: PluginInfo = {
      id: "@workbox/plugin-terminal",
      name: "Terminal",
      version: "1.0.0",
      status: "active",
      permissions: [],
      hasUI: true
    };
    mockWorkbox([noIconPlugin]);
    usePluginStore.setState({ plugins: [noIconPlugin] });
    render(<Sidebar />);
    expect(screen.getByTestId("nav-plugin:@workbox/plugin-terminal")).toBeInTheDocument();
  });
});
