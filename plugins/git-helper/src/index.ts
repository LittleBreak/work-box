/**
 * Git Helper Plugin Entry
 *
 * Git 操作助手插件，提供 Git 状态查询、stage/unstage、commit、
 * 分支管理、diff 查看和 commit 历史等功能。
 * activate() 中创建 GitService、注册 IPC handler，
 * deactivate() 中清理所有资源。
 */
import { ipcMain } from "electron";
import { GIT_CHANNELS } from "./constants.ts";
import { GitService } from "./git-service.ts";
import type { PluginContext, PluginDefinition } from "@workbox/plugin-api";

/** 模块级 GitService 引用，供 deactivate 访问 */
let gitService: GitService | null = null;

/** Git Helper 插件定义 */
const gitHelperPlugin: PluginDefinition = {
  name: "Git Helper",

  async activate(ctx: PluginContext): Promise<void> {
    gitService = new GitService(ctx);

    // git:status — 获取当前 Git 状态
    ipcMain.handle(GIT_CHANNELS.status, async () => {
      if (!gitService) throw new Error("Git Helper plugin not active");
      return gitService.getStatus();
    });

    // git:stage — 暂存文件
    ipcMain.handle(GIT_CHANNELS.stage, async (_event, paths: string[]) => {
      if (!gitService) throw new Error("Git Helper plugin not active");
      return gitService.stage(paths);
    });

    // git:unstage — 取消暂存
    ipcMain.handle(GIT_CHANNELS.unstage, async (_event, paths: string[]) => {
      if (!gitService) throw new Error("Git Helper plugin not active");
      return gitService.unstage(paths);
    });

    // git:commit — 提交
    ipcMain.handle(GIT_CHANNELS.commit, async (_event, message: string) => {
      if (!gitService) throw new Error("Git Helper plugin not active");
      return gitService.commit(message);
    });

    // git:branches — 获取分支列表
    ipcMain.handle(GIT_CHANNELS.branches, async () => {
      if (!gitService) throw new Error("Git Helper plugin not active");
      return gitService.getBranches();
    });

    // git:checkout — 切换分支
    ipcMain.handle(GIT_CHANNELS.checkout, async (_event, branch: string) => {
      if (!gitService) throw new Error("Git Helper plugin not active");
      return gitService.checkout(branch);
    });

    // git:diff — 获取 diff
    ipcMain.handle(
      GIT_CHANNELS.diff,
      async (_event, options?: { path?: string; staged?: boolean; cwd?: string }) => {
        if (!gitService) throw new Error("Git Helper plugin not active");
        return gitService.getDiff(options);
      }
    );

    // git:log — 获取 commit 历史
    ipcMain.handle(GIT_CHANNELS.log, async (_event, options?: { count?: number; cwd?: string }) => {
      if (!gitService) throw new Error("Git Helper plugin not active");
      return gitService.getLog(options);
    });
  },

  async deactivate(): Promise<void> {
    gitService = null;

    // 移除所有 Git Helper IPC handler
    ipcMain.removeHandler(GIT_CHANNELS.status);
    ipcMain.removeHandler(GIT_CHANNELS.stage);
    ipcMain.removeHandler(GIT_CHANNELS.unstage);
    ipcMain.removeHandler(GIT_CHANNELS.commit);
    ipcMain.removeHandler(GIT_CHANNELS.branches);
    ipcMain.removeHandler(GIT_CHANNELS.checkout);
    ipcMain.removeHandler(GIT_CHANNELS.diff);
    ipcMain.removeHandler(GIT_CHANNELS.log);
  }
};

export default gitHelperPlugin;
