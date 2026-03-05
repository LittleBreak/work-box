import { describe, it, expect } from "vitest";
import { getPluginPanel, getDiscoveredPluginIds } from "./plugin-panels";

describe("plugin-panels (auto-discovery)", () => {
  it("自动发现所有 5 个插件 UI 组件", () => {
    const ids = getDiscoveredPluginIds();
    expect(ids).toHaveLength(5);
    expect(ids).toContain("@workbox/plugin-terminal");
    expect(ids).toContain("@workbox/plugin-file-explorer");
    expect(ids).toContain("@workbox/plugin-git-helper");
    expect(ids).toContain("@workbox/plugin-json-formatter");
    expect(ids).toContain("@workbox/plugin-regex-tester");
  });

  it("每个插件有可用的 component", () => {
    const ids = getDiscoveredPluginIds();
    for (const id of ids) {
      const entry = getPluginPanel(id);
      expect(entry).toBeDefined();
      expect(typeof entry!.component).toBe("function");
    }
  });

  it("未知 ID 返回 undefined", () => {
    expect(getPluginPanel("nonexistent")).toBeUndefined();
  });
});
