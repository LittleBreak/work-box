import { describe, it, expect } from "vitest";
import { definePlugin } from "@workbox/plugin-api";
import type { PluginManifest, PluginDefinition } from "@workbox/plugin-api";

describe("@workbox/plugin-api", () => {
  // 正常路径：definePlugin 是函数，调用后返回含 name 属性的对象
  it("definePlugin is a function and returns object with name", () => {
    expect(typeof definePlugin).toBe("function");
    const result = definePlugin({ name: "test-plugin", activate: async () => {} });
    expect(result).toHaveProperty("name", "test-plugin");
  });

  // 边界条件：传入最小定义不抛错
  it("definePlugin does not throw when called with minimal definition", () => {
    expect(() =>
      definePlugin({ name: "min", activate: async () => {} } as PluginDefinition)
    ).not.toThrow();
  });

  // 类型验证：PluginManifest 接口可被正确实例化
  it("PluginManifest interface can be instantiated correctly", () => {
    const manifest: PluginManifest = {
      name: "my-plugin",
      version: "1.0.0"
    };
    expect(manifest.name).toBe("my-plugin");
    expect(manifest.version).toBe("1.0.0");
  });
});
