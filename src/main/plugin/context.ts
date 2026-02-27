/**
 * PluginContext Creation
 *
 * Factory for creating isolated PluginContext instances per plugin.
 * All system APIs are accessed through injected SystemServices,
 * guarded by PermissionManager for runtime permission enforcement.
 */
import type { PluginContext, Disposable, ToolDefinition, ExecOptions } from "@workbox/plugin-api";
import type { PermissionManager } from "./permission";

// ---- System Services (Dependency Injection) ----

/** Injected system services for PluginContext creation */
export interface SystemServices {
  fsHandler: {
    readFile(path: string): Promise<Buffer>;
    writeFile(path: string, data: Buffer | string): Promise<void>;
    readDir(path: string): Promise<string[]>;
    stat(
      path: string
    ): Promise<{ size: number; isFile: boolean; isDirectory: boolean; mtime: number }>;
    watch(path: string, callback: (event: string, filename: string) => void): Disposable;
  };
  shellHandler: {
    exec(
      command: string,
      options?: ExecOptions
    ): Promise<{ stdout: string; stderr: string; exitCode: number; signal?: string }>;
  };
  crud: {
    getPluginData(pluginId: string, key: string): string | undefined;
    setPluginData(pluginId: string, key: string, value: string): void;
    deletePluginData(pluginId: string, key: string): void;
    deleteAllPluginData(pluginId: string): void;
  };
  notificationSender: (level: "success" | "error" | "info", message: string) => void;
  dialogOpener: {
    selectFolder(): Promise<string | null>;
    selectFile(filters?: Array<{ name: string; extensions: string[] }>): Promise<string | null>;
  };
  commandRegistry: {
    register(pluginId: string, commandId: string, handler: () => Promise<void>): Disposable;
  };
  toolRegistry: {
    register(pluginId: string, tool: ToolDefinition): Disposable;
  };
}

/** Options for createPluginContext */
export interface CreatePluginContextOptions {
  pluginId: string;
  pluginName: string;
  pluginVersion: string;
  dataPath: string;
  permissionManager: PermissionManager;
  services: SystemServices;
}

/**
 * Create an isolated PluginContext for a specific plugin.
 * All operations are guarded by the plugin's PermissionManager.
 *
 * @param options - Plugin identity, permissions, and injected services
 * @returns A complete PluginContext instance
 */
export function createPluginContext(options: CreatePluginContextOptions): PluginContext {
  const { pluginId, pluginName, pluginVersion, dataPath, permissionManager, services } = options;

  return {
    // ---- plugin metadata ----
    plugin: {
      id: pluginId,
      name: pluginName,
      version: pluginVersion,
      dataPath
    },

    // ---- fs (guarded by fs:read / fs:write) ----
    fs: {
      async readFile(path: string): Promise<Buffer> {
        permissionManager.require("fs:read");
        return services.fsHandler.readFile(path);
      },
      async writeFile(path: string, data: Buffer | string): Promise<void> {
        permissionManager.require("fs:write");
        return services.fsHandler.writeFile(path, data);
      },
      async readDir(path: string): Promise<string[]> {
        permissionManager.require("fs:read");
        return services.fsHandler.readDir(path);
      },
      async stat(path: string) {
        permissionManager.require("fs:read");
        return services.fsHandler.stat(path);
      },
      watch(path: string, callback: (event: string, filename: string) => void): Disposable {
        permissionManager.require("fs:read");
        return services.fsHandler.watch(path, callback);
      }
    },

    // ---- shell (guarded by shell:exec) ----
    shell: {
      async exec(command: string, shellOptions?: ExecOptions) {
        permissionManager.require("shell:exec");
        return services.shellHandler.exec(command, shellOptions);
      }
    },

    // ---- ai ----
    ai: {
      // Phase 2 placeholder - will be connected to AI service in Phase 3
      chat(): AsyncIterable<unknown> {
        return {
          [Symbol.asyncIterator]() {
            return {
              async next(): Promise<IteratorResult<unknown>> {
                throw new Error("AI service not available");
              }
            };
          }
        };
      },
      registerTool(tool: ToolDefinition): Disposable {
        return services.toolRegistry.register(pluginId, tool);
      }
    },

    // ---- commands ----
    commands: {
      register(id: string, handler: () => Promise<void>): Disposable {
        return services.commandRegistry.register(pluginId, id, handler);
      }
    },

    // ---- notification ----
    notification: {
      success(message: string): void {
        services.notificationSender("success", message);
      },
      error(message: string): void {
        services.notificationSender("error", message);
      },
      info(message: string): void {
        services.notificationSender("info", message);
      }
    },

    // ---- workspace ----
    workspace: {
      rootPath: dataPath,
      selectFolder(): Promise<string | null> {
        return services.dialogOpener.selectFolder();
      },
      selectFile(filters?: Array<{ name: string; extensions: string[] }>): Promise<string | null> {
        return services.dialogOpener.selectFile(filters);
      }
    },

    // ---- storage (auto-scoped by pluginId, JSON serialization) ----
    storage: {
      async get<T>(key: string): Promise<T | null> {
        const raw = services.crud.getPluginData(pluginId, key);
        if (raw === undefined || raw === null) {
          return null;
        }
        return JSON.parse(raw) as T;
      },
      async set<T>(key: string, value: T): Promise<void> {
        services.crud.setPluginData(pluginId, key, JSON.stringify(value));
      },
      async delete(key: string): Promise<void> {
        services.crud.deletePluginData(pluginId, key);
      }
    }
  };
}
