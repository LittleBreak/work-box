/**
 * JSON Formatter Plugin Entry
 *
 * JSON 格式化工具插件。所有逻辑运行在渲染进程（纯计算），
 * 主进程侧仅提供插件骨架，无 IPC handler 注册。
 */
import type { PluginDefinition, PluginContext } from "@workbox/plugin-api";

/** JSON Formatter 插件定义 */
const jsonFormatterPlugin: PluginDefinition = {
  name: "JSON Formatter",

  async activate(_ctx: PluginContext): Promise<void> {
    // 所有逻辑运行在渲染进程，主进程无需注册 IPC handler
  },

  async deactivate(): Promise<void> {
    // 无资源需要清理
  }
};

export default jsonFormatterPlugin;
