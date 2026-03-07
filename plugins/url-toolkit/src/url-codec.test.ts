/**
 * URL Codec Tests
 *
 * 覆盖 encodeFullUrl / decodeFullUrl / encodeComponent / decodeComponent
 * 正常路径、中文及特殊字符、无效编码序列、空输入边界。
 */
import { describe, it, expect } from "vitest";
import { encodeFullUrl, decodeFullUrl, encodeComponent, decodeComponent } from "./url-codec";

// ============================================================
// encodeFullUrl
// ============================================================
describe("encodeFullUrl", () => {
  it("should encode Chinese characters in URL", () => {
    const input = "https://example.com/路径?名称=值";
    const result = encodeFullUrl(input);
    expect(result).toBe("https://example.com/%E8%B7%AF%E5%BE%84?%E5%90%8D%E7%A7%B0=%E5%80%BC");
  });

  it("should preserve already valid URL characters", () => {
    const input = "https://example.com/path?key=value&foo=bar";
    const result = encodeFullUrl(input);
    expect(result).toBe(input);
  });

  it("should encode spaces as %20", () => {
    const input = "https://example.com/my path";
    const result = encodeFullUrl(input);
    expect(result).toContain("%20");
    expect(result).not.toContain(" ");
  });

  it("should handle empty input", () => {
    expect(encodeFullUrl("")).toBe("");
  });

  it("should encode already-encoded URL (no double-encoding detection)", () => {
    const input = "https://example.com/%E4%B8%AD%E6%96%87";
    const result = encodeFullUrl(input);
    // encodeURI encodes the % character, resulting in double encoding
    expect(result).toBe("https://example.com/%25E4%25B8%25AD%25E6%2596%2587");
  });
});

// ============================================================
// decodeFullUrl
// ============================================================
describe("decodeFullUrl", () => {
  it("should decode percent-encoded URL", () => {
    const input = "https://example.com/%E8%B7%AF%E5%BE%84?%E5%90%8D%E7%A7%B0=%E5%80%BC";
    const result = decodeFullUrl(input);
    expect(result).toBe("https://example.com/路径?名称=值");
  });

  it("should return the same string if nothing to decode", () => {
    const input = "https://example.com/path";
    expect(decodeFullUrl(input)).toBe(input);
  });

  it("should handle empty input", () => {
    expect(decodeFullUrl("")).toBe("");
  });

  it("should throw on invalid encoding sequence", () => {
    expect(() => decodeFullUrl("https://example.com/%ZZ")).toThrow();
  });
});

// ============================================================
// encodeComponent
// ============================================================
describe("encodeComponent", () => {
  it("should encode special characters", () => {
    const input = "hello world&foo=bar";
    const result = encodeComponent(input);
    expect(result).toBe("hello%20world%26foo%3Dbar");
  });

  it("should encode Chinese characters", () => {
    const input = "你好";
    const result = encodeComponent(input);
    expect(result).toBe("%E4%BD%A0%E5%A5%BD");
  });

  it("should not encode unreserved characters", () => {
    const input = "abc123-_.~";
    expect(encodeComponent(input)).toBe(input);
  });

  it("should handle empty input", () => {
    expect(encodeComponent("")).toBe("");
  });
});

// ============================================================
// decodeComponent
// ============================================================
describe("decodeComponent", () => {
  it("should decode encoded component", () => {
    const input = "hello%20world%26foo%3Dbar";
    expect(decodeComponent(input)).toBe("hello world&foo=bar");
  });

  it("should decode Chinese characters", () => {
    const input = "%E4%BD%A0%E5%A5%BD";
    expect(decodeComponent(input)).toBe("你好");
  });

  it("should handle empty input", () => {
    expect(decodeComponent("")).toBe("");
  });

  it("should throw on invalid encoding sequence", () => {
    expect(() => decodeComponent("%ZZ")).toThrow();
  });
});
