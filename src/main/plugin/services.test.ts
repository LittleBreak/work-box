import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSystemServices } from "./services";
import type { Crud } from "../storage/crud";

/** 创建最小化的 mock Crud（仅需 plugin 相关方法） */
function createMockCrud(): Crud {
  return {
    getPluginData: vi.fn().mockReturnValue("stored-value"),
    setPluginData: vi.fn(),
    deletePluginData: vi.fn(),
    deleteAllPluginData: vi.fn(),
    // 其余方法不会被 SystemServices 使用，提供 stub
    insertConversation: vi.fn(),
    getConversation: vi.fn(),
    updateConversation: vi.fn(),
    deleteConversation: vi.fn(),
    getAllConversations: vi.fn().mockReturnValue([]),
    insertMessage: vi.fn(),
    getMessagesByConversation: vi.fn().mockReturnValue([]),
    getSetting: vi.fn(),
    setSetting: vi.fn(),
    deleteSetting: vi.fn(),
    getAllSettings: vi.fn().mockReturnValue([]),
    deleteAllSettings: vi.fn()
  };
}

describe("createSystemServices", () => {
  let mockCrud: Crud;

  beforeEach(() => {
    mockCrud = createMockCrud();
  });

  it("返回包含所有必需属性的 SystemServices 对象", () => {
    const services = createSystemServices({ crud: mockCrud });

    expect(services.fsHandler).toBeDefined();
    expect(services.shellHandler).toBeDefined();
    expect(services.crud).toBeDefined();
    expect(services.notificationSender).toBeDefined();
    expect(services.dialogOpener).toBeDefined();
    expect(services.commandRegistry).toBeDefined();
    expect(services.toolRegistry).toBeDefined();
  });

  it("crud 方法正确代理到底层 Crud 实例", () => {
    const services = createSystemServices({ crud: mockCrud });

    services.crud.getPluginData("test-plugin", "key1");
    expect(mockCrud.getPluginData).toHaveBeenCalledWith("test-plugin", "key1");

    services.crud.setPluginData("test-plugin", "key1", "value1");
    expect(mockCrud.setPluginData).toHaveBeenCalledWith("test-plugin", "key1", "value1");

    services.crud.deletePluginData("test-plugin", "key1");
    expect(mockCrud.deletePluginData).toHaveBeenCalledWith("test-plugin", "key1");

    services.crud.deleteAllPluginData("test-plugin");
    expect(mockCrud.deleteAllPluginData).toHaveBeenCalledWith("test-plugin");
  });

  it("notificationSender 调用不抛错", () => {
    const services = createSystemServices({ crud: mockCrud });

    expect(() => services.notificationSender("success", "ok")).not.toThrow();
    expect(() => services.notificationSender("error", "fail")).not.toThrow();
    expect(() => services.notificationSender("info", "note")).not.toThrow();
  });

  it("commandRegistry.register 返回 Disposable", () => {
    const services = createSystemServices({ crud: mockCrud });
    const disposable = services.commandRegistry.register("plugin-a", "cmd1", async () => {});

    expect(disposable).toBeDefined();
    expect(typeof disposable.dispose).toBe("function");
    expect(() => disposable.dispose()).not.toThrow();
  });

  it("toolRegistry.register 返回 Disposable", () => {
    const services = createSystemServices({ crud: mockCrud });
    const disposable = services.toolRegistry.register("plugin-a", {
      name: "test-tool",
      description: "test",
      parameters: {},
      handler: async () => ({})
    });

    expect(disposable).toBeDefined();
    expect(typeof disposable.dispose).toBe("function");
    expect(() => disposable.dispose()).not.toThrow();
  });

  it("shellHandler.exec 属性存在且为函数", () => {
    const services = createSystemServices({ crud: mockCrud });
    expect(typeof services.shellHandler.exec).toBe("function");
  });

  it("fsHandler 包含所有必需方法", () => {
    const services = createSystemServices({ crud: mockCrud });

    expect(typeof services.fsHandler.readFile).toBe("function");
    expect(typeof services.fsHandler.writeFile).toBe("function");
    expect(typeof services.fsHandler.readDir).toBe("function");
    expect(typeof services.fsHandler.stat).toBe("function");
    expect(typeof services.fsHandler.watch).toBe("function");
  });
});
