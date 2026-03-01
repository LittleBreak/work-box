import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { parseManifest, scanPlugins } from "../../../src/main/plugin/engine";
import { PluginManager } from "../../../src/main/plugin/manager";
import type { SystemServices } from "../../../src/main/plugin/context";
import type { PluginContext, ToolDefinition } from "@workbox/plugin-api";

// Mock electron for direct plugin testing (ipcMain.handle / BrowserWindow)
vi.mock("electron", () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn()
  },
  BrowserWindow: {
    getFocusedWindow: vi.fn().mockReturnValue(null),
    getAllWindows: vi.fn().mockReturnValue([])
  }
}));

/** Git Helper 插件的 package.json 路径 */
const GIT_HELPER_PLUGIN_DIR = path.resolve(__dirname, "..");

/** 读取 Git Helper 插件的 package.json */
function readGitHelperPackageJson(): Record<string, unknown> {
  const raw = fs.readFileSync(path.join(GIT_HELPER_PLUGIN_DIR, "package.json"), "utf-8");
  return JSON.parse(raw) as Record<string, unknown>;
}

/** 创建 mock SystemServices */
function createMockServices(): SystemServices {
  return {
    fsHandler: {
      readFile: vi.fn().mockResolvedValue(Buffer.from("content")),
      writeFile: vi.fn().mockResolvedValue(undefined),
      readDir: vi.fn().mockResolvedValue(["file1.ts"]),
      stat: vi
        .fn()
        .mockResolvedValue({ size: 100, isFile: true, isDirectory: false, mtime: Date.now() }),
      watch: vi.fn().mockReturnValue({ dispose: vi.fn() })
    },
    shellHandler: {
      exec: vi.fn().mockResolvedValue({ stdout: "ok", stderr: "", exitCode: 0 })
    },
    crud: {
      getPluginData: vi.fn().mockReturnValue(undefined),
      setPluginData: vi.fn(),
      deletePluginData: vi.fn(),
      deleteAllPluginData: vi.fn()
    },
    notificationSender: vi.fn(),
    dialogOpener: {
      selectFolder: vi.fn().mockResolvedValue(null),
      selectFile: vi.fn().mockResolvedValue(null)
    },
    commandRegistry: {
      register: vi.fn().mockReturnValue({ dispose: vi.fn() })
    },
    toolRegistry: {
      register: vi.fn().mockReturnValue({ dispose: vi.fn() })
    }
  };
}

/**
 * 在临时目录创建带有可执行 index.js 的 Git Helper 插件副本，
 * 用于 PluginManager 测试（因为 PluginManager 通过 require 加载 entry.main）
 */
function createGitHelperPluginCopy(baseDir: string): string {
  const pluginDir = path.join(baseDir, "git-helper");
  const srcDir = path.join(pluginDir, "src");
  fs.mkdirSync(srcDir, { recursive: true });

  // 复制 package.json
  const pkgJson = readGitHelperPackageJson();
  // 将 entry.main 改为指向 .js 文件以便 require 加载
  const workbox = pkgJson.workbox as Record<string, unknown>;
  const entry = workbox.entry as Record<string, unknown>;
  entry.main = "./src/index.js";
  fs.writeFileSync(path.join(pluginDir, "package.json"), JSON.stringify(pkgJson, null, 2));

  // 创建可执行的 index.js（模拟 index.ts 编译后的结果）
  fs.writeFileSync(
    path.join(srcDir, "index.js"),
    `module.exports = {
      default: {
        name: "Git Helper",
        activate: async (ctx) => {},
        deactivate: async () => {}
      }
    };`
  );

  return pluginDir;
}

describe("Git Helper Plugin - parseManifest", () => {
  it("正确解析 Git Helper 插件的 package.json", () => {
    const pkgJson = readGitHelperPackageJson();
    const parsed = parseManifest(pkgJson, GIT_HELPER_PLUGIN_DIR);

    expect(parsed.id).toBe("@workbox/plugin-git-helper");
    expect(parsed.version).toBe("0.1.0");
    expect(parsed.config.name).toBe("Git Helper");
    expect(parsed.config.description).toBe(
      "一键 Git 操作助手，提供 Git 状态查询、提交、分支管理等功能"
    );
    expect(parsed.config.permissions).toEqual(["fs:read", "shell:exec"]);
    expect(parsed.config.entry.main).toBe("./src/index.ts");
    expect(parsed.config.entry.ui).toBe("./src/ui/GitPanel.tsx");
  });

  it("解析 commands 和 ai 配置", () => {
    const pkgJson = readGitHelperPackageJson();
    const parsed = parseManifest(pkgJson, GIT_HELPER_PLUGIN_DIR);

    expect(parsed.config.commands).toEqual([
      { id: "quick-commit", title: "Quick Commit", shortcut: "CmdOrCtrl+Shift+C" }
    ]);
    expect(parsed.config.ai).toEqual({
      tools: ["git_status", "git_commit", "git_diff", "git_log"]
    });
  });
});

describe("Git Helper Plugin - scanPlugins", () => {
  it("PluginManager 可扫描到 Git Helper 插件", () => {
    const pluginsDir = path.resolve(__dirname, "../..");
    const result = scanPlugins([pluginsDir]);

    expect(result.valid.length).toBeGreaterThanOrEqual(1);
    const gitHelper = result.valid.find((p) => p.id === "@workbox/plugin-git-helper");
    expect(gitHelper).toBeDefined();
    expect(gitHelper?.config.name).toBe("Git Helper");
  });
});

describe("Git Helper Plugin - PluginManager lifecycle", () => {
  let tmpDir: string;
  let mockServices: SystemServices;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "workbox-git-helper-"));
    mockServices = createMockServices();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("Git Helper 插件 activate() 被调用且不报错", async () => {
    createGitHelperPluginCopy(tmpDir);
    const pm = new PluginManager(mockServices);
    await pm.loadAll([tmpDir]);

    const list = pm.getPluginList();
    const gh = list.find((p) => p.id === "@workbox/plugin-git-helper");
    expect(gh).toBeDefined();
    expect(gh?.status).toBe("active");
    expect(gh?.error).toBeUndefined();
  });

  it("Git Helper 插件状态变为 active", async () => {
    createGitHelperPluginCopy(tmpDir);
    const pm = new PluginManager(mockServices);
    await pm.loadAll([tmpDir]);

    const list = pm.getPluginList();
    const gh = list.find((p) => p.id === "@workbox/plugin-git-helper");
    expect(gh?.status).toBe("active");
  });

  it("deactivate() 被调用且不报错", async () => {
    createGitHelperPluginCopy(tmpDir);
    const pm = new PluginManager(mockServices);
    await pm.loadAll([tmpDir]);

    // shutdown 调用 deactivate
    await expect(pm.shutdown()).resolves.not.toThrow();

    const list = pm.getPluginList();
    const gh = list.find((p) => p.id === "@workbox/plugin-git-helper");
    expect(gh?.status).toBe("unloaded");
  });
});

// ============================================================
// Direct plugin testing: AI Tools & Commands
// ============================================================

// Lazy-import the real plugin (after vi.mock("electron") is applied)

const {
  default: gitHelperPlugin,
  executeQuickCommit,
  formatStatusSummary
} = await import("./index.ts");

/** Mock plugin context data returned by createMockPluginContext */
interface MockPluginContextData {
  ctx: PluginContext;
  shellExec: ReturnType<typeof vi.fn>;
  registeredTools: ToolDefinition[];
  registeredCommands: { id: string; handler: () => Promise<void> }[];
  toolDisposables: Array<{ dispose: ReturnType<typeof vi.fn> }>;
  commandDisposables: Array<{ dispose: ReturnType<typeof vi.fn> }>;
}

/** Create a mock PluginContext with capturing of registered tools/commands */
function createMockPluginContext(): MockPluginContextData {
  const registeredTools: ToolDefinition[] = [];
  const registeredCommands: { id: string; handler: () => Promise<void> }[] = [];
  const toolDisposables: Array<{ dispose: ReturnType<typeof vi.fn> }> = [];
  const commandDisposables: Array<{ dispose: ReturnType<typeof vi.fn> }> = [];

  const shellExec = vi.fn().mockResolvedValue({ stdout: "", stderr: "", exitCode: 0 });

  const ctx = {
    plugin: {
      id: "@workbox/plugin-git-helper",
      name: "Git Helper",
      version: "0.1.0",
      dataPath: "/tmp/git-helper"
    },
    fs: {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      readDir: vi.fn(),
      stat: vi.fn(),
      watch: vi.fn()
    },
    shell: { exec: shellExec },
    ai: {
      chat: vi.fn(),
      registerTool: vi.fn().mockImplementation((tool: ToolDefinition) => {
        registeredTools.push(tool);
        const d = { dispose: vi.fn() };
        toolDisposables.push(d);
        return d;
      })
    },
    commands: {
      register: vi.fn().mockImplementation((id: string, handler: () => Promise<void>) => {
        registeredCommands.push({ id, handler });
        const d = { dispose: vi.fn() };
        commandDisposables.push(d);
        return d;
      })
    },
    notification: {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn()
    },
    workspace: {
      rootPath: "/test/repo",
      selectFolder: vi.fn(),
      selectFile: vi.fn()
    },
    storage: {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn()
    }
  } as unknown as PluginContext;

  return {
    ctx,
    shellExec,
    registeredTools,
    registeredCommands,
    toolDisposables,
    commandDisposables
  };
}

describe("Git Helper Plugin - AI Tool registration", () => {
  let mockData: ReturnType<typeof createMockPluginContext>;

  beforeEach(async () => {
    mockData = createMockPluginContext();
    await gitHelperPlugin.activate(mockData.ctx);
  });

  afterEach(async () => {
    await gitHelperPlugin.deactivate?.();
  });

  it("注册四个 AI Tool (git_status, git_commit, git_diff, git_log)", () => {
    expect(mockData.ctx.ai.registerTool).toHaveBeenCalledTimes(4);
    const names = mockData.registeredTools.map((t: ToolDefinition) => t.name);
    expect(names).toContain("git_status");
    expect(names).toContain("git_commit");
    expect(names).toContain("git_diff");
    expect(names).toContain("git_log");
  });

  it("注册 quick-commit 命令", () => {
    expect(mockData.ctx.commands.register).toHaveBeenCalledTimes(1);
    expect(mockData.registeredCommands[0].id).toBe("quick-commit");
  });

  it("每个 Tool 定义包含 name、description、parameters 和 handler", () => {
    for (const tool of mockData.registeredTools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.parameters).toBeDefined();
      expect(typeof tool.handler).toBe("function");
    }
  });
});

describe("Git Helper Plugin - git_status Tool handler", () => {
  let mockData: ReturnType<typeof createMockPluginContext>;
  let statusTool: ToolDefinition;

  beforeEach(async () => {
    mockData = createMockPluginContext();
    await gitHelperPlugin.activate(mockData.ctx);
    statusTool = mockData.registeredTools.find((t: ToolDefinition) => t.name === "git_status")!;
  });

  afterEach(async () => {
    await gitHelperPlugin.deactivate?.();
  });

  it("返回人类可读的状态摘要", async () => {
    mockData.shellExec.mockResolvedValue({
      stdout: " M src/index.ts\nA  new-file.ts\n?? untracked.txt\n",
      stderr: "",
      exitCode: 0
    });

    const result = await statusTool.handler({});

    expect(result).toContain("modified");
    expect(result).toContain("src/index.ts");
    expect(result).toContain("untracked");
    expect(result).toContain("untracked.txt");
  });

  it("工作区干净时返回无更改提示", async () => {
    mockData.shellExec.mockResolvedValue({
      stdout: "",
      stderr: "",
      exitCode: 0
    });

    const result = await statusTool.handler({});
    expect(result).toContain("clean");
  });

  it("非 Git 仓库返回错误", async () => {
    mockData.shellExec.mockResolvedValue({
      stdout: "",
      stderr: "fatal: not a git repository",
      exitCode: 128
    });

    await expect(statusTool.handler({})).rejects.toThrow("not a git repository");
  });

  it("支持 cwd 参数指定仓库路径", async () => {
    mockData.shellExec.mockResolvedValue({ stdout: "", stderr: "", exitCode: 0 });

    await statusTool.handler({ cwd: "/other/repo" });

    expect(mockData.shellExec).toHaveBeenCalledWith(
      "git status --porcelain",
      expect.objectContaining({ cwd: "/other/repo" })
    );
  });
});

describe("Git Helper Plugin - git_commit Tool handler", () => {
  let mockData: ReturnType<typeof createMockPluginContext>;
  let commitTool: ToolDefinition;

  beforeEach(async () => {
    mockData = createMockPluginContext();
    await gitHelperPlugin.activate(mockData.ctx);
    commitTool = mockData.registeredTools.find((t: ToolDefinition) => t.name === "git_commit")!;
  });

  afterEach(async () => {
    await gitHelperPlugin.deactivate?.();
  });

  it("执行 git add -A 后 git commit", async () => {
    mockData.shellExec.mockResolvedValue({ stdout: "", stderr: "", exitCode: 0 });

    const result = await commitTool.handler({ message: "feat: test commit" });

    // 验证 git add -A 被调用
    expect(mockData.shellExec).toHaveBeenCalledWith(
      "git add -A",
      expect.objectContaining({ cwd: "/test/repo" })
    );
    // 验证 git commit 被调用
    expect(mockData.shellExec).toHaveBeenCalledWith(
      expect.stringContaining("git commit -m"),
      expect.objectContaining({ cwd: "/test/repo" })
    );
    expect(result).toContain("feat: test commit");
  });

  it("空 message 抛出错误", async () => {
    await expect(commitTool.handler({ message: "" })).rejects.toThrow(
      "Commit message must not be empty"
    );
  });

  it("无 message 参数抛出错误", async () => {
    await expect(commitTool.handler({})).rejects.toThrow("Commit message must not be empty");
  });

  it("支持 cwd 参数指定仓库路径", async () => {
    mockData.shellExec.mockResolvedValue({ stdout: "", stderr: "", exitCode: 0 });

    await commitTool.handler({ message: "test", cwd: "/other/repo" });

    expect(mockData.shellExec).toHaveBeenCalledWith(
      "git add -A",
      expect.objectContaining({ cwd: "/other/repo" })
    );
  });
});

describe("Git Helper Plugin - git_diff Tool handler", () => {
  let mockData: ReturnType<typeof createMockPluginContext>;
  let diffTool: ToolDefinition;

  beforeEach(async () => {
    mockData = createMockPluginContext();
    await gitHelperPlugin.activate(mockData.ctx);
    diffTool = mockData.registeredTools.find((t: ToolDefinition) => t.name === "git_diff")!;
  });

  afterEach(async () => {
    await gitHelperPlugin.deactivate?.();
  });

  it("返回 unified diff 文本", async () => {
    const diffText =
      "diff --git a/file.ts b/file.ts\n--- a/file.ts\n+++ b/file.ts\n@@ -1,3 +1,3 @@\n-old\n+new\n";
    mockData.shellExec.mockResolvedValue({ stdout: diffText, stderr: "", exitCode: 0 });

    const result = await diffTool.handler({});
    expect(result).toBe(diffText);
  });

  it("超长 diff 输出被截断至 10000 字符", async () => {
    const longDiff = "x".repeat(15000);
    mockData.shellExec.mockResolvedValue({ stdout: longDiff, stderr: "", exitCode: 0 });

    const result = (await diffTool.handler({})) as string;
    expect(result.length).toBeLessThanOrEqual(10000 + 50); // + truncation message
    expect(result).toContain("[diff output truncated]");
  });

  it("无差异时返回提示", async () => {
    mockData.shellExec.mockResolvedValue({ stdout: "", stderr: "", exitCode: 0 });

    const result = await diffTool.handler({});
    expect(result).toContain("No differences");
  });

  it("支持 staged 参数", async () => {
    mockData.shellExec.mockResolvedValue({ stdout: "", stderr: "", exitCode: 0 });

    await diffTool.handler({ staged: true });

    expect(mockData.shellExec).toHaveBeenCalledWith(
      expect.stringContaining("--staged"),
      expect.any(Object)
    );
  });

  it("支持 path 参数", async () => {
    mockData.shellExec.mockResolvedValue({ stdout: "", stderr: "", exitCode: 0 });

    await diffTool.handler({ path: "src/file.ts" });

    expect(mockData.shellExec).toHaveBeenCalledWith(
      expect.stringContaining("-- src/file.ts"),
      expect.any(Object)
    );
  });
});

describe("Git Helper Plugin - git_log Tool handler", () => {
  let mockData: ReturnType<typeof createMockPluginContext>;
  let logTool: ToolDefinition;

  beforeEach(async () => {
    mockData = createMockPluginContext();
    await gitHelperPlugin.activate(mockData.ctx);
    logTool = mockData.registeredTools.find((t: ToolDefinition) => t.name === "git_log")!;
  });

  afterEach(async () => {
    await gitHelperPlugin.deactivate?.();
  });

  it("返回格式化的 commit 列表", async () => {
    mockData.shellExec.mockResolvedValue({
      stdout:
        "abc123fullhash0000000000000000000000000000|abc1234|feat: add feature|John|2024-01-01T00:00:00+00:00\ndef456fullhash0000000000000000000000000000|def4567|fix: bug fix|Jane|2024-01-02T00:00:00+00:00\n",
      stderr: "",
      exitCode: 0
    });

    const result = await logTool.handler({});
    expect(result).toContain("abc1234");
    expect(result).toContain("feat: add feature");
    expect(result).toContain("John");
    expect(result).toContain("def4567");
    expect(result).toContain("fix: bug fix");
  });

  it("无 commit 时返回提示", async () => {
    mockData.shellExec.mockResolvedValue({ stdout: "", stderr: "", exitCode: 0 });

    const result = await logTool.handler({});
    expect(result).toContain("No commits");
  });

  it("支持 count 参数", async () => {
    mockData.shellExec.mockResolvedValue({ stdout: "", stderr: "", exitCode: 0 });

    await logTool.handler({ count: 10 });

    expect(mockData.shellExec).toHaveBeenCalledWith(
      expect.stringContaining("-n 10"),
      expect.any(Object)
    );
  });
});

describe("Git Helper Plugin - quick-commit command (executeQuickCommit)", () => {
  it("无更改时显示通知，不调用 prompt", async () => {
    const mockData = createMockPluginContext();
    const mockService = {
      getStatus: vi.fn().mockResolvedValue([]),
      commit: vi.fn()
    };
    const mockPrompt = vi.fn();

    await executeQuickCommit(mockService, mockData.ctx, mockPrompt);

    expect(mockData.ctx.notification.info).toHaveBeenCalledWith(
      expect.stringContaining("没有需要提交的更改")
    );
    expect(mockPrompt).not.toHaveBeenCalled();
    expect(mockService.commit).not.toHaveBeenCalled();
  });

  it("有更改时执行 stage all + commit", async () => {
    const mockData = createMockPluginContext();
    mockData.shellExec.mockResolvedValue({ stdout: "", stderr: "", exitCode: 0 });
    const mockService = {
      getStatus: vi
        .fn()
        .mockResolvedValue([{ path: "file.ts", status: "modified", staged: false }]),
      commit: vi.fn().mockResolvedValue(undefined)
    };
    const mockPrompt = vi.fn().mockResolvedValue("feat: quick commit");

    await executeQuickCommit(mockService, mockData.ctx, mockPrompt);

    expect(mockPrompt).toHaveBeenCalled();
    expect(mockData.shellExec).toHaveBeenCalledWith(
      "git add -A",
      expect.objectContaining({ cwd: "/test/repo" })
    );
    expect(mockService.commit).toHaveBeenCalledWith("feat: quick commit");
    expect(mockData.ctx.notification.success).toHaveBeenCalledWith(
      expect.stringContaining("feat: quick commit")
    );
  });

  it("用户取消输入时不执行 commit", async () => {
    const mockData = createMockPluginContext();
    const mockService = {
      getStatus: vi
        .fn()
        .mockResolvedValue([{ path: "file.ts", status: "modified", staged: false }]),
      commit: vi.fn()
    };
    const mockPrompt = vi.fn().mockResolvedValue(null);

    await executeQuickCommit(mockService, mockData.ctx, mockPrompt);

    expect(mockService.commit).not.toHaveBeenCalled();
    expect(mockData.shellExec).not.toHaveBeenCalled();
  });

  it("用户输入空 message 时不执行 commit", async () => {
    const mockData = createMockPluginContext();
    const mockService = {
      getStatus: vi
        .fn()
        .mockResolvedValue([{ path: "file.ts", status: "modified", staged: false }]),
      commit: vi.fn()
    };
    const mockPrompt = vi.fn().mockResolvedValue("   ");

    await executeQuickCommit(mockService, mockData.ctx, mockPrompt);

    expect(mockService.commit).not.toHaveBeenCalled();
  });
});

describe("Git Helper Plugin - formatStatusSummary", () => {
  it("格式化 mixed 状态文件列表", () => {
    const statuses = [
      { path: "src/index.ts", status: "modified" as const, staged: false },
      { path: "new-file.ts", status: "added" as const, staged: true },
      { path: "untracked.txt", status: "untracked" as const, staged: false }
    ];

    const result = formatStatusSummary(statuses);
    expect(result).toContain("Staged");
    expect(result).toContain("new-file.ts");
    expect(result).toContain("Unstaged");
    expect(result).toContain("src/index.ts");
    expect(result).toContain("Untracked");
    expect(result).toContain("untracked.txt");
  });

  it("空状态返回 clean 提示", () => {
    const result = formatStatusSummary([]);
    expect(result).toContain("clean");
  });
});

describe("Git Helper Plugin - Tool & Command disposal", () => {
  it("deactivate() 释放所有 Tool 和 Command Disposable", async () => {
    const mockData = createMockPluginContext();
    await gitHelperPlugin.activate(mockData.ctx);

    expect(mockData.toolDisposables.length).toBe(4);
    expect(mockData.commandDisposables.length).toBe(1);

    await gitHelperPlugin.deactivate?.();

    for (const d of mockData.toolDisposables) {
      expect(d.dispose).toHaveBeenCalledOnce();
    }
    for (const d of mockData.commandDisposables) {
      expect(d.dispose).toHaveBeenCalledOnce();
    }
  });

  it("deactivate() 后再次调用 deactivate() 不报错", async () => {
    const mockData = createMockPluginContext();
    await gitHelperPlugin.activate(mockData.ctx);

    await gitHelperPlugin.deactivate?.();
    await expect(gitHelperPlugin.deactivate?.()).resolves.not.toThrow();
  });
});
