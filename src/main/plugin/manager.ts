/**
 * Plugin Lifecycle Manager
 *
 * Manages the complete plugin lifecycle: scan → parse → load → activate → disable → shutdown.
 * Provides IPC-facing methods for plugin list, enable, and disable operations.
 */
import path from "node:path";
import { scanPlugins, resolveLoadOrder } from "./engine";
import type { ParsedPlugin } from "./engine";
import { PermissionManager } from "./permission";
import { createPluginContext } from "./context";
import type { SystemServices } from "./context";
import type { PluginDefinition } from "@workbox/plugin-api";
import type { PluginInfo, PluginStatus } from "@shared/types";

// ---- Internal Types ----

/** Internal plugin instance state (not exposed to renderer) */
interface PluginInstance {
  id: string;
  parsed: ParsedPlugin;
  status: PluginStatus;
  context?: ReturnType<typeof createPluginContext>;
  definition?: PluginDefinition;
  permissionManager?: PermissionManager;
  error?: string;
}

// ---- PluginManager ----

/**
 * Singleton plugin manager that handles the full plugin lifecycle.
 */
export class PluginManager {
  private readonly services: SystemServices;
  private readonly plugins: Map<string, PluginInstance> = new Map();
  private loaded = false;

  constructor(services: SystemServices) {
    this.services = services;
  }

  /**
   * Scan plugin directories, parse manifests, and activate all valid plugins.
   *
   * @param dirs - Directories to scan for plugins
   * @throws Error if loadAll has already been called
   */
  async loadAll(dirs: string[]): Promise<void> {
    if (this.loaded) {
      throw new Error("Plugins already loaded. Cannot call loadAll twice.");
    }
    this.loaded = true;

    const scanResult = scanPlugins(dirs);
    const ordered = resolveLoadOrder(scanResult.valid);

    for (const parsed of ordered) {
      const instance: PluginInstance = {
        id: parsed.id,
        parsed,
        status: "loading"
      };
      this.plugins.set(parsed.id, instance);

      try {
        await this.activatePlugin(instance);
      } catch (err) {
        instance.status = "error";
        instance.error = err instanceof Error ? err.message : String(err);
      }
    }
  }

  /**
   * Get the list of all plugins with their current status.
   *
   * @returns Array of PluginInfo for IPC transport
   */
  getPluginList(): PluginInfo[] {
    const list: PluginInfo[] = [];
    for (const instance of this.plugins.values()) {
      list.push({
        id: instance.id,
        name: instance.parsed.config.name,
        version: instance.parsed.version,
        description: instance.parsed.config.description,
        status: instance.status,
        permissions: instance.parsed.config.permissions,
        hasUI: !!instance.parsed.config.entry.ui,
        error: instance.error
      });
    }
    return list;
  }

  /**
   * Enable (re-activate) a disabled plugin.
   *
   * @param id - Plugin identifier
   * @throws Error if plugin not found
   */
  async enablePlugin(id: string): Promise<void> {
    const instance = this.plugins.get(id);
    if (!instance) {
      throw new Error(`Plugin "${id}" not found`);
    }
    await this.activatePlugin(instance);
  }

  /**
   * Disable an active plugin by calling its deactivate callback.
   *
   * @param id - Plugin identifier
   * @throws Error if plugin not found
   */
  async disablePlugin(id: string): Promise<void> {
    const instance = this.plugins.get(id);
    if (!instance) {
      throw new Error(`Plugin "${id}" not found`);
    }

    if (instance.definition?.deactivate) {
      try {
        await instance.definition.deactivate();
      } catch {
        // Ignore deactivate errors
      }
    }
    instance.status = "disabled";
  }

  /**
   * Shutdown all active plugins (called on app exit).
   * Executes deactivate in reverse load order.
   */
  async shutdown(): Promise<void> {
    const instances = Array.from(this.plugins.values()).reverse();
    for (const instance of instances) {
      if (instance.status === "active" && instance.definition?.deactivate) {
        try {
          await instance.definition.deactivate();
        } catch {
          // Ignore shutdown errors
        }
      }
      instance.status = "unloaded";
    }
  }

  /**
   * Activate a plugin instance: require its entry, create context, call activate().
   */
  private async activatePlugin(instance: PluginInstance): Promise<void> {
    const { parsed } = instance;

    // Create permission manager
    const permissionManager = new PermissionManager(parsed.id, parsed.config.permissions);
    instance.permissionManager = permissionManager;

    // Create plugin context
    const dataPath = path.join(parsed.path, ".data");
    const ctx = createPluginContext({
      pluginId: parsed.id,
      pluginName: parsed.config.name,
      pluginVersion: parsed.version,
      dataPath,
      permissionManager,
      services: this.services
    });
    instance.context = ctx;

    // Load plugin module
    const entryPath = path.resolve(parsed.path, parsed.config.entry.main);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require(entryPath);
    const definition: PluginDefinition = mod.default || mod;

    if (!definition || typeof definition.activate !== "function") {
      throw new Error(`Plugin "${parsed.id}" does not export a valid PluginDefinition`);
    }

    instance.definition = definition;

    // Activate
    await definition.activate(ctx);
    instance.status = "active";
  }
}
