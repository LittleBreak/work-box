import { ipcMain } from "electron";
import { IPC_CHANNELS } from "@shared/ipc-channels";
import { setupFSHandlers } from "./fs.handler";
import { setupShellHandlers } from "./shell.handler";
import { setupSettingsHandlers } from "./settings.handler";
import { setupClipboardHandlers } from "./clipboard.handler";
import { createAIHandler } from "./ai.handler";
import type { Crud } from "../storage/crud";
import type { PluginManager } from "../plugin/manager";
import type { AIService } from "../ai/service";

let registered = false;

/** registerIPCHandlers 选项 */
export interface RegisterIPCOptions {
  crud?: Crud;
  pluginManager?: PluginManager;
  aiService?: AIService;
}

/**
 * 统一注册所有 IPC handler。
 * 已实现的领域通过各自的 setup 函数注册，
 * 未实现的领域使用空壳 handler（抛出 Not implemented）。
 */
export function registerIPCHandlers(options?: RegisterIPCOptions): void {
  if (registered) {
    throw new Error("IPC handlers already registered. Duplicate registration is not allowed.");
  }

  const notImplemented = async (): Promise<never> => {
    throw new Error("Not implemented");
  };

  // fs 领域（Task 1.2 实现）
  setupFSHandlers(ipcMain);

  // clipboard 领域（Task 4.5 实现）
  setupClipboardHandlers(ipcMain);

  // shell 领域（Task 1.3 实现）
  setupShellHandlers(ipcMain);

  // ai 领域（Task 3.4 实现）
  if (options?.aiService) {
    const handler = createAIHandler(options.aiService);

    ipcMain.handle(IPC_CHANNELS.ai.chat, async (event, conversationId: string, content: string) => {
      return handler.chat(conversationId, content, (streamEvent) => {
        event.sender.send(IPC_CHANNELS.ai.stream, streamEvent);
      });
    });
    ipcMain.handle(IPC_CHANNELS.ai.getModels, async () => handler.getModels());
    ipcMain.handle(IPC_CHANNELS.ai.getConversations, async () => handler.getConversations());
    ipcMain.handle(IPC_CHANNELS.ai.getHistory, async (_event, conversationId: string) =>
      handler.getHistory(conversationId)
    );
    ipcMain.handle(IPC_CHANNELS.ai.deleteConversation, async (_event, id: string) =>
      handler.deleteConversation(id)
    );
    ipcMain.handle(
      IPC_CHANNELS.ai.updateSystemPrompt,
      async (_event, conversationId: string, systemPrompt: string | null) =>
        handler.updateSystemPrompt(conversationId, systemPrompt)
    );
    ipcMain.handle(
      IPC_CHANNELS.ai.deleteMessagesAfter,
      async (_event, conversationId: string, messageId: string) =>
        handler.deleteMessagesAfter(conversationId, messageId)
    );
    ipcMain.handle(IPC_CHANNELS.ai.regenerate, async (event, conversationId: string) =>
      handler.regenerate(conversationId, (streamEvent) => {
        event.sender.send(IPC_CHANNELS.ai.stream, streamEvent);
      })
    );
    ipcMain.handle(
      IPC_CHANNELS.ai.updateMessageContent,
      async (_event, messageId: string, content: string) =>
        handler.updateMessageContent(messageId, content)
    );
    ipcMain.handle(IPC_CHANNELS.ai.searchConversations, async (_event, query: string) =>
      handler.searchConversations(query)
    );
    ipcMain.handle(
      IPC_CHANNELS.ai.exportConversation,
      async (_event, conversationId: string, format: string) =>
        handler.exportConversation(conversationId, format)
    );
  } else {
    ipcMain.handle(IPC_CHANNELS.ai.chat, notImplemented);
    ipcMain.handle(IPC_CHANNELS.ai.getModels, notImplemented);
    ipcMain.handle(IPC_CHANNELS.ai.getConversations, notImplemented);
    ipcMain.handle(IPC_CHANNELS.ai.getHistory, notImplemented);
    ipcMain.handle(IPC_CHANNELS.ai.deleteConversation, notImplemented);
    ipcMain.handle(IPC_CHANNELS.ai.updateSystemPrompt, notImplemented);
    ipcMain.handle(IPC_CHANNELS.ai.deleteMessagesAfter, notImplemented);
    ipcMain.handle(IPC_CHANNELS.ai.regenerate, notImplemented);
    ipcMain.handle(IPC_CHANNELS.ai.updateMessageContent, notImplemented);
    ipcMain.handle(IPC_CHANNELS.ai.searchConversations, notImplemented);
    ipcMain.handle(IPC_CHANNELS.ai.exportConversation, notImplemented);
  }

  // plugin 领域
  if (options?.pluginManager) {
    const pm = options.pluginManager;
    ipcMain.handle(IPC_CHANNELS.plugin.list, async () => pm.getPluginList());
    ipcMain.handle(IPC_CHANNELS.plugin.enable, async (_event, id: string) => pm.enablePlugin(id));
    ipcMain.handle(IPC_CHANNELS.plugin.disable, async (_event, id: string) => pm.disablePlugin(id));
  } else {
    ipcMain.handle(IPC_CHANNELS.plugin.list, notImplemented);
    ipcMain.handle(IPC_CHANNELS.plugin.enable, notImplemented);
    ipcMain.handle(IPC_CHANNELS.plugin.disable, notImplemented);
  }

  // settings 领域（Task 1.6 实现）
  if (options?.crud) {
    setupSettingsHandlers(ipcMain, options.crud);
  } else {
    ipcMain.handle(IPC_CHANNELS.settings.get, notImplemented);
    ipcMain.handle(IPC_CHANNELS.settings.update, notImplemented);
    ipcMain.handle(IPC_CHANNELS.settings.reset, notImplemented);
  }

  registered = true;
}
