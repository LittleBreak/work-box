/**
 * File Explorer Plugin Constants
 *
 * Plugin-local definitions for IPC channels, types, and path security utilities.
 * Avoids importing from the host app's source (which uses build-time aliases
 * that are not available at plugin runtime).
 */
import * as path from "node:path";

/** File Explorer IPC channel names (must match src/shared/ipc-channels.ts) */
export const FILE_EXPLORER_CHANNELS = {
  listDir: "fileExplorer:listDir",
  readPreview: "fileExplorer:readPreview",
  searchFiles: "fileExplorer:searchFiles",
  createFile: "fileExplorer:createFile",
  createDir: "fileExplorer:createDir",
  rename: "fileExplorer:rename",
  deleteItem: "fileExplorer:deleteItem"
} as const;

/** File tree node representing a file or directory entry */
export interface FileTreeNode {
  /** File or directory name */
  name: string;
  /** Absolute path */
  path: string;
  /** Whether this is a directory */
  isDirectory: boolean;
  /** File size in bytes (0 for directories) */
  size: number;
  /** Last modified timestamp (ms) */
  mtime: number;
}

/** File preview result */
export interface FilePreviewResult {
  /** File content (possibly truncated) */
  content: string;
  /** Whether the content was truncated */
  truncated: boolean;
  /** Detected language for syntax highlighting */
  language: string;
  /** File size in bytes */
  size: number;
}

/** Search result entry */
export interface SearchResult {
  /** Absolute file path */
  path: string;
  /** File name */
  name: string;
  /** Matching line content (for content search) */
  matchLine?: string;
  /** Line number of match (for content search) */
  lineNumber?: number;
}

/** Search options */
export interface SearchOptions {
  /** Search mode: by file name or by file content */
  mode: "name" | "content";
  /** Maximum directory depth to traverse */
  maxDepth?: number;
  /** Maximum number of results to return */
  maxResults?: number;
}

/** Maximum file size for preview (500KB) */
export const MAX_PREVIEW_SIZE = 500 * 1024;

/** Binary file extensions that should not be previewed */
export const BINARY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".bmp",
  ".ico",
  ".webp",
  ".svg",
  ".mp3",
  ".mp4",
  ".wav",
  ".avi",
  ".mov",
  ".mkv",
  ".flv",
  ".wmv",
  ".zip",
  ".tar",
  ".gz",
  ".bz2",
  ".rar",
  ".7z",
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".bin",
  ".dat",
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".eot"
]);

/** Extension to language mapping for syntax highlighting */
const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "tsx",
  ".js": "javascript",
  ".jsx": "jsx",
  ".json": "json",
  ".md": "markdown",
  ".html": "html",
  ".css": "css",
  ".scss": "scss",
  ".less": "less",
  ".py": "python",
  ".rb": "ruby",
  ".go": "go",
  ".rs": "rust",
  ".java": "java",
  ".c": "c",
  ".cpp": "cpp",
  ".h": "c",
  ".hpp": "cpp",
  ".sh": "shell",
  ".bash": "shell",
  ".zsh": "shell",
  ".yml": "yaml",
  ".yaml": "yaml",
  ".toml": "toml",
  ".xml": "xml",
  ".sql": "sql",
  ".graphql": "graphql",
  ".vue": "vue",
  ".svelte": "svelte",
  ".swift": "swift",
  ".kt": "kotlin",
  ".dart": "dart",
  ".lua": "lua",
  ".r": "r",
  ".m": "matlab"
};

/**
 * Detect language from file extension for syntax highlighting.
 * Returns "plaintext" for unknown extensions.
 */
export function detectLanguage(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return EXTENSION_LANGUAGE_MAP[ext] ?? "plaintext";
}

/**
 * Check if a file extension indicates a binary file.
 * Returns true for binary files that should not be previewed as text.
 */
export function isBinaryFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

/**
 * Validate that a target path is within the allowed root path.
 * Prevents path traversal attacks (e.g., `../../etc/passwd`).
 *
 * @throws Error if the path is outside the root directory
 */
export function validatePathSecurity(targetPath: string, rootPath: string): void {
  const resolved = path.resolve(targetPath);
  const resolvedRoot = path.resolve(rootPath);

  if (resolved !== resolvedRoot && !resolved.startsWith(resolvedRoot + path.sep)) {
    throw new Error(`Path security violation: "${targetPath}" is outside root "${rootPath}"`);
  }
}
