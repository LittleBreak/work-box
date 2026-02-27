import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TerminalSessionManager } from "./session-manager";
import type { PtyFactory, PtyProcess } from "./session-manager";

/** 创建单个 mock PTY 进程 */
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

describe("TerminalSessionManager", () => {
  let manager: TerminalSessionManager;
  let factory: ReturnType<typeof createMockFactory>;

  beforeEach(() => {
    factory = createMockFactory();
    manager = new TerminalSessionManager(factory);
  });

  afterEach(() => {
    manager.closeAll();
  });

  // ---- create ----

  describe("create()", () => {
    it("创建 session 并返回 sessionId", () => {
      const sessionId = manager.create();

      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe("string");
      expect(sessionId.length).toBeGreaterThan(0);
    });

    it("使用默认 cols/rows 调用 PTY spawn", () => {
      manager.create();

      expect(factory.spawn).toHaveBeenCalledOnce();
      const spawnArgs = (factory.spawn as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(spawnArgs[2]).toMatchObject({
        name: "xterm-256color",
        cols: 80,
        rows: 30
      });
    });

    it("使用自定义选项调用 PTY spawn", () => {
      manager.create({ cols: 120, rows: 40, cwd: "/tmp" });

      const spawnArgs = (factory.spawn as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(spawnArgs[2]).toMatchObject({
        cols: 120,
        rows: 40,
        cwd: "/tmp"
      });
    });

    it("每次调用返回唯一 sessionId", () => {
      const id1 = manager.create();
      const id2 = manager.create();
      const id3 = manager.create();

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });
  });

  // ---- write ----

  describe("write()", () => {
    it("向 PTY stdin 写入数据", () => {
      const sessionId = manager.create();
      const mockPty = factory.getMocks()[0];

      manager.write(sessionId, "ls -la\r");

      expect(mockPty.write).toHaveBeenCalledWith("ls -la\r");
    });

    it("无效 sessionId 抛出错误", () => {
      expect(() => manager.write("invalid-id", "data")).toThrow('Session "invalid-id" not found');
    });
  });

  // ---- resize ----

  describe("resize()", () => {
    it("调整 PTY 终端尺寸", () => {
      const sessionId = manager.create();
      const mockPty = factory.getMocks()[0];

      manager.resize(sessionId, 120, 40);

      expect(mockPty.resize).toHaveBeenCalledWith(120, 40);
    });

    it("无效 sessionId 抛出错误", () => {
      expect(() => manager.resize("invalid-id", 80, 30)).toThrow('Session "invalid-id" not found');
    });
  });

  // ---- onData ----

  describe("onData()", () => {
    it("注册数据回调并接收 PTY 输出", () => {
      const sessionId = manager.create();
      const mockPty = factory.getMocks()[0];
      const callback = vi.fn();

      manager.onData(sessionId, callback);
      mockPty._emitData("output text");

      expect(callback).toHaveBeenCalledWith("output text");
    });

    it("支持多个数据回调", () => {
      const sessionId = manager.create();
      const mockPty = factory.getMocks()[0];
      const cb1 = vi.fn();
      const cb2 = vi.fn();

      manager.onData(sessionId, cb1);
      manager.onData(sessionId, cb2);
      mockPty._emitData("data");

      expect(cb1).toHaveBeenCalledWith("data");
      expect(cb2).toHaveBeenCalledWith("data");
    });

    it("无效 sessionId 抛出错误", () => {
      expect(() => manager.onData("invalid-id", vi.fn())).toThrow('Session "invalid-id" not found');
    });
  });

  // ---- onExit ----

  describe("onExit()", () => {
    it("注册退出回调并接收退出码", () => {
      const sessionId = manager.create();
      const mockPty = factory.getMocks()[0];
      const callback = vi.fn();

      manager.onExit(sessionId, callback);
      mockPty._emitExit(0);

      expect(callback).toHaveBeenCalledWith(0);
    });

    it("PTY 退出后 session 从池中移除", () => {
      const sessionId = manager.create();
      const mockPty = factory.getMocks()[0];

      mockPty._emitExit(0);

      expect(manager.listSessions()).not.toContain(sessionId);
    });

    it("无效 sessionId 抛出错误", () => {
      expect(() => manager.onExit("invalid-id", vi.fn())).toThrow('Session "invalid-id" not found');
    });
  });

  // ---- close ----

  describe("close()", () => {
    it("销毁 PTY 实例并移除 session", () => {
      const sessionId = manager.create();
      const mockPty = factory.getMocks()[0];

      manager.close(sessionId);

      expect(mockPty.kill).toHaveBeenCalled();
      expect(manager.listSessions()).not.toContain(sessionId);
    });

    it("close 后 onData 回调不再触发", () => {
      const sessionId = manager.create();
      const mockPty = factory.getMocks()[0];
      const callback = vi.fn();
      manager.onData(sessionId, callback);

      manager.close(sessionId);
      mockPty._emitData("should not receive");

      expect(callback).not.toHaveBeenCalled();
    });

    it("无效 sessionId 抛出错误", () => {
      expect(() => manager.close("invalid-id")).toThrow('Session "invalid-id" not found');
    });
  });

  // ---- closeAll ----

  describe("closeAll()", () => {
    it("关闭所有 session", () => {
      manager.create();
      manager.create();
      manager.create();

      expect(manager.listSessions()).toHaveLength(3);

      manager.closeAll();

      expect(manager.listSessions()).toHaveLength(0);
    });

    it("调用每个 PTY 的 kill 方法", () => {
      manager.create();
      manager.create();

      manager.closeAll();

      for (const mock of factory.getMocks()) {
        expect(mock.kill).toHaveBeenCalled();
      }
    });

    it("空 session 列表时不报错", () => {
      expect(() => manager.closeAll()).not.toThrow();
    });
  });

  // ---- listSessions ----

  describe("listSessions()", () => {
    it("返回空列表当无 session", () => {
      expect(manager.listSessions()).toEqual([]);
    });

    it("返回所有活跃 session ID", () => {
      const id1 = manager.create();
      const id2 = manager.create();

      const sessions = manager.listSessions();

      expect(sessions).toContain(id1);
      expect(sessions).toContain(id2);
      expect(sessions).toHaveLength(2);
    });

    it("关闭的 session 不在列表中", () => {
      const id1 = manager.create();
      const id2 = manager.create();

      manager.close(id1);

      const sessions = manager.listSessions();
      expect(sessions).not.toContain(id1);
      expect(sessions).toContain(id2);
      expect(sessions).toHaveLength(1);
    });
  });

  // ---- 多 session 并发管理 ----

  describe("多 session 并发管理", () => {
    it("各 session 互不干扰", () => {
      const id1 = manager.create();
      const id2 = manager.create();
      const mocks = factory.getMocks();
      const cb1 = vi.fn();
      const cb2 = vi.fn();

      manager.onData(id1, cb1);
      manager.onData(id2, cb2);

      mocks[0]._emitData("data-for-1");
      mocks[1]._emitData("data-for-2");

      expect(cb1).toHaveBeenCalledWith("data-for-1");
      expect(cb1).not.toHaveBeenCalledWith("data-for-2");
      expect(cb2).toHaveBeenCalledWith("data-for-2");
      expect(cb2).not.toHaveBeenCalledWith("data-for-1");
    });

    it("关闭一个 session 不影响其他 session", () => {
      const id1 = manager.create();
      const id2 = manager.create();

      manager.close(id1);

      expect(() => manager.write(id2, "test")).not.toThrow();
      expect(manager.listSessions()).toContain(id2);
    });

    it("write 路由到正确的 PTY 实例", () => {
      const id1 = manager.create();
      const id2 = manager.create();
      const mocks = factory.getMocks();

      manager.write(id1, "cmd1");
      manager.write(id2, "cmd2");

      expect(mocks[0].write).toHaveBeenCalledWith("cmd1");
      expect(mocks[1].write).toHaveBeenCalledWith("cmd2");
    });
  });

  // ---- 边界情况 ----

  describe("边界情况", () => {
    it("PTY 退出后再次 write 抛出错误", () => {
      const sessionId = manager.create();
      const mockPty = factory.getMocks()[0];

      mockPty._emitExit(0);

      expect(() => manager.write(sessionId, "data")).toThrow(`Session "${sessionId}" not found`);
    });

    it("PTY 退出后 onData 回调中的 session 检查", () => {
      const sessionId = manager.create();
      const mockPty = factory.getMocks()[0];
      const callback = vi.fn();
      manager.onData(sessionId, callback);

      // 模拟 PTY 进程退出后仍触发 data 事件
      mockPty._emitExit(0);
      mockPty._emitData("late data");

      // 退出后不应再收到数据回调
      expect(callback).not.toHaveBeenCalled();
    });
  });
});
