/**
 * File Explorer Plugin Entry
 *
 * 文件浏览器插件，提供目录浏览、文件预览、搜索和文件管理功能。
 * activate() 中创建 FileService、注册 IPC handler，
 * deactivate() 中清理所有资源。
 */
import { ipcMain } from "electron";
import { FILE_EXPLORER_CHANNELS } from "./constants.ts";
import { FileService } from "./file-service.ts";
import type { PluginContext, PluginDefinition } from "@workbox/plugin-api";
import type { SearchOptions } from "./constants.ts";

/** 模块级 FileService 引用，供 deactivate 访问 */
let fileService: FileService | null = null;

/** File Explorer 插件定义 */
const fileExplorerPlugin: PluginDefinition = {
  name: "File Explorer",

  async activate(ctx: PluginContext): Promise<void> {
    fileService = new FileService(ctx, process.cwd());

    // fileExplorer:getRootPath — 获取工作区根路径
    ipcMain.handle(FILE_EXPLORER_CHANNELS.getRootPath, () => {
      return fileService?.getRootPath() ?? process.cwd();
    });

    // fileExplorer:listDir — 列出目录内容
    ipcMain.handle(FILE_EXPLORER_CHANNELS.listDir, async (_event, dirPath: string) => {
      if (!fileService) throw new Error("File Explorer plugin not active");
      return fileService.listDir(dirPath);
    });

    // fileExplorer:readPreview — 读取文件预览
    ipcMain.handle(FILE_EXPLORER_CHANNELS.readPreview, async (_event, filePath: string) => {
      if (!fileService) throw new Error("File Explorer plugin not active");
      return fileService.readPreview(filePath);
    });

    // fileExplorer:searchFiles — 搜索文件
    ipcMain.handle(
      FILE_EXPLORER_CHANNELS.searchFiles,
      async (_event, dirPath: string, query: string, options: SearchOptions) => {
        if (!fileService) throw new Error("File Explorer plugin not active");
        return fileService.searchFiles(dirPath, query, options);
      }
    );

    // fileExplorer:createFile — 创建文件
    ipcMain.handle(
      FILE_EXPLORER_CHANNELS.createFile,
      async (_event, filePath: string, content: string) => {
        if (!fileService) throw new Error("File Explorer plugin not active");
        return fileService.createFile(filePath, content);
      }
    );

    // fileExplorer:createDir — 创建目录
    ipcMain.handle(FILE_EXPLORER_CHANNELS.createDir, async (_event, dirPath: string) => {
      if (!fileService) throw new Error("File Explorer plugin not active");
      return fileService.createDir(dirPath);
    });

    // fileExplorer:rename — 重命名
    ipcMain.handle(
      FILE_EXPLORER_CHANNELS.rename,
      async (_event, oldPath: string, newPath: string) => {
        if (!fileService) throw new Error("File Explorer plugin not active");
        return fileService.rename(oldPath, newPath);
      }
    );

    // fileExplorer:deleteItem — 删除文件/目录
    ipcMain.handle(FILE_EXPLORER_CHANNELS.deleteItem, async (_event, targetPath: string) => {
      if (!fileService) throw new Error("File Explorer plugin not active");
      return fileService.deleteItem(targetPath);
    });
  },

  async deactivate(): Promise<void> {
    fileService = null;

    // 移除所有 File Explorer IPC handler
    ipcMain.removeHandler(FILE_EXPLORER_CHANNELS.getRootPath);
    ipcMain.removeHandler(FILE_EXPLORER_CHANNELS.listDir);
    ipcMain.removeHandler(FILE_EXPLORER_CHANNELS.readPreview);
    ipcMain.removeHandler(FILE_EXPLORER_CHANNELS.searchFiles);
    ipcMain.removeHandler(FILE_EXPLORER_CHANNELS.createFile);
    ipcMain.removeHandler(FILE_EXPLORER_CHANNELS.createDir);
    ipcMain.removeHandler(FILE_EXPLORER_CHANNELS.rename);
    ipcMain.removeHandler(FILE_EXPLORER_CHANNELS.deleteItem);
  }
};

export default fileExplorerPlugin;
