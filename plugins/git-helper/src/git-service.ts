/**
 * GitService — Git Helper Plugin Core Service
 *
 * Provides Git operations (status, stage, unstage, commit, branches, checkout,
 * diff, log) through PluginContext.shell.exec() with command injection prevention.
 */
import type { PluginContext } from "@workbox/plugin-api";
import { DEFAULT_LOG_COUNT, MAX_LOG_COUNT, validateBranchName } from "./constants.ts";
import type {
  GitFileStatus,
  GitBranch,
  GitCommitInfo,
  GitDiffHunk,
  GitFileDiff
} from "./constants.ts";

/** Git operations service for the Git Helper plugin */
export class GitService {
  private readonly ctx: PluginContext;
  private readonly rootPath: string;

  constructor(ctx: PluginContext, rootPath?: string) {
    this.ctx = ctx;
    this.rootPath = rootPath ?? ctx.workspace.rootPath;
  }

  /**
   * Get the current Git status (modified, added, deleted, untracked files).
   * Parses `git status --porcelain` output.
   */
  async getStatus(cwd?: string): Promise<GitFileStatus[]> {
    const result = await this.ctx.shell.exec("git status --porcelain", {
      cwd: cwd ?? this.rootPath
    });

    this.checkGitError(result.exitCode, result.stderr);

    // Do NOT use trim() — leading spaces are significant in porcelain format
    const lines = result.stdout.split("\n").filter((line) => line.length >= 4);
    if (lines.length === 0) return [];

    const statuses: GitFileStatus[] = [];

    for (const line of lines) {
      if (line.length < 4) continue;

      const indexStatus = line[0];
      const workTreeStatus = line[1];
      const filePart = line.slice(3);

      // Handle renamed files: "R  old.ts -> new.ts"
      if (indexStatus === "R" || workTreeStatus === "R") {
        const parts = filePart.split(" -> ");
        statuses.push({
          path: parts.length > 1 ? parts[1] : filePart,
          status: "renamed",
          staged: indexStatus === "R",
          oldPath: parts.length > 1 ? parts[0] : undefined
        });
        continue;
      }

      // Handle copied files
      if (indexStatus === "C" || workTreeStatus === "C") {
        const parts = filePart.split(" -> ");
        statuses.push({
          path: parts.length > 1 ? parts[1] : filePart,
          status: "copied",
          staged: indexStatus === "C",
          oldPath: parts.length > 1 ? parts[0] : undefined
        });
        continue;
      }

      // Untracked files
      if (indexStatus === "?" && workTreeStatus === "?") {
        statuses.push({
          path: filePart,
          status: "untracked",
          staged: false
        });
        continue;
      }

      // Determine status from index (staged) or worktree (unstaged)
      // Index status (staged changes)
      if (indexStatus !== " " && indexStatus !== "?") {
        statuses.push({
          path: filePart,
          status: this.mapStatusCode(indexStatus),
          staged: true
        });
      }
      // Worktree status (unstaged changes) — only if no staged entry was already added
      else if (workTreeStatus !== " " && workTreeStatus !== "?") {
        statuses.push({
          path: filePart,
          status: this.mapStatusCode(workTreeStatus),
          staged: false
        });
      }
    }

    return statuses;
  }

  /**
   * Stage files for commit.
   * @param paths - File paths to stage (relative to repo root)
   */
  async stage(paths: string[], cwd?: string): Promise<void> {
    if (paths.length === 0) return;

    const pathArgs = paths.join(" ");
    const result = await this.ctx.shell.exec(`git add -- ${pathArgs}`, {
      cwd: cwd ?? this.rootPath
    });

    this.checkGitError(result.exitCode, result.stderr);
  }

  /**
   * Unstage files (remove from staging area).
   * @param paths - File paths to unstage
   */
  async unstage(paths: string[], cwd?: string): Promise<void> {
    if (paths.length === 0) return;

    const pathArgs = paths.join(" ");
    const result = await this.ctx.shell.exec(`git restore --staged -- ${pathArgs}`, {
      cwd: cwd ?? this.rootPath
    });

    this.checkGitError(result.exitCode, result.stderr);
  }

  /**
   * Create a commit with the given message.
   * @throws Error if message is empty or commit fails
   */
  async commit(message: string, cwd?: string): Promise<void> {
    if (!message || message.trim().length === 0) {
      throw new Error("Commit message must not be empty");
    }

    // Use stdin to pass the message safely, avoiding shell escaping issues
    // Escape single quotes in the message for shell safety
    const escapedMessage = message.replace(/'/g, "'\\''");
    const result = await this.ctx.shell.exec(`git commit -m '${escapedMessage}'`, {
      cwd: cwd ?? this.rootPath
    });

    this.checkGitError(result.exitCode, result.stderr);
  }

  /**
   * Get list of local branches.
   * Parses `git branch -a --format` output.
   */
  async getBranches(cwd?: string): Promise<GitBranch[]> {
    const result = await this.ctx.shell.exec(
      'git branch -a --format="%(refname:short) %(HEAD) %(upstream:short)"',
      { cwd: cwd ?? this.rootPath }
    );

    this.checkGitError(result.exitCode, result.stderr);

    const stdout = result.stdout.trim();
    if (!stdout) return [];

    const lines = stdout.split("\n");
    const branches: GitBranch[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const parts = trimmed.split(" ");
      const name = parts[0];
      const isCurrent = parts[1] === "*";
      const remote = parts[2] || undefined;

      branches.push({
        name,
        current: isCurrent,
        remote: remote || undefined
      });
    }

    return branches;
  }

  /**
   * Checkout a branch.
   * @throws Error if branch name is invalid (command injection prevention)
   */
  async checkout(branch: string, cwd?: string): Promise<void> {
    validateBranchName(branch);

    const result = await this.ctx.shell.exec(`git checkout ${branch}`, {
      cwd: cwd ?? this.rootPath
    });

    this.checkGitError(result.exitCode, result.stderr);
  }

  /**
   * Get diff output, parsed into structured format.
   * Supports staged/unstaged diff and per-file diff.
   */
  async getDiff(options?: {
    path?: string;
    staged?: boolean;
    cwd?: string;
  }): Promise<GitFileDiff[]> {
    let cmd = "git diff --unified=3";
    if (options?.staged) {
      cmd += " --staged";
    }
    if (options?.path) {
      cmd += ` -- ${options.path}`;
    }

    const result = await this.ctx.shell.exec(cmd, {
      cwd: options?.cwd ?? this.rootPath
    });

    this.checkGitError(result.exitCode, result.stderr);

    const stdout = result.stdout;
    if (!stdout.trim()) return [];

    return this.parseDiff(stdout);
  }

  /**
   * Get commit history.
   * @param options.count - Number of commits (default 50, max 200)
   */
  async getLog(options?: { count?: number; cwd?: string }): Promise<GitCommitInfo[]> {
    const count = Math.min(options?.count ?? DEFAULT_LOG_COUNT, MAX_LOG_COUNT);

    const result = await this.ctx.shell.exec(`git log --format="%H|%h|%s|%an|%aI" -n ${count}`, {
      cwd: options?.cwd ?? this.rootPath
    });

    this.checkGitError(result.exitCode, result.stderr);

    const stdout = result.stdout.trim();
    if (!stdout) return [];

    const lines = stdout.split("\n");
    const commits: GitCommitInfo[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Format: hash|shortHash|message|author|date
      // Message may contain pipes, so we split carefully:
      // First 2 fields are fixed-length hashes, last 2 are author and date
      const firstPipe = trimmed.indexOf("|");
      const secondPipe = trimmed.indexOf("|", firstPipe + 1);
      const lastPipe = trimmed.lastIndexOf("|");
      const secondLastPipe = trimmed.lastIndexOf("|", lastPipe - 1);

      if (firstPipe === -1 || secondPipe === -1 || lastPipe === -1 || secondLastPipe === -1) {
        continue;
      }

      const hash = trimmed.slice(0, firstPipe);
      const shortHash = trimmed.slice(firstPipe + 1, secondPipe);
      const message = trimmed.slice(secondPipe + 1, secondLastPipe);
      const author = trimmed.slice(secondLastPipe + 1, lastPipe);
      const date = trimmed.slice(lastPipe + 1);

      commits.push({ hash, shortHash, message, author, date });
    }

    return commits;
  }

  /**
   * Check for git errors and throw a descriptive error message.
   */
  private checkGitError(exitCode: number, stderr: string): void {
    if (exitCode !== 0 && stderr) {
      // Extract a meaningful message from stderr
      const message = stderr.trim().replace(/^fatal:\s*/i, "");
      throw new Error(message);
    }
  }

  /**
   * Map a git status porcelain character to a status name.
   */
  private mapStatusCode(code: string): GitFileStatus["status"] {
    switch (code) {
      case "M":
        return "modified";
      case "A":
        return "added";
      case "D":
        return "deleted";
      case "R":
        return "renamed";
      case "C":
        return "copied";
      default:
        return "modified";
    }
  }

  /**
   * Parse unified diff output into structured GitFileDiff array.
   */
  private parseDiff(diffOutput: string): GitFileDiff[] {
    const files: GitFileDiff[] = [];
    // Split by file diff headers
    const fileDiffs = diffOutput.split(/^diff --git /m).filter(Boolean);

    for (const fileDiff of fileDiffs) {
      const lines = fileDiff.split("\n");

      // Extract file path from first line: "a/path b/path"
      const headerLine = lines[0];
      const pathMatch = headerLine.match(/b\/(.+)$/);
      if (!pathMatch) continue;

      const filePath = pathMatch[1];
      const hunks: GitDiffHunk[] = [];

      let currentHunk: GitDiffHunk | null = null;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];

        // Hunk header: @@ -oldStart,oldCount +newStart,newCount @@
        const hunkMatch = line.match(/^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
        if (hunkMatch) {
          if (currentHunk) {
            hunks.push(currentHunk);
          }
          currentHunk = {
            oldStart: parseInt(hunkMatch[1], 10),
            oldCount: parseInt(hunkMatch[2] || "1", 10),
            newStart: parseInt(hunkMatch[3], 10),
            newCount: parseInt(hunkMatch[4] || "1", 10),
            lines: []
          };
          continue;
        }

        if (!currentHunk) continue;

        // Diff lines
        if (line.startsWith("+")) {
          currentHunk.lines.push({ type: "add", content: line.slice(1) });
        } else if (line.startsWith("-")) {
          currentHunk.lines.push({ type: "remove", content: line.slice(1) });
        } else if (line.startsWith(" ")) {
          currentHunk.lines.push({ type: "context", content: line.slice(1) });
        }
        // Skip lines like "--- a/file" and "+++ b/file" and "\ No newline at end of file"
      }

      // Push the last hunk
      if (currentHunk) {
        hunks.push(currentHunk);
      }

      files.push({ filePath, hunks });
    }

    return files;
  }
}
