import { create } from "zustand";

// ---- UI-side types (matching preload API shapes) ----

/** File/directory node in the tree */
export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  mtime: number;
}

/** File preview result from backend */
export interface PreviewResult {
  content: string;
  truncated: boolean;
  language: string;
  size: number;
}

/** Search result entry */
export interface FileSearchResult {
  path: string;
  name: string;
  matchLine?: string;
  lineNumber?: number;
}

// ---- Image extension detection (renderer-side, no node:path) ----

const IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".bmp",
  ".ico",
  ".webp",
  ".svg"
]);

/** Check if a file path points to an image */
export function isImageFile(filePath: string): boolean {
  const dotIndex = filePath.lastIndexOf(".");
  if (dotIndex === -1) return false;
  return IMAGE_EXTENSIONS.has(filePath.slice(dotIndex).toLowerCase());
}

/** Format file size to human-readable string */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---- Store ----

/** File Explorer UI state */
interface FileExplorerState {
  /** Workspace root path */
  rootPath: string;
  /** Paths of expanded directories */
  expandedPaths: string[];
  /** Currently selected file/directory path */
  selectedPath: string | null;
  /** Directory content cache: dirPath → children */
  treeData: Record<string, FileNode[]>;
  /** Preview content of selected file */
  previewContent: PreviewResult | null;
  /** Whether preview is loading */
  isLoadingPreview: boolean;
  /** Current search query */
  searchQuery: string;
  /** Search mode: name or content */
  searchType: "name" | "content";
  /** Search results */
  searchResults: FileSearchResult[];
  /** Whether search is in progress */
  isSearching: boolean;

  /** Initialize root path from backend and load root directory */
  init: () => Promise<void>;
  /** Toggle directory expand/collapse (lazy-loads children) */
  toggleExpand: (dirPath: string) => Promise<void>;
  /** Select a file and load its preview */
  selectFile: (filePath: string) => Promise<void>;
  /** Execute search */
  search: (query: string, type: "name" | "content") => Promise<void>;
  /** Clear search state */
  clearSearch: () => void;
  /** Refresh a directory's cached children */
  refreshDir: (dirPath: string) => Promise<void>;
  /** Create a new file */
  createFile: (filePath: string, content?: string) => Promise<void>;
  /** Create a new directory */
  createDir: (dirPath: string) => Promise<void>;
  /** Rename a file or directory */
  renameItem: (oldPath: string, newPath: string) => Promise<void>;
  /** Delete a file or directory */
  deleteItem: (targetPath: string) => Promise<void>;
}

/** Initial state values (exported for testing) */
export const initialFileExplorerState = {
  rootPath: "",
  expandedPaths: [] as string[],
  selectedPath: null as string | null,
  treeData: {} as Record<string, FileNode[]>,
  previewContent: null as PreviewResult | null,
  isLoadingPreview: false,
  searchQuery: "",
  searchType: "name" as const,
  searchResults: [] as FileSearchResult[],
  isSearching: false
};

/** File Explorer UI Zustand Store */
export const useFileExplorerStore = create<FileExplorerState>((set, get) => ({
  ...initialFileExplorerState,

  async init() {
    const rootPath = await window.workbox.fileExplorer.getRootPath();
    const children = await window.workbox.fileExplorer.listDir(rootPath);
    set({
      rootPath,
      treeData: { [rootPath]: sortNodes(children) },
      expandedPaths: [rootPath]
    });
  },

  async toggleExpand(dirPath: string) {
    const { expandedPaths, treeData } = get();
    const isExpanded = expandedPaths.includes(dirPath);

    if (isExpanded) {
      // Collapse: remove from expanded list
      set({ expandedPaths: expandedPaths.filter((p) => p !== dirPath) });
    } else {
      // Expand: load children if not cached, then add to expanded list
      let updatedTreeData = treeData;
      if (!treeData[dirPath]) {
        const children = await window.workbox.fileExplorer.listDir(dirPath);
        updatedTreeData = { ...treeData, [dirPath]: sortNodes(children) };
      }
      set({
        expandedPaths: [...expandedPaths, dirPath],
        treeData: updatedTreeData
      });
    }
  },

  async selectFile(filePath: string) {
    set({ selectedPath: filePath, isLoadingPreview: true, previewContent: null });
    try {
      const preview = await window.workbox.fileExplorer.readPreview(filePath);
      set({ previewContent: preview, isLoadingPreview: false });
    } catch {
      set({ previewContent: null, isLoadingPreview: false });
    }
  },

  async search(query: string, type: "name" | "content") {
    const { rootPath } = get();
    if (!query.trim()) {
      set({ searchQuery: "", searchResults: [], isSearching: false });
      return;
    }
    set({ searchQuery: query, searchType: type, isSearching: true });
    try {
      const results = await window.workbox.fileExplorer.searchFiles(rootPath, query, {
        mode: type
      });
      set({ searchResults: results, isSearching: false });
    } catch {
      set({ searchResults: [], isSearching: false });
    }
  },

  clearSearch() {
    set({ searchQuery: "", searchResults: [], isSearching: false });
  },

  async refreshDir(dirPath: string) {
    const children = await window.workbox.fileExplorer.listDir(dirPath);
    set((state) => ({
      treeData: { ...state.treeData, [dirPath]: sortNodes(children) }
    }));
  },

  async createFile(filePath: string, content = "") {
    await window.workbox.fileExplorer.createFile(filePath, content);
    // Refresh parent directory
    const parentPath = filePath.substring(0, filePath.lastIndexOf("/")) || get().rootPath;
    await get().refreshDir(parentPath);
  },

  async createDir(dirPath: string) {
    await window.workbox.fileExplorer.createDir(dirPath);
    const parentPath = dirPath.substring(0, dirPath.lastIndexOf("/")) || get().rootPath;
    await get().refreshDir(parentPath);
  },

  async renameItem(oldPath: string, newPath: string) {
    await window.workbox.fileExplorer.rename(oldPath, newPath);
    const parentPath = oldPath.substring(0, oldPath.lastIndexOf("/")) || get().rootPath;
    await get().refreshDir(parentPath);
  },

  async deleteItem(targetPath: string) {
    await window.workbox.fileExplorer.deleteItem(targetPath);
    const parentPath = targetPath.substring(0, targetPath.lastIndexOf("/")) || get().rootPath;
    // If deleted item was selected, clear selection
    if (get().selectedPath === targetPath) {
      set({ selectedPath: null, previewContent: null });
    }
    await get().refreshDir(parentPath);
  }
}));

/** Sort nodes: directories first, then alphabetically */
function sortNodes(nodes: FileNode[]): FileNode[] {
  return [...nodes].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}
