import { tool } from "ai";
import { jsonSchema } from "ai";
import type { ToolDefinition, Disposable } from "@workbox/plugin-api";

/** Tool Router 接口 */
export interface ToolRouter {
  /** 注册 Tool，返回 Disposable 用于取消注册 */
  registerTool(toolDef: ToolDefinition): Disposable;
  /** 获取所有已注册 Tool 的信息 */
  getRegisteredTools(): ToolDefinition[];
  /** 将已注册 Tools 转换为 Vercel AI SDK 格式 */
  getToolsForAISDK(): Record<string, unknown>;
  /** 根据 tool name 执行对应 handler */
  executeTool(name: string, params: Record<string, unknown>): Promise<unknown>;
  /** 清空所有已注册 Tools */
  clearTools(): void;
}

/**
 * 创建 Tool Router 实例。
 * 管理全局 Tool 注册表，提供 AI SDK 格式转换和 Tool 执行路由。
 */
export function createToolRouter(): ToolRouter {
  const registry = new Map<string, ToolDefinition>();

  return {
    registerTool(toolDef) {
      registry.set(toolDef.name, toolDef);
      return {
        dispose() {
          registry.delete(toolDef.name);
        }
      };
    },

    getRegisteredTools() {
      return Array.from(registry.values());
    },

    getToolsForAISDK() {
      const tools: Record<string, unknown> = {};
      for (const [name, toolDef] of registry) {
        tools[name] = tool({
          description: toolDef.description,
          parameters: jsonSchema(toolDef.parameters as Parameters<typeof jsonSchema>[0]),
          execute: async (params) => {
            return toolDef.handler(params as Record<string, unknown>);
          }
        });
      }
      return tools;
    },

    async executeTool(name, params) {
      const toolDef = registry.get(name);
      if (!toolDef) {
        throw new Error(`Tool not found: ${name}`);
      }
      return toolDef.handler(params);
    },

    clearTools() {
      registry.clear();
    }
  };
}
