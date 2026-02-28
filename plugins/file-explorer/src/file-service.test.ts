import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PluginContext } from "@workbox/plugin-api";
import { FileService } from "./file-service.ts";
import { MAX_PREVIEW_SIZE } from "./constants.ts";

/** Create a mock PluginContext with all fs methods stubbed */
function createMockCtx(rootPath = "/workspace/project"): PluginContext {
  return {
    plugin: { id: "file-explorer", name: "File Explorer", version: "0.1.0", dataPath: "/tmp" },
    fs: {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      readDir: vi.fn(),
      stat: vi.fn(),
      watch: vi.fn()
    },
    shell: { exec: vi.fn() },
    ai: { chat: vi.fn(), registerTool: vi.fn() },
    commands: { register: vi.fn() },
    notification: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
    workspace: { rootPath, selectFolder: vi.fn(), selectFile: vi.fn() },
    storage: { get: vi.fn(), set: vi.fn(), delete: vi.fn() }
  } as unknown as PluginContext;
}

describe("FileService", () => {
  let ctx: PluginContext;
  let service: FileService;

  beforeEach(() => {
    ctx = createMockCtx();
    service = new FileService(ctx);
  });

  // ---- listDir ----

  describe("listDir", () => {
    it("正常列出目录内容并返回 FileTreeNode 数组", async () => {
      vi.mocked(ctx.fs.readDir).mockResolvedValue(["file.ts", "subdir"]);
      vi.mocked(ctx.fs.stat)
        .mockResolvedValueOnce({ size: 1024, isFile: true, isDirectory: false, mtime: 1000 })
        .mockResolvedValueOnce({ size: 0, isFile: false, isDirectory: true, mtime: 2000 });

      const result = await service.listDir("/workspace/project/src");

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: "file.ts",
        path: "/workspace/project/src/file.ts",
        isDirectory: false,
        size: 1024,
        mtime: 1000
      });
      expect(result[1]).toEqual({
        name: "subdir",
        path: "/workspace/project/src/subdir",
        isDirectory: true,
        size: 0,
        mtime: 2000
      });
    });

    it("空目录返回空数组", async () => {
      vi.mocked(ctx.fs.readDir).mockResolvedValue([]);

      const result = await service.listDir("/workspace/project/empty");

      expect(result).toEqual([]);
    });

    it("不存在的路径抛出错误", async () => {
      vi.mocked(ctx.fs.readDir).mockRejectedValue(new Error("ENOENT"));

      await expect(service.listDir("/workspace/project/nonexistent")).rejects.toThrow("ENOENT");
    });

    it("路径穿越攻击被拦截", async () => {
      await expect(service.listDir("/workspace/project/../../etc")).rejects.toThrow(
        "Path security violation"
      );
    });
  });

  // ---- readPreview ----

  describe("readPreview", () => {
    it("正常读取文件内容", async () => {
      const content = "const x = 1;";
      vi.mocked(ctx.fs.stat).mockResolvedValue({
        size: content.length,
        isFile: true,
        isDirectory: false,
        mtime: 1000
      });
      vi.mocked(ctx.fs.readFile).mockResolvedValue(Buffer.from(content));

      const result = await service.readPreview("/workspace/project/test.ts");

      expect(result.content).toBe(content);
      expect(result.truncated).toBe(false);
      expect(result.language).toBe("typescript");
      expect(result.size).toBe(content.length);
    });

    it("大文件被截断（>500KB）", async () => {
      const bigContent = "x".repeat(MAX_PREVIEW_SIZE + 100);
      vi.mocked(ctx.fs.stat).mockResolvedValue({
        size: bigContent.length,
        isFile: true,
        isDirectory: false,
        mtime: 1000
      });
      vi.mocked(ctx.fs.readFile).mockResolvedValue(Buffer.from(bigContent));

      const result = await service.readPreview("/workspace/project/big.js");

      expect(result.content.length).toBe(MAX_PREVIEW_SIZE);
      expect(result.truncated).toBe(true);
      expect(result.size).toBe(bigContent.length);
    });

    it("二进制文件返回提示信息而非内容", async () => {
      vi.mocked(ctx.fs.stat).mockResolvedValue({
        size: 2048,
        isFile: true,
        isDirectory: false,
        mtime: 1000
      });

      const result = await service.readPreview("/workspace/project/image.png");

      expect(result.content).toBe("");
      expect(result.language).toBe("binary");
      expect(result.size).toBe(2048);
      // readFile should not be called for binary files
      expect(ctx.fs.readFile).not.toHaveBeenCalled();
    });

    it("路径穿越攻击被拦截", async () => {
      await expect(service.readPreview("/workspace/project/../../../etc/passwd")).rejects.toThrow(
        "Path security violation"
      );
    });
  });

  // ---- searchFiles ----

  describe("searchFiles", () => {
    it("按文件名搜索返回匹配结果", async () => {
      // Root dir
      vi.mocked(ctx.fs.readDir)
        .mockResolvedValueOnce(["app.ts", "utils.ts", "subdir"])
        .mockResolvedValueOnce(["helper.ts"]);
      vi.mocked(ctx.fs.stat)
        .mockResolvedValueOnce({ size: 100, isFile: true, isDirectory: false, mtime: 1 })
        .mockResolvedValueOnce({ size: 200, isFile: true, isDirectory: false, mtime: 2 })
        .mockResolvedValueOnce({ size: 0, isFile: false, isDirectory: true, mtime: 3 })
        .mockResolvedValueOnce({ size: 50, isFile: true, isDirectory: false, mtime: 4 });

      const results = await service.searchFiles("/workspace/project", "app", { mode: "name" });

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("app.ts");
      expect(results[0].path).toBe("/workspace/project/app.ts");
    });

    it("按文件内容搜索返回匹配行", async () => {
      vi.mocked(ctx.fs.readDir).mockResolvedValueOnce(["main.ts"]);
      vi.mocked(ctx.fs.stat).mockResolvedValueOnce({
        size: 100,
        isFile: true,
        isDirectory: false,
        mtime: 1
      });
      vi.mocked(ctx.fs.readFile).mockResolvedValueOnce(Buffer.from("line1\nfind me here\nline3"));

      const results = await service.searchFiles("/workspace/project", "find me", {
        mode: "content"
      });

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("main.ts");
      expect(results[0].matchLine).toBe("find me here");
      expect(results[0].lineNumber).toBe(2);
    });

    it("无匹配结果返回空数组", async () => {
      vi.mocked(ctx.fs.readDir).mockResolvedValueOnce(["file.ts"]);
      vi.mocked(ctx.fs.stat).mockResolvedValueOnce({
        size: 50,
        isFile: true,
        isDirectory: false,
        mtime: 1
      });

      const results = await service.searchFiles("/workspace/project", "zzz_no_match", {
        mode: "name"
      });

      expect(results).toEqual([]);
    });

    it("深度限制生效", async () => {
      // depth 0 means only scan root
      vi.mocked(ctx.fs.readDir).mockResolvedValueOnce(["a.ts", "sub"]);
      vi.mocked(ctx.fs.stat)
        .mockResolvedValueOnce({ size: 10, isFile: true, isDirectory: false, mtime: 1 })
        .mockResolvedValueOnce({ size: 0, isFile: false, isDirectory: true, mtime: 2 });

      const results = await service.searchFiles("/workspace/project", "a", {
        mode: "name",
        maxDepth: 0
      });

      // Only root level file matched, subdir not traversed
      expect(results).toHaveLength(1);
      expect(ctx.fs.readDir).toHaveBeenCalledTimes(1);
    });

    it("结果数限制生效", async () => {
      vi.mocked(ctx.fs.readDir).mockResolvedValueOnce(["a.ts", "ab.ts", "abc.ts"]);
      vi.mocked(ctx.fs.stat)
        .mockResolvedValueOnce({ size: 10, isFile: true, isDirectory: false, mtime: 1 })
        .mockResolvedValueOnce({ size: 20, isFile: true, isDirectory: false, mtime: 2 })
        .mockResolvedValueOnce({ size: 30, isFile: true, isDirectory: false, mtime: 3 });

      const results = await service.searchFiles("/workspace/project", "a", {
        mode: "name",
        maxResults: 2
      });

      expect(results).toHaveLength(2);
    });

    it("路径穿越攻击被拦截", async () => {
      await expect(
        service.searchFiles("/workspace/project/../../etc", "passwd", { mode: "name" })
      ).rejects.toThrow("Path security violation");
    });
  });

  // ---- createFile ----

  describe("createFile", () => {
    it("正常创建文件", async () => {
      vi.mocked(ctx.fs.writeFile).mockResolvedValue(undefined);

      await service.createFile("/workspace/project/new.ts", "content");

      expect(ctx.fs.writeFile).toHaveBeenCalledWith("/workspace/project/new.ts", "content");
    });

    it("路径穿越攻击被拦截", async () => {
      await expect(service.createFile("/workspace/project/../../etc/hack", "bad")).rejects.toThrow(
        "Path security violation"
      );
    });
  });

  // ---- createDir ----

  describe("createDir", () => {
    it("正常创建目录", async () => {
      vi.mocked(ctx.fs.writeFile).mockResolvedValue(undefined);

      await service.createDir("/workspace/project/newdir");

      // createDir uses writeFile with a placeholder since ctx.fs doesn't have mkdir
      // The implementation will use shell.exec or a workaround
      expect(ctx.fs.writeFile).toHaveBeenCalled();
    });

    it("路径穿越攻击被拦截", async () => {
      await expect(service.createDir("/workspace/project/../../etc/hack")).rejects.toThrow(
        "Path security violation"
      );
    });
  });

  // ---- rename ----

  describe("rename", () => {
    it("正常重命名", async () => {
      vi.mocked(ctx.fs.readFile).mockResolvedValue(Buffer.from("content"));
      vi.mocked(ctx.fs.writeFile).mockResolvedValue(undefined);

      await service.rename("/workspace/project/old.ts", "/workspace/project/new.ts");

      // rename reads source, writes to new path
      expect(ctx.fs.readFile).toHaveBeenCalledWith("/workspace/project/old.ts");
      expect(ctx.fs.writeFile).toHaveBeenCalledWith("/workspace/project/new.ts", expect.anything());
    });

    it("源路径穿越被拦截", async () => {
      await expect(
        service.rename("/workspace/project/../../etc/passwd", "/workspace/project/new.ts")
      ).rejects.toThrow("Path security violation");
    });

    it("目标路径穿越被拦截", async () => {
      await expect(
        service.rename("/workspace/project/old.ts", "/workspace/project/../../etc/hack")
      ).rejects.toThrow("Path security violation");
    });
  });

  // ---- deleteItem ----

  describe("deleteItem", () => {
    it("正常删除文件", async () => {
      vi.mocked(ctx.fs.writeFile).mockResolvedValue(undefined);

      await service.deleteItem("/workspace/project/trash.ts");

      // deleteItem delegates to shell.exec rm or ctx.fs operation
      expect(ctx.shell.exec).toHaveBeenCalled();
    });

    it("路径穿越攻击被拦截", async () => {
      await expect(service.deleteItem("/workspace/project/../../etc/passwd")).rejects.toThrow(
        "Path security violation"
      );
    });
  });

  // ---- Path Security ----

  describe("路径安全校验", () => {
    it("相对路径中的 .. 被正确检测", async () => {
      await expect(service.listDir("/workspace/project/../../../")).rejects.toThrow(
        "Path security violation"
      );
    });

    it("根路径本身是合法的", async () => {
      vi.mocked(ctx.fs.readDir).mockResolvedValue([]);
      const result = await service.listDir("/workspace/project");
      expect(result).toEqual([]);
    });

    it("根路径子目录是合法的", async () => {
      vi.mocked(ctx.fs.readDir).mockResolvedValue([]);
      const result = await service.listDir("/workspace/project/src/deep");
      expect(result).toEqual([]);
    });
  });
});
