/**
 * Terminal Plugin Constants
 *
 * Plugin-local definitions for IPC channels, types, and security utilities.
 * Avoids importing from the host app's source (which uses build-time aliases
 * that are not available at plugin runtime).
 */

/** Terminal IPC channel names (must match src/shared/ipc-channels.ts) */
export const TERMINAL_CHANNELS = {
  create: "terminal:create",
  write: "terminal:write",
  resize: "terminal:resize",
  close: "terminal:close",
  list: "terminal:list",
  data: "terminal:data",
  exit: "terminal:exit"
} as const;

/** Terminal session create options */
export interface TerminalCreateOptions {
  cols?: number;
  rows?: number;
  cwd?: string;
}

/**
 * 危险命令正则列表（词边界匹配，避免子串误判）。
 * Mirrors DANGEROUS_PATTERNS from src/main/ipc/shell.handler.ts.
 */
const DANGEROUS_PATTERNS: RegExp[] = [
  /rm\s+-[^\s]*r[^\s]*f\s+\//, // rm -rf / 及变体（仅根路径）
  /\bsudo\b/,
  /\bdd\b/,
  /\bmkfs\b/,
  /\bformat\b/,
  /\bshutdown\b/,
  /\breboot\b/
];

/**
 * 检测命令是否为危险命令（词边界正则匹配）。
 * 返回 true 表示命令危险，应被拦截。
 */
export function isDangerousCommand(command: string): boolean {
  return DANGEROUS_PATTERNS.some((pattern) => pattern.test(command));
}
