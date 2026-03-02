/**
 * Regex Engine Tests
 *
 * 验证正则匹配引擎：executeRegex、validateRegex、generateHighlightSegments。
 * 覆盖：正常匹配、全局匹配、分组捕获、命名分组、无效正则、空输入、ReDoS 防护。
 */
import { describe, it, expect } from "vitest";
import { executeRegex, validateRegex, generateHighlightSegments } from "./regex-engine.ts";

describe("validateRegex", () => {
  it("returns valid for a correct pattern", () => {
    const result = validateRegex("\\d+", "g");
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("returns valid for an empty pattern", () => {
    const result = validateRegex("", "g");
    expect(result.valid).toBe(true);
  });

  it("returns invalid for a bad pattern", () => {
    const result = validateRegex("[unclosed", "g");
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
    expect(typeof result.error).toBe("string");
  });

  it("returns invalid for invalid flags", () => {
    const result = validateRegex("abc", "z");
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("handles valid flags combination", () => {
    const result = validateRegex("test", "gimsu");
    expect(result.valid).toBe(true);
  });
});

describe("executeRegex", () => {
  it("returns matches for a simple pattern", () => {
    const matches = executeRegex("\\d+", "g", "abc 123 def 456");
    expect(matches).toHaveLength(2);
    expect(matches[0].fullMatch).toBe("123");
    expect(matches[0].index).toBe(4);
    expect(matches[0].length).toBe(3);
    expect(matches[1].fullMatch).toBe("456");
    expect(matches[1].index).toBe(12);
  });

  it("returns empty array for no matches", () => {
    const matches = executeRegex("xyz", "g", "abc def");
    expect(matches).toHaveLength(0);
  });

  it("returns empty array for empty pattern", () => {
    const matches = executeRegex("", "g", "abc");
    expect(matches).toHaveLength(0);
  });

  it("returns empty array for empty text", () => {
    const matches = executeRegex("\\d+", "g", "");
    expect(matches).toHaveLength(0);
  });

  it("returns empty array for invalid pattern", () => {
    const matches = executeRegex("[unclosed", "g", "test");
    expect(matches).toHaveLength(0);
  });

  it("captures unnamed groups", () => {
    const matches = executeRegex("(\\d+)-(\\w+)", "g", "123-abc");
    expect(matches).toHaveLength(1);
    expect(matches[0].captures).toEqual(["123", "abc"]);
  });

  it("captures named groups", () => {
    const matches = executeRegex("(?<year>\\d{4})-(?<month>\\d{2})", "g", "2024-03");
    expect(matches).toHaveLength(1);
    expect(matches[0].groups).toEqual({ year: "2024", month: "03" });
  });

  it("handles non-global flag (returns first match only)", () => {
    const matches = executeRegex("\\d+", "", "123 456");
    expect(matches).toHaveLength(1);
    expect(matches[0].fullMatch).toBe("123");
  });

  it("handles case-insensitive flag", () => {
    const matches = executeRegex("abc", "gi", "ABC abc Abc");
    expect(matches).toHaveLength(3);
  });

  it("handles multiline flag", () => {
    const matches = executeRegex("^\\d+", "gm", "123\n456\nabc");
    expect(matches).toHaveLength(2);
    expect(matches[0].fullMatch).toBe("123");
    expect(matches[1].fullMatch).toBe("456");
  });

  it("limits matches to prevent ReDoS (max 1000)", () => {
    // A pattern that matches every character position
    const text = "a".repeat(2000);
    const matches = executeRegex("a", "g", text);
    expect(matches).toHaveLength(1000);
  });

  it("handles groups with undefined captures gracefully", () => {
    const matches = executeRegex("(a)(b)?(c)", "g", "ac");
    expect(matches).toHaveLength(1);
    // capture index 1 = undefined (b is optional and missing)
    expect(matches[0].captures).toEqual(["a", "", "c"]);
  });
});

describe("generateHighlightSegments", () => {
  it("returns single non-match segment when no matches", () => {
    const segments = generateHighlightSegments("hello world", []);
    expect(segments).toEqual([{ text: "hello world", isMatch: false }]);
  });

  it("returns empty array for empty text", () => {
    const segments = generateHighlightSegments("", []);
    expect(segments).toEqual([]);
  });

  it("splits text around a single match", () => {
    const matches = executeRegex("world", "g", "hello world foo");
    const segments = generateHighlightSegments("hello world foo", matches);
    expect(segments).toEqual([
      { text: "hello ", isMatch: false },
      { text: "world", isMatch: true, matchIndex: 0 },
      { text: " foo", isMatch: false }
    ]);
  });

  it("handles match at start of text", () => {
    const matches = executeRegex("hello", "g", "hello world");
    const segments = generateHighlightSegments("hello world", matches);
    expect(segments[0]).toEqual({ text: "hello", isMatch: true, matchIndex: 0 });
    expect(segments[1]).toEqual({ text: " world", isMatch: false });
  });

  it("handles match at end of text", () => {
    const matches = executeRegex("world", "g", "hello world");
    const segments = generateHighlightSegments("hello world", matches);
    expect(segments).toHaveLength(2);
    expect(segments[1]).toEqual({ text: "world", isMatch: true, matchIndex: 0 });
  });

  it("handles multiple consecutive matches", () => {
    const matches = executeRegex("\\d", "g", "123");
    const segments = generateHighlightSegments("123", matches);
    expect(segments).toHaveLength(3);
    expect(segments.every((s) => s.isMatch)).toBe(true);
  });

  it("handles entire text as match", () => {
    const matches = executeRegex("^.*$", "g", "hello");
    const segments = generateHighlightSegments("hello", matches);
    expect(segments).toHaveLength(1);
    expect(segments[0]).toEqual({ text: "hello", isMatch: true, matchIndex: 0 });
  });

  it("assigns correct matchIndex for multiple matches", () => {
    const matches = executeRegex("\\w+", "g", "a bb ccc");
    const segments = generateHighlightSegments("a bb ccc", matches);
    const matchSegments = segments.filter((s) => s.isMatch);
    expect(matchSegments).toHaveLength(3);
    expect(matchSegments[0].matchIndex).toBe(0);
    expect(matchSegments[1].matchIndex).toBe(1);
    expect(matchSegments[2].matchIndex).toBe(2);
  });
});
