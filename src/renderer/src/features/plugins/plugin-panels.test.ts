import { describe, it, expect } from "vitest";
import { PLUGIN_PANELS, getPluginPanel } from "./plugin-panels";

describe("plugin-panels", () => {
  it("注册了 3 个内置插件", () => {
    expect(Object.keys(PLUGIN_PANELS)).toHaveLength(3);
  });

  it("Terminal 插件已注册", () => {
    const entry = getPluginPanel("@workbox/plugin-terminal");
    expect(entry).toBeDefined();
    expect(entry!.component).toBeDefined();
    expect(entry!.icon).toBeDefined();
  });

  it("File Explorer 插件已注册", () => {
    const entry = getPluginPanel("@workbox/plugin-file-explorer");
    expect(entry).toBeDefined();
    expect(entry!.component).toBeDefined();
    expect(entry!.icon).toBeDefined();
  });

  it("Git Helper 插件已注册", () => {
    const entry = getPluginPanel("@workbox/plugin-git-helper");
    expect(entry).toBeDefined();
    expect(entry!.component).toBeDefined();
    expect(entry!.icon).toBeDefined();
  });

  it("不存在的插件返回 undefined", () => {
    expect(getPluginPanel("nonexistent")).toBeUndefined();
  });
});
