import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock window.workbox.git
const mockGit = {
  getStatus: vi.fn(() => Promise.resolve([])),
  stage: vi.fn(() => Promise.resolve()),
  unstage: vi.fn(() => Promise.resolve()),
  commit: vi.fn(() => Promise.resolve()),
  getBranches: vi.fn(() => Promise.resolve([])),
  checkout: vi.fn(() => Promise.resolve()),
  getDiff: vi.fn(() => Promise.resolve([])),
  getLog: vi.fn(() => Promise.resolve([]))
};
vi.stubGlobal("window", { workbox: { git: mockGit } });

import { useGitStore, initialGitState } from "./store";
import type { GitFileStatus, GitBranch, GitCommitInfo, GitFileDiff } from "../constants";

describe("useGitStore", () => {
  beforeEach(() => {
    useGitStore.setState({ ...initialGitState });
    vi.clearAllMocks();
  });

  // ---- 初始状态 ----
  it("初始状态正确", () => {
    const state = useGitStore.getState();
    expect(state.activeTab).toBe("status");
    expect(state.files).toEqual([]);
    expect(state.branches).toEqual([]);
    expect(state.commits).toEqual([]);
    expect(state.selectedFilePath).toBeNull();
    expect(state.fileDiff).toBeNull();
    expect(state.commitMessage).toBe("");
    expect(state.isLoading).toBe(false);
  });

  // ---- setActiveTab ----
  it("setActiveTab 切换到 branches", () => {
    useGitStore.getState().setActiveTab("branches");
    expect(useGitStore.getState().activeTab).toBe("branches");
  });

  it("setActiveTab 切换到 history", () => {
    useGitStore.getState().setActiveTab("history");
    expect(useGitStore.getState().activeTab).toBe("history");
  });

  // ---- refreshStatus ----
  it("refreshStatus 加载文件状态", async () => {
    const files: GitFileStatus[] = [
      { path: "src/index.ts", status: "modified", staged: false },
      { path: "new-file.ts", status: "added", staged: true }
    ];
    mockGit.getStatus.mockResolvedValue(files);

    await useGitStore.getState().refreshStatus();

    const state = useGitStore.getState();
    expect(state.files).toEqual(files);
    expect(state.isLoading).toBe(false);
    expect(mockGit.getStatus).toHaveBeenCalledOnce();
  });

  it("refreshStatus 失败时清空文件列表", async () => {
    useGitStore.setState({ files: [{ path: "x", status: "modified", staged: false }] });
    mockGit.getStatus.mockRejectedValue(new Error("not a git repo"));

    await useGitStore.getState().refreshStatus();

    expect(useGitStore.getState().files).toEqual([]);
    expect(useGitStore.getState().isLoading).toBe(false);
  });

  // ---- toggleStage ----
  it("toggleStage 暂存未暂存的文件", async () => {
    mockGit.getStatus.mockResolvedValue([]);

    await useGitStore.getState().toggleStage("src/index.ts", false);

    expect(mockGit.stage).toHaveBeenCalledWith(["src/index.ts"]);
    expect(mockGit.unstage).not.toHaveBeenCalled();
    expect(mockGit.getStatus).toHaveBeenCalled(); // auto-refresh
  });

  it("toggleStage 取消暂存已暂存的文件", async () => {
    mockGit.getStatus.mockResolvedValue([]);

    await useGitStore.getState().toggleStage("src/index.ts", true);

    expect(mockGit.unstage).toHaveBeenCalledWith(["src/index.ts"]);
    expect(mockGit.stage).not.toHaveBeenCalled();
  });

  // ---- commit ----
  it("commit 提交并清空消息", async () => {
    useGitStore.setState({ commitMessage: "feat: add feature" });
    mockGit.getStatus.mockResolvedValue([]);

    await useGitStore.getState().commit();

    expect(mockGit.commit).toHaveBeenCalledWith("feat: add feature");
    expect(useGitStore.getState().commitMessage).toBe("");
    expect(useGitStore.getState().isLoading).toBe(false);
  });

  it("commit 空消息不执行", async () => {
    useGitStore.setState({ commitMessage: "" });

    await useGitStore.getState().commit();

    expect(mockGit.commit).not.toHaveBeenCalled();
  });

  it("commit 仅空格的消息不执行", async () => {
    useGitStore.setState({ commitMessage: "   " });

    await useGitStore.getState().commit();

    expect(mockGit.commit).not.toHaveBeenCalled();
  });

  it("commit 失败时保留消息", async () => {
    useGitStore.setState({ commitMessage: "feat: add feature" });
    mockGit.commit.mockRejectedValue(new Error("commit failed"));

    await useGitStore.getState().commit();

    expect(useGitStore.getState().commitMessage).toBe("feat: add feature");
    expect(useGitStore.getState().isLoading).toBe(false);
  });

  // ---- refreshBranches ----
  it("refreshBranches 加载分支列表", async () => {
    const branches: GitBranch[] = [
      { name: "main", current: true },
      { name: "feature/x", current: false, remote: "origin/feature/x" }
    ];
    mockGit.getBranches.mockResolvedValue(branches);

    await useGitStore.getState().refreshBranches();

    expect(useGitStore.getState().branches).toEqual(branches);
    expect(useGitStore.getState().isLoading).toBe(false);
  });

  it("refreshBranches 失败时清空分支列表", async () => {
    useGitStore.setState({ branches: [{ name: "main", current: true }] });
    mockGit.getBranches.mockRejectedValue(new Error("error"));

    await useGitStore.getState().refreshBranches();

    expect(useGitStore.getState().branches).toEqual([]);
  });

  // ---- checkout ----
  it("checkout 切换分支并刷新状态", async () => {
    mockGit.getBranches.mockResolvedValue([]);
    mockGit.getStatus.mockResolvedValue([]);

    await useGitStore.getState().checkout("feature/x");

    expect(mockGit.checkout).toHaveBeenCalledWith("feature/x");
    expect(mockGit.getBranches).toHaveBeenCalled();
    expect(mockGit.getStatus).toHaveBeenCalled();
    expect(useGitStore.getState().isLoading).toBe(false);
  });

  it("checkout 失败时不刷新", async () => {
    mockGit.checkout.mockRejectedValue(new Error("checkout failed"));

    await useGitStore.getState().checkout("bad-branch");

    expect(useGitStore.getState().isLoading).toBe(false);
    expect(mockGit.getBranches).not.toHaveBeenCalled();
  });

  // ---- refreshHistory ----
  it("refreshHistory 加载提交历史", async () => {
    const commits: GitCommitInfo[] = [
      {
        hash: "abc123def456",
        shortHash: "abc123d",
        message: "feat: add feature",
        author: "dev",
        date: "2025-01-01T00:00:00Z"
      }
    ];
    mockGit.getLog.mockResolvedValue(commits);

    await useGitStore.getState().refreshHistory();

    expect(useGitStore.getState().commits).toEqual(commits);
    expect(useGitStore.getState().isLoading).toBe(false);
  });

  it("refreshHistory 失败时清空历史", async () => {
    useGitStore.setState({
      commits: [
        {
          hash: "x",
          shortHash: "x",
          message: "m",
          author: "a",
          date: "d"
        }
      ]
    });
    mockGit.getLog.mockRejectedValue(new Error("error"));

    await useGitStore.getState().refreshHistory();

    expect(useGitStore.getState().commits).toEqual([]);
  });

  // ---- selectFile ----
  it("selectFile 选中文件并加载 diff", async () => {
    const diffs: GitFileDiff[] = [
      {
        filePath: "src/index.ts",
        hunks: [
          {
            oldStart: 1,
            oldCount: 3,
            newStart: 1,
            newCount: 4,
            lines: [
              { type: "context", content: "line 1" },
              { type: "remove", content: "old line" },
              { type: "add", content: "new line" },
              { type: "add", content: "extra line" }
            ]
          }
        ]
      }
    ];
    mockGit.getDiff.mockResolvedValue(diffs);

    await useGitStore.getState().selectFile("src/index.ts");

    const state = useGitStore.getState();
    expect(state.selectedFilePath).toBe("src/index.ts");
    expect(state.fileDiff).toEqual(diffs[0]);
    expect(mockGit.getDiff).toHaveBeenCalledWith({ path: "src/index.ts" });
  });

  it("selectFile 文件不在 diff 结果中时设为 null", async () => {
    mockGit.getDiff.mockResolvedValue([]);

    await useGitStore.getState().selectFile("src/missing.ts");

    expect(useGitStore.getState().selectedFilePath).toBe("src/missing.ts");
    expect(useGitStore.getState().fileDiff).toBeNull();
  });

  it("selectFile 失败时清空 diff", async () => {
    mockGit.getDiff.mockRejectedValue(new Error("diff error"));

    await useGitStore.getState().selectFile("src/error.ts");

    expect(useGitStore.getState().fileDiff).toBeNull();
  });

  // ---- setCommitMessage ----
  it("setCommitMessage 更新提交消息", () => {
    useGitStore.getState().setCommitMessage("fix: bug fix");
    expect(useGitStore.getState().commitMessage).toBe("fix: bug fix");
  });
});
