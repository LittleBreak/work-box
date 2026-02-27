/**
 * SystemServices Factory
 *
 * Creates the SystemServices object required by PluginManager,
 * wiring system-level handlers (fs, shell, crud, dialog) into
 * the dependency injection interface.
 */
import * as fs from "fs/promises";
import * as nodePath from "path";
import * as nodeFs from "fs";
import { dialog } from "electron";
import { exec } from "../ipc/shell.handler";
import type { SystemServices } from "./context";
import type { Crud } from "../storage/crud";
import type { Disposable } from "@workbox/plugin-api";

/** createSystemServices 选项 */
export interface CreateSystemServicesOptions {
  crud: Crud;
}

/**
 * 创建 PluginManager 所需的 SystemServices 实例。
 *
 * @param options - 包含 crud 等依赖
 * @returns SystemServices 实例
 */
export function createSystemServices(options: CreateSystemServicesOptions): SystemServices {
  const { crud } = options;

  return {
    fsHandler: {
      async readFile(path: string): Promise<Buffer> {
        return fs.readFile(path);
      },
      async writeFile(path: string, data: Buffer | string): Promise<void> {
        await fs.mkdir(nodePath.dirname(path), { recursive: true });
        await fs.writeFile(path, data);
      },
      async readDir(path: string): Promise<string[]> {
        return fs.readdir(path);
      },
      async stat(path: string) {
        const s = await fs.stat(path);
        return {
          size: s.size,
          isFile: s.isFile(),
          isDirectory: s.isDirectory(),
          mtime: s.mtimeMs
        };
      },
      watch(path: string, callback: (event: string, filename: string) => void): Disposable {
        const watcher = nodeFs.watch(path, (event, filename) => {
          callback(event, filename ?? "");
        });
        return {
          dispose(): void {
            watcher.close();
          }
        };
      }
    },

    shellHandler: {
      exec
    },

    crud: {
      getPluginData: crud.getPluginData.bind(crud),
      setPluginData: crud.setPluginData.bind(crud),
      deletePluginData: crud.deletePluginData.bind(crud),
      deleteAllPluginData: crud.deleteAllPluginData.bind(crud)
    },

    notificationSender(level, message) {
      console.log(`[Plugin:${level}] ${message}`);
    },

    dialogOpener: {
      async selectFolder(): Promise<string | null> {
        const result = await dialog.showOpenDialog({ properties: ["openDirectory"] });
        return result.canceled ? null : (result.filePaths[0] ?? null);
      },
      async selectFile(
        filters?: Array<{ name: string; extensions: string[] }>
      ): Promise<string | null> {
        const result = await dialog.showOpenDialog({
          properties: ["openFile"],
          filters
        });
        return result.canceled ? null : (result.filePaths[0] ?? null);
      }
    },

    commandRegistry: {
      register(_pluginId, _commandId, _handler) {
        // Phase 4.2+ 将连接到命令面板
        return {
          dispose(): void {
            /* noop - placeholder until command palette is implemented */
          }
        };
      }
    },

    toolRegistry: {
      register(_pluginId, _tool) {
        // Phase 4.2+ 将连接到 AI ToolRouter
        return {
          dispose(): void {
            /* noop - placeholder until tool router is connected */
          }
        };
      }
    }
  };
}
