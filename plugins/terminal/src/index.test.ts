import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { parseManifest, scanPlugins } from "../../../src/main/plugin/engine";
import { PluginManager } from "../../../src/main/plugin/manager";
import type { SystemServices } from "../../../src/main/plugin/context";

/** Terminal 插件的 package.json 路径 */
const TERMINAL_PLUGIN_DIR = path.resolve(__dirname, "..");

/** 读取 Terminal 插件的 package.json */
function readTerminalPackageJson(): Record<string, unknown> {
  const raw = fs.readFileSync(path.join(TERMINAL_PLUGIN_DIR, "package.json"), "utf-8");
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
 * 在临时目录创建带有可执行 index.js 的 Terminal 插件副本，
 * 用于 PluginManager 测试（因为 PluginManager 通过 require 加载 entry.main）
 */
function createTerminalPluginCopy(baseDir: string): string {
  const pluginDir = path.join(baseDir, "terminal");
  const srcDir = path.join(pluginDir, "src");
  fs.mkdirSync(srcDir, { recursive: true });

  // 复制 package.json
  const pkgJson = readTerminalPackageJson();
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
        name: "Terminal",
        activate: async (ctx) => {},
        deactivate: async () => {}
      }
    };`
  );

  return pluginDir;
}

describe("Terminal Plugin - parseManifest", () => {
  it("正确解析 Terminal 插件的 package.json", () => {
    const pkgJson = readTerminalPackageJson();
    const parsed = parseManifest(pkgJson, TERMINAL_PLUGIN_DIR);

    expect(parsed.id).toBe("@workbox/plugin-terminal");
    expect(parsed.version).toBe("0.1.0");
    expect(parsed.config.name).toBe("Terminal");
    expect(parsed.config.description).toBe("内置终端插件，提供终端 Tab 和 AI 命令执行能力");
    expect(parsed.config.permissions).toEqual(["shell:exec"]);
    expect(parsed.config.entry.main).toBe("./src/index.ts");
    expect(parsed.config.entry.ui).toBe("./src/ui/TerminalPanel.tsx");
  });

  it("解析 commands 和 ai 配置", () => {
    const pkgJson = readTerminalPackageJson();
    const parsed = parseManifest(pkgJson, TERMINAL_PLUGIN_DIR);

    expect(parsed.config.commands).toEqual([
      { id: "open-terminal", title: "打开终端", shortcut: "CmdOrCtrl+`" }
    ]);
    expect(parsed.config.ai).toEqual({ tools: ["run_command"] });
  });
});

describe("Terminal Plugin - scanPlugins", () => {
  it("PluginManager 可扫描到 Terminal 插件", () => {
    const pluginsDir = path.resolve(__dirname, "../..");
    const result = scanPlugins([pluginsDir]);

    expect(result.valid.length).toBeGreaterThanOrEqual(1);
    const terminal = result.valid.find((p) => p.id === "@workbox/plugin-terminal");
    expect(terminal).toBeDefined();
    expect(terminal?.config.name).toBe("Terminal");
  });
});

describe("Terminal Plugin - PluginManager lifecycle", () => {
  let tmpDir: string;
  let mockServices: SystemServices;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "workbox-terminal-"));
    mockServices = createMockServices();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("Terminal 插件 activate() 被调用且不报错", async () => {
    createTerminalPluginCopy(tmpDir);
    const pm = new PluginManager(mockServices);
    await pm.loadAll([tmpDir]);

    const list = pm.getPluginList();
    const terminal = list.find((p) => p.id === "@workbox/plugin-terminal");
    expect(terminal).toBeDefined();
    expect(terminal?.status).toBe("active");
    expect(terminal?.error).toBeUndefined();
  });

  it("Terminal 插件状态变为 active", async () => {
    createTerminalPluginCopy(tmpDir);
    const pm = new PluginManager(mockServices);
    await pm.loadAll([tmpDir]);

    const list = pm.getPluginList();
    const terminal = list.find((p) => p.id === "@workbox/plugin-terminal");
    expect(terminal?.status).toBe("active");
  });

  it("deactivate() 被调用且不报错", async () => {
    createTerminalPluginCopy(tmpDir);
    const pm = new PluginManager(mockServices);
    await pm.loadAll([tmpDir]);

    // shutdown 调用 deactivate
    await expect(pm.shutdown()).resolves.not.toThrow();

    const list = pm.getPluginList();
    const terminal = list.find((p) => p.id === "@workbox/plugin-terminal");
    expect(terminal?.status).toBe("unloaded");
  });
});
