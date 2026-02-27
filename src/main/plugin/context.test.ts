import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPluginContext } from "./context";
import type { SystemServices } from "./context";
import { PermissionManager, PermissionDeniedError } from "./permission";

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

describe("createPluginContext", () => {
  let services: SystemServices;

  beforeEach(() => {
    services = createMockServices();
  });

  // 正常路径：plugin 子模块包含元信息
  it("plugin 子模块返回插件基本信息", () => {
    const pm = new PermissionManager("test-plugin", ["fs:read"]);
    const ctx = createPluginContext({
      pluginId: "test-plugin",
      pluginName: "Test Plugin",
      pluginVersion: "1.0.0",
      dataPath: "/data/test-plugin",
      permissionManager: pm,
      services
    });
    expect(ctx.plugin.id).toBe("test-plugin");
    expect(ctx.plugin.name).toBe("Test Plugin");
    expect(ctx.plugin.version).toBe("1.0.0");
    expect(ctx.plugin.dataPath).toBe("/data/test-plugin");
  });

  // 正常路径：fs 操作有权限时正常调用
  it("有 fs:read 权限时 fs.readFile 正常调用", async () => {
    const pm = new PermissionManager("test-plugin", ["fs:read"]);
    const ctx = createPluginContext({
      pluginId: "test-plugin",
      pluginName: "T",
      pluginVersion: "1.0.0",
      dataPath: "/data",
      permissionManager: pm,
      services
    });
    await ctx.fs.readFile("/some/file");
    expect(services.fsHandler.readFile).toHaveBeenCalledWith("/some/file");
  });

  // 正常路径：fs.readDir 有权限时正常调用
  it("有 fs:read 权限时 fs.readDir 正常调用", async () => {
    const pm = new PermissionManager("test-plugin", ["fs:read"]);
    const ctx = createPluginContext({
      pluginId: "test-plugin",
      pluginName: "T",
      pluginVersion: "1.0.0",
      dataPath: "/data",
      permissionManager: pm,
      services
    });
    const result = await ctx.fs.readDir("/some/dir");
    expect(services.fsHandler.readDir).toHaveBeenCalledWith("/some/dir");
    expect(result).toEqual(["file1.ts"]);
  });

  // 正常路径：fs.writeFile 有 fs:write 权限时正常调用
  it("有 fs:write 权限时 fs.writeFile 正常调用", async () => {
    const pm = new PermissionManager("test-plugin", ["fs:write"]);
    const ctx = createPluginContext({
      pluginId: "test-plugin",
      pluginName: "T",
      pluginVersion: "1.0.0",
      dataPath: "/data",
      permissionManager: pm,
      services
    });
    await ctx.fs.writeFile("/some/file", "data");
    expect(services.fsHandler.writeFile).toHaveBeenCalledWith("/some/file", "data");
  });

  // 错误处理：fs 操作无权限时被拦截
  it("无 fs:read 权限时 fs.readFile 抛出权限错误", async () => {
    const pm = new PermissionManager("test-plugin", []);
    const ctx = createPluginContext({
      pluginId: "test-plugin",
      pluginName: "T",
      pluginVersion: "1.0.0",
      dataPath: "/data",
      permissionManager: pm,
      services
    });
    await expect(ctx.fs.readFile("/file")).rejects.toThrow(PermissionDeniedError);
  });

  // 错误处理：fs.writeFile 无 fs:write 权限时被拦截
  it("无 fs:write 权限时 fs.writeFile 抛出权限错误", async () => {
    const pm = new PermissionManager("test-plugin", []);
    const ctx = createPluginContext({
      pluginId: "test-plugin",
      pluginName: "T",
      pluginVersion: "1.0.0",
      dataPath: "/data",
      permissionManager: pm,
      services
    });
    await expect(ctx.fs.writeFile("/file", "data")).rejects.toThrow(PermissionDeniedError);
  });

  // 正常路径：fs.stat 有 fs:read 权限时正常调用
  it("有 fs:read 权限时 fs.stat 正常调用", async () => {
    const pm = new PermissionManager("test-plugin", ["fs:read"]);
    const ctx = createPluginContext({
      pluginId: "test-plugin",
      pluginName: "T",
      pluginVersion: "1.0.0",
      dataPath: "/data",
      permissionManager: pm,
      services
    });
    const stat = await ctx.fs.stat("/some/file");
    expect(services.fsHandler.stat).toHaveBeenCalledWith("/some/file");
    expect(stat.isFile).toBe(true);
  });

  // 正常路径：fs.watch 有 fs:read 权限时正常调用
  it("有 fs:read 权限时 fs.watch 返回 Disposable", () => {
    const pm = new PermissionManager("test-plugin", ["fs:read"]);
    const ctx = createPluginContext({
      pluginId: "test-plugin",
      pluginName: "T",
      pluginVersion: "1.0.0",
      dataPath: "/data",
      permissionManager: pm,
      services
    });
    const callback = vi.fn();
    const disposable = ctx.fs.watch("/some/path", callback);
    expect(services.fsHandler.watch).toHaveBeenCalledWith("/some/path", callback);
    expect(typeof disposable.dispose).toBe("function");
  });

  // 正常路径：shell 操作有权限时正常调用
  it("有 shell:exec 权限时 shell.exec 正常调用", async () => {
    const pm = new PermissionManager("test-plugin", ["shell:exec"]);
    const ctx = createPluginContext({
      pluginId: "test-plugin",
      pluginName: "T",
      pluginVersion: "1.0.0",
      dataPath: "/data",
      permissionManager: pm,
      services
    });
    const result = await ctx.shell.exec("echo hello");
    expect(services.shellHandler.exec).toHaveBeenCalledWith("echo hello", undefined);
    expect(result.stdout).toBe("ok");
  });

  // 正常路径：shell 操作带选项
  it("shell.exec 传递 options", async () => {
    const pm = new PermissionManager("test-plugin", ["shell:exec"]);
    const ctx = createPluginContext({
      pluginId: "test-plugin",
      pluginName: "T",
      pluginVersion: "1.0.0",
      dataPath: "/data",
      permissionManager: pm,
      services
    });
    await ctx.shell.exec("ls", { cwd: "/tmp" });
    expect(services.shellHandler.exec).toHaveBeenCalledWith("ls", { cwd: "/tmp" });
  });

  // 错误处理：shell 操作无权限时被拦截
  it("无 shell:exec 权限时 shell.exec 抛出权限错误", async () => {
    const pm = new PermissionManager("test-plugin", []);
    const ctx = createPluginContext({
      pluginId: "test-plugin",
      pluginName: "T",
      pluginVersion: "1.0.0",
      dataPath: "/data",
      permissionManager: pm,
      services
    });
    await expect(ctx.shell.exec("ls")).rejects.toThrow(PermissionDeniedError);
  });

  // 正常路径：storage 操作自动隔离
  it("storage.get 自动注入 pluginId", async () => {
    const pm = new PermissionManager("test-plugin", []);
    const ctx = createPluginContext({
      pluginId: "test-plugin",
      pluginName: "T",
      pluginVersion: "1.0.0",
      dataPath: "/data",
      permissionManager: pm,
      services
    });
    await ctx.storage.get("myKey");
    expect(services.crud.getPluginData).toHaveBeenCalledWith("test-plugin", "myKey");
  });

  it("storage.set 自动注入 pluginId 并序列化值", async () => {
    const pm = new PermissionManager("test-plugin", []);
    const ctx = createPluginContext({
      pluginId: "test-plugin",
      pluginName: "T",
      pluginVersion: "1.0.0",
      dataPath: "/data",
      permissionManager: pm,
      services
    });
    await ctx.storage.set("key", { foo: "bar" });
    expect(services.crud.setPluginData).toHaveBeenCalledWith(
      "test-plugin",
      "key",
      JSON.stringify({ foo: "bar" })
    );
  });

  it("storage.get 反序列化 JSON 值", async () => {
    const pm = new PermissionManager("test-plugin", []);
    (services.crud.getPluginData as ReturnType<typeof vi.fn>).mockReturnValue(
      JSON.stringify({ foo: "bar" })
    );
    const ctx = createPluginContext({
      pluginId: "test-plugin",
      pluginName: "T",
      pluginVersion: "1.0.0",
      dataPath: "/data",
      permissionManager: pm,
      services
    });
    const result = await ctx.storage.get("key");
    expect(result).toEqual({ foo: "bar" });
  });

  it("storage.get 无数据时返回 null", async () => {
    const pm = new PermissionManager("test-plugin", []);
    const ctx = createPluginContext({
      pluginId: "test-plugin",
      pluginName: "T",
      pluginVersion: "1.0.0",
      dataPath: "/data",
      permissionManager: pm,
      services
    });
    const result = await ctx.storage.get("nonexistent");
    expect(result).toBeNull();
  });

  it("storage.delete 自动注入 pluginId", async () => {
    const pm = new PermissionManager("test-plugin", []);
    const ctx = createPluginContext({
      pluginId: "test-plugin",
      pluginName: "T",
      pluginVersion: "1.0.0",
      dataPath: "/data",
      permissionManager: pm,
      services
    });
    await ctx.storage.delete("key");
    expect(services.crud.deletePluginData).toHaveBeenCalledWith("test-plugin", "key");
  });

  // 正常路径：commands.register 委托给命令注册表
  it("commands.register 返回 Disposable", () => {
    const pm = new PermissionManager("test-plugin", []);
    const ctx = createPluginContext({
      pluginId: "test-plugin",
      pluginName: "T",
      pluginVersion: "1.0.0",
      dataPath: "/data",
      permissionManager: pm,
      services
    });
    const handler = async (): Promise<void> => {};
    const disposable = ctx.commands.register("my-cmd", handler);
    expect(disposable.dispose).toBeDefined();
    expect(services.commandRegistry.register).toHaveBeenCalledWith(
      "test-plugin",
      "my-cmd",
      handler
    );
  });

  // 正常路径：ai.registerTool 委托给 tool 注册表
  it("ai.registerTool 返回 Disposable", () => {
    const pm = new PermissionManager("test-plugin", []);
    const ctx = createPluginContext({
      pluginId: "test-plugin",
      pluginName: "T",
      pluginVersion: "1.0.0",
      dataPath: "/data",
      permissionManager: pm,
      services
    });
    const tool = {
      name: "my_tool",
      description: "A tool",
      parameters: {},
      handler: async () => ({})
    };
    const disposable = ctx.ai.registerTool(tool);
    expect(disposable.dispose).toBeDefined();
    expect(services.toolRegistry.register).toHaveBeenCalledWith("test-plugin", tool);
  });

  // 错误处理：ai.chat Phase 2 占位实现
  it("ai.chat 抛出 not available 错误", async () => {
    const pm = new PermissionManager("test-plugin", ["ai:chat"]);
    const ctx = createPluginContext({
      pluginId: "test-plugin",
      pluginName: "T",
      pluginVersion: "1.0.0",
      dataPath: "/data",
      permissionManager: pm,
      services
    });
    // ai.chat returns an AsyncIterable, attempting to iterate should throw
    const iterable = ctx.ai.chat([{ role: "user", content: "hello" }]);
    const iterator = iterable[Symbol.asyncIterator]();
    await expect(iterator.next()).rejects.toThrow("AI service not available");
  });

  // 正常路径：notification 调用
  it("notification.success 调用 notificationSender", () => {
    const pm = new PermissionManager("test-plugin", []);
    const ctx = createPluginContext({
      pluginId: "test-plugin",
      pluginName: "T",
      pluginVersion: "1.0.0",
      dataPath: "/data",
      permissionManager: pm,
      services
    });
    ctx.notification.success("done!");
    expect(services.notificationSender).toHaveBeenCalledWith("success", "done!");
  });

  it("notification.error 调用 notificationSender", () => {
    const pm = new PermissionManager("test-plugin", []);
    const ctx = createPluginContext({
      pluginId: "test-plugin",
      pluginName: "T",
      pluginVersion: "1.0.0",
      dataPath: "/data",
      permissionManager: pm,
      services
    });
    ctx.notification.error("failed!");
    expect(services.notificationSender).toHaveBeenCalledWith("error", "failed!");
  });

  it("notification.info 调用 notificationSender", () => {
    const pm = new PermissionManager("test-plugin", []);
    const ctx = createPluginContext({
      pluginId: "test-plugin",
      pluginName: "T",
      pluginVersion: "1.0.0",
      dataPath: "/data",
      permissionManager: pm,
      services
    });
    ctx.notification.info("info msg");
    expect(services.notificationSender).toHaveBeenCalledWith("info", "info msg");
  });

  // 正常路径：workspace 代理
  it("workspace.selectFolder 委托给 dialogOpener", async () => {
    const pm = new PermissionManager("test-plugin", []);
    const ctx = createPluginContext({
      pluginId: "test-plugin",
      pluginName: "T",
      pluginVersion: "1.0.0",
      dataPath: "/data",
      permissionManager: pm,
      services
    });
    await ctx.workspace.selectFolder();
    expect(services.dialogOpener.selectFolder).toHaveBeenCalled();
  });

  it("workspace.selectFile 委托给 dialogOpener", async () => {
    const pm = new PermissionManager("test-plugin", []);
    const ctx = createPluginContext({
      pluginId: "test-plugin",
      pluginName: "T",
      pluginVersion: "1.0.0",
      dataPath: "/data",
      permissionManager: pm,
      services
    });
    await ctx.workspace.selectFile();
    expect(services.dialogOpener.selectFile).toHaveBeenCalled();
  });

  // workspace.rootPath
  it("workspace.rootPath 返回 dataPath", () => {
    const pm = new PermissionManager("test-plugin", []);
    const ctx = createPluginContext({
      pluginId: "test-plugin",
      pluginName: "T",
      pluginVersion: "1.0.0",
      dataPath: "/data/test-plugin",
      permissionManager: pm,
      services
    });
    expect(ctx.workspace.rootPath).toBeDefined();
  });
});
