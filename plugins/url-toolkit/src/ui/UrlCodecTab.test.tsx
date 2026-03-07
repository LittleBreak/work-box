/**
 * UrlCodecTab Tests
 *
 * 覆盖：输入框渲染、模式切换、编码/解码按钮、复制功能、错误提示。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockClipboard = { writeText: vi.fn(() => Promise.resolve()) };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).workbox = { clipboard: mockClipboard };

import { UrlCodecTab } from "./UrlCodecTab";

describe("UrlCodecTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders input and output textareas", () => {
    render(<UrlCodecTab />);
    expect(screen.getByTestId("codec-input")).toBeInTheDocument();
    expect(screen.getByTestId("codec-output")).toBeInTheDocument();
  });

  it("renders encode and decode buttons", () => {
    render(<UrlCodecTab />);
    expect(screen.getByTestId("btn-encode")).toBeInTheDocument();
    expect(screen.getByTestId("btn-decode")).toBeInTheDocument();
  });

  it("renders mode toggle (full URL / component)", () => {
    render(<UrlCodecTab />);
    expect(screen.getByTestId("mode-full")).toBeInTheDocument();
    expect(screen.getByTestId("mode-component")).toBeInTheDocument();
  });

  it("encodes input in full URL mode by default", async () => {
    render(<UrlCodecTab />);
    const input = screen.getByTestId("codec-input") as HTMLTextAreaElement;
    await userEvent.clear(input);
    await userEvent.type(input, "https://example.com/路径");
    await userEvent.click(screen.getByTestId("btn-encode"));

    const output = screen.getByTestId("codec-output") as HTMLTextAreaElement;
    expect(output.value).toContain("%E8%B7%AF%E5%BE%84");
  });

  it("decodes input in full URL mode", async () => {
    render(<UrlCodecTab />);
    const input = screen.getByTestId("codec-input") as HTMLTextAreaElement;
    await userEvent.clear(input);
    await userEvent.type(input, "https://example.com/%E8%B7%AF%E5%BE%84");
    await userEvent.click(screen.getByTestId("btn-decode"));

    const output = screen.getByTestId("codec-output") as HTMLTextAreaElement;
    expect(output.value).toContain("路径");
  });

  it("encodes input in component mode", async () => {
    render(<UrlCodecTab />);
    await userEvent.click(screen.getByTestId("mode-component"));

    const input = screen.getByTestId("codec-input") as HTMLTextAreaElement;
    await userEvent.clear(input);
    await userEvent.type(input, "hello world");
    await userEvent.click(screen.getByTestId("btn-encode"));

    const output = screen.getByTestId("codec-output") as HTMLTextAreaElement;
    expect(output.value).toBe("hello%20world");
  });

  it("shows error on invalid decode", async () => {
    render(<UrlCodecTab />);
    const input = screen.getByTestId("codec-input") as HTMLTextAreaElement;
    await userEvent.clear(input);
    await userEvent.type(input, "%ZZ");
    await userEvent.click(screen.getByTestId("btn-decode"));

    expect(screen.getByTestId("codec-error")).toBeInTheDocument();
  });

  it("renders copy button and copies output", async () => {
    render(<UrlCodecTab />);
    const input = screen.getByTestId("codec-input") as HTMLTextAreaElement;
    await userEvent.clear(input);
    await userEvent.type(input, "hello");
    await userEvent.click(screen.getByTestId("btn-encode"));
    await userEvent.click(screen.getByTestId("btn-copy"));

    expect(mockClipboard.writeText).toHaveBeenCalled();
  });
});
