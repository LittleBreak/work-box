import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { parseManifest, scanPlugins } from "../../../src/main/plugin/engine";
import { PluginManager } from "../../../src/main/plugin/manager";
import type { SystemServices } from "../../../src/main/plugin/context";

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
    expect(parsed.config.ai).toEqual({ tools: ["git_status", "git_commit"] });
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
