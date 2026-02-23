import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { setupFSHandlers } from './fs.handler'

let registered = false

/**
 * 统一注册所有 IPC handler。
 * 已实现的领域通过各自的 setup 函数注册，
 * 未实现的领域使用空壳 handler（抛出 Not implemented）。
 */
export function registerIPCHandlers(): void {
  if (registered) {
    throw new Error('IPC handlers already registered. Duplicate registration is not allowed.')
  }

  const notImplemented = async (): Promise<never> => {
    throw new Error('Not implemented')
  }

  // fs 领域（Task 1.2 实现）
  setupFSHandlers(ipcMain)

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
