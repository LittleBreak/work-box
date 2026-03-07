/**
 * URL Parser Tests
 *
 * 覆盖：标准 URL 解析、query 参数提取、重复参数名、
 * 编码参数自动解码、无参数 URL、无效 URL 错误处理。
 */
import { describe, it, expect } from "vitest";
import { parseUrl } from "./url-parser";

describe("parseUrl", () => {
  it("should parse standard URL structure", () => {
    const result = parseUrl("https://api.example.com:8080/v1/users?id=1#section");
    expect(result.protocol).toBe("https:");
    expect(result.host).toBe("api.example.com:8080");
    expect(result.pathname).toBe("/v1/users");
    expect(result.search).toBe("?id=1");
    expect(result.hash).toBe("#section");
  });

  it("should extract query parameters", () => {
    const result = parseUrl("https://example.com/path?name=alice&age=30&city=beijing");
    expect(result.params).toEqual([
      { key: "name", value: "alice" },
      { key: "age", value: "30" },
      { key: "city", value: "beijing" }
    ]);
  });

  it("should handle duplicate parameter names", () => {
    const result = parseUrl("https://example.com?tag=a&tag=b&tag=c");
    const tagParams = result.params.filter((p) => p.key === "tag");
    expect(tagParams).toHaveLength(3);
    expect(tagParams.map((p) => p.value)).toEqual(["a", "b", "c"]);
  });

  it("should auto-decode encoded parameter names and values", () => {
    const result = parseUrl("https://example.com?%E5%90%8D%E7%A7%B0=%E5%BC%A0%E4%B8%89");
    expect(result.params).toEqual([{ key: "名称", value: "张三" }]);
  });

  it("should return empty params array for URL without query", () => {
    const result = parseUrl("https://example.com/path");
    expect(result.params).toEqual([]);
  });

  it("should throw on invalid URL", () => {
    expect(() => parseUrl("not-a-url")).toThrow();
  });

  it("should handle URL with empty query value", () => {
    const result = parseUrl("https://example.com?key=");
    expect(result.params).toEqual([{ key: "key", value: "" }]);
  });

  it("should handle URL with hash only (no query)", () => {
    const result = parseUrl("https://example.com#section");
    expect(result.params).toEqual([]);
    expect(result.hash).toBe("#section");
  });
});
