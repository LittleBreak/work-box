export type {
  PluginManifest,
  PluginDefinition,
  PluginContext,
  WorkboxPluginConfig,
  Permission,
  Disposable,
  CommandDefinition,
  ToolDefinition,
  WatchCallback,
  ExecResult,
  ExecOptions,
  FileStat
} from "./types";

import type { PluginDefinition } from "./types";

/**
 * Define a Work-Box plugin with lifecycle callbacks.
 * Returns the definition object unchanged for registration.
 */
export function definePlugin(definition: PluginDefinition): PluginDefinition {
  return definition;
}
