import { describe, it, expect } from "vitest";
import { createExecResult, createFileStat, isExecResult } from "./types";

describe("共享类型辅助函数", () => {
  describe("createExecResult", () => {
    // 正常路径：工厂函数创建符合结构的对象
    it("创建包含 stdout/stderr/exitCode 的结果对象", () => {
      const result = createExecResult({ stdout: "hello", stderr: "", exitCode: 0 });
      expect(result.stdout).toBe("hello");
      expect(result.stderr).toBe("");
      expect(result.exitCode).toBe(0);
    });

    // 边界条件：支持可选 signal 字段
    it("支持可选 signal 字段", () => {
      const result = createExecResult({ stdout: "", stderr: "", exitCode: 1, signal: "SIGTERM" });
      expect(result.signal).toBe("SIGTERM");
    });

    // 边界条件：未传 signal 时为 undefined
    it("未传 signal 时为 undefined", () => {
      const result = createExecResult({ stdout: "", stderr: "", exitCode: 0 });
      expect(result.signal).toBeUndefined();
    });
  });

  describe("createFileStat", () => {
    it("创建文件元信息对象", () => {
      const stat = createFileStat({
        size: 1024,
        isDirectory: false,
        isFile: true,
        mtime: 1700000000
      });
      expect(stat.size).toBe(1024);
      expect(stat.isFile).toBe(true);
      expect(stat.isDirectory).toBe(false);
      expect(stat.mtime).toBe(1700000000);
    });
  });

  describe("isExecResult（类型守卫）", () => {
    it("合法 ExecResult 返回 true", () => {
      expect(isExecResult({ stdout: "", stderr: "", exitCode: 0 })).toBe(true);
    });

    it("缺少必要字段返回 false", () => {
      expect(isExecResult({ stdout: "" })).toBe(false);
      expect(isExecResult(null)).toBe(false);
      expect(isExecResult("string")).toBe(false);
    });
  });
});
