/**
 * FileService — File Explorer Plugin Core Service
 *
 * Provides directory browsing, file preview, search, and file operations
 * through PluginContext.fs API with path security enforcement.
 */
import * as path from "node:path";
import type { PluginContext } from "@workbox/plugin-api";
import {
  MAX_PREVIEW_SIZE,
  detectLanguage,
  isBinaryFile,
  validatePathSecurity
} from "./constants.ts";
import type { FileTreeNode, FilePreviewResult, SearchResult, SearchOptions } from "./constants.ts";

/** Default maximum search depth */
const DEFAULT_MAX_DEPTH = 10;

/** Default maximum search results */
const DEFAULT_MAX_RESULTS = 100;

/** File system service for the File Explorer plugin */
export class FileService {
  private readonly ctx: PluginContext;
  private readonly rootPath: string;

  constructor(ctx: PluginContext) {
    this.ctx = ctx;
    this.rootPath = ctx.workspace.rootPath;
  }

  /** List directory contents as FileTreeNode array */
  async listDir(dirPath: string): Promise<FileTreeNode[]> {
    validatePathSecurity(dirPath, this.rootPath);

    const entries = await this.ctx.fs.readDir(dirPath);
    if (entries.length === 0) return [];

    const nodes: FileTreeNode[] = await Promise.all(
      entries.map(async (name) => {
        const fullPath = path.join(dirPath, name);
        const stat = await this.ctx.fs.stat(fullPath);
        return {
          name,
          path: fullPath,
          isDirectory: stat.isDirectory,
          size: stat.size,
          mtime: stat.mtime
        };
      })
    );

    return nodes;
  }

  /** Read file content for preview with truncation and language detection */
  async readPreview(filePath: string): Promise<FilePreviewResult> {
    validatePathSecurity(filePath, this.rootPath);

    const stat = await this.ctx.fs.stat(filePath);

    // Binary files: return empty content with binary language tag
    if (isBinaryFile(filePath)) {
      return {
        content: "",
        truncated: false,
        language: "binary",
        size: stat.size
      };
    }

    const raw = await this.ctx.fs.readFile(filePath);
    const fullContent = raw.toString("utf-8");
    const needsTruncation = fullContent.length > MAX_PREVIEW_SIZE;

    return {
      content: needsTruncation ? fullContent.slice(0, MAX_PREVIEW_SIZE) : fullContent,
      truncated: needsTruncation,
      language: detectLanguage(filePath),
      size: stat.size
    };
  }

  /** Search files by name or content */
  async searchFiles(
    dirPath: string,
    query: string,
    options: SearchOptions
  ): Promise<SearchResult[]> {
    validatePathSecurity(dirPath, this.rootPath);

    const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
    const maxResults = options.maxResults ?? DEFAULT_MAX_RESULTS;
    const results: SearchResult[] = [];

    await this.searchRecursive(dirPath, query, options.mode, 0, maxDepth, maxResults, results);
    return results;
  }

  /** Create a new file with content */
  async createFile(filePath: string, content: string): Promise<void> {
    validatePathSecurity(filePath, this.rootPath);
    await this.ctx.fs.writeFile(filePath, content);
  }

  /** Create a new directory */
  async createDir(dirPath: string): Promise<void> {
    validatePathSecurity(dirPath, this.rootPath);
    // ctx.fs doesn't expose mkdir, use writeFile with a .gitkeep placeholder
    const keepFile = path.join(dirPath, ".gitkeep");
    await this.ctx.fs.writeFile(keepFile, "");
  }

  /** Rename a file or directory (copy + delete via ctx.fs) */
  async rename(oldPath: string, newPath: string): Promise<void> {
    validatePathSecurity(oldPath, this.rootPath);
    validatePathSecurity(newPath, this.rootPath);

    const content = await this.ctx.fs.readFile(oldPath);
    await this.ctx.fs.writeFile(newPath, content);
    await this.ctx.shell.exec(`rm -f "${oldPath}"`);
  }

  /** Delete a file or directory */
  async deleteItem(targetPath: string): Promise<void> {
    validatePathSecurity(targetPath, this.rootPath);
    await this.ctx.shell.exec(`rm -rf "${targetPath}"`);
  }

  /** Recursive search helper */
  private async searchRecursive(
    dirPath: string,
    query: string,
    mode: "name" | "content",
    depth: number,
    maxDepth: number,
    maxResults: number,
    results: SearchResult[]
  ): Promise<void> {
    if (results.length >= maxResults) return;

    const entries = await this.ctx.fs.readDir(dirPath);

    for (const name of entries) {
      if (results.length >= maxResults) return;

      const fullPath = path.join(dirPath, name);
      const stat = await this.ctx.fs.stat(fullPath);

      if (stat.isDirectory) {
        // Recurse into subdirectories if depth allows
        if (depth < maxDepth) {
          await this.searchRecursive(
            fullPath,
            query,
            mode,
            depth + 1,
            maxDepth,
            maxResults,
            results
          );
        }
        continue;
      }

      // File: check match based on mode
      if (mode === "name") {
        if (name.toLowerCase().includes(query.toLowerCase())) {
          results.push({ path: fullPath, name });
        }
      } else {
        // content search: skip binary files
        if (isBinaryFile(fullPath)) continue;

        try {
          const raw = await this.ctx.fs.readFile(fullPath);
          const content = raw.toString("utf-8");
          const lines = content.split("\n");

          for (let i = 0; i < lines.length; i++) {
            if (results.length >= maxResults) return;
            if (lines[i].includes(query)) {
              results.push({
                path: fullPath,
                name,
                matchLine: lines[i],
                lineNumber: i + 1
              });
            }
          }
        } catch {
          // Skip files that can't be read
        }
      }
    }
  }
}
