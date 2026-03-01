import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PluginContext } from "@workbox/plugin-api";
import { GitService } from "./git-service.ts";

/** Create a mock PluginContext with all methods stubbed */
function createMockCtx(rootPath = "/workspace/project"): PluginContext {
  return {
    plugin: { id: "git-helper", name: "Git Helper", version: "0.1.0", dataPath: "/tmp" },
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

describe("GitService", () => {
  let ctx: PluginContext;
  let service: GitService;

  beforeEach(() => {
    ctx = createMockCtx();
    service = new GitService(ctx);
  });

  // ---- getStatus ----

  describe("getStatus", () => {
    it("解析 modified 文件", async () => {
      vi.mocked(ctx.shell.exec).mockResolvedValue({
        stdout: " M src/app.ts\n",
        stderr: "",
        exitCode: 0
      });

      const result = await service.getStatus();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: "src/app.ts",
        status: "modified",
        staged: false
      });
    });

    it("解析 staged modified 文件", async () => {
      vi.mocked(ctx.shell.exec).mockResolvedValue({
        stdout: "M  src/app.ts\n",
        stderr: "",
        exitCode: 0
      });

      const result = await service.getStatus();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: "src/app.ts",
        status: "modified",
        staged: true
      });
    });

    it("解析 added (staged new) 文件", async () => {
      vi.mocked(ctx.shell.exec).mockResolvedValue({
        stdout: "A  new-file.ts\n",
        stderr: "",
        exitCode: 0
      });

      const result = await service.getStatus();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: "new-file.ts",
        status: "added",
        staged: true
      });
    });

    it("解析 deleted 文件", async () => {
      vi.mocked(ctx.shell.exec).mockResolvedValue({
        stdout: " D removed.ts\n",
        stderr: "",
        exitCode: 0
      });

      const result = await service.getStatus();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: "removed.ts",
        status: "deleted",
        staged: false
      });
    });

    it("解析 untracked 文件", async () => {
      vi.mocked(ctx.shell.exec).mockResolvedValue({
        stdout: "?? untracked.ts\n",
        stderr: "",
        exitCode: 0
      });

      const result = await service.getStatus();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: "untracked.ts",
        status: "untracked",
        staged: false
      });
    });

    it("解析 renamed 文件", async () => {
      vi.mocked(ctx.shell.exec).mockResolvedValue({
        stdout: "R  old.ts -> new.ts\n",
        stderr: "",
        exitCode: 0
      });

      const result = await service.getStatus();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: "new.ts",
        status: "renamed",
        staged: true,
        oldPath: "old.ts"
      });
    });

    it("解析多个文件状态", async () => {
      vi.mocked(ctx.shell.exec).mockResolvedValue({
        stdout: " M src/app.ts\nA  new.ts\n?? todo.md\n",
        stderr: "",
        exitCode: 0
      });

      const result = await service.getStatus();

      expect(result).toHaveLength(3);
      expect(result[0].status).toBe("modified");
      expect(result[1].status).toBe("added");
      expect(result[2].status).toBe("untracked");
    });

    it("干净仓库返回空数组", async () => {
      vi.mocked(ctx.shell.exec).mockResolvedValue({
        stdout: "",
        stderr: "",
        exitCode: 0
      });

      const result = await service.getStatus();

      expect(result).toEqual([]);
    });

    it("支持指定 cwd", async () => {
      vi.mocked(ctx.shell.exec).mockResolvedValue({
        stdout: "",
        stderr: "",
        exitCode: 0
      });

      await service.getStatus("/other/repo");

      expect(ctx.shell.exec).toHaveBeenCalledWith("git status --porcelain", {
        cwd: "/other/repo"
      });
    });

    it("非 Git 仓库抛出错误", async () => {
      vi.mocked(ctx.shell.exec).mockResolvedValue({
        stdout: "",
        stderr: "fatal: not a git repository",
        exitCode: 128
      });

      await expect(service.getStatus()).rejects.toThrow("not a git repository");
    });
  });

  // ---- stage ----

  describe("stage", () => {
    it("stage 单个文件", async () => {
      vi.mocked(ctx.shell.exec).mockResolvedValue({
        stdout: "",
        stderr: "",
        exitCode: 0
      });

      await service.stage(["src/app.ts"]);

      expect(ctx.shell.exec).toHaveBeenCalledWith("git add -- src/app.ts", {
        cwd: "/workspace/project"
      });
    });

    it("stage 多个文件", async () => {
      vi.mocked(ctx.shell.exec).mockResolvedValue({
        stdout: "",
        stderr: "",
        exitCode: 0
      });

      await service.stage(["a.ts", "b.ts"]);

      expect(ctx.shell.exec).toHaveBeenCalledWith("git add -- a.ts b.ts", {
        cwd: "/workspace/project"
      });
    });

    it("空文件列表不执行命令", async () => {
      await service.stage([]);

      expect(ctx.shell.exec).not.toHaveBeenCalled();
    });
  });

  // ---- unstage ----

  describe("unstage", () => {
    it("unstage 单个文件", async () => {
      vi.mocked(ctx.shell.exec).mockResolvedValue({
        stdout: "",
        stderr: "",
        exitCode: 0
      });

      await service.unstage(["src/app.ts"]);

      expect(ctx.shell.exec).toHaveBeenCalledWith("git restore --staged -- src/app.ts", {
        cwd: "/workspace/project"
      });
    });

    it("unstage 多个文件", async () => {
      vi.mocked(ctx.shell.exec).mockResolvedValue({
        stdout: "",
        stderr: "",
        exitCode: 0
      });

      await service.unstage(["a.ts", "b.ts"]);

      expect(ctx.shell.exec).toHaveBeenCalledWith("git restore --staged -- a.ts b.ts", {
        cwd: "/workspace/project"
      });
    });

    it("空文件列表不执行命令", async () => {
      await service.unstage([]);

      expect(ctx.shell.exec).not.toHaveBeenCalled();
    });
  });

  // ---- commit ----

  describe("commit", () => {
    it("正常提交", async () => {
      vi.mocked(ctx.shell.exec).mockResolvedValue({
        stdout: "[main abc1234] fix bug\n",
        stderr: "",
        exitCode: 0
      });

      await service.commit("fix bug");

      expect(ctx.shell.exec).toHaveBeenCalledWith(expect.stringContaining("git commit -m"), {
        cwd: "/workspace/project"
      });
    });

    it("空 message 被拒绝", async () => {
      await expect(service.commit("")).rejects.toThrow("Commit message must not be empty");
    });

    it("仅空格 message 被拒绝", async () => {
      await expect(service.commit("   ")).rejects.toThrow("Commit message must not be empty");
    });

    it("message 中的特殊字符被正确处理", async () => {
      vi.mocked(ctx.shell.exec).mockResolvedValue({
        stdout: "",
        stderr: "",
        exitCode: 0
      });

      await service.commit('fix: handle "quotes" & special chars');

      // Should not throw, and the message should be passed safely
      expect(ctx.shell.exec).toHaveBeenCalled();
    });
  });

  // ---- getBranches ----

  describe("getBranches", () => {
    it("解析本地分支列表", async () => {
      vi.mocked(ctx.shell.exec).mockResolvedValue({
        stdout: "main * \nfeature/login  \ndev  \n",
        stderr: "",
        exitCode: 0
      });

      const result = await service.getBranches();

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ name: "main", current: true });
      expect(result[1]).toEqual({ name: "feature/login", current: false });
      expect(result[2]).toEqual({ name: "dev", current: false });
    });

    it("解析带有远程跟踪的分支", async () => {
      vi.mocked(ctx.shell.exec).mockResolvedValue({
        stdout: "main * origin/main\ndev  origin/dev\n",
        stderr: "",
        exitCode: 0
      });

      const result = await service.getBranches();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ name: "main", current: true, remote: "origin/main" });
      expect(result[1]).toEqual({ name: "dev", current: false, remote: "origin/dev" });
    });

    it("空仓库（无分支）返回空数组", async () => {
      vi.mocked(ctx.shell.exec).mockResolvedValue({
        stdout: "",
        stderr: "",
        exitCode: 0
      });

      const result = await service.getBranches();

      expect(result).toEqual([]);
    });
  });

  // ---- checkout ----

  describe("checkout", () => {
    it("切换到合法分支", async () => {
      vi.mocked(ctx.shell.exec).mockResolvedValue({
        stdout: "Switched to branch 'dev'\n",
        stderr: "",
        exitCode: 0
      });

      await service.checkout("dev");

      expect(ctx.shell.exec).toHaveBeenCalledWith("git checkout dev", {
        cwd: "/workspace/project"
      });
    });

    it("支持含斜杠的分支名", async () => {
      vi.mocked(ctx.shell.exec).mockResolvedValue({
        stdout: "",
        stderr: "",
        exitCode: 0
      });

      await service.checkout("feature/login");

      expect(ctx.shell.exec).toHaveBeenCalledWith("git checkout feature/login", {
        cwd: "/workspace/project"
      });
    });

    it("拒绝包含空格的分支名", async () => {
      await expect(service.checkout("bad branch")).rejects.toThrow("Invalid branch name");
    });

    it("拒绝包含分号的分支名（命令注入）", async () => {
      await expect(service.checkout("dev; rm -rf /")).rejects.toThrow("Invalid branch name");
    });

    it("拒绝包含反引号的分支名（命令注入）", async () => {
      await expect(service.checkout("`whoami`")).rejects.toThrow("Invalid branch name");
    });

    it("拒绝空分支名", async () => {
      await expect(service.checkout("")).rejects.toThrow("Branch name must not be empty");
    });

    it("拒绝包含 $() 的分支名（命令注入）", async () => {
      await expect(service.checkout("$(whoami)")).rejects.toThrow("Invalid branch name");
    });
  });

  // ---- getDiff ----

  describe("getDiff", () => {
    it("解析单文件 diff", async () => {
      const diffOutput = [
        "diff --git a/src/app.ts b/src/app.ts",
        "--- a/src/app.ts",
        "+++ b/src/app.ts",
        "@@ -1,3 +1,4 @@",
        " line 1",
        "-old line 2",
        "+new line 2",
        "+added line",
        " line 3"
      ].join("\n");

      vi.mocked(ctx.shell.exec).mockResolvedValue({
        stdout: diffOutput,
        stderr: "",
        exitCode: 0
      });

      const result = await service.getDiff();

      expect(result).toHaveLength(1);
      expect(result[0].filePath).toBe("src/app.ts");
      expect(result[0].hunks).toHaveLength(1);
      expect(result[0].hunks[0].oldStart).toBe(1);
      expect(result[0].hunks[0].oldCount).toBe(3);
      expect(result[0].hunks[0].newStart).toBe(1);
      expect(result[0].hunks[0].newCount).toBe(4);
      expect(result[0].hunks[0].lines).toEqual([
        { type: "context", content: "line 1" },
        { type: "remove", content: "old line 2" },
        { type: "add", content: "new line 2" },
        { type: "add", content: "added line" },
        { type: "context", content: "line 3" }
      ]);
    });

    it("解析多文件 diff", async () => {
      const diffOutput = [
        "diff --git a/a.ts b/a.ts",
        "--- a/a.ts",
        "+++ b/a.ts",
        "@@ -1,2 +1,2 @@",
        "-old",
        "+new",
        "diff --git a/b.ts b/b.ts",
        "--- a/b.ts",
        "+++ b/b.ts",
        "@@ -1,1 +1,1 @@",
        "-foo",
        "+bar"
      ].join("\n");

      vi.mocked(ctx.shell.exec).mockResolvedValue({
        stdout: diffOutput,
        stderr: "",
        exitCode: 0
      });

      const result = await service.getDiff();

      expect(result).toHaveLength(2);
      expect(result[0].filePath).toBe("a.ts");
      expect(result[1].filePath).toBe("b.ts");
    });

    it("无变更返回空数组", async () => {
      vi.mocked(ctx.shell.exec).mockResolvedValue({
        stdout: "",
        stderr: "",
        exitCode: 0
      });

      const result = await service.getDiff();

      expect(result).toEqual([]);
    });

    it("支持 staged diff", async () => {
      vi.mocked(ctx.shell.exec).mockResolvedValue({
        stdout: "",
        stderr: "",
        exitCode: 0
      });

      await service.getDiff({ staged: true });

      expect(ctx.shell.exec).toHaveBeenCalledWith(
        expect.stringContaining("--staged"),
        expect.anything()
      );
    });

    it("支持指定文件路径", async () => {
      vi.mocked(ctx.shell.exec).mockResolvedValue({
        stdout: "",
        stderr: "",
        exitCode: 0
      });

      await service.getDiff({ path: "src/app.ts" });

      expect(ctx.shell.exec).toHaveBeenCalledWith(
        expect.stringContaining("-- src/app.ts"),
        expect.anything()
      );
    });
  });

  // ---- getLog ----

  describe("getLog", () => {
    it("解析 commit 日志", async () => {
      const logOutput = [
        "abc1234567890|abc1234|fix: handle edge case|John Doe|2024-01-15T10:30:00+08:00",
        "def5678901234|def5678|feat: add login|Jane Smith|2024-01-14T09:00:00+08:00"
      ].join("\n");

      vi.mocked(ctx.shell.exec).mockResolvedValue({
        stdout: logOutput,
        stderr: "",
        exitCode: 0
      });

      const result = await service.getLog();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        hash: "abc1234567890",
        shortHash: "abc1234",
        message: "fix: handle edge case",
        author: "John Doe",
        date: "2024-01-15T10:30:00+08:00"
      });
      expect(result[1]).toEqual({
        hash: "def5678901234",
        shortHash: "def5678",
        message: "feat: add login",
        author: "Jane Smith",
        date: "2024-01-14T09:00:00+08:00"
      });
    });

    it("默认返回 50 条记录", async () => {
      vi.mocked(ctx.shell.exec).mockResolvedValue({
        stdout: "",
        stderr: "",
        exitCode: 0
      });

      await service.getLog();

      expect(ctx.shell.exec).toHaveBeenCalledWith(
        expect.stringContaining("-n 50"),
        expect.anything()
      );
    });

    it("自定义数量", async () => {
      vi.mocked(ctx.shell.exec).mockResolvedValue({
        stdout: "",
        stderr: "",
        exitCode: 0
      });

      await service.getLog({ count: 10 });

      expect(ctx.shell.exec).toHaveBeenCalledWith(
        expect.stringContaining("-n 10"),
        expect.anything()
      );
    });

    it("数量被限制为最大 200", async () => {
      vi.mocked(ctx.shell.exec).mockResolvedValue({
        stdout: "",
        stderr: "",
        exitCode: 0
      });

      await service.getLog({ count: 500 });

      expect(ctx.shell.exec).toHaveBeenCalledWith(
        expect.stringContaining("-n 200"),
        expect.anything()
      );
    });

    it("空仓库返回空数组", async () => {
      vi.mocked(ctx.shell.exec).mockResolvedValue({
        stdout: "",
        stderr: "",
        exitCode: 0
      });

      const result = await service.getLog();

      expect(result).toEqual([]);
    });

    it("解析含竖线的 commit message", async () => {
      const logOutput = "abc1234567890|abc1234|fix: handle a|b case|John|2024-01-15T10:30:00+08:00";

      vi.mocked(ctx.shell.exec).mockResolvedValue({
        stdout: logOutput,
        stderr: "",
        exitCode: 0
      });

      const result = await service.getLog();

      expect(result).toHaveLength(1);
      expect(result[0].hash).toBe("abc1234567890");
      expect(result[0].shortHash).toBe("abc1234");
      // Message may contain pipes - should handle gracefully
      expect(result[0].message).toBe("fix: handle a|b case");
    });
  });

  // ---- Error handling ----

  describe("非 Git 仓库错误处理", () => {
    it("getStatus 在非 Git 仓库时报错", async () => {
      vi.mocked(ctx.shell.exec).mockResolvedValue({
        stdout: "",
        stderr: "fatal: not a git repository (or any of the parent directories): .git",
        exitCode: 128
      });

      await expect(service.getStatus()).rejects.toThrow("not a git repository");
    });

    it("commit 在非 Git 仓库时报错", async () => {
      vi.mocked(ctx.shell.exec).mockResolvedValue({
        stdout: "",
        stderr: "fatal: not a git repository",
        exitCode: 128
      });

      await expect(service.commit("test")).rejects.toThrow("not a git repository");
    });

    it("getBranches 在非 Git 仓库时报错", async () => {
      vi.mocked(ctx.shell.exec).mockResolvedValue({
        stdout: "",
        stderr: "fatal: not a git repository",
        exitCode: 128
      });

      await expect(service.getBranches()).rejects.toThrow("not a git repository");
    });
  });
});
