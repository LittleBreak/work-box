/**
 * Terminal Session Manager
 *
 * 管理多终端 PTY session 的生命周期：创建、写入、resize、销毁。
 * 通过 PtyFactory 接口抽象 node-pty 依赖，便于测试时注入 mock。
 */
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";

// ---- PTY 抽象接口 ----

/** PTY 资源释放句柄 */
export interface PtyDisposable {
  dispose(): void;
}

/** PTY 进程实例接口（兼容 node-pty IPty） */
export interface PtyProcess {
  /** 监听 PTY stdout 输出 */
  onData: (callback: (data: string) => void) => PtyDisposable;
  /** 监听 PTY 退出事件 */
  onExit: (callback: (info: { exitCode: number; signal?: number }) => void) => PtyDisposable;
  /** 向 PTY stdin 写入数据 */
  write(data: string): void;
  /** 调整 PTY 终端尺寸 */
  resize(columns: number, rows: number): void;
  /** 终止 PTY 进程 */
  kill(signal?: string): void;
  /** PTY 进程 PID */
  pid: number;
}

/** PTY 进程创建选项 */
export interface PtySpawnOptions {
  name: string;
  cols: number;
  rows: number;
  cwd: string;
  env: Record<string, string>;
}

/** PTY 工厂接口，用于依赖注入 */
export interface PtyFactory {
  spawn(file: string, args: string[], options: PtySpawnOptions): PtyProcess;
}

/** Terminal session 创建选项 */
export interface SessionCreateOptions {
  cols?: number;
  rows?: number;
  cwd?: string;
}

// ---- TerminalSessionManager ----

/**
 * 终端 Session 管理器。
 * 维护 `Map<sessionId, PtyProcess>` 实例池，提供完整的 session 生命周期管理。
 */
export class TerminalSessionManager {
  private readonly sessions: Map<string, PtyProcess> = new Map();
  private readonly dataCallbacks: Map<string, Set<(data: string) => void>> = new Map();
  private readonly exitCallbacks: Map<string, Set<(exitCode: number) => void>> = new Map();
  private readonly ptyFactory: PtyFactory;

  constructor(ptyFactory: PtyFactory) {
    this.ptyFactory = ptyFactory;
  }

  /**
   * 创建新终端 session，返回 sessionId。
   *
   * @param options - 可选的 cols/rows/cwd 配置
   * @returns 唯一的 session 标识符
   */
  create(options?: SessionCreateOptions): string {
    const sessionId = randomUUID();
    const shell = process.platform === "win32" ? "powershell.exe" : process.env.SHELL || "bash";

    const pty = this.ptyFactory.spawn(shell, [], {
      name: "xterm-256color",
      cols: options?.cols ?? 80,
      rows: options?.rows ?? 30,
      cwd: options?.cwd ?? (process.env.HOME || homedir()),
      env: process.env as Record<string, string>
    });

    this.sessions.set(sessionId, pty);
    this.dataCallbacks.set(sessionId, new Set());
    this.exitCallbacks.set(sessionId, new Set());

    // 注册 PTY stdout 数据转发
    pty.onData((data: string) => {
      if (!this.sessions.has(sessionId)) return;
      const callbacks = this.dataCallbacks.get(sessionId);
      if (callbacks) {
        for (const cb of callbacks) cb(data);
      }
    });

    // 注册 PTY 退出处理
    pty.onExit(({ exitCode }: { exitCode: number }) => {
      const callbacks = this.exitCallbacks.get(sessionId);
      if (callbacks) {
        for (const cb of callbacks) cb(exitCode);
      }
      this.sessions.delete(sessionId);
      this.dataCallbacks.delete(sessionId);
      this.exitCallbacks.delete(sessionId);
    });

    return sessionId;
  }

  /**
   * 向指定 session 写入数据（用户输入）。
   *
   * @param sessionId - session 标识符
   * @param data - 要写入的字符串数据
   * @throws Error 如果 session 不存在
   */
  write(sessionId: string, data: string): void {
    const pty = this.sessions.get(sessionId);
    if (!pty) {
      throw new Error(`Session "${sessionId}" not found`);
    }
    pty.write(data);
  }

  /**
   * 调整终端尺寸。
   *
   * @param sessionId - session 标识符
   * @param cols - 列数
   * @param rows - 行数
   * @throws Error 如果 session 不存在
   */
  resize(sessionId: string, cols: number, rows: number): void {
    const pty = this.sessions.get(sessionId);
    if (!pty) {
      throw new Error(`Session "${sessionId}" not found`);
    }
    pty.resize(cols, rows);
  }

  /**
   * 关闭并销毁指定 session。
   *
   * @param sessionId - session 标识符
   * @throws Error 如果 session 不存在
   */
  close(sessionId: string): void {
    const pty = this.sessions.get(sessionId);
    if (!pty) {
      throw new Error(`Session "${sessionId}" not found`);
    }
    pty.kill();
    this.sessions.delete(sessionId);
    this.dataCallbacks.delete(sessionId);
    this.exitCallbacks.delete(sessionId);
  }

  /**
   * 关闭所有 session（插件 deactivate 时调用）。
   */
  closeAll(): void {
    for (const [, pty] of this.sessions) {
      pty.kill();
    }
    this.sessions.clear();
    this.dataCallbacks.clear();
    this.exitCallbacks.clear();
  }

  /**
   * 注册数据回调（stdout 输出）。
   *
   * @param sessionId - session 标识符
   * @param callback - 数据回调函数
   * @throws Error 如果 session 不存在
   */
  onData(sessionId: string, callback: (data: string) => void): void {
    if (!this.sessions.has(sessionId)) {
      throw new Error(`Session "${sessionId}" not found`);
    }
    const callbacks = this.dataCallbacks.get(sessionId);
    if (callbacks) {
      callbacks.add(callback);
    }
  }

  /**
   * 注册 session 退出回调。
   *
   * @param sessionId - session 标识符
   * @param callback - 退出回调函数，接收退出码
   * @throws Error 如果 session 不存在
   */
  onExit(sessionId: string, callback: (exitCode: number) => void): void {
    if (!this.sessions.has(sessionId)) {
      throw new Error(`Session "${sessionId}" not found`);
    }
    const callbacks = this.exitCallbacks.get(sessionId);
    if (callbacks) {
      callbacks.add(callback);
    }
  }

  /**
   * 获取所有活跃 session ID。
   *
   * @returns 活跃 session 的 ID 数组
   */
  listSessions(): string[] {
    return Array.from(this.sessions.keys());
  }
}
