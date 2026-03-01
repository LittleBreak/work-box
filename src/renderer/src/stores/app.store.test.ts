import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore, initialAppState, isPluginPage, extractPluginId } from "./app.store";

describe("useAppStore", () => {
  beforeEach(() => {
    // 用导出的初始状态重置 store（merge 模式保留 action 函数）
    useAppStore.setState(initialAppState);
  });

  describe("导航状态", () => {
    // 正常路径
    it("默认页面为 home", () => {
      expect(useAppStore.getState().currentPage).toBe("home");
    });

    it("setCurrentPage 切换当前页面", () => {
      useAppStore.getState().setCurrentPage("chat");
      expect(useAppStore.getState().currentPage).toBe("chat");
    });

    // 边界条件
    it("支持所有有效页面值", () => {
      const pages = ["home", "chat", "plugins", "settings"] as const;
      pages.forEach((page) => {
        useAppStore.getState().setCurrentPage(page);
        expect(useAppStore.getState().currentPage).toBe(page);
      });
    });
  });

  describe("侧边栏状态", () => {
    it("默认侧边栏展开", () => {
      expect(useAppStore.getState().sidebarCollapsed).toBe(false);
    });

    it("setSidebarCollapsed 切换折叠状态", () => {
      useAppStore.getState().setSidebarCollapsed(true);
      expect(useAppStore.getState().sidebarCollapsed).toBe(true);
    });
  });

  describe("主题状态", () => {
    it("默认主题为 dark", () => {
      expect(useAppStore.getState().theme).toBe("dark");
    });

    it("setTheme 切换主题", () => {
      useAppStore.getState().setTheme("light");
      expect(useAppStore.getState().theme).toBe("light");
    });
  });

  describe("插件页面支持", () => {
    it("setCurrentPage 支持插件页面 ID", () => {
      useAppStore.getState().setCurrentPage("plugin:@workbox/plugin-terminal");
      expect(useAppStore.getState().currentPage).toBe("plugin:@workbox/plugin-terminal");
    });
  });

  describe("isPluginPage", () => {
    it("核心页面返回 false", () => {
      expect(isPluginPage("home")).toBe(false);
      expect(isPluginPage("chat")).toBe(false);
      expect(isPluginPage("plugins")).toBe(false);
      expect(isPluginPage("settings")).toBe(false);
    });

    it("插件页面返回 true", () => {
      expect(isPluginPage("plugin:@workbox/plugin-terminal")).toBe(true);
      expect(isPluginPage("plugin:@workbox/plugin-file-explorer")).toBe(true);
    });
  });

  describe("extractPluginId", () => {
    it("从插件页面 ID 提取插件 ID", () => {
      expect(extractPluginId("plugin:@workbox/plugin-terminal")).toBe("@workbox/plugin-terminal");
      expect(extractPluginId("plugin:@workbox/plugin-file-explorer")).toBe(
        "@workbox/plugin-file-explorer"
      );
    });
  });
});
