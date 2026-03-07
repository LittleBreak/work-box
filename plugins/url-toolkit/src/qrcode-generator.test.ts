/**
 * QR Code Generator Tests
 *
 * 覆盖：正常 URL 生成 Data URL、空输入返回 null、
 * 超长 URL 标记警告、不同尺寸参数。
 */
import { describe, it, expect } from "vitest";
import { generateQrCode } from "./qrcode-generator";

describe("generateQrCode", () => {
  it("should generate a data URL for a normal URL", async () => {
    const result = await generateQrCode("https://example.com");
    expect(result.dataUrl).toMatch(/^data:image\/png;base64,/);
    expect(result.warning).toBeUndefined();
  });

  it("should return null dataUrl for empty input", async () => {
    const result = await generateQrCode("");
    expect(result.dataUrl).toBeNull();
  });

  it("should include warning for URL longer than 2000 characters", async () => {
    const longUrl = "https://example.com?" + "a".repeat(2001);
    const result = await generateQrCode(longUrl);
    expect(result.dataUrl).toMatch(/^data:image\/png;base64,/);
    expect(result.warning).toBeDefined();
  });

  it("should generate different sizes (128px)", async () => {
    const result = await generateQrCode("https://example.com", 128);
    expect(result.dataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it("should generate different sizes (256px)", async () => {
    const result = await generateQrCode("https://example.com", 256);
    expect(result.dataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it("should generate different sizes (512px)", async () => {
    const result = await generateQrCode("https://example.com", 512);
    expect(result.dataUrl).toMatch(/^data:image\/png;base64,/);
  });
});
