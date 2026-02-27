import { clipboard } from "electron";
import { IPC_CHANNELS } from "@shared/ipc-channels";

/**
 * 将文本写入系统剪贴板。
 * 使用 Electron clipboard API（不使用 navigator.clipboard）。
 */
export function writeTextToClipboard(text: string): void {
  clipboard.writeText(text);
}

/**
 * 注册 clipboard 领域的 IPC handler。
 */
export function setupClipboardHandlers(ipcMain: Electron.IpcMain): void {
  ipcMain.handle(IPC_CHANNELS.clipboard.writeText, async (_event, text: string) => {
    writeTextToClipboard(text);
  });
}
