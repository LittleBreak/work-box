import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNELS } from "@shared/ipc-channels";

/** workbox API exposed to renderer via contextBridge */
const workboxAPI = {
  fs: {
    readFile: (path: string): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.fs.readFile, path),
    writeFile: (path: string, data: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.fs.writeFile, path, data),
    readDir: (path: string): Promise<string[]> => ipcRenderer.invoke(IPC_CHANNELS.fs.readDir, path),
    stat: (path: string): Promise<import("@shared/types").FileStat> =>
      ipcRenderer.invoke(IPC_CHANNELS.fs.stat, path)
  },
  shell: {
    exec: (
      command: string,
      options?: import("@shared/types").ExecOptions
    ): Promise<import("@shared/types").ExecResult> =>
      ipcRenderer.invoke(IPC_CHANNELS.shell.exec, command, options)
  },
  ai: {
    chat: (conversationId: string, content: string): Promise<import("@shared/types").ChatResult> =>
      ipcRenderer.invoke(IPC_CHANNELS.ai.chat, conversationId, content),
    getModels: (): Promise<Array<import("../main/ai/types").ModelInfo>> =>
      ipcRenderer.invoke(IPC_CHANNELS.ai.getModels),
    getConversations: (): Promise<unknown[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.ai.getConversations),
    getHistory: (conversationId: string): Promise<unknown[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.ai.getHistory, conversationId),
    deleteConversation: (id: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.ai.deleteConversation, id),
    updateSystemPrompt: (conversationId: string, systemPrompt: string | null): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.ai.updateSystemPrompt, conversationId, systemPrompt),
    deleteMessagesAfter: (conversationId: string, messageId: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.ai.deleteMessagesAfter, conversationId, messageId),
    regenerate: (conversationId: string): Promise<import("@shared/types").ChatResult> =>
      ipcRenderer.invoke(IPC_CHANNELS.ai.regenerate, conversationId),
    updateMessageContent: (messageId: string, content: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.ai.updateMessageContent, messageId, content),
    searchConversations: (query: string): Promise<unknown[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.ai.searchConversations, query),
    exportConversation: (conversationId: string, format: string): Promise<string | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.ai.exportConversation, conversationId, format),
    onStream: (callback: (event: import("@shared/types").StreamEvent) => void): (() => void) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        data: import("@shared/types").StreamEvent
      ): void => {
        callback(data);
      };
      ipcRenderer.on(IPC_CHANNELS.ai.stream, handler);
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.ai.stream, handler);
      };
    }
  },
  clipboard: {
    writeText: (text: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.clipboard.writeText, text)
  },
  workspace: {
    selectFile: (filters?: Array<{ name: string; extensions: string[] }>): Promise<string | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.workspace.selectFile, filters)
  },
  plugin: {
    list: (): Promise<unknown> => ipcRenderer.invoke(IPC_CHANNELS.plugin.list),
    enable: (id: string): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.plugin.enable, id),
    disable: (id: string): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.plugin.disable, id)
  },
  settings: {
    get: (): Promise<unknown> => ipcRenderer.invoke(IPC_CHANNELS.settings.get),
    update: (settings: Record<string, unknown>): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.settings.update, settings),
    reset: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.settings.reset)
  },
  terminal: {
    create: (options?: import("@shared/types").TerminalCreateOptions): Promise<string> =>
      ipcRenderer.invoke(IPC_CHANNELS.terminal.create, options),
    write: (sessionId: string, data: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.terminal.write, sessionId, data),
    resize: (sessionId: string, cols: number, rows: number): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.terminal.resize, sessionId, cols, rows),
    close: (sessionId: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.terminal.close, sessionId),
    list: (): Promise<string[]> => ipcRenderer.invoke(IPC_CHANNELS.terminal.list),
    onData: (callback: (sessionId: string, data: string) => void): (() => void) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        sessionId: string,
        data: string
      ): void => {
        callback(sessionId, data);
      };
      ipcRenderer.on(IPC_CHANNELS.terminal.data, handler);
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.terminal.data, handler);
      };
    },
    onExit: (callback: (sessionId: string, exitCode: number) => void): (() => void) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        sessionId: string,
        exitCode: number
      ): void => {
        callback(sessionId, exitCode);
      };
      ipcRenderer.on(IPC_CHANNELS.terminal.exit, handler);
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.terminal.exit, handler);
      };
    }
  }
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("workbox", workboxAPI);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  window.workbox = workboxAPI;
}
