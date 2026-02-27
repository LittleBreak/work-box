import { describe, it, expect } from "vitest";
import { definePlugin } from "./index";
import type {
  PluginDefinition,
  PluginContext,
  WorkboxPluginConfig,
  Permission,
  Disposable,
  CommandDefinition,
  ToolDefinition
} from "./types";

describe("definePlugin", () => {
  it("接受包含 activate 和 deactivate 的完整定义", () => {
    const definition = definePlugin({
      name: "test-plugin",
      activate: async () => {},
      deactivate: async () => {}
    });
    expect(definition.name).toBe("test-plugin");
    expect(typeof definition.activate).toBe("function");
    expect(typeof definition.deactivate).toBe("function");
  });

  it("允许省略 deactivate", () => {
    const definition = definePlugin({
      name: "minimal-plugin",
      activate: async () => {}
    });
    expect(definition.name).toBe("minimal-plugin");
    expect(definition.deactivate).toBeUndefined();
  });

  it("返回的对象与传入对象引用一致", () => {
    const input: PluginDefinition = {
      name: "ref-test",
      activate: async () => {}
    };
    expect(definePlugin(input)).toBe(input);
  });
});

describe("类型完整性检查", () => {
  it("Permission 类型包含所有架构文档定义的权限", () => {
    const permissions: Permission[] = [
      "fs:read",
      "fs:write",
      "shell:exec",
      "network:fetch",
      "ai:chat",
      "clipboard",
      "notification"
    ];
    expect(permissions).toHaveLength(7);
  });

  it("WorkboxPluginConfig 包含必要字段", () => {
    const config: WorkboxPluginConfig = {
      name: "Test Plugin",
      description: "A test plugin",
      permissions: ["fs:read"],
      entry: { main: "./src/index.ts" }
    };
    expect(config.name).toBeDefined();
    expect(config.permissions).toContain("fs:read");
  });

  it("WorkboxPluginConfig 支持完整字段（icon, commands, ai, ui entry）", () => {
    const config: WorkboxPluginConfig = {
      name: "Full Plugin",
      description: "Full featured",
      icon: "./icon.svg",
      permissions: ["fs:read", "shell:exec"],
      entry: {
        main: "./src/index.ts",
        ui: "./src/ui/Panel.tsx"
      },
      commands: [{ id: "my-cmd", title: "My Command", shortcut: "CmdOrCtrl+Shift+M" }],
      ai: { tools: ["my_tool"] }
    };
    expect(config.commands).toHaveLength(1);
    expect(config.ai?.tools).toContain("my_tool");
  });

  it("Disposable 对象有 dispose 方法", () => {
    const disposable: Disposable = { dispose: () => {} };
    expect(typeof disposable.dispose).toBe("function");
  });

  it("PluginContext 包含所有 8 个子模块（类型验证）", () => {
    const contextKeys: Array<keyof PluginContext> = [
      "plugin",
      "fs",
      "shell",
      "ai",
      "commands",
      "notification",
      "workspace",
      "storage"
    ];
    expect(contextKeys).toHaveLength(8);
  });

  it("CommandDefinition 包含 id 和 title", () => {
    const cmd: CommandDefinition = { id: "test", title: "Test Command" };
    expect(cmd.id).toBe("test");
    expect(cmd.shortcut).toBeUndefined();
  });

  it("ToolDefinition 包含 name, description, parameters, handler", () => {
    const tool: ToolDefinition = {
      name: "test_tool",
      description: "A test tool",
      parameters: { path: { type: "string" } },
      handler: async () => ({ result: "ok" })
    };
    expect(tool.name).toBe("test_tool");
    expect(typeof tool.handler).toBe("function");
  });
});
