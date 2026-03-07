/**
 * AI Tools Tests
 *
 * 覆盖：url_encode tool handler（编码/解码、完整 URL/组件模式）、
 * url_parse tool handler（返回结构化参数信息、错误输入处理）。
 */
import { describe, it, expect } from "vitest";
import { handleUrlEncode, handleUrlParse } from "./ai-tools";

describe("handleUrlEncode", () => {
  it("should encode full URL by default", async () => {
    const result = await handleUrlEncode({
      input: "https://example.com/路径",
      action: "encode"
    });
    expect(result).toEqual({
      output: "https://example.com/%E8%B7%AF%E5%BE%84"
    });
  });

  it("should decode full URL", async () => {
    const result = await handleUrlEncode({
      input: "https://example.com/%E8%B7%AF%E5%BE%84",
      action: "decode"
    });
    expect(result).toEqual({
      output: "https://example.com/路径"
    });
  });

  it("should encode component when mode is component", async () => {
    const result = await handleUrlEncode({
      input: "hello world&foo=bar",
      action: "encode",
      mode: "component"
    });
    expect(result).toEqual({
      output: "hello%20world%26foo%3Dbar"
    });
  });

  it("should decode component when mode is component", async () => {
    const result = await handleUrlEncode({
      input: "hello%20world%26foo%3Dbar",
      action: "decode",
      mode: "component"
    });
    expect(result).toEqual({
      output: "hello world&foo=bar"
    });
  });

  it("should return error for invalid decode input", async () => {
    const result = await handleUrlEncode({
      input: "%ZZ",
      action: "decode"
    });
    expect(result).toHaveProperty("error");
  });
});

describe("handleUrlParse", () => {
  it("should return structured URL info", async () => {
    const result = await handleUrlParse({
      url: "https://example.com/path?name=alice&age=30#section"
    });
    expect(result).toEqual({
      protocol: "https:",
      host: "example.com",
      pathname: "/path",
      search: "?name=alice&age=30",
      hash: "#section",
      params: [
        { key: "name", value: "alice" },
        { key: "age", value: "30" }
      ]
    });
  });

  it("should handle duplicate parameters", async () => {
    const result = await handleUrlParse({
      url: "https://example.com?tag=a&tag=b"
    });
    expect(result.params).toEqual([
      { key: "tag", value: "a" },
      { key: "tag", value: "b" }
    ]);
  });

  it("should return error for invalid URL", async () => {
    const result = await handleUrlParse({ url: "not-a-url" });
    expect(result).toHaveProperty("error");
  });
});
