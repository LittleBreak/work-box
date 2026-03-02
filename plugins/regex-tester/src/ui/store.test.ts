/**
 * Regex Tester Store Tests
 *
 * 验证 Zustand store 的状态管理：模式切换、正则执行、
 * Flag 切换、模板选择和剪贴板复制。
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock clipboard before importing store
const mockClipboard = { writeText: vi.fn(() => Promise.resolve()) };
vi.stubGlobal("window", { workbox: { clipboard: mockClipboard } });

import { useRegexTesterStore, initialRegexTesterState } from "./store.ts";

describe("useRegexTesterStore", () => {
  beforeEach(() => {
    useRegexTesterStore.setState({ ...initialRegexTesterState });
    vi.clearAllMocks();
  });

  // ---- Default State ----
  it("has empty pattern by default", () => {
    expect(useRegexTesterStore.getState().pattern).toBe("");
  });

  it("has default flags 'g'", () => {
    expect(useRegexTesterStore.getState().flags).toBe("g");
  });

  it("has empty test text by default", () => {
    expect(useRegexTesterStore.getState().testText).toBe("");
  });

  it("has empty matches by default", () => {
    expect(useRegexTesterStore.getState().matches).toEqual([]);
  });

  // ---- Setters ----
  it("setPattern updates pattern", () => {
    useRegexTesterStore.getState().setPattern("\\d+");
    expect(useRegexTesterStore.getState().pattern).toBe("\\d+");
  });

  it("setTestText updates testText", () => {
    useRegexTesterStore.getState().setTestText("hello 123");
    expect(useRegexTesterStore.getState().testText).toBe("hello 123");
  });

  it("setFlags updates flags", () => {
    useRegexTesterStore.getState().setFlags("gi");
    expect(useRegexTesterStore.getState().flags).toBe("gi");
  });

  // ---- Flag Toggling ----
  it("toggleFlag adds a flag that is not present", () => {
    useRegexTesterStore.setState({ flags: "g" });
    useRegexTesterStore.getState().toggleFlag("i");
    expect(useRegexTesterStore.getState().flags).toContain("i");
    expect(useRegexTesterStore.getState().flags).toContain("g");
  });

  it("toggleFlag removes a flag that is present", () => {
    useRegexTesterStore.setState({ flags: "gi" });
    useRegexTesterStore.getState().toggleFlag("i");
    expect(useRegexTesterStore.getState().flags).not.toContain("i");
    expect(useRegexTesterStore.getState().flags).toContain("g");
  });

  // ---- Execute ----
  it("execute populates matches for valid pattern", () => {
    useRegexTesterStore.setState({
      pattern: "\\d+",
      flags: "g",
      testText: "abc 123 def 456"
    });
    useRegexTesterStore.getState().execute();
    const state = useRegexTesterStore.getState();
    expect(state.matches).toHaveLength(2);
    expect(state.matches[0].fullMatch).toBe("123");
    expect(state.matches[1].fullMatch).toBe("456");
    expect(state.error).toBeNull();
  });

  it("execute sets error for invalid pattern", () => {
    useRegexTesterStore.setState({
      pattern: "[unclosed",
      flags: "g",
      testText: "test"
    });
    useRegexTesterStore.getState().execute();
    const state = useRegexTesterStore.getState();
    expect(state.matches).toEqual([]);
    expect(state.error).toBeTruthy();
  });

  it("execute clears previous error on valid pattern", () => {
    useRegexTesterStore.setState({
      pattern: "[bad",
      flags: "g",
      testText: "test",
      error: "some old error"
    });
    // First execute with bad pattern
    useRegexTesterStore.getState().execute();
    expect(useRegexTesterStore.getState().error).toBeTruthy();

    // Fix pattern and re-execute
    useRegexTesterStore.setState({ pattern: "test" });
    useRegexTesterStore.getState().execute();
    expect(useRegexTesterStore.getState().error).toBeNull();
    expect(useRegexTesterStore.getState().matches).toHaveLength(1);
  });

  it("execute with empty pattern returns no matches and no error", () => {
    useRegexTesterStore.setState({
      pattern: "",
      flags: "g",
      testText: "test"
    });
    useRegexTesterStore.getState().execute();
    const state = useRegexTesterStore.getState();
    expect(state.matches).toEqual([]);
    expect(state.error).toBeNull();
  });

  it("execute with empty text returns no matches and no error", () => {
    useRegexTesterStore.setState({
      pattern: "\\d+",
      flags: "g",
      testText: ""
    });
    useRegexTesterStore.getState().execute();
    const state = useRegexTesterStore.getState();
    expect(state.matches).toEqual([]);
    expect(state.error).toBeNull();
  });

  // ---- Template Selection ----
  it("applyTemplate sets pattern, flags, and testText from template", () => {
    useRegexTesterStore.getState().applyTemplate({
      name: "Test",
      pattern: "abc",
      flags: "gi",
      description: "Test template",
      sampleText: "abc ABC"
    });
    const state = useRegexTesterStore.getState();
    expect(state.pattern).toBe("abc");
    expect(state.flags).toBe("gi");
    expect(state.testText).toBe("abc ABC");
  });

  it("applyTemplate auto-executes matching", () => {
    useRegexTesterStore.getState().applyTemplate({
      name: "Digits",
      pattern: "\\d+",
      flags: "g",
      description: "Match digits",
      sampleText: "hello 123"
    });
    expect(useRegexTesterStore.getState().matches).toHaveLength(1);
  });

  // ---- Clipboard ----
  it("copyToClipboard calls window.workbox.clipboard.writeText", async () => {
    await useRegexTesterStore.getState().copyToClipboard("\\d+");
    expect(mockClipboard.writeText).toHaveBeenCalledWith("\\d+");
    expect(useRegexTesterStore.getState().copySuccess).toBe(true);
  });
});
