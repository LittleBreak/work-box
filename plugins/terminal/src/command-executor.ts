/**
 * Command Executor
 *
 * 提供 AI Tool 使用的命令执行能力。
 * 创建临时 PTY session 执行命令，收集输出后销毁，不复用 UI 的 session。
 * 支持超时控制、输出截断和危险命令拦截。
 */
import { homedir } from "node:os";
import { isDangerousCommand } from "@main/ipc/shell.handler";
import type { PtyFactory } from "./session-manager";
import type { ToolDefinition } from "@workbox/plugin-api";

/** 最大输出长度（字符数），超出时截断 */
export const MAX_OUTPUT_LENGTH = 10000;

/** 默认超时时间（毫秒） */
export const DEFAULT_TIMEOUT = 30000;

/** 命令执行选项 */
export interface CommandExecuteOptions {
  /** 要执行的 shell 命令 */
  command: string;
  /** 工作目录，默认为用户 HOME 目录 */
  cwd?: string;
  /** 超时时间（毫秒），默认 30000 */
  timeout?: number;
}

/** 命令执行结果 */
export interface CommandResult {
  /** 命令标准输出 */
  stdout: string;
  /** 进程退出码 */
  exitCode: number;
}

/**
 * 命令执行器。
 * 通过临时 PTY session 执行命令，适用于 AI Tool 调用场景。
 */
export class CommandExecutor {
  private readonly ptyFactory: PtyFactory;

  constructor(ptyFactory: PtyFactory) {
    this.ptyFactory = ptyFactory;
  }

  /**
   * 执行 shell 命令并返回结果。
   *
   * @param options - 命令执行选项
   * @returns 命令输出和退出码
   * @throws Error 空命令或危险命令
   */
  async execute(options: CommandExecuteOptions): Promise<CommandResult> {
    const { command, cwd, timeout } = options;

    // 前置校验：空命令
    if (!command || command.trim() === "") {
      throw new Error("Command must not be empty");
    }

    // 前置校验：危险命令
    if (isDangerousCommand(command)) {
      throw new Error(`Dangerous command rejected: ${command}`);
    }

    const shell = process.platform === "win32" ? "powershell.exe" : process.env.SHELL || "bash";
    const effectiveTimeout = timeout ?? DEFAULT_TIMEOUT;
    const effectiveCwd = cwd ?? (process.env.HOME || homedir());

    // 创建临时 PTY，使用 -c 标志非交互式执行命令
    const pty = this.ptyFactory.spawn(shell, ["-c", command], {
      name: "xterm-256color",
      cols: 80,
      rows: 30,
      cwd: effectiveCwd,
      env: process.env as Record<string, string>
    });

    return new Promise<CommandResult>((resolve) => {
      let output = "";
      let resolved = false;
      let truncated = false;

      // 收集 stdout 数据
      pty.onData((data: string) => {
        if (resolved) return;
        output += data;
        if (output.length > MAX_OUTPUT_LENGTH) {
          truncated = true;
        }
      });

      /** 完成执行并返回结果 */
      const finish = (exitCode: number): void => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);

        // 确保 PTY 进程被清理
        pty.kill();

        // 截断输出
        let stdout = output;
        if (truncated) {
          stdout = output.slice(0, MAX_OUTPUT_LENGTH) + "\n...[output truncated]";
        }

        resolve({ stdout, exitCode });
      };

      // 监听 PTY 退出
      pty.onExit(({ exitCode }: { exitCode: number }) => {
        finish(exitCode);
      });

      // 超时控制
      const timer = setTimeout(() => {
        if (!resolved) {
          output += "\n[Command timed out after " + effectiveTimeout + "ms]";
          finish(124); // 124 是 timeout 的标准退出码
        }
      }, effectiveTimeout);
    });
  }

  /**
   * 获取 run_command AI Tool 定义。
   *
   * @returns 符合 ToolDefinition 接口的工具定义
   */
  getToolDefinition(): ToolDefinition {
    return {
      name: "run_command",
      description:
        "在终端中执行命令并返回输出结果。可用于运行 shell 命令、查看文件、编译代码等操作。",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "要执行的 shell 命令" },
          cwd: { type: "string", description: "工作目录，默认为用户 HOME 目录" },
          timeout: { type: "number", description: "超时时间（毫秒），默认 30000" }
        },
        required: ["command"]
      },
      handler: async (params: Record<string, unknown>): Promise<CommandResult> => {
        return this.execute({
          command: params.command as string,
          cwd: params.cwd as string | undefined,
          timeout: params.timeout as number | undefined
        });
      }
    };
  }
}
