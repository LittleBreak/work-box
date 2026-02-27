import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CommandExecutor, MAX_OUTPUT_LENGTH, DEFAULT_TIMEOUT } from "./command-executor";
import type { PtyFactory, PtyProcess } from "./session-manager";

/** 创建单个 mock PTY 进程（支持手动触发 data/exit 事件） */
function createMockPty(): PtyProcess & {
  _emitData: (data: string) => void;
  _emitExit: (exitCode: number, signal?: number) => void;
} {
  const dataCallbacks: Array<(data: string) => void> = [];
  const exitCallbacks: Array<(info: { exitCode: number; signal?: number }) => void> = [];

  return {
    pid: Math.floor(Math.random() * 99999),
    write: vi.fn(),
    resize: vi.fn(),
    kill: vi.fn(),
    onData: vi.fn((cb: (data: string) => void) => {
      dataCallbacks.push(cb);
      return { dispose: vi.fn() };
    }),
    onExit: vi.fn((cb: (info: { exitCode: number; signal?: number }) => void) => {
      exitCallbacks.push(cb);
      return { dispose: vi.fn() };
    }),
    _emitData(data: string) {
      for (const cb of dataCallbacks) cb(data);
    },
    _emitExit(exitCode: number, signal?: number) {
      for (const cb of exitCallbacks) cb({ exitCode, signal });
    }
  };
}

/** 创建 mock PtyFactory，每次 spawn 返回新的 mock PTY */
function createMockFactory(): PtyFactory & {
  getMocks: () => ReturnType<typeof createMockPty>[];
} {
  const mocks: ReturnType<typeof createMockPty>[] = [];

  return {
    spawn: vi.fn(() => {
      const mock = createMockPty();
      mocks.push(mock);
      return mock;
    }),
    getMocks: () => mocks
  };
}

describe("CommandExecutor", () => {
  let executor: CommandExecutor;
  let factory: ReturnType<typeof createMockFactory>;

  beforeEach(() => {
    vi.useFakeTimers();
    factory = createMockFactory();
    executor = new CommandExecutor(factory);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ---- 常量导出 ----

  describe("常量", () => {
    it("MAX_OUTPUT_LENGTH 为 10000", () => {
      expect(MAX_OUTPUT_LENGTH).toBe(10000);
    });

    it("DEFAULT_TIMEOUT 为 30000", () => {
      expect(DEFAULT_TIMEOUT).toBe(30000);
    });
  });

  // ---- 简单命令执行 ----

  describe("execute() — 正常路径", () => {
    it("执行简单命令并返回 stdout 和 exitCode", async () => {
      const promise = executor.execute({ command: "echo hello" });

      // 模拟 PTY 行为：输出数据后退出
      const mockPty = factory.getMocks()[0]!;
      mockPty._emitData("hello\n");
      mockPty._emitExit(0);

      const result = await promise;
      expect(result).toEqual({ stdout: "hello\n", exitCode: 0 });
    });

    it("使用 shell -c 参数执行命令", () => {
      executor.execute({ command: "ls -la" });

      const spawnArgs = (factory.spawn as ReturnType<typeof vi.fn>).mock.calls[0]!;
      // args[1] 应为 ["-c", "ls -la"]
      expect(spawnArgs[1]).toEqual(["-c", "ls -la"]);
    });

    it("多段数据拼接为完整 stdout", async () => {
      const promise = executor.execute({ command: "cat file.txt" });

      const mockPty = factory.getMocks()[0]!;
      mockPty._emitData("line1\n");
      mockPty._emitData("line2\n");
      mockPty._emitData("line3\n");
      mockPty._emitExit(0);

      const result = await promise;
      expect(result.stdout).toBe("line1\nline2\nline3\n");
      expect(result.exitCode).toBe(0);
    });

    it("命令失败返回非零 exitCode", async () => {
      const promise = executor.execute({ command: "false" });

      const mockPty = factory.getMocks()[0]!;
      mockPty._emitData("");
      mockPty._emitExit(1);

      const result = await promise;
      expect(result.exitCode).toBe(1);
    });

    it("自定义 cwd 传递给 PTY spawn", () => {
      executor.execute({ command: "pwd", cwd: "/tmp" });

      const spawnArgs = (factory.spawn as ReturnType<typeof vi.fn>).mock.calls[0]!;
      expect(spawnArgs[2]).toMatchObject({ cwd: "/tmp" });
    });

    it("PTY 退出后清理资源（kill 被调用）", async () => {
      const promise = executor.execute({ command: "echo done" });

      const mockPty = factory.getMocks()[0]!;
      mockPty._emitExit(0);

      await promise;
      expect(mockPty.kill).toHaveBeenCalled();
    });
  });

  // ---- 超时处理 ----

  describe("execute() — 超时", () => {
    it("命令超时后返回错误结果", async () => {
      const promise = executor.execute({ command: "sleep 999", timeout: 5000 });

      // 前进到超时时间
      vi.advanceTimersByTime(5000);

      const result = await promise;
      expect(result.exitCode).not.toBe(0);
      expect(result.stdout).toContain("timed out");
    });

    it("超时后 kill PTY 进程", async () => {
      const promise = executor.execute({ command: "sleep 999", timeout: 5000 });
      const mockPty = factory.getMocks()[0]!;

      vi.advanceTimersByTime(5000);
      await promise;

      expect(mockPty.kill).toHaveBeenCalled();
    });

    it("默认超时为 DEFAULT_TIMEOUT (30s)", () => {
      executor.execute({ command: "sleep 999" });

      const mockPty = factory.getMocks()[0]!;

      // 29秒不应超时
      vi.advanceTimersByTime(29000);
      expect(mockPty.kill).not.toHaveBeenCalled();

      // 30秒应超时
      vi.advanceTimersByTime(1000);
      expect(mockPty.kill).toHaveBeenCalled();
    });

    it("命令正常退出时清除超时计时器", async () => {
      const promise = executor.execute({ command: "echo fast", timeout: 5000 });

      const mockPty = factory.getMocks()[0]!;
      mockPty._emitData("fast\n");
      mockPty._emitExit(0);

      await promise;

      // 前进到超时时间后不应再次 kill
      vi.advanceTimersByTime(5000);
      expect(mockPty.kill).toHaveBeenCalledTimes(1); // 只在正常退出时 kill 一次
    });
  });

  // ---- 输出截断 ----

  describe("execute() — 输出截断", () => {
    it("输出超过 MAX_OUTPUT_LENGTH 时截断", async () => {
      const promise = executor.execute({ command: "cat large-file" });

      const mockPty = factory.getMocks()[0]!;
      // 发送超过 10000 字符的数据
      const longOutput = "x".repeat(12000);
      mockPty._emitData(longOutput);
      mockPty._emitExit(0);

      const result = await promise;
      expect(result.stdout.length).toBeLessThanOrEqual(MAX_OUTPUT_LENGTH + 100); // 允许截断提示文本
      expect(result.stdout).toContain("...[output truncated]");
    });

    it("输出恰好等于 MAX_OUTPUT_LENGTH 时不截断", async () => {
      const promise = executor.execute({ command: "cat exact-file" });

      const mockPty = factory.getMocks()[0]!;
      const exactOutput = "x".repeat(MAX_OUTPUT_LENGTH);
      mockPty._emitData(exactOutput);
      mockPty._emitExit(0);

      const result = await promise;
      expect(result.stdout).toBe(exactOutput);
      expect(result.stdout).not.toContain("truncated");
    });
  });

  // ---- 危险命令检测 ----

  describe("execute() — 危险命令拦截", () => {
    it("拦截 rm -rf / 命令", async () => {
      await expect(executor.execute({ command: "rm -rf /" })).rejects.toThrow(
        /[Dd]angerous command rejected/
      );
    });

    it("拦截 sudo 命令", async () => {
      await expect(executor.execute({ command: "sudo apt install" })).rejects.toThrow(
        /[Dd]angerous command rejected/
      );
    });

    it("拦截 dd 命令", async () => {
      await expect(executor.execute({ command: "dd if=/dev/zero" })).rejects.toThrow(
        /[Dd]angerous command rejected/
      );
    });

    it("拦截 mkfs 命令", async () => {
      await expect(executor.execute({ command: "mkfs.ext4 /dev/sda1" })).rejects.toThrow(
        /[Dd]angerous command rejected/
      );
    });

    it("拦截 shutdown 命令", async () => {
      await expect(executor.execute({ command: "shutdown -h now" })).rejects.toThrow(
        /[Dd]angerous command rejected/
      );
    });

    it("拦截 reboot 命令", async () => {
      await expect(executor.execute({ command: "reboot" })).rejects.toThrow(
        /[Dd]angerous command rejected/
      );
    });

    it("危险命令不创建 PTY session", async () => {
      try {
        await executor.execute({ command: "sudo rm -rf /" });
      } catch {
        // expected
      }
      expect(factory.spawn).not.toHaveBeenCalled();
    });
  });

  // ---- 空命令 / 无效输入 ----

  describe("execute() — 无效输入", () => {
    it("空命令抛出错误", async () => {
      await expect(executor.execute({ command: "" })).rejects.toThrow(
        /[Cc]ommand must not be empty/
      );
    });

    it("纯空白命令抛出错误", async () => {
      await expect(executor.execute({ command: "   " })).rejects.toThrow(
        /[Cc]ommand must not be empty/
      );
    });

    it("空命令不创建 PTY session", async () => {
      try {
        await executor.execute({ command: "" });
      } catch {
        // expected
      }
      expect(factory.spawn).not.toHaveBeenCalled();
    });
  });

  // ---- Tool 注册/注销 ----

  describe("getToolDefinition()", () => {
    it("返回符合 ToolDefinition 接口的对象", () => {
      const toolDef = executor.getToolDefinition();

      expect(toolDef.name).toBe("run_command");
      expect(toolDef.description).toBeDefined();
      expect(typeof toolDef.description).toBe("string");
      expect(toolDef.parameters).toBeDefined();
      expect(toolDef.handler).toBeDefined();
      expect(typeof toolDef.handler).toBe("function");
    });

    it("参数 schema 包含 command 必填字段", () => {
      const toolDef = executor.getToolDefinition();
      const params = toolDef.parameters as {
        type: string;
        properties: Record<string, unknown>;
        required: string[];
      };

      expect(params.type).toBe("object");
      expect(params.properties).toHaveProperty("command");
      expect(params.required).toContain("command");
    });

    it("参数 schema 包含 cwd 和 timeout 可选字段", () => {
      const toolDef = executor.getToolDefinition();
      const params = toolDef.parameters as {
        properties: Record<string, unknown>;
      };

      expect(params.properties).toHaveProperty("cwd");
      expect(params.properties).toHaveProperty("timeout");
    });

    it("handler 调用 execute() 并返回结果", async () => {
      const toolDef = executor.getToolDefinition();
      const handlerPromise = toolDef.handler({ command: "echo test" });

      const mockPty = factory.getMocks()[0]!;
      mockPty._emitData("test\n");
      mockPty._emitExit(0);

      const result = await handlerPromise;
      expect(result).toEqual({ stdout: "test\n", exitCode: 0 });
    });
  });
});
