import { describe, it, expect, beforeEach } from "vitest";
import type { ToolDefinition } from "@workbox/plugin-api";
import { createToolRouter } from "./tool-router";

describe("createToolRouter", () => {
  let router: ReturnType<typeof createToolRouter>;

  beforeEach(() => {
    router = createToolRouter();
  });

  describe("registerTool", () => {
    // 正常路径：注册 Tool
    it("注册 Tool 后可在注册表中找到", () => {
      const tool: ToolDefinition = {
        name: "test_tool",
        description: "A test tool",
        parameters: { type: "object", properties: { query: { type: "string" } } },
        handler: async () => "result"
      };
      router.registerTool(tool);
      expect(router.getRegisteredTools()).toHaveLength(1);
      expect(router.getRegisteredTools()[0]!.name).toBe("test_tool");
    });

    // 正常路径：返回 Disposable
    it("返回 Disposable 对象用于取消注册", () => {
      const tool: ToolDefinition = {
        name: "disposable_tool",
        description: "Will be disposed",
        parameters: {},
        handler: async () => "result"
      };
      const disposable = router.registerTool(tool);
      expect(typeof disposable.dispose).toBe("function");

      disposable.dispose();
      expect(router.getRegisteredTools()).toHaveLength(0);
    });

    // 边界条件：重复注册同名 Tool 覆盖旧的
    it("重复注册同名 Tool 覆盖旧定义", () => {
      const tool1: ToolDefinition = {
        name: "dup_tool",
        description: "Version 1",
        parameters: {},
        handler: async () => "v1"
      };
      const tool2: ToolDefinition = {
        name: "dup_tool",
        description: "Version 2",
        parameters: {},
        handler: async () => "v2"
      };
      router.registerTool(tool1);
      router.registerTool(tool2);
      expect(router.getRegisteredTools()).toHaveLength(1);
      expect(router.getRegisteredTools()[0]!.description).toBe("Version 2");
    });
  });

  describe("getToolsForAISDK", () => {
    // 正常路径：转换为 AI SDK 格式
    it("将注册的 Tools 转换为 AI SDK 兼容的 tool 对象", () => {
      router.registerTool({
        name: "get_weather",
        description: "Get weather for a location",
        parameters: {
          type: "object",
          properties: { location: { type: "string", description: "City name" } },
          required: ["location"]
        },
        handler: async (params) => ({ temp: 20, location: params.location })
      });

      const sdkTools = router.getToolsForAISDK();
      expect(sdkTools).toHaveProperty("get_weather");
      expect(sdkTools.get_weather).toBeDefined();
    });

    // 边界条件：无注册 Tool 返回空对象
    it("无注册 Tool 时返回空对象", () => {
      const sdkTools = router.getToolsForAISDK();
      expect(Object.keys(sdkTools)).toHaveLength(0);
    });
  });

  describe("executeTool", () => {
    // 正常路径：执行已注册的 Tool
    it("根据 toolName 调用对应 handler 并返回结果", async () => {
      router.registerTool({
        name: "echo",
        description: "Echo input",
        parameters: {},
        handler: async (params) => ({ echo: params.text })
      });

      const result = await router.executeTool("echo", { text: "hello" });
      expect(result).toEqual({ echo: "hello" });
    });

    // 错误处理：执行未注册的 Tool
    it("执行未注册的 Tool 抛出错误", async () => {
      await expect(router.executeTool("unknown_tool", {})).rejects.toThrow(/tool.*not.*found/i);
    });

    // 错误处理：Tool handler 抛出异常
    it("Tool handler 抛出异常时包装为可读错误", async () => {
      router.registerTool({
        name: "failing_tool",
        description: "Always fails",
        parameters: {},
        handler: async () => {
          throw new Error("Something went wrong");
        }
      });

      await expect(router.executeTool("failing_tool", {})).rejects.toThrow("Something went wrong");
    });
  });

  describe("clearTools", () => {
    // 正常路径：清空注册表
    it("清空所有已注册的 Tools", () => {
      router.registerTool({
        name: "tool1",
        description: "Tool 1",
        parameters: {},
        handler: async () => "result"
      });
      router.registerTool({
        name: "tool2",
        description: "Tool 2",
        parameters: {},
        handler: async () => "result"
      });
      expect(router.getRegisteredTools()).toHaveLength(2);

      router.clearTools();
      expect(router.getRegisteredTools()).toHaveLength(0);
    });
  });
});
