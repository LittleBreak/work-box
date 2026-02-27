/**
 * Terminal Plugin Entry
 *
 * 内置终端插件，提供多终端 session 管理、IPC 通道和 AI Tool 集成。
 * activate() 中创建 SessionManager、注册 IPC handler 和 run_command AI Tool，
 * deactivate() 中清理所有资源（session、IPC handler、AI Tool 注册）。
 */
import { ipcMain, BrowserWindow } from "electron";
import * as pty from "node-pty";
import { IPC_CHANNELS } from "@shared/ipc-channels";
import { TerminalSessionManager } from "./session-manager";
import { CommandExecutor } from "./command-executor";
import type { PluginContext, PluginDefinition, Disposable } from "@workbox/plugin-api";
import type { TerminalCreateOptions } from "@shared/types";

/** 模块级 SessionManager 引用，供 deactivate 访问 */
let sessionManager: TerminalSessionManager | null = null;

/** 模块级 run_command Tool 注册句柄，供 deactivate 释放 */
let toolDisposable: Disposable | null = null;

/** Terminal 插件定义 */
const terminalPlugin: PluginDefinition = {
  name: "Terminal",

  async activate(ctx: PluginContext): Promise<void> {
    sessionManager = new TerminalSessionManager(pty);

    // 注册 run_command AI Tool
    const executor = new CommandExecutor(pty);
    toolDisposable = ctx.ai.registerTool(executor.getToolDefinition());

    // terminal:create — 创建新终端 session
    ipcMain.handle(
      IPC_CHANNELS.terminal.create,
      async (_event, options?: TerminalCreateOptions): Promise<string> => {
        if (!sessionManager) throw new Error("Terminal plugin not active");
        const sessionId = sessionManager.create(options);

        // 注册 stdout 数据推送到 renderer
        sessionManager.onData(sessionId, (data: string) => {
          const windows = BrowserWindow.getAllWindows();
          for (const win of windows) {
            win.webContents.send(IPC_CHANNELS.terminal.data, sessionId, data);
          }
        });

        // 注册退出事件推送到 renderer
        sessionManager.onExit(sessionId, (exitCode: number) => {
          const windows = BrowserWindow.getAllWindows();
          for (const win of windows) {
            win.webContents.send(IPC_CHANNELS.terminal.exit, sessionId, exitCode);
          }
        });

        return sessionId;
      }
    );

    // terminal:write — 向 session 写入数据
    ipcMain.handle(
      IPC_CHANNELS.terminal.write,
      async (_event, sessionId: string, data: string): Promise<void> => {
        if (!sessionManager) throw new Error("Terminal plugin not active");
        sessionManager.write(sessionId, data);
      }
    );

    // terminal:resize — 调整终端尺寸
    ipcMain.handle(
      IPC_CHANNELS.terminal.resize,
      async (_event, sessionId: string, cols: number, rows: number): Promise<void> => {
        if (!sessionManager) throw new Error("Terminal plugin not active");
        sessionManager.resize(sessionId, cols, rows);
      }
    );

    // terminal:close — 关闭指定 session
    ipcMain.handle(
      IPC_CHANNELS.terminal.close,
      async (_event, sessionId: string): Promise<void> => {
        if (!sessionManager) throw new Error("Terminal plugin not active");
        sessionManager.close(sessionId);
      }
    );

    // terminal:list — 获取活跃 session 列表
    ipcMain.handle(IPC_CHANNELS.terminal.list, async (): Promise<string[]> => {
      if (!sessionManager) throw new Error("Terminal plugin not active");
      return sessionManager.listSessions();
    });
  },

  async deactivate(): Promise<void> {
    // 注销 run_command AI Tool
    if (toolDisposable) {
      toolDisposable.dispose();
      toolDisposable = null;
    }

    if (sessionManager) {
      sessionManager.closeAll();
      sessionManager = null;
    }

    // 移除所有 terminal IPC handler
    ipcMain.removeHandler(IPC_CHANNELS.terminal.create);
    ipcMain.removeHandler(IPC_CHANNELS.terminal.write);
    ipcMain.removeHandler(IPC_CHANNELS.terminal.resize);
    ipcMain.removeHandler(IPC_CHANNELS.terminal.close);
    ipcMain.removeHandler(IPC_CHANNELS.terminal.list);
  }
};

export default terminalPlugin;
