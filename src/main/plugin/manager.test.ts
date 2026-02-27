import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { PluginManager } from "./manager";
import type { SystemServices } from "./context";

/** Create mock system services for testing */
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

/** Create a test plugin directory with valid package.json and index.js */
function createTestPlugin(
  baseDir: string,
  name: string,
  options?: { activateError?: boolean; hasDeactivate?: boolean }
): string {
  const pluginDir = path.join(baseDir, name);
  fs.mkdirSync(pluginDir, { recursive: true });
  fs.writeFileSync(
    path.join(pluginDir, "package.json"),
    JSON.stringify({
      name,
      version: "1.0.0",
      workbox: {
        name: `Plugin ${name}`,
        permissions: [],
        entry: { main: "./index.js" }
      }
    })
  );

  const activateBody = options?.activateError ? 'throw new Error("activate failed")' : "";
  const deactivateExport = options?.hasDeactivate !== false ? "deactivate: async () => {}," : "";

  fs.writeFileSync(
    path.join(pluginDir, "index.js"),
    `module.exports = {
      default: {
        name: "${name}",
        activate: async (ctx) => { ${activateBody} },
        ${deactivateExport}
      }
    };`
  );
  return pluginDir;
}

describe("PluginManager", () => {
  let tmpDir: string;
  let mockServices: SystemServices;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "workbox-pm-"));
    mockServices = createMockServices();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // 正常路径：加载并激活插件
  it("loadAll 扫描并激活有效插件", async () => {
    createTestPlugin(tmpDir, "plugin-a");
    const pm = new PluginManager(mockServices);
    await pm.loadAll([tmpDir]);
    const list = pm.getPluginList();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe("plugin-a");
    expect(list[0].status).toBe("active");
  });

  // 正常路径：加载多个插件
  it("可加载多个插件", async () => {
    createTestPlugin(tmpDir, "plugin-a");
    createTestPlugin(tmpDir, "plugin-b");
    const pm = new PluginManager(mockServices);
    await pm.loadAll([tmpDir]);
    expect(pm.getPluginList()).toHaveLength(2);
  });

  // 正常路径：disable 插件
  it("disablePlugin 将插件状态设为 disabled", async () => {
    createTestPlugin(tmpDir, "plugin-a", { hasDeactivate: true });
    const pm = new PluginManager(mockServices);
    await pm.loadAll([tmpDir]);
    await pm.disablePlugin("plugin-a");
    const info = pm.getPluginList().find((p) => p.id === "plugin-a");
    expect(info?.status).toBe("disabled");
  });

  // 正常路径：enable 已禁用的插件
  it("enablePlugin 重新激活禁用的插件", async () => {
    createTestPlugin(tmpDir, "plugin-a");
    const pm = new PluginManager(mockServices);
    await pm.loadAll([tmpDir]);
    await pm.disablePlugin("plugin-a");
    await pm.enablePlugin("plugin-a");
    const info = pm.getPluginList().find((p) => p.id === "plugin-a");
    expect(info?.status).toBe("active");
  });

  // 正常路径：shutdown 清理所有插件
  it("shutdown 对所有 active 插件执行 deactivate", async () => {
    createTestPlugin(tmpDir, "plugin-a", { hasDeactivate: true });
    const pm = new PluginManager(mockServices);
    await pm.loadAll([tmpDir]);
    await pm.shutdown();
    const list = pm.getPluginList();
    expect(list.every((p) => p.status !== "active")).toBe(true);
  });

  // 错误隔离：单个插件 activate 失败不影响其他
  it("activate 失败的插件标记为 error，不影响其他插件", async () => {
    createTestPlugin(tmpDir, "good-plugin");
    createTestPlugin(tmpDir, "bad-plugin", { activateError: true });
    const pm = new PluginManager(mockServices);
    await pm.loadAll([tmpDir]);
    const list = pm.getPluginList();
    const good = list.find((p) => p.id === "good-plugin");
    const bad = list.find((p) => p.id === "bad-plugin");
    expect(good?.status).toBe("active");
    expect(bad?.status).toBe("error");
    expect(bad?.error).toContain("activate failed");
  });

  // 错误处理：enable 不存在的插件
  it("enablePlugin 不存在的 ID 抛出错误", async () => {
    const pm = new PluginManager(mockServices);
    await expect(pm.enablePlugin("nonexistent")).rejects.toThrow();
  });

  // 错误处理：disable 不存在的插件
  it("disablePlugin 不存在的 ID 抛出错误", async () => {
    const pm = new PluginManager(mockServices);
    await expect(pm.disablePlugin("nonexistent")).rejects.toThrow();
  });

  // 边界条件：空目录
  it("空目录 loadAll 不报错", async () => {
    const pm = new PluginManager(mockServices);
    await pm.loadAll([tmpDir]);
    expect(pm.getPluginList()).toEqual([]);
  });

  // 边界条件：重复 loadAll
  it("重复 loadAll 抛出错误（已加载）", async () => {
    createTestPlugin(tmpDir, "plugin-a");
    const pm = new PluginManager(mockServices);
    await pm.loadAll([tmpDir]);
    await expect(pm.loadAll([tmpDir])).rejects.toThrow();
  });

  // getPluginList 返回 PluginInfo 格式
  it("getPluginList 返回正确的 PluginInfo 结构", async () => {
    createTestPlugin(tmpDir, "plugin-a");
    const pm = new PluginManager(mockServices);
    await pm.loadAll([tmpDir]);
    const list = pm.getPluginList();
    const info = list[0];
    expect(info).toHaveProperty("id");
    expect(info).toHaveProperty("name");
    expect(info).toHaveProperty("version");
    expect(info).toHaveProperty("status");
    expect(info).toHaveProperty("permissions");
  });
});
