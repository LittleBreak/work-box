/**
 * JSON Formatter Store Tests
 *
 * 验证 Zustand store 的状态管理：模式切换、格式化/压缩、
 * 校验、转换、Diff、树形解析和剪贴板复制。
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock clipboard before importing store
const mockClipboard = { writeText: vi.fn(() => Promise.resolve()) };
vi.stubGlobal("window", { workbox: { clipboard: mockClipboard } });

import { useJsonFormatterStore, initialJsonFormatterState } from "./store";

describe("useJsonFormatterStore", () => {
  beforeEach(() => {
    useJsonFormatterStore.setState({ ...initialJsonFormatterState });
    vi.clearAllMocks();
  });

  // ---- Mode ----
  it("has default mode 'format'", () => {
    expect(useJsonFormatterStore.getState().mode).toBe("format");
  });

  it("setMode changes the mode", () => {
    useJsonFormatterStore.getState().setMode("validate");
    expect(useJsonFormatterStore.getState().mode).toBe("validate");
  });

  // ---- Format / Compress ----
  it("doFormat formats valid JSON", () => {
    useJsonFormatterStore.setState({ formatInput: '{"a":1}' });
    useJsonFormatterStore.getState().doFormat();
    expect(useJsonFormatterStore.getState().formatOutput).toBe('{\n  "a": 1\n}');
  });

  it("doFormat sets error output on invalid JSON", () => {
    useJsonFormatterStore.setState({ formatInput: "{invalid}" });
    useJsonFormatterStore.getState().doFormat();
    expect(useJsonFormatterStore.getState().formatOutput).toContain("Error:");
  });

  it("doCompress compresses valid JSON", () => {
    useJsonFormatterStore.setState({ formatInput: '{\n  "a": 1\n}' });
    useJsonFormatterStore.getState().doCompress();
    expect(useJsonFormatterStore.getState().formatOutput).toBe('{"a":1}');
  });

  it("doCompress sets error output on invalid JSON", () => {
    useJsonFormatterStore.setState({ formatInput: "not json" });
    useJsonFormatterStore.getState().doCompress();
    expect(useJsonFormatterStore.getState().formatOutput).toContain("Error:");
  });

  // ---- Validate ----
  it("doValidate returns valid for valid JSON", () => {
    useJsonFormatterStore.setState({ validateInput: '{"key":"value"}' });
    useJsonFormatterStore.getState().doValidate();
    const result = useJsonFormatterStore.getState().validationResult;
    expect(result).not.toBeNull();
    expect(result!.valid).toBe(true);
  });

  it("doValidate returns error for invalid JSON", () => {
    useJsonFormatterStore.setState({ validateInput: "{bad" });
    useJsonFormatterStore.getState().doValidate();
    const result = useJsonFormatterStore.getState().validationResult;
    expect(result).not.toBeNull();
    expect(result!.valid).toBe(false);
    expect(result!.error).toBeDefined();
  });

  // ---- Convert ----
  it("doConvert JSON→TS generates interface", () => {
    useJsonFormatterStore.setState({
      convertInput: '{"name":"Alice"}',
      convertDirection: "json-to-ts"
    });
    useJsonFormatterStore.getState().doConvert();
    expect(useJsonFormatterStore.getState().convertOutput).toContain("interface Root");
    expect(useJsonFormatterStore.getState().convertOutput).toContain("name: string");
  });

  it("doConvert TS→JSON generates sample", () => {
    useJsonFormatterStore.setState({
      convertInput: "interface User {\n  name: string;\n  age: number;\n}",
      convertDirection: "ts-to-json"
    });
    useJsonFormatterStore.getState().doConvert();
    const parsed = JSON.parse(useJsonFormatterStore.getState().convertOutput);
    expect(parsed.name).toBe("");
    expect(parsed.age).toBe(0);
  });

  it("doConvert sets error on invalid input", () => {
    useJsonFormatterStore.setState({
      convertInput: "{invalid}",
      convertDirection: "json-to-ts"
    });
    useJsonFormatterStore.getState().doConvert();
    expect(useJsonFormatterStore.getState().convertOutput).toContain("Error:");
  });

  it("toggleConvertDirection switches direction and clears input/output", () => {
    useJsonFormatterStore.setState({
      convertDirection: "json-to-ts",
      convertInput: "some input",
      convertOutput: "some output"
    });
    useJsonFormatterStore.getState().toggleConvertDirection();
    const state = useJsonFormatterStore.getState();
    expect(state.convertDirection).toBe("ts-to-json");
    expect(state.convertInput).toBe("");
    expect(state.convertOutput).toBe("");
  });

  // ---- Diff ----
  it("doDiff detects changes between two JSON strings", () => {
    useJsonFormatterStore.setState({
      diffLeft: '{"a":1}',
      diffRight: '{"a":2}'
    });
    useJsonFormatterStore.getState().doDiff();
    const entries = useJsonFormatterStore.getState().diffEntries;
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0].type).toBe("changed");
  });

  it("doDiff returns unchanged for identical JSON", () => {
    useJsonFormatterStore.setState({
      diffLeft: '{"a":1}',
      diffRight: '{"a":1}'
    });
    useJsonFormatterStore.getState().doDiff();
    const entries = useJsonFormatterStore.getState().diffEntries;
    expect(entries.every((e) => e.type === "unchanged")).toBe(true);
  });

  it("doDiff handles invalid input gracefully", () => {
    useJsonFormatterStore.setState({
      diffLeft: "{invalid}",
      diffRight: "{}"
    });
    useJsonFormatterStore.getState().doDiff();
    const entries = useJsonFormatterStore.getState().diffEntries;
    expect(entries.length).toBeGreaterThan(0);
  });

  // ---- Tree ----
  it("parseTree parses valid JSON", () => {
    useJsonFormatterStore.setState({ treeInput: '{"a":1,"b":[2,3]}' });
    useJsonFormatterStore.getState().parseTree();
    const state = useJsonFormatterStore.getState();
    expect(state.treeData).toEqual({ a: 1, b: [2, 3] });
    expect(state.treeError).toBeNull();
  });

  it("parseTree sets error for invalid JSON", () => {
    useJsonFormatterStore.setState({ treeInput: "{bad" });
    useJsonFormatterStore.getState().parseTree();
    const state = useJsonFormatterStore.getState();
    expect(state.treeData).toBeNull();
    expect(state.treeError).toBeTruthy();
  });

  // ---- Clipboard ----
  it("copyToClipboard calls window.workbox.clipboard.writeText", async () => {
    await useJsonFormatterStore.getState().copyToClipboard("test text");
    expect(mockClipboard.writeText).toHaveBeenCalledWith("test text");
    expect(useJsonFormatterStore.getState().copySuccess).toBe(true);
  });

  // ---- Setters ----
  it("setFormatInput updates formatInput", () => {
    useJsonFormatterStore.getState().setFormatInput("hello");
    expect(useJsonFormatterStore.getState().formatInput).toBe("hello");
  });

  it("setValidateInput updates validateInput", () => {
    useJsonFormatterStore.getState().setValidateInput("world");
    expect(useJsonFormatterStore.getState().validateInput).toBe("world");
  });

  it("setConvertInput updates convertInput", () => {
    useJsonFormatterStore.getState().setConvertInput("data");
    expect(useJsonFormatterStore.getState().convertInput).toBe("data");
  });

  it("setDiffLeft updates diffLeft", () => {
    useJsonFormatterStore.getState().setDiffLeft("left");
    expect(useJsonFormatterStore.getState().diffLeft).toBe("left");
  });

  it("setDiffRight updates diffRight", () => {
    useJsonFormatterStore.getState().setDiffRight("right");
    expect(useJsonFormatterStore.getState().diffRight).toBe("right");
  });

  it("setTreeInput updates treeInput", () => {
    useJsonFormatterStore.getState().setTreeInput("tree");
    expect(useJsonFormatterStore.getState().treeInput).toBe("tree");
  });
});
