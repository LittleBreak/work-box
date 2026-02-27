import { IPC_CHANNELS } from "@shared/ipc-channels";

/** showOpenDialog 函数签名 */
type ShowOpenDialogFn = (
  options: Electron.OpenDialogOptions
) => Promise<Electron.OpenDialogReturnValue>;

/**
 * 注册 workspace 领域的 IPC handler。
 * 通过依赖注入接收 showOpenDialog，便于测试。
 */
export function setupWorkspaceHandlers(
  ipcMain: Electron.IpcMain,
  showOpenDialog: ShowOpenDialogFn
): void {
  ipcMain.handle(
    IPC_CHANNELS.workspace.selectFile,
    async (
      _event,
      filters?: Array<{ name: string; extensions: string[] }>
    ): Promise<string | null> => {
      const result = await showOpenDialog({
        properties: ["openFile"],
        filters
      });
      if (result.canceled || result.filePaths.length === 0) return null;
      return result.filePaths[0];
    }
  );
}
