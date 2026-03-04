import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { createLogger, initLogger, installGlobalErrorHandlers } from "./logger";

describe("logger", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "workbox-logger-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe("createLogger", () => {
    it("创建带 scope 的 logger 实例", () => {
      const logger = createLogger("main");
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe("function");
      expect(typeof logger.warn).toBe("function");
      expect(typeof logger.error).toBe("function");
      expect(typeof logger.debug).toBe("function");
    });

    it("不同 scope 创建不同的 logger 实例", () => {
      const logger1 = createLogger("main");
      const logger2 = createLogger("plugin:test");
      expect(logger1).not.toBe(logger2);
    });

    it("logger 调用各级别方法不抛异常", () => {
      const logger = createLogger("test");
      expect(() => logger.info("test message")).not.toThrow();
      expect(() => logger.warn("warning message")).not.toThrow();
      expect(() => logger.error("error message")).not.toThrow();
      expect(() => logger.debug("debug message")).not.toThrow();
    });

    it("logger 支持 meta 参数", () => {
      const logger = createLogger("test");
      expect(() => logger.info("message with meta", { key: "value" })).not.toThrow();
      expect(() => logger.error("error with meta", { code: 500 })).not.toThrow();
    });
  });

  describe("initLogger", () => {
    it("initLogger 函数存在且可调用", () => {
      expect(typeof initLogger).toBe("function");
    });

    it("initLogger 配置日志目录", () => {
      expect(() => initLogger({ logDir: tmpDir })).not.toThrow();
    });

    it("日志目录不存在时自动创建", () => {
      const nestedDir = path.join(tmpDir, "nested", "logs");
      expect(() => initLogger({ logDir: nestedDir })).not.toThrow();
      expect(fs.existsSync(nestedDir)).toBe(true);
    });
  });

  describe("installGlobalErrorHandlers", () => {
    it("installGlobalErrorHandlers 函数存在且可调用", () => {
      expect(typeof installGlobalErrorHandlers).toBe("function");
    });

    it("注册 uncaughtException 和 unhandledRejection 处理器", () => {
      const logger = createLogger("test");
      const onSpy = vi.spyOn(process, "on");

      installGlobalErrorHandlers(logger);

      const eventNames = onSpy.mock.calls.map((call) => call[0]);
      expect(eventNames).toContain("uncaughtException");
      expect(eventNames).toContain("unhandledRejection");

      onSpy.mockRestore();
    });
  });

  describe("边界条件", () => {
    it("日志 message 包含特殊字符不抛异常", () => {
      const logger = createLogger("test");
      expect(() => logger.info("message with\nnewline")).not.toThrow();
      expect(() => logger.info("unicode: 你好世界")).not.toThrow();
      expect(() => logger.info("tabs\tand\tmore")).not.toThrow();
    });

    it("空 scope 不抛异常", () => {
      expect(() => createLogger("")).not.toThrow();
    });
  });
});
