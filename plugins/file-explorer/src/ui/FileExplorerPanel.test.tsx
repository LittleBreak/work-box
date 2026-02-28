import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock window.workbox.fileExplorer (preserve jsdom window/document)
const mockFileExplorer = {
  getRootPath: vi.fn(() => Promise.resolve("/workspace")),
  listDir: vi.fn(() => Promise.resolve([])),
  readPreview: vi.fn(() =>
    Promise.resolve({ content: "hello world", truncated: false, language: "plaintext", size: 11 })
  ),
  searchFiles: vi.fn(() => Promise.resolve([])),
  createFile: vi.fn(() => Promise.resolve()),
  createDir: vi.fn(() => Promise.resolve()),
  rename: vi.fn(() => Promise.resolve()),
  deleteItem: vi.fn(() => Promise.resolve())
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).workbox = { fileExplorer: mockFileExplorer };

import { FileExplorerPanel } from "./FileExplorerPanel";
import { useFileExplorerStore, initialFileExplorerState } from "./store";
import type { FileNode } from "./store";

/** Helper: create mock FileNode */
function createNode(overrides: Partial<FileNode> = {}): FileNode {
  return {
    name: "test.txt",
    path: "/workspace/test.txt",
    isDirectory: false,
    size: 100,
    mtime: Date.now(),
    ...overrides
  };
}

describe("FileExplorerPanel", () => {
  beforeEach(() => {
    useFileExplorerStore.setState({ ...initialFileExplorerState });
    vi.clearAllMocks();
    mockFileExplorer.getRootPath.mockResolvedValue("/workspace");
    mockFileExplorer.listDir.mockResolvedValue([]);
  });

  it("渲染面板并显示加载状态", () => {
    render(<FileExplorerPanel />);
    expect(screen.getByText("正在加载文件浏览器...")).toBeInTheDocument();
  });

  it("初始化后显示文件树和预览区域", async () => {
    const nodes: FileNode[] = [
      createNode({ name: "src", path: "/workspace/src", isDirectory: true }),
      createNode({ name: "README.md", path: "/workspace/README.md" })
    ];
    mockFileExplorer.listDir.mockResolvedValue(nodes);

    render(<FileExplorerPanel />);

    await waitFor(() => {
      expect(screen.getByTestId("file-explorer-panel")).toBeInTheDocument();
    });

    // File tree should show nodes
    expect(screen.getByTestId("file-tree")).toBeInTheDocument();
    expect(screen.getByText("src")).toBeInTheDocument();
    expect(screen.getByText("README.md")).toBeInTheDocument();
  });

  it("显示搜索栏", async () => {
    mockFileExplorer.listDir.mockResolvedValue([createNode()]);

    render(<FileExplorerPanel />);

    await waitFor(() => {
      expect(screen.getByTestId("search-bar")).toBeInTheDocument();
    });

    expect(screen.getByTestId("search-input")).toBeInTheDocument();
  });

  it("点击文件加载预览", async () => {
    const nodes = [createNode({ name: "hello.txt", path: "/workspace/hello.txt" })];
    mockFileExplorer.listDir.mockResolvedValue(nodes);
    mockFileExplorer.readPreview.mockResolvedValue({
      content: "file content here",
      truncated: false,
      language: "plaintext",
      size: 17
    });

    render(<FileExplorerPanel />);

    await waitFor(() => {
      expect(screen.getByText("hello.txt")).toBeInTheDocument();
    });

    // Click on file
    await userEvent.click(screen.getByTestId("tree-node-hello.txt"));

    await waitFor(() => {
      expect(screen.getByTestId("file-preview")).toBeInTheDocument();
    });

    expect(mockFileExplorer.readPreview).toHaveBeenCalledWith("/workspace/hello.txt");
  });

  it("点击目录展开子目录", async () => {
    const rootNodes = [createNode({ name: "src", path: "/workspace/src", isDirectory: true })];
    mockFileExplorer.listDir
      .mockResolvedValueOnce(rootNodes) // initial load
      .mockResolvedValueOnce([
        // src expansion
        createNode({ name: "index.ts", path: "/workspace/src/index.ts" })
      ]);

    render(<FileExplorerPanel />);

    await waitFor(() => {
      expect(screen.getByText("src")).toBeInTheDocument();
    });

    // Click directory to expand
    await userEvent.click(screen.getByTestId("tree-node-src"));

    await waitFor(() => {
      expect(screen.getByText("index.ts")).toBeInTheDocument();
    });
  });

  it("未选中文件时显示预览占位", async () => {
    mockFileExplorer.listDir.mockResolvedValue([createNode()]);

    render(<FileExplorerPanel />);

    await waitFor(() => {
      expect(screen.getByText("选择文件以预览")).toBeInTheDocument();
    });
  });

  it("搜索输入触发文件搜索", async () => {
    mockFileExplorer.listDir.mockResolvedValue([createNode()]);
    mockFileExplorer.searchFiles.mockResolvedValue([
      { path: "/workspace/found.ts", name: "found.ts" }
    ]);

    render(<FileExplorerPanel />);

    await waitFor(() => {
      expect(screen.getByTestId("search-input")).toBeInTheDocument();
    });

    // Type in search
    await userEvent.type(screen.getByTestId("search-input"), "found");

    // Wait for debounce + results
    await waitFor(
      () => {
        expect(screen.getByText("found.ts")).toBeInTheDocument();
      },
      { timeout: 1000 }
    );
  });

  it("空目录显示提示", async () => {
    mockFileExplorer.listDir.mockResolvedValue([]);

    render(<FileExplorerPanel />);

    await waitFor(() => {
      expect(screen.getByText("空目录")).toBeInTheDocument();
    });
  });
});
