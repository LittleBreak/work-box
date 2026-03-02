/**
 * Regex Tester Plugin Entry
 *
 * 正则表达式测试工具插件。所有逻辑运行在渲染进程（纯计算），
 * 主进程侧仅提供插件骨架，无 IPC handler 注册。
 */
import type { PluginDefinition, PluginContext } from "@workbox/plugin-api";

/** Regex Tester 插件定义 */
const regexTesterPlugin: PluginDefinition = {
  name: "Regex Tester",

  async activate(_ctx: PluginContext): Promise<void> {
    // 所有逻辑运行在渲染进程，主进程无需注册 IPC handler
  },

  async deactivate(): Promise<void> {
    // 无资源需要清理
  }
};

export default regexTesterPlugin;
