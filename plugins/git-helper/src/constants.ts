/**
 * Git Helper Plugin Constants
 *
 * Plugin-local definitions for IPC channels, types, and validation utilities.
 * Avoids importing from the host app's source (which uses build-time aliases
 * that are not available at plugin runtime).
 */

/** Git Helper IPC channel names (must match src/shared/ipc-channels.ts) */
export const GIT_CHANNELS = {
  status: "git:status",
  stage: "git:stage",
  unstage: "git:unstage",
  commit: "git:commit",
  branches: "git:branches",
  checkout: "git:checkout",
  diff: "git:diff",
  log: "git:log"
} as const;

/** Git file status entry from `git status --porcelain` */
export interface GitFileStatus {
  /** File path relative to repo root */
  path: string;
  /** Status category */
  status: "modified" | "added" | "deleted" | "untracked" | "renamed" | "copied";
  /** Whether the file is in the staging area */
  staged: boolean;
  /** Original path for renamed/copied files */
  oldPath?: string;
}

/** Git branch information */
export interface GitBranch {
  /** Branch name */
  name: string;
  /** Whether this is the currently checked out branch */
  current: boolean;
  /** Remote tracking branch name, if any */
  remote?: string;
}

/** Git commit metadata */
export interface GitCommitInfo {
  /** Full commit hash */
  hash: string;
  /** Short (7-char) commit hash */
  shortHash: string;
  /** Commit message (first line) */
  message: string;
  /** Author name */
  author: string;
  /** ISO 8601 date string */
  date: string;
}

/** A single line within a diff hunk */
export interface GitDiffLine {
  /** Line type: addition, removal, or context */
  type: "add" | "remove" | "context";
  /** Line content (without leading +/-/space) */
  content: string;
}

/** A contiguous diff hunk */
export interface GitDiffHunk {
  /** Old file start line */
  oldStart: number;
  /** Number of lines in old file */
  oldCount: number;
  /** New file start line */
  newStart: number;
  /** Number of lines in new file */
  newCount: number;
  /** Lines within this hunk */
  lines: GitDiffLine[];
}

/** Diff result for a single file */
export interface GitFileDiff {
  /** File path */
  filePath: string;
  /** Diff hunks */
  hunks: GitDiffHunk[];
}

/** Maximum number of log entries to return */
export const MAX_LOG_COUNT = 200;

/** Default number of log entries */
export const DEFAULT_LOG_COUNT = 50;

/** Maximum diff output length (characters) */
export const MAX_DIFF_LENGTH = 10000;

/**
 * Validate that a branch name is safe for use in git commands.
 * Prevents command injection via branch names containing shell metacharacters.
 *
 * @throws Error if the branch name contains invalid characters
 */
export function validateBranchName(name: string): void {
  if (!name || name.trim().length === 0) {
    throw new Error("Branch name must not be empty");
  }
  // Allow alphanumeric, hyphens, underscores, forward slashes, dots
  if (!/^[\w\-/.]+$/.test(name)) {
    throw new Error(
      `Invalid branch name: "${name}". Only alphanumeric, hyphens, underscores, slashes, and dots are allowed.`
    );
  }
}
