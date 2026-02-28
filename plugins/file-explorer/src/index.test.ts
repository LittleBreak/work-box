import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { parseManifest, scanPlugins } from "../../../src/main/plugin/engine";
import { PluginManager } from "../../../src/main/plugin/manager";
import type { SystemServices } from "../../../src/main/plugin/context";

/** File Explorer 插件的 package.json 路径 */
const FILE_EXPLORER_PLUGIN_DIR = path.resolve(__dirname, "..");

/** 读取 File Explorer 插件的 package.json */
function readFileExplorerPackageJson(): Record<string, unknown> {
  const raw = fs.readFileSync(path.join(FILE_EXPLORER_PLUGIN_DIR, "package.json"), "utf-8");
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
 * 在临时目录创建带有可执行 index.js 的 File Explorer 插件副本，
 * 用于 PluginManager 测试（因为 PluginManager 通过 require 加载 entry.main）
 */
function createFileExplorerPluginCopy(baseDir: string): string {
  const pluginDir = path.join(baseDir, "file-explorer");
  const srcDir = path.join(pluginDir, "src");
  fs.mkdirSync(srcDir, { recursive: true });

  // 复制 package.json
  const pkgJson = readFileExplorerPackageJson();
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
        name: "File Explorer",
        activate: async (ctx) => {},
        deactivate: async () => {}
      }
    };`
  );

  return pluginDir;
}

describe("File Explorer Plugin - parseManifest", () => {
  it("正确解析 File Explorer 插件的 package.json", () => {
    const pkgJson = readFileExplorerPackageJson();
    const parsed = parseManifest(pkgJson, FILE_EXPLORER_PLUGIN_DIR);

    expect(parsed.id).toBe("@workbox/plugin-file-explorer");
    expect(parsed.version).toBe("0.1.0");
    expect(parsed.config.name).toBe("File Explorer");
    expect(parsed.config.description).toBe(
      "文件浏览器插件，提供目录浏览、文件预览、搜索和管理功能"
    );
    expect(parsed.config.permissions).toEqual(["fs:read", "fs:write"]);
    expect(parsed.config.entry.main).toBe("./src/index.ts");
    expect(parsed.config.entry.ui).toBe("./src/ui/FileExplorerPanel.tsx");
  });

  it("解析 commands 和 ai 配置", () => {
    const pkgJson = readFileExplorerPackageJson();
    const parsed = parseManifest(pkgJson, FILE_EXPLORER_PLUGIN_DIR);

    expect(parsed.config.commands).toEqual([
      { id: "open-file-explorer", title: "打开文件浏览器", shortcut: "CmdOrCtrl+Shift+E" }
    ]);
    expect(parsed.config.ai).toEqual({ tools: ["read_file", "list_directory", "search_files"] });
  });
});

describe("File Explorer Plugin - scanPlugins", () => {
  it("PluginManager 可扫描到 File Explorer 插件", () => {
    const pluginsDir = path.resolve(__dirname, "../..");
    const result = scanPlugins([pluginsDir]);

    expect(result.valid.length).toBeGreaterThanOrEqual(1);
    const fileExplorer = result.valid.find((p) => p.id === "@workbox/plugin-file-explorer");
    expect(fileExplorer).toBeDefined();
    expect(fileExplorer?.config.name).toBe("File Explorer");
  });
});

describe("File Explorer Plugin - PluginManager lifecycle", () => {
  let tmpDir: string;
  let mockServices: SystemServices;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "workbox-file-explorer-"));
    mockServices = createMockServices();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("File Explorer 插件 activate() 被调用且不报错", async () => {
    createFileExplorerPluginCopy(tmpDir);
    const pm = new PluginManager(mockServices);
    await pm.loadAll([tmpDir]);

    const list = pm.getPluginList();
    const fe = list.find((p) => p.id === "@workbox/plugin-file-explorer");
    expect(fe).toBeDefined();
    expect(fe?.status).toBe("active");
    expect(fe?.error).toBeUndefined();
  });

  it("File Explorer 插件状态变为 active", async () => {
    createFileExplorerPluginCopy(tmpDir);
    const pm = new PluginManager(mockServices);
    await pm.loadAll([tmpDir]);

    const list = pm.getPluginList();
    const fe = list.find((p) => p.id === "@workbox/plugin-file-explorer");
    expect(fe?.status).toBe("active");
  });

  it("deactivate() 被调用且不报错", async () => {
    createFileExplorerPluginCopy(tmpDir);
    const pm = new PluginManager(mockServices);
    await pm.loadAll([tmpDir]);

    // shutdown 调用 deactivate
    await expect(pm.shutdown()).resolves.not.toThrow();

    const list = pm.getPluginList();
    const fe = list.find((p) => p.id === "@workbox/plugin-file-explorer");
    expect(fe?.status).toBe("unloaded");
  });
});
