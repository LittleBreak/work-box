import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Sidebar } from "./Sidebar";
import { useAppStore, initialAppState } from "../../stores/app.store";

describe("Sidebar", () => {
  beforeEach(() => {
    useAppStore.setState(initialAppState);
  });

  // 正常路径：通过 data-testid 定位导航项
  it("渲染所有导航项", () => {
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
});
