/**
 * URL Toolkit Plugin Entry
 *
 * URL 工具箱插件。提供 URL 编解码、Query 参数解析和二维码生成功能。
 * 纯计算逻辑在渲染进程执行，主进程负责 AI tools 注册。
 */
import type { PluginDefinition, PluginContext, Disposable } from "@workbox/plugin-api";
import { handleUrlEncode } from "./ai-tools";
import { handleUrlParse } from "./ai-tools";

/** 已注册的 disposable 资源 */
const disposables: Disposable[] = [];

/** URL Toolkit 插件定义 */
const urlToolkitPlugin: PluginDefinition = {
  name: "URL Toolkit",

  async activate(ctx: PluginContext): Promise<void> {
    disposables.push(
      ctx.ai.registerTool({
        name: "url_encode",
        description:
          "URL 编码或解码。支持完整 URL (encodeURI) 和组件 (encodeURIComponent) 两种模式。",
        parameters: {
          type: "object",
          properties: {
            input: { type: "string", description: "要编码/解码的字符串" },
            action: { type: "string", enum: ["encode", "decode"], description: "操作类型" },
            mode: {
              type: "string",
              enum: ["full", "component"],
              description: "模式：full=完整URL，component=URL组件。默认 full"
            }
          },
          required: ["input", "action"]
        },
        handler: (params) =>
          handleUrlEncode(params as unknown as Parameters<typeof handleUrlEncode>[0])
      })
    );

    disposables.push(
      ctx.ai.registerTool({
        name: "url_parse",
        description: "解析 URL 的结构（protocol/host/pathname/search/hash）和 query 参数。",
        parameters: {
          type: "object",
          properties: {
            url: { type: "string", description: "要解析的 URL" }
          },
          required: ["url"]
        },
        handler: (params) => handleUrlParse(params)
      })
    );
  },

  async deactivate(): Promise<void> {
    disposables.forEach((d) => d.dispose());
    disposables.length = 0;
  }
};

export default urlToolkitPlugin;
