import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock window.workbox.fileExplorer
const mockFileExplorer = {
  getRootPath: vi.fn(() => Promise.resolve("/workspace")),
  listDir: vi.fn(() => Promise.resolve([])),
  readPreview: vi.fn(() =>
    Promise.resolve({ content: "hello", truncated: false, language: "plaintext", size: 5 })
  ),
  searchFiles: vi.fn(() => Promise.resolve([])),
  createFile: vi.fn(() => Promise.resolve()),
  createDir: vi.fn(() => Promise.resolve()),
  rename: vi.fn(() => Promise.resolve()),
  deleteItem: vi.fn(() => Promise.resolve())
};
vi.stubGlobal("window", { workbox: { fileExplorer: mockFileExplorer } });

import {
  useFileExplorerStore,
  initialFileExplorerState,
  isImageFile,
  formatFileSize
} from "./store";
import type { FileNode } from "./store";

/** Helper: create mock FileNode entries */
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

describe("useFileExplorerStore", () => {
  beforeEach(() => {
    useFileExplorerStore.setState({ ...initialFileExplorerState });
    vi.clearAllMocks();
    mockFileExplorer.getRootPath.mockResolvedValue("/workspace");
    mockFileExplorer.listDir.mockResolvedValue([]);
    mockFileExplorer.readPreview.mockResolvedValue({
      content: "hello",
      truncated: false,
      language: "plaintext",
      size: 5
    });
    mockFileExplorer.searchFiles.mockResolvedValue([]);
  });

  // ---- 初始状态 ----
  it("初始状态正确", () => {
    const state = useFileExplorerStore.getState();
    expect(state.rootPath).toBe("");
    expect(state.expandedPaths).toEqual([]);
    expect(state.selectedPath).toBeNull();
    expect(state.treeData).toEqual({});
    expect(state.previewContent).toBeNull();
    expect(state.isLoadingPreview).toBe(false);
    expect(state.searchQuery).toBe("");
    expect(state.searchType).toBe("name");
    expect(state.searchResults).toEqual([]);
    expect(state.isSearching).toBe(false);
  });

  // ---- init ----
  it("init 获取根路径并加载根目录内容", async () => {
    const rootChildren: FileNode[] = [
      createNode({ name: "src", path: "/workspace/src", isDirectory: true }),
      createNode({ name: "README.md", path: "/workspace/README.md" })
    ];
    mockFileExplorer.listDir.mockResolvedValue(rootChildren);

    await useFileExplorerStore.getState().init();

    const state = useFileExplorerStore.getState();
    expect(state.rootPath).toBe("/workspace");
    expect(state.expandedPaths).toContain("/workspace");
    expect(state.treeData["/workspace"]).toHaveLength(2);
    expect(mockFileExplorer.getRootPath).toHaveBeenCalledOnce();
    expect(mockFileExplorer.listDir).toHaveBeenCalledWith("/workspace");
  });

  it("init 排序：目录在前，文件在后", async () => {
    mockFileExplorer.listDir.mockResolvedValue([
      createNode({ name: "zebra.txt", path: "/workspace/zebra.txt" }),
      createNode({ name: "alpha", path: "/workspace/alpha", isDirectory: true }),
      createNode({ name: "beta.ts", path: "/workspace/beta.ts" })
    ]);

    await useFileExplorerStore.getState().init();

    const nodes = useFileExplorerStore.getState().treeData["/workspace"];
    expect(nodes[0].name).toBe("alpha"); // directory first
    expect(nodes[1].name).toBe("beta.ts"); // files sorted alphabetically
    expect(nodes[2].name).toBe("zebra.txt");
  });

  // ---- toggleExpand ----
  it("toggleExpand 展开目录：加载子节点并添加到 expandedPaths", async () => {
    useFileExplorerStore.setState({
      rootPath: "/workspace",
      expandedPaths: ["/workspace"],
      treeData: {
        "/workspace": [createNode({ name: "src", path: "/workspace/src", isDirectory: true })]
      }
    });

    const subChildren = [createNode({ name: "index.ts", path: "/workspace/src/index.ts" })];
    mockFileExplorer.listDir.mockResolvedValue(subChildren);

    await useFileExplorerStore.getState().toggleExpand("/workspace/src");

    const state = useFileExplorerStore.getState();
    expect(state.expandedPaths).toContain("/workspace/src");
    expect(state.treeData["/workspace/src"]).toHaveLength(1);
    expect(mockFileExplorer.listDir).toHaveBeenCalledWith("/workspace/src");
  });

  it("toggleExpand 折叠已展开的目录", async () => {
    useFileExplorerStore.setState({
      expandedPaths: ["/workspace", "/workspace/src"],
      treeData: { "/workspace/src": [createNode()] }
    });

    await useFileExplorerStore.getState().toggleExpand("/workspace/src");

    expect(useFileExplorerStore.getState().expandedPaths).not.toContain("/workspace/src");
  });

  it("toggleExpand 展开已缓存的目录不重新加载", async () => {
    useFileExplorerStore.setState({
      rootPath: "/workspace",
      expandedPaths: ["/workspace"],
      treeData: {
        "/workspace": [createNode({ name: "src", path: "/workspace/src", isDirectory: true })],
        "/workspace/src": [createNode({ name: "cached.ts", path: "/workspace/src/cached.ts" })]
      }
    });

    await useFileExplorerStore.getState().toggleExpand("/workspace/src");

    expect(mockFileExplorer.listDir).not.toHaveBeenCalled();
    expect(useFileExplorerStore.getState().expandedPaths).toContain("/workspace/src");
  });

  // ---- selectFile ----
  it("selectFile 选中文件并加载预览", async () => {
    const preview = { content: "const x = 1;", truncated: false, language: "typescript", size: 12 };
    mockFileExplorer.readPreview.mockResolvedValue(preview);

    await useFileExplorerStore.getState().selectFile("/workspace/index.ts");

    const state = useFileExplorerStore.getState();
    expect(state.selectedPath).toBe("/workspace/index.ts");
    expect(state.previewContent).toEqual(preview);
    expect(state.isLoadingPreview).toBe(false);
  });

  it("selectFile 预览加载失败时清空预览内容", async () => {
    mockFileExplorer.readPreview.mockRejectedValue(new Error("read error"));

    await useFileExplorerStore.getState().selectFile("/workspace/bad-file");

    const state = useFileExplorerStore.getState();
    expect(state.selectedPath).toBe("/workspace/bad-file");
    expect(state.previewContent).toBeNull();
    expect(state.isLoadingPreview).toBe(false);
  });

  // ---- search ----
  it("search 执行文件名搜索", async () => {
    useFileExplorerStore.setState({ rootPath: "/workspace" });
    const results = [{ path: "/workspace/test.ts", name: "test.ts" }];
    mockFileExplorer.searchFiles.mockResolvedValue(results);

    await useFileExplorerStore.getState().search("test", "name");

    const state = useFileExplorerStore.getState();
    expect(state.searchQuery).toBe("test");
    expect(state.searchType).toBe("name");
    expect(state.searchResults).toEqual(results);
    expect(state.isSearching).toBe(false);
    expect(mockFileExplorer.searchFiles).toHaveBeenCalledWith("/workspace", "test", {
      mode: "name"
    });
  });

  it("search 执行内容搜索", async () => {
    useFileExplorerStore.setState({ rootPath: "/workspace" });
    const results = [
      { path: "/workspace/app.ts", name: "app.ts", matchLine: "import test", lineNumber: 3 }
    ];
    mockFileExplorer.searchFiles.mockResolvedValue(results);

    await useFileExplorerStore.getState().search("import", "content");

    const state = useFileExplorerStore.getState();
    expect(state.searchType).toBe("content");
    expect(state.searchResults).toEqual(results);
  });

  it("search 空查询时清空结果", async () => {
    useFileExplorerStore.setState({ searchResults: [{ path: "/a", name: "a" }] });

    await useFileExplorerStore.getState().search("", "name");

    expect(useFileExplorerStore.getState().searchResults).toEqual([]);
    expect(mockFileExplorer.searchFiles).not.toHaveBeenCalled();
  });

  it("search 仅空格的查询清空结果", async () => {
    await useFileExplorerStore.getState().search("   ", "name");

    expect(useFileExplorerStore.getState().searchResults).toEqual([]);
    expect(mockFileExplorer.searchFiles).not.toHaveBeenCalled();
  });

  it("search 失败时清空结果", async () => {
    useFileExplorerStore.setState({ rootPath: "/workspace" });
    mockFileExplorer.searchFiles.mockRejectedValue(new Error("search error"));

    await useFileExplorerStore.getState().search("test", "name");

    expect(useFileExplorerStore.getState().searchResults).toEqual([]);
    expect(useFileExplorerStore.getState().isSearching).toBe(false);
  });

  // ---- clearSearch ----
  it("clearSearch 清空搜索状态", () => {
    useFileExplorerStore.setState({
      searchQuery: "test",
      searchResults: [{ path: "/a", name: "a" }],
      isSearching: true
    });

    useFileExplorerStore.getState().clearSearch();

    const state = useFileExplorerStore.getState();
    expect(state.searchQuery).toBe("");
    expect(state.searchResults).toEqual([]);
    expect(state.isSearching).toBe(false);
  });

  // ---- refreshDir ----
  it("refreshDir 重新加载目录内容", async () => {
    useFileExplorerStore.setState({
      treeData: { "/workspace": [createNode({ name: "old.txt", path: "/workspace/old.txt" })] }
    });

    const newChildren = [createNode({ name: "new.txt", path: "/workspace/new.txt" })];
    mockFileExplorer.listDir.mockResolvedValue(newChildren);

    await useFileExplorerStore.getState().refreshDir("/workspace");

    expect(useFileExplorerStore.getState().treeData["/workspace"][0].name).toBe("new.txt");
  });

  // ---- createFile ----
  it("createFile 创建文件并刷新父目录", async () => {
    useFileExplorerStore.setState({ rootPath: "/workspace", treeData: {} });
    mockFileExplorer.listDir.mockResolvedValue([]);

    await useFileExplorerStore.getState().createFile("/workspace/new.txt", "content");

    expect(mockFileExplorer.createFile).toHaveBeenCalledWith("/workspace/new.txt", "content");
    expect(mockFileExplorer.listDir).toHaveBeenCalledWith("/workspace");
  });

  it("createFile 默认内容为空字符串", async () => {
    useFileExplorerStore.setState({ rootPath: "/workspace", treeData: {} });
    mockFileExplorer.listDir.mockResolvedValue([]);

    await useFileExplorerStore.getState().createFile("/workspace/empty.txt");

    expect(mockFileExplorer.createFile).toHaveBeenCalledWith("/workspace/empty.txt", "");
  });

  // ---- createDir ----
  it("createDir 创建目录并刷新父目录", async () => {
    useFileExplorerStore.setState({ rootPath: "/workspace", treeData: {} });
    mockFileExplorer.listDir.mockResolvedValue([]);

    await useFileExplorerStore.getState().createDir("/workspace/new-dir");

    expect(mockFileExplorer.createDir).toHaveBeenCalledWith("/workspace/new-dir");
    expect(mockFileExplorer.listDir).toHaveBeenCalledWith("/workspace");
  });

  // ---- renameItem ----
  it("renameItem 重命名并刷新父目录", async () => {
    useFileExplorerStore.setState({ rootPath: "/workspace", treeData: {} });
    mockFileExplorer.listDir.mockResolvedValue([]);

    await useFileExplorerStore.getState().renameItem("/workspace/old.txt", "/workspace/new.txt");

    expect(mockFileExplorer.rename).toHaveBeenCalledWith(
      "/workspace/old.txt",
      "/workspace/new.txt"
    );
    expect(mockFileExplorer.listDir).toHaveBeenCalledWith("/workspace");
  });

  // ---- deleteItem ----
  it("deleteItem 删除并刷新父目录", async () => {
    useFileExplorerStore.setState({ rootPath: "/workspace", treeData: {} });
    mockFileExplorer.listDir.mockResolvedValue([]);

    await useFileExplorerStore.getState().deleteItem("/workspace/file.txt");

    expect(mockFileExplorer.deleteItem).toHaveBeenCalledWith("/workspace/file.txt");
    expect(mockFileExplorer.listDir).toHaveBeenCalledWith("/workspace");
  });

  it("deleteItem 删除选中文件时清空选中和预览", async () => {
    useFileExplorerStore.setState({
      rootPath: "/workspace",
      selectedPath: "/workspace/file.txt",
      previewContent: { content: "x", truncated: false, language: "plaintext", size: 1 },
      treeData: {}
    });
    mockFileExplorer.listDir.mockResolvedValue([]);

    await useFileExplorerStore.getState().deleteItem("/workspace/file.txt");

    const state = useFileExplorerStore.getState();
    expect(state.selectedPath).toBeNull();
    expect(state.previewContent).toBeNull();
  });

  it("deleteItem 删除非选中文件不影响选中状态", async () => {
    useFileExplorerStore.setState({
      rootPath: "/workspace",
      selectedPath: "/workspace/other.txt",
      previewContent: { content: "x", truncated: false, language: "plaintext", size: 1 },
      treeData: {}
    });
    mockFileExplorer.listDir.mockResolvedValue([]);

    await useFileExplorerStore.getState().deleteItem("/workspace/file.txt");

    expect(useFileExplorerStore.getState().selectedPath).toBe("/workspace/other.txt");
    expect(useFileExplorerStore.getState().previewContent).not.toBeNull();
  });
});

// ---- Utility function tests ----

describe("isImageFile", () => {
  it("识别常见图片格式", () => {
    expect(isImageFile("photo.png")).toBe(true);
    expect(isImageFile("photo.jpg")).toBe(true);
    expect(isImageFile("photo.jpeg")).toBe(true);
    expect(isImageFile("photo.gif")).toBe(true);
    expect(isImageFile("photo.webp")).toBe(true);
    expect(isImageFile("photo.svg")).toBe(true);
    expect(isImageFile("photo.bmp")).toBe(true);
    expect(isImageFile("photo.ico")).toBe(true);
  });

  it("不识别非图片文件", () => {
    expect(isImageFile("code.ts")).toBe(false);
    expect(isImageFile("doc.pdf")).toBe(false);
    expect(isImageFile("readme.md")).toBe(false);
    expect(isImageFile("noext")).toBe(false);
  });

  it("大小写不敏感", () => {
    expect(isImageFile("photo.PNG")).toBe(true);
    expect(isImageFile("photo.JPG")).toBe(true);
  });
});

describe("formatFileSize", () => {
  it("格式化字节", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(500)).toBe("500 B");
    expect(formatFileSize(1023)).toBe("1023 B");
  });

  it("格式化 KB", () => {
    expect(formatFileSize(1024)).toBe("1.0 KB");
    expect(formatFileSize(1536)).toBe("1.5 KB");
  });

  it("格式化 MB", () => {
    expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe("2.5 MB");
  });
});
