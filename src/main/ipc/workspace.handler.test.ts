import { describe, it, expect, vi, beforeEach } from "vitest";
import { setupWorkspaceHandlers } from "./workspace.handler";

describe("workspace handler", () => {
  let mockIpcMain: { handle: ReturnType<typeof vi.fn> };
  let mockShowOpenDialog: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockIpcMain = { handle: vi.fn() };
    mockShowOpenDialog = vi.fn();
    vi.clearAllMocks();
  });

  // 正常路径：注册 workspace:selectFile handler
  it("注册 workspace:selectFile handler", () => {
    setupWorkspaceHandlers(mockIpcMain as unknown as Electron.IpcMain, mockShowOpenDialog);
    expect(mockIpcMain.handle).toHaveBeenCalledWith("workspace:selectFile", expect.any(Function));
  });

  // 正常路径：selectFile 返回选中的文件路径
  it("selectFile 返回选中的文件路径", async () => {
    mockShowOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: ["/path/to/file.ts"]
    });

    setupWorkspaceHandlers(mockIpcMain as unknown as Electron.IpcMain, mockShowOpenDialog);

    const handler = mockIpcMain.handle.mock.calls[0][1];
    const result = await handler({});
    expect(result).toBe("/path/to/file.ts");
  });

  // 正常路径：用户取消选择返回 null
  it("用户取消选择返回 null", async () => {
    mockShowOpenDialog.mockResolvedValue({
      canceled: true,
      filePaths: []
    });

    setupWorkspaceHandlers(mockIpcMain as unknown as Electron.IpcMain, mockShowOpenDialog);

    const handler = mockIpcMain.handle.mock.calls[0][1];
    const result = await handler({});
    expect(result).toBeNull();
  });

  // 正常路径：传递文件类型过滤器
  it("传递文件类型过滤器到 showOpenDialog", async () => {
    mockShowOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });

    setupWorkspaceHandlers(mockIpcMain as unknown as Electron.IpcMain, mockShowOpenDialog);

    const handler = mockIpcMain.handle.mock.calls[0][1];
    const filters = [{ name: "TypeScript", extensions: ["ts", "tsx"] }];
    await handler({}, filters);

    expect(mockShowOpenDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        filters
      })
    );
  });
});
