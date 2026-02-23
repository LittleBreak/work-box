import * as fs from 'fs/promises'
import * as path from 'path'
import { homedir } from 'os'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import type { FileStat } from '@shared/types'

// ---- Custom Error Classes ----

/** 路径安全校验失败 */
export class PathSecurityError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PathSecurityError'
  }
}

/** 文件/目录不存在 */
export class FileNotFoundError extends Error {
  constructor(filePath: string) {
    super(`File not found: ${filePath}`)
    this.name = 'FileNotFoundError'
  }
}

/** 权限不足 */
export class PermissionDeniedError extends Error {
  constructor(filePath: string) {
    super(`Permission denied: ${filePath}`)
    this.name = 'PermissionDeniedError'
  }
}

// ---- Path Validation ----

/**
 * 校验路径安全性：
 *  1. 必须是绝对路径
 *  2. resolve() 后必须以白名单中某个目录为前缀
 */
export function validatePath(filePath: string, allowedPaths?: string[]): void {
  if (!path.isAbsolute(filePath)) {
    throw new PathSecurityError(`Path must be absolute: ${filePath}`)
  }

  const resolved = path.resolve(filePath)
  const whitelist = allowedPaths ?? [homedir()]

  const isAllowed = whitelist.some((allowed) => {
    const resolvedAllowed = path.resolve(allowed)
    return resolved === resolvedAllowed || resolved.startsWith(resolvedAllowed + path.sep)
  })

  if (!isAllowed) {
    throw new PathSecurityError(`Path is outside allowed directories: ${filePath}`)
  }
}

// ---- Helper: wrap Node.js fs errors ----

function wrapFSError(err: unknown, filePath: string): never {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code: string }).code
    if (code === 'ENOENT') {
      throw new FileNotFoundError(filePath)
    }
    if (code === 'EACCES' || code === 'EPERM') {
      throw new PermissionDeniedError(filePath)
    }
  }
  throw err
}

// ---- Business Functions ----

interface FSOptions {
  allowedPaths?: string[]
}

/** 读取文件内容（UTF-8 字符串） */
export async function readFile(filePath: string, options?: FSOptions): Promise<string> {
  validatePath(filePath, options?.allowedPaths)
  try {
    return await fs.readFile(filePath, 'utf-8')
  } catch (err) {
    wrapFSError(err, filePath)
  }
}

/** 写入文件内容，父目录不存在时自动创建 */
export async function writeFile(
  filePath: string,
  data: string,
  options?: FSOptions
): Promise<void> {
  validatePath(filePath, options?.allowedPaths)
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, data, 'utf-8')
  } catch (err) {
    wrapFSError(err, filePath)
  }
}

/** 读取目录下的文件名列表 */
export async function readDir(dirPath: string, options?: FSOptions): Promise<string[]> {
  validatePath(dirPath, options?.allowedPaths)
  try {
    return await fs.readdir(dirPath)
  } catch (err) {
    wrapFSError(err, dirPath)
  }
}

/** 获取文件/目录元信息 */
export async function stat(filePath: string, options?: FSOptions): Promise<FileStat> {
  validatePath(filePath, options?.allowedPaths)
  try {
    const s = await fs.stat(filePath)
    return {
      size: s.size,
      isDirectory: s.isDirectory(),
      isFile: s.isFile(),
      mtime: s.mtimeMs
    }
  } catch (err) {
    wrapFSError(err, filePath)
  }
}

// ---- IPC Registration ----

/**
 * 注册 fs 领域的 4 个 IPC handler 到 ipcMain。
 * handler wrapper 调用业务函数时不传 allowedPaths（走默认 [homedir()]）。
 */
export function setupFSHandlers(ipcMain: Electron.IpcMain): void {
  ipcMain.handle(IPC_CHANNELS.fs.readFile, (_event, filePath: string) => readFile(filePath))

  ipcMain.handle(IPC_CHANNELS.fs.writeFile, (_event, filePath: string, data: string) =>
    writeFile(filePath, data)
  )

  ipcMain.handle(IPC_CHANNELS.fs.readDir, (_event, dirPath: string) => readDir(dirPath))

  ipcMain.handle(IPC_CHANNELS.fs.stat, (_event, filePath: string) => stat(filePath))
}
