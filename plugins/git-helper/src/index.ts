/**
 * Git Helper Plugin Entry
 *
 * Git 操作助手插件，提供 Git 状态查询、stage/unstage、commit、
 * 分支管理、diff 查看和 commit 历史等功能。
 * activate() 中创建 GitService、注册 IPC handler、AI Tool 和命令，
 * deactivate() 中清理所有资源。
 */
import { ipcMain, BrowserWindow } from "electron";
import { GIT_CHANNELS, MAX_DIFF_LENGTH } from "./constants.ts";
import { GitService } from "./git-service.ts";
import type {
  PluginContext,
  PluginDefinition,
  Disposable,
  ToolDefinition
} from "@workbox/plugin-api";
import type { GitFileStatus, GitCommitInfo } from "./constants.ts";

/** 模块级 GitService 引用，供 deactivate 访问 */
let gitService: GitService | null = null;

/** 模块级 AI Tool Disposable 引用列表，供 deactivate 释放 */
let toolDisposables: Disposable[] = [];

/** 模块级 Command Disposable 引用，供 deactivate 释放 */
let commandDisposable: Disposable | null = null;

/**
 * Format git status as a human-readable summary for AI consumption.
 *
 * @param statuses - Parsed git file statuses
 * @returns Formatted status summary string
 */
export function formatStatusSummary(statuses: GitFileStatus[]): string {
  if (statuses.length === 0) {
    return "Working tree clean — no changes.";
  }

  const staged = statuses.filter((s) => s.staged);
  const unstaged = statuses.filter((s) => !s.staged && s.status !== "untracked");
  const untracked = statuses.filter((s) => s.status === "untracked");

  const lines: string[] = [];
  lines.push(`Git Status: ${statuses.length} file(s) changed`);

  if (staged.length > 0) {
    lines.push(`\nStaged (${staged.length}):`);
    for (const f of staged) {
      lines.push(`  ${f.status}: ${f.path}`);
    }
  }

  if (unstaged.length > 0) {
    lines.push(`\nUnstaged (${unstaged.length}):`);
    for (const f of unstaged) {
      lines.push(`  ${f.status}: ${f.path}`);
    }
  }

  if (untracked.length > 0) {
    lines.push(`\nUntracked (${untracked.length}):`);
    for (const f of untracked) {
      lines.push(`  ${f.path}`);
    }
  }

  return lines.join("\n");
}

/**
 * Format commit log entries as a human-readable list for AI consumption.
 *
 * @param commits - Parsed commit info list
 * @returns Formatted commit list string
 */
function formatLogSummary(commits: GitCommitInfo[]): string {
  if (commits.length === 0) {
    return "No commits found.";
  }

  const lines: string[] = [`Recent Commits (${commits.length}):`];
  for (const c of commits) {
    lines.push(`  ${c.shortHash} - ${c.message} (${c.author}, ${c.date})`);
  }
  return lines.join("\n");
}

/**
 * Create AI Tool definitions for the Git Helper plugin.
 *
 * @param service - GitService instance
 * @param ctx - Plugin context
 * @returns Array of ToolDefinition for registration
 */
function createGitTools(service: GitService, ctx: PluginContext): ToolDefinition[] {
  return [
    {
      name: "git_status",
      description: "获取当前 Git 仓库的文件状态摘要，包括已修改、已暂存、未跟踪的文件列表",
      parameters: {
        type: "object",
        properties: {
          cwd: { type: "string", description: "Git 仓库路径（可选，默认为工作区根目录）" }
        },
        required: []
      },
      handler: async (params: Record<string, unknown>): Promise<string> => {
        const statuses = await service.getStatus(params.cwd as string | undefined);
        return formatStatusSummary(statuses);
      }
    },
    {
      name: "git_commit",
      description: "暂存所有更改（git add -A）并创建 commit。需要提供 commit message 参数",
      parameters: {
        type: "object",
        properties: {
          message: { type: "string", description: "Commit 消息（必填）" },
          cwd: { type: "string", description: "Git 仓库路径（可选，默认为工作区根目录）" }
        },
        required: ["message"]
      },
      handler: async (params: Record<string, unknown>): Promise<string> => {
        const message = params.message as string | undefined;
        if (!message || message.trim().length === 0) {
          throw new Error("Commit message must not be empty");
        }

        const cwd = (params.cwd as string) ?? ctx.workspace.rootPath;

        // Stage all changes
        await ctx.shell.exec("git add -A", { cwd });
        // Commit
        await service.commit(message, cwd);

        return `Successfully committed: "${message}"`;
      }
    },
    {
      name: "git_diff",
      description:
        "获取 Git diff 输出（unified diff 格式）。支持查看暂存或未暂存的差异，可指定文件路径",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "指定文件路径（可选，默认查看所有文件）" },
          staged: {
            type: "boolean",
            description: "是否查看暂存区的差异（可选，默认查看未暂存的差异）"
          },
          cwd: { type: "string", description: "Git 仓库路径（可选，默认为工作区根目录）" }
        },
        required: []
      },
      handler: async (params: Record<string, unknown>): Promise<string> => {
        const cwd = (params.cwd as string) ?? ctx.workspace.rootPath;

        let cmd = "git diff --unified=3";
        if (params.staged) cmd += " --staged";
        if (params.path) cmd += ` -- ${params.path as string}`;

        const result = await ctx.shell.exec(cmd, { cwd });
        if (result.exitCode !== 0 && result.stderr) {
          throw new Error(result.stderr.trim().replace(/^fatal:\s*/i, ""));
        }

        let output = result.stdout;
        if (!output.trim()) {
          return "No differences found.";
        }

        if (output.length > MAX_DIFF_LENGTH) {
          output = output.slice(0, MAX_DIFF_LENGTH) + "\n...[diff output truncated]";
        }

        return output;
      }
    },
    {
      name: "git_log",
      description: "获取最近的 commit 历史列表。可指定返回条数",
      parameters: {
        type: "object",
        properties: {
          count: {
            type: "number",
            description: "返回的 commit 条数（可选，默认 50，最大 200）"
          },
          cwd: { type: "string", description: "Git 仓库路径（可选，默认为工作区根目录）" }
        },
        required: []
      },
      handler: async (params: Record<string, unknown>): Promise<string> => {
        const commits = await service.getLog({
          count: params.count as number | undefined,
          cwd: params.cwd as string | undefined
        });
        return formatLogSummary(commits);
      }
    }
  ];
}

/**
 * Show a commit message input prompt by injecting a dialog overlay
 * into the focused BrowserWindow's renderer.
 *
 * @returns The commit message entered by the user, or null if cancelled
 */
async function showCommitPrompt(): Promise<string | null> {
  const win = BrowserWindow.getFocusedWindow();
  if (!win) return null;

  try {
    const result = await win.webContents.executeJavaScript(`
      (() => {
        return new Promise((resolve) => {
          const overlay = document.createElement('div');
          overlay.id = 'git-quick-commit-overlay';
          overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:99999;';

          const dialog = document.createElement('div');
          dialog.style.cssText = 'background:#1e1e1e;color:#fff;padding:24px;border-radius:8px;width:400px;font-family:system-ui;';
          dialog.innerHTML =
            '<p style="margin:0 0 12px;font-size:14px;">Enter commit message:</p>' +
            '<input id="git-commit-msg" type="text" placeholder="feat: ..." ' +
            'style="width:100%;padding:8px;box-sizing:border-box;border:1px solid #555;border-radius:4px;background:#2d2d2d;color:#fff;font-size:14px;outline:none;">' +
            '<div style="margin-top:16px;text-align:right;">' +
            '<button id="git-commit-cancel" style="padding:6px 16px;margin-right:8px;border:1px solid #555;border-radius:4px;background:transparent;color:#fff;cursor:pointer;">Cancel</button>' +
            '<button id="git-commit-ok" style="padding:6px 16px;border:none;border-radius:4px;background:#0078d4;color:#fff;cursor:pointer;">Commit</button>' +
            '</div>';
          overlay.appendChild(dialog);
          document.body.appendChild(overlay);

          const input = document.getElementById('git-commit-msg');
          input.focus();

          const cleanup = (value) => {
            overlay.remove();
            resolve(value);
          };

          document.getElementById('git-commit-ok').onclick = () => cleanup(input.value || null);
          document.getElementById('git-commit-cancel').onclick = () => cleanup(null);
          overlay.onclick = (e) => { if (e.target === overlay) cleanup(null); };
          input.onkeydown = (e) => {
            if (e.key === 'Enter') cleanup(input.value || null);
            if (e.key === 'Escape') cleanup(null);
          };
        });
      })()
    `);
    return result as string | null;
  } catch {
    return null;
  }
}

/**
 * Execute quick-commit workflow.
 * Checks status, prompts for message, stages all, and commits.
 * Exported for testing purposes.
 *
 * @param service - Git service (or mock) providing getStatus/commit
 * @param ctx - Plugin context for shell/notification access
 * @param getCommitMessage - Async function to prompt user for commit message
 */
export async function executeQuickCommit(
  service: Pick<GitService, "getStatus" | "commit">,
  ctx: PluginContext,
  getCommitMessage: () => Promise<string | null>
): Promise<void> {
  const statuses = await service.getStatus();
  if (statuses.length === 0) {
    ctx.notification.info("没有需要提交的更改");
    return;
  }

  const message = await getCommitMessage();
  if (!message || message.trim().length === 0) {
    return;
  }

  // Stage all changes
  await ctx.shell.exec("git add -A", { cwd: ctx.workspace.rootPath });
  // Commit
  await service.commit(message);
  ctx.notification.success(`已提交: ${message}`);
}

/** Git Helper 插件定义 */
const gitHelperPlugin: PluginDefinition = {
  name: "Git Helper",

  async activate(ctx: PluginContext): Promise<void> {
    gitService = new GitService(ctx);

    // ---- IPC Handlers ----

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

    // ---- AI Tools ----
    const tools = createGitTools(gitService, ctx);
    toolDisposables = tools.map((tool) => ctx.ai.registerTool(tool));

    // ---- Commands ----
    commandDisposable = ctx.commands.register("quick-commit", async () => {
      if (!gitService) throw new Error("Git Helper plugin not active");
      await executeQuickCommit(gitService, ctx, showCommitPrompt);
    });
  },

  async deactivate(): Promise<void> {
    // 注销 AI Tools
    for (const d of toolDisposables) {
      d.dispose();
    }
    toolDisposables = [];

    // 注销 Command
    if (commandDisposable) {
      commandDisposable.dispose();
      commandDisposable = null;
    }

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
