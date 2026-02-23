import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'

let registered = false

/**
 * 统一注册所有 IPC handler。
 * Task 1.1 阶段所有 handler 为空壳实现（抛出 Not implemented）。
 * 后续 Task 1.2/1.3/1.6 实现具体 handler 后替换对应空壳。
 */
export function registerIPCHandlers(): void {
  if (registered) {
    throw new Error('IPC handlers already registered. Duplicate registration is not allowed.')
  }

  const notImplemented = async (): Promise<never> => {
    throw new Error('Not implemented')
  }

  // fs 领域
  ipcMain.handle(IPC_CHANNELS.fs.readFile, notImplemented)
  ipcMain.handle(IPC_CHANNELS.fs.writeFile, notImplemented)
  ipcMain.handle(IPC_CHANNELS.fs.readDir, notImplemented)
  ipcMain.handle(IPC_CHANNELS.fs.stat, notImplemented)

  // shell 领域
  ipcMain.handle(IPC_CHANNELS.shell.exec, notImplemented)

  // ai 领域
  ipcMain.handle(IPC_CHANNELS.ai.chat, notImplemented)
  ipcMain.handle(IPC_CHANNELS.ai.getModels, notImplemented)

  // plugin 领域
  ipcMain.handle(IPC_CHANNELS.plugin.list, notImplemented)
  ipcMain.handle(IPC_CHANNELS.plugin.enable, notImplemented)
  ipcMain.handle(IPC_CHANNELS.plugin.disable, notImplemented)

  // settings 领域
  ipcMain.handle(IPC_CHANNELS.settings.get, notImplemented)
  ipcMain.handle(IPC_CHANNELS.settings.update, notImplemented)
  ipcMain.handle(IPC_CHANNELS.settings.reset, notImplemented)

  registered = true
}
