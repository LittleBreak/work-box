import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock electron.clipboard
vi.mock("electron", () => ({
  clipboard: {
    writeText: vi.fn()
  }
}));

import { clipboard } from "electron";
import { writeTextToClipboard, setupClipboardHandlers } from "./clipboard.handler";

describe("clipboard.handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("writeTextToClipboard", () => {
    // 正常路径：写入文本到剪贴板
    it("调用 clipboard.writeText 写入文本", () => {
      writeTextToClipboard("Hello World");
      expect(clipboard.writeText).toHaveBeenCalledWith("Hello World");
    });

    // 边界条件：空字符串
    it("空字符串也正常写入", () => {
      writeTextToClipboard("");
      expect(clipboard.writeText).toHaveBeenCalledWith("");
    });
  });

  describe("setupClipboardHandlers", () => {
    // 正常路径：注册 IPC handler
    it("注册 clipboard:writeText handler", () => {
      const mockIpcMain = {
        handle: vi.fn()
      };
      setupClipboardHandlers(mockIpcMain as unknown as Electron.IpcMain);
      expect(mockIpcMain.handle).toHaveBeenCalledWith("clipboard:writeText", expect.any(Function));
    });

    // 正常路径：handler 调用 writeTextToClipboard
    it("handler 调用时触发剪贴板写入", async () => {
      const mockIpcMain = {
        handle: vi.fn()
      };
      setupClipboardHandlers(mockIpcMain as unknown as Electron.IpcMain);

      // 获取注册的 handler 函数并调用
      const handler = mockIpcMain.handle.mock.calls[0]![1] as (
        event: unknown,
        text: string
      ) => Promise<void>;
      await handler({}, "Test text");

      expect(clipboard.writeText).toHaveBeenCalledWith("Test text");
    });
  });
});
