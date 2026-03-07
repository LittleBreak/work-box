/**
 * UrlParserTab Tests
 *
 * 覆盖：URL 结构分解展示、参数表格渲染、重复参数展示、
 * 单个参数复制、无效 URL 错误提示、空参数提示。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockClipboard = { writeText: vi.fn(() => Promise.resolve()) };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).workbox = { clipboard: mockClipboard };

import { UrlParserTab } from "./UrlParserTab";

describe("UrlParserTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders URL input and parse button", () => {
    render(<UrlParserTab />);
    expect(screen.getByTestId("parser-input")).toBeInTheDocument();
    expect(screen.getByTestId("btn-parse")).toBeInTheDocument();
  });

  it("shows URL structure breakdown after parsing", async () => {
    render(<UrlParserTab />);
    const input = screen.getByTestId("parser-input") as HTMLInputElement;
    await userEvent.clear(input);
    await userEvent.type(input, "https://api.example.com:8080/v1/users?id=1#section");
    await userEvent.click(screen.getByTestId("btn-parse"));

    expect(screen.getByTestId("url-protocol")).toHaveTextContent("https:");
    expect(screen.getByTestId("url-host")).toHaveTextContent("api.example.com:8080");
    expect(screen.getByTestId("url-pathname")).toHaveTextContent("/v1/users");
    expect(screen.getByTestId("url-search")).toHaveTextContent("?id=1");
    expect(screen.getByTestId("url-hash")).toHaveTextContent("#section");
  });

  it("renders parameter table with values", async () => {
    render(<UrlParserTab />);
    const input = screen.getByTestId("parser-input") as HTMLInputElement;
    await userEvent.clear(input);
    await userEvent.type(input, "https://example.com?name=alice&age=30");
    await userEvent.click(screen.getByTestId("btn-parse"));

    expect(screen.getByText("name")).toBeInTheDocument();
    expect(screen.getByText("alice")).toBeInTheDocument();
    expect(screen.getByText("age")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
  });

  it("shows duplicate parameters", async () => {
    render(<UrlParserTab />);
    const input = screen.getByTestId("parser-input") as HTMLInputElement;
    await userEvent.clear(input);
    await userEvent.type(input, "https://example.com?tag=a&tag=b");
    await userEvent.click(screen.getByTestId("btn-parse"));

    const tagCells = screen.getAllByText("tag");
    expect(tagCells.length).toBeGreaterThanOrEqual(2);
  });

  it("shows error for invalid URL", async () => {
    render(<UrlParserTab />);
    const input = screen.getByTestId("parser-input") as HTMLInputElement;
    await userEvent.clear(input);
    await userEvent.type(input, "not-a-url");
    await userEvent.click(screen.getByTestId("btn-parse"));

    expect(screen.getByTestId("parser-error")).toBeInTheDocument();
  });

  it("shows no-params message for URL without query", async () => {
    render(<UrlParserTab />);
    const input = screen.getByTestId("parser-input") as HTMLInputElement;
    await userEvent.clear(input);
    await userEvent.type(input, "https://example.com/path");
    await userEvent.click(screen.getByTestId("btn-parse"));

    expect(screen.getByTestId("no-params")).toBeInTheDocument();
  });

  it("copies single parameter on copy button click", async () => {
    render(<UrlParserTab />);
    const input = screen.getByTestId("parser-input") as HTMLInputElement;
    await userEvent.clear(input);
    await userEvent.type(input, "https://example.com?name=alice");
    await userEvent.click(screen.getByTestId("btn-parse"));
    await userEvent.click(screen.getByTestId("btn-copy-param-0"));

    expect(mockClipboard.writeText).toHaveBeenCalledWith("name=alice");
  });
});
