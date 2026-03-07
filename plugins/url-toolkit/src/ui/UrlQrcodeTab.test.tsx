/**
 * UrlQrcodeTab Tests
 *
 * 覆盖：二维码图片渲染、空输入引导提示、超长 URL 警告、
 * 尺寸选项切换、下载按钮触发。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock qrcode-generator module
vi.mock("../qrcode-generator.ts", () => ({
  generateQrCode: vi.fn(async (url: string) => {
    if (!url) return { dataUrl: null };
    if (url.length > 2000) {
      return {
        dataUrl: "data:image/png;base64,mock",
        warning: "URL 过长，二维码可能难以扫描"
      };
    }
    return { dataUrl: "data:image/png;base64,mock" };
  })
}));

import { UrlQrcodeTab } from "./UrlQrcodeTab";

describe("UrlQrcodeTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders input and shows empty prompt when no URL", () => {
    render(<UrlQrcodeTab />);
    expect(screen.getByTestId("qrcode-input")).toBeInTheDocument();
    expect(screen.getByTestId("qrcode-empty")).toBeInTheDocument();
  });

  it("renders QR code image after entering URL and clicking generate", async () => {
    render(<UrlQrcodeTab />);
    const input = screen.getByTestId("qrcode-input") as HTMLInputElement;
    await userEvent.clear(input);
    await userEvent.type(input, "https://example.com");
    await userEvent.click(screen.getByTestId("btn-generate"));

    await waitFor(() => {
      expect(screen.getByTestId("qrcode-image")).toBeInTheDocument();
    });
  });

  it("shows warning for long URL", async () => {
    render(<UrlQrcodeTab />);
    const input = screen.getByTestId("qrcode-input") as HTMLInputElement;
    await userEvent.clear(input);
    const longUrl = "https://example.com?" + "a".repeat(2001);
    await userEvent.type(input, longUrl);
    await userEvent.click(screen.getByTestId("btn-generate"));

    await waitFor(() => {
      expect(screen.getByTestId("qrcode-warning")).toBeInTheDocument();
    });
  });

  it("renders size options", () => {
    render(<UrlQrcodeTab />);
    expect(screen.getByTestId("size-128")).toBeInTheDocument();
    expect(screen.getByTestId("size-256")).toBeInTheDocument();
    expect(screen.getByTestId("size-512")).toBeInTheDocument();
  });

  it("switches size option on click", async () => {
    render(<UrlQrcodeTab />);
    const btn512 = screen.getByTestId("size-512");
    await userEvent.click(btn512);
    // 256 is default, 512 should now be active
    expect(btn512.className).toContain("bg-blue-500");
  });

  it("renders download button when QR code is generated", async () => {
    render(<UrlQrcodeTab />);
    const input = screen.getByTestId("qrcode-input") as HTMLInputElement;
    await userEvent.clear(input);
    await userEvent.type(input, "https://example.com");
    await userEvent.click(screen.getByTestId("btn-generate"));

    await waitFor(() => {
      expect(screen.getByTestId("btn-download")).toBeInTheDocument();
    });
  });

  it("triggers download on button click", async () => {
    const clickMock = vi.fn();
    HTMLAnchorElement.prototype.click = clickMock;

    render(<UrlQrcodeTab />);
    const input = screen.getByTestId("qrcode-input") as HTMLInputElement;
    await userEvent.clear(input);
    await userEvent.type(input, "https://example.com");
    await userEvent.click(screen.getByTestId("btn-generate"));

    await waitFor(() => {
      expect(screen.getByTestId("btn-download")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId("btn-download"));
    expect(clickMock).toHaveBeenCalled();

    vi.restoreAllMocks();
  });
});
