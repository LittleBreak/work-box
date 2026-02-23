import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'

/** workbox API exposed to renderer via contextBridge */
const workboxAPI = {
  fs: {
    readFile: (path: string): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.fs.readFile, path),
    writeFile: (path: string, data: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.fs.writeFile, path, data),
    readDir: (path: string): Promise<string[]> => ipcRenderer.invoke(IPC_CHANNELS.fs.readDir, path),
    stat: (path: string): Promise<import('@shared/types').FileStat> =>
      ipcRenderer.invoke(IPC_CHANNELS.fs.stat, path)
  },
  shell: {
    exec: (
      command: string,
      options?: import('@shared/types').ExecOptions
    ): Promise<import('@shared/types').ExecResult> =>
      ipcRenderer.invoke(IPC_CHANNELS.shell.exec, command, options)
  },
  ai: {
    chat: (params: unknown): Promise<unknown> => ipcRenderer.invoke(IPC_CHANNELS.ai.chat, params),
    getModels: (): Promise<unknown> => ipcRenderer.invoke(IPC_CHANNELS.ai.getModels)
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
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('workbox', workboxAPI)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.workbox = workboxAPI
}
