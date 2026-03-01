import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock window.workbox.git (preserve jsdom window/document)
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).workbox = { git: mockGit };

import GitPanel from "./GitPanel";
import { useGitStore, initialGitState } from "./store";
import type { GitFileStatus, GitBranch, GitCommitInfo } from "../constants";

describe("GitPanel", () => {
  beforeEach(() => {
    useGitStore.setState({ ...initialGitState });
    vi.clearAllMocks();
    mockGit.getStatus.mockResolvedValue([]);
    mockGit.getBranches.mockResolvedValue([]);
    mockGit.getLog.mockResolvedValue([]);
    mockGit.getDiff.mockResolvedValue([]);
  });

  it("渲染面板并显示三个 Tab", () => {
    render(<GitPanel />);

    expect(screen.getByTestId("git-panel")).toBeInTheDocument();
    expect(screen.getByTestId("tab-status")).toBeInTheDocument();
    expect(screen.getByTestId("tab-branches")).toBeInTheDocument();
    expect(screen.getByTestId("tab-history")).toBeInTheDocument();
  });

  it("默认显示状态 Tab", async () => {
    render(<GitPanel />);

    await waitFor(() => {
      expect(screen.getByTestId("status-tab")).toBeInTheDocument();
    });
  });

  it("点击分支 Tab 切换到分支视图", async () => {
    render(<GitPanel />);

    await userEvent.click(screen.getByTestId("tab-branches"));

    await waitFor(() => {
      expect(screen.getByTestId("branch-tab")).toBeInTheDocument();
    });
  });

  it("点击历史 Tab 切换到历史视图", async () => {
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

    render(<GitPanel />);

    await userEvent.click(screen.getByTestId("tab-history"));

    await waitFor(() => {
      expect(screen.getByTestId("history-tab")).toBeInTheDocument();
    });
  });

  it("状态 Tab 显示文件状态列表", async () => {
    const files: GitFileStatus[] = [
      { path: "src/index.ts", status: "modified", staged: false },
      { path: "new-file.ts", status: "added", staged: true }
    ];
    mockGit.getStatus.mockResolvedValue(files);

    render(<GitPanel />);

    await waitFor(() => {
      expect(screen.getByTestId("status-list")).toBeInTheDocument();
    });

    expect(screen.getByText("index.ts")).toBeInTheDocument();
    expect(screen.getByText("new-file.ts")).toBeInTheDocument();
  });

  it("无更改时显示工作区干净提示", async () => {
    mockGit.getStatus.mockResolvedValue([]);

    render(<GitPanel />);

    await waitFor(() => {
      expect(screen.getByText("工作区干净，没有更改")).toBeInTheDocument();
    });
  });

  it("显示刷新按钮", () => {
    render(<GitPanel />);
    expect(screen.getByTestId("refresh-button")).toBeInTheDocument();
  });

  it("刷新按钮触发当前 Tab 数据刷新", async () => {
    render(<GitPanel />);

    await waitFor(() => {
      // Initial load of status tab
      expect(mockGit.getStatus).toHaveBeenCalled();
    });

    vi.clearAllMocks();
    await userEvent.click(screen.getByTestId("refresh-button"));

    expect(mockGit.getStatus).toHaveBeenCalled();
  });

  it("分支 Tab 显示分支列表", async () => {
    const branches: GitBranch[] = [
      { name: "main", current: true },
      { name: "develop", current: false }
    ];
    mockGit.getBranches.mockResolvedValue(branches);

    render(<GitPanel />);
    await userEvent.click(screen.getByTestId("tab-branches"));

    await waitFor(() => {
      expect(screen.getByTestId("branch-main")).toBeInTheDocument();
      expect(screen.getByTestId("branch-develop")).toBeInTheDocument();
    });

    expect(screen.getByText("当前")).toBeInTheDocument();
  });

  it("历史 Tab 显示提交历史", async () => {
    const commits: GitCommitInfo[] = [
      {
        hash: "abc123def456",
        shortHash: "abc123d",
        message: "feat: add feature",
        author: "dev",
        date: "2025-01-01T00:00:00Z"
      },
      {
        hash: "def456ghi789",
        shortHash: "def456g",
        message: "fix: bug fix",
        author: "dev2",
        date: "2024-12-31T00:00:00Z"
      }
    ];
    mockGit.getLog.mockResolvedValue(commits);

    render(<GitPanel />);
    await userEvent.click(screen.getByTestId("tab-history"));

    await waitFor(() => {
      expect(screen.getByText("feat: add feature")).toBeInTheDocument();
      expect(screen.getByText("fix: bug fix")).toBeInTheDocument();
    });

    expect(screen.getByText("abc123d")).toBeInTheDocument();
    expect(screen.getByText("def456g")).toBeInTheDocument();
  });

  it("提交输入框存在且可输入", async () => {
    render(<GitPanel />);

    await waitFor(() => {
      expect(screen.getByTestId("commit-input")).toBeInTheDocument();
    });

    const textarea = screen.getByTestId("commit-message");
    await userEvent.type(textarea, "feat: new feature");

    expect(textarea).toHaveValue("feat: new feature");
  });

  it("提交按钮在无暂存文件时禁用", async () => {
    mockGit.getStatus.mockResolvedValue([{ path: "file.ts", status: "modified", staged: false }]);

    render(<GitPanel />);

    await waitFor(() => {
      expect(screen.getByTestId("status-list")).toBeInTheDocument();
    });

    const textarea = screen.getByTestId("commit-message");
    await userEvent.type(textarea, "some message");

    expect(screen.getByTestId("commit-button")).toBeDisabled();
  });
});
