import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync } from "fs";
import { join, resolve } from "path";
import { tmpdir, homedir } from "os";
import {
  readFile,
  writeFile,
  readDir,
  stat,
  validatePath,
  PathSecurityError,
  FileNotFoundError,
  PermissionDeniedError
} from "./fs.handler";

describe("fs.handler", () => {
  let testDir: string;
  // 获取 resolve 后的真实 tmpdir 路径（macOS 上 /tmp 是 /private/tmp 的 symlink）
  const resolvedTmpBase = resolve(tmpdir());

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), "workbox-test-"));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe("readFile", () => {
    // 正常路径
    it("读取文件返回 UTF-8 字符串内容", async () => {
      const filePath = join(testDir, "test.txt");
      writeFileSync(filePath, "hello world");
      const content = await readFile(filePath, { allowedPaths: [resolvedTmpBase] });
      expect(content).toBe("hello world");
    });

    // 边界条件：空文件
    it("读取空文件返回空字符串", async () => {
      const filePath = join(testDir, "empty.txt");
      writeFileSync(filePath, "");
      const content = await readFile(filePath, { allowedPaths: [resolvedTmpBase] });
      expect(content).toBe("");
    });

    // 错误处理：文件不存在 → FileNotFoundError
    it("文件不存在时抛出 FileNotFoundError", async () => {
      await expect(
        readFile(join(testDir, "nonexistent.txt"), { allowedPaths: [resolvedTmpBase] })
      ).rejects.toThrow(FileNotFoundError);
    });

    // 安全：路径穿越 — resolve 后逃逸白名单
    it("拒绝 resolve 后逃逸白名单的路径", async () => {
      await expect(
        readFile("/tmp/../etc/passwd", { allowedPaths: [resolvedTmpBase] })
      ).rejects.toThrow(PathSecurityError);
    });

    // 安全：非绝对路径
    it("拒绝相对路径", async () => {
      await expect(readFile("relative/path.txt")).rejects.toThrow(/absolute/i);
    });
  });

  describe("writeFile", () => {
    // 正常路径
    it("写入字符串内容到文件", async () => {
      const filePath = join(testDir, "output.txt");
      await writeFile(filePath, "written content", { allowedPaths: [resolvedTmpBase] });
      const content = readFileSync(filePath, "utf-8");
      expect(content).toBe("written content");
    });

    // 正常路径：覆盖已有文件
    it("覆盖已有文件内容", async () => {
      const filePath = join(testDir, "existing.txt");
      writeFileSync(filePath, "old content");
      await writeFile(filePath, "new content", { allowedPaths: [resolvedTmpBase] });
      expect(readFileSync(filePath, "utf-8")).toBe("new content");
    });

    // 正常路径：父目录不存在时自动创建
    it("父目录不存在时自动创建后写入", async () => {
      const filePath = join(testDir, "nested", "deep", "output.txt");
      await writeFile(filePath, "auto-mkdir content", { allowedPaths: [resolvedTmpBase] });
      expect(readFileSync(filePath, "utf-8")).toBe("auto-mkdir content");
    });

    // 安全：路径穿越
    it("拒绝 resolve 后逃逸白名单的写入", async () => {
      await expect(
        writeFile("/tmp/../etc/evil", "data", { allowedPaths: [resolvedTmpBase] })
      ).rejects.toThrow(PathSecurityError);
    });
  });

  describe("readDir", () => {
    // 正常路径
    it("返回目录下的文件名列表", async () => {
      writeFileSync(join(testDir, "a.txt"), "");
      writeFileSync(join(testDir, "b.txt"), "");
      const list = await readDir(testDir, { allowedPaths: [resolvedTmpBase] });
      expect(list).toContain("a.txt");
      expect(list).toContain("b.txt");
    });

    // 边界条件：空目录
    it("空目录返回空数组", async () => {
      const emptyDir = join(testDir, "empty");
      mkdirSync(emptyDir);
      const list = await readDir(emptyDir, { allowedPaths: [resolvedTmpBase] });
      expect(list).toEqual([]);
    });

    // 错误处理：路径不是目录
    it("路径不是目录时抛出错误", async () => {
      const filePath = join(testDir, "file.txt");
      writeFileSync(filePath, "");
      await expect(readDir(filePath, { allowedPaths: [resolvedTmpBase] })).rejects.toThrow();
    });

    // 错误处理：目录不存在 → FileNotFoundError
    it("目录不存在时抛出 FileNotFoundError", async () => {
      await expect(
        readDir(join(testDir, "nonexistent"), { allowedPaths: [resolvedTmpBase] })
      ).rejects.toThrow(FileNotFoundError);
    });
  });

  describe("stat", () => {
    // 正常路径
    it("返回文件元信息", async () => {
      const filePath = join(testDir, "info.txt");
      writeFileSync(filePath, "data");
      const info = await stat(filePath, { allowedPaths: [resolvedTmpBase] });
      expect(info.isFile).toBe(true);
      expect(info.isDirectory).toBe(false);
      expect(info.size).toBeGreaterThan(0);
      expect(info.mtime).toBeGreaterThan(0);
    });

    // 正常路径：目录
    it("返回目录元信息", async () => {
      const info = await stat(testDir, { allowedPaths: [resolvedTmpBase] });
      expect(info.isDirectory).toBe(true);
      expect(info.isFile).toBe(false);
    });

    // 错误处理：路径不存在 → FileNotFoundError
    it("路径不存在时抛出 FileNotFoundError", async () => {
      await expect(
        stat(join(testDir, "nope"), { allowedPaths: [resolvedTmpBase] })
      ).rejects.toThrow(FileNotFoundError);
    });
  });

  describe("validatePath（路径安全校验）", () => {
    it("允许用户 home 目录下的绝对路径（默认白名单）", () => {
      expect(() => validatePath(join(homedir(), "Documents/test.txt"))).not.toThrow();
    });

    it("允许显式白名单目录下的路径", () => {
      const tmpBase = resolve(tmpdir());
      expect(() => validatePath(join(tmpBase, "some-file.txt"), [tmpBase])).not.toThrow();
    });

    it("拒绝白名单外的路径", () => {
      expect(() => validatePath("/etc/passwd")).toThrow(PathSecurityError);
    });

    it("拒绝 resolve 后逃逸白名单的路径穿越", () => {
      expect(() => validatePath(join(homedir(), "..", "etc", "passwd"))).toThrow(PathSecurityError);
    });

    it("拒绝相对路径", () => {
      expect(() => validatePath("relative/path")).toThrow(/absolute/i);
    });
  });

  describe("错误类型包装", () => {
    // EACCES → PermissionDeniedError
    it("文件无读取权限时抛出 PermissionDeniedError", async () => {
      const filePath = join(testDir, "no-access.txt");
      writeFileSync(filePath, "secret");
      const { chmodSync } = await import("fs");
      chmodSync(filePath, 0o000);
      try {
        await expect(readFile(filePath, { allowedPaths: [resolvedTmpBase] })).rejects.toThrow(
          PermissionDeniedError
        );
      } finally {
        chmodSync(filePath, 0o644);
      }
    });
  });

  describe("setupFSHandlers（IPC 集成）", () => {
    it("注册 4 个 fs channel 到 ipcMain", async () => {
      const { setupFSHandlers } = await import("./fs.handler");
      const mockHandle = vi.fn();
      const mockIpcMain = { handle: mockHandle } as unknown as Electron.IpcMain;

      setupFSHandlers(mockIpcMain);

      const registeredChannels = mockHandle.mock.calls.map((c: unknown[]) => c[0]);
      expect(registeredChannels).toContain("fs:readFile");
      expect(registeredChannels).toContain("fs:writeFile");
      expect(registeredChannels).toContain("fs:readDir");
      expect(registeredChannels).toContain("fs:stat");
      expect(registeredChannels).toHaveLength(4);
    });

    it("handler wrapper 正确转发参数并返回结果", async () => {
      const { setupFSHandlers } = await import("./fs.handler");
      const handlers: Record<string, (...args: unknown[]) => unknown> = {};
      const mockIpcMain = {
        handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
          handlers[channel] = handler;
        })
      } as unknown as Electron.IpcMain;

      setupFSHandlers(mockIpcMain);

      expect(handlers["fs:readFile"]).toBeDefined();
      expect(typeof handlers["fs:readFile"]).toBe("function");
    });
  });
});
