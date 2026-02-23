/** 主进程/渲染进程共享类型定义 */

/** Shell 命令执行结果 */
export interface ExecResult {
  stdout: string
  stderr: string
  exitCode: number
  signal?: string
}

/** Shell 命令执行选项 */
export interface ExecOptions {
  cwd?: string
  timeout?: number
  env?: Record<string, string>
}

/** 文件元信息 */
export interface FileStat {
  size: number
  isDirectory: boolean
  isFile: boolean
  mtime: number
}

// ---- 运行时辅助函数 ----

/** 创建 ExecResult 对象 */
export function createExecResult(params: {
  stdout: string
  stderr: string
  exitCode: number
  signal?: string
}): ExecResult {
  return {
    stdout: params.stdout,
    stderr: params.stderr,
    exitCode: params.exitCode,
    signal: params.signal
  }
}

/** 创建 FileStat 对象 */
export function createFileStat(params: {
  size: number
  isDirectory: boolean
  isFile: boolean
  mtime: number
}): FileStat {
  return {
    size: params.size,
    isDirectory: params.isDirectory,
    isFile: params.isFile,
    mtime: params.mtime
  }
}

/** ExecResult 类型守卫 */
export function isExecResult(value: unknown): value is ExecResult {
  if (value === null || value === undefined || typeof value !== 'object') {
    return false
  }
  const obj = value as Record<string, unknown>
  return (
    typeof obj.stdout === 'string' &&
    typeof obj.stderr === 'string' &&
    typeof obj.exitCode === 'number'
  )
}
