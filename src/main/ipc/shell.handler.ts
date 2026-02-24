import { exec as cpExec } from 'child_process'
import { homedir } from 'os'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import type { ExecResult, ExecOptions } from '@shared/types'

// ---- Constants ----

export const DEFAULT_TIMEOUT = 30000

/**
 * 敏感环境变量名关键词（大小写不敏感匹配）
 */
const SENSITIVE_ENV_KEYWORDS = ['KEY', 'SECRET', 'TOKEN', 'PASSWORD', 'CREDENTIAL']

/**
 * 危险命令正则列表（词边界匹配，避免子串误判）
 */
const DANGEROUS_PATTERNS: RegExp[] = [
  /rm\s+-[^\s]*r[^\s]*f\s+\//, // rm -rf / 及变体（仅根路径）
  /\bsudo\b/,
  /\bdd\b/,
  /\bmkfs\b/,
  /\bformat\b/,
  /\bshutdown\b/,
  /\breboot\b/
]

// ---- Dangerous Command Detection ----

/**
 * 检测命令是否为危险命令（词边界正则匹配）。
 * 返回 true 表示命令危险，应被拦截。
 */
export function isDangerousCommand(command: string): boolean {
  return DANGEROUS_PATTERNS.some((pattern) => pattern.test(command))
}

// ---- Environment Variable Filtering ----

/**
 * 过滤环境变量：移除名称中含 KEY/SECRET/TOKEN/PASSWORD/CREDENTIAL 的变量。
 * 若 extraEnv 存在则合并覆盖到过滤后结果。
 */
export function filterEnv(
  processEnv: Record<string, string | undefined>,
  extraEnv?: Record<string, string>
): Record<string, string> {
  const filtered: Record<string, string> = {}

  for (const [key, value] of Object.entries(processEnv)) {
    if (value === undefined) continue
    const upperKey = key.toUpperCase()
    const isSensitive = SENSITIVE_ENV_KEYWORDS.some((keyword) => upperKey.includes(keyword))
    if (!isSensitive) {
      filtered[key] = value
    }
  }

  if (extraEnv) {
    Object.assign(filtered, extraEnv)
  }

  return filtered
}

// ---- Shell Exec ----

/**
 * 执行 Shell 命令，带超时保护和危险命令拦截。
 *
 * - 空命令或危险命令 → throw Error（前置校验）
 * - 命令执行失败或超时 → 返回 ExecResult（exitCode !== 0），不 throw
 */
export function exec(command: string, options?: ExecOptions): Promise<ExecResult> {
  // 前置校验：空命令
  if (!command || command.trim() === '') {
    return Promise.reject(new Error('Command must not be empty'))
  }

  // 前置校验：危险命令
  if (isDangerousCommand(command)) {
    return Promise.reject(new Error(`Dangerous command rejected: ${command}`))
  }

  const timeout = options?.timeout ?? DEFAULT_TIMEOUT
  const cwd = options?.cwd ?? homedir()
  const env = filterEnv(process.env, options?.env)

  return new Promise<ExecResult>((resolve) => {
    cpExec(command, { timeout, cwd, env }, (error, stdout, stderr) => {
      if (error) {
        // exec error: command failed, timed out, or was killed
        const exitCode = error.code ?? 1
        const signal = error.killed ? 'SIGTERM' : (error as { signal?: string }).signal
        resolve({
          stdout: stdout ?? '',
          stderr: stderr || error.message,
          exitCode: typeof exitCode === 'number' ? exitCode : 1,
          signal: signal ?? undefined
        })
        return
      }

      resolve({
        stdout: stdout ?? '',
        stderr: stderr ?? '',
        exitCode: 0
      })
    })
  })
}

// ---- IPC Registration ----

/**
 * 注册 shell 领域的 IPC handler 到 ipcMain。
 */
export function setupShellHandlers(ipcMain: Electron.IpcMain): void {
  ipcMain.handle(IPC_CHANNELS.shell.exec, (_event, command: string, options?: ExecOptions) =>
    exec(command, options)
  )
}
