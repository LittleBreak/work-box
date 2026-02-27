/** 插件引擎模块 - 统一导出 */
export { PluginManager } from "./manager";
export { scanPlugins, parseManifest, resolveLoadOrder } from "./engine";
export type { ParsedPlugin, ScanResult } from "./engine";
export { createPluginContext } from "./context";
export type { SystemServices, CreatePluginContextOptions } from "./context";
export {
  PermissionManager,
  PermissionDeniedError,
  isHighRisk,
  VALID_PERMISSIONS
} from "./permission";
