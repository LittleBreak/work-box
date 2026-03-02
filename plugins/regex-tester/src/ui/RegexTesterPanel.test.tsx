/**
 * RegexTesterPanel Tests
 *
 * 验证面板渲染、正则输入、Flag 切换、模板选择、匹配高亮和匹配详情。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock clipboard (preserve jsdom window/document)
const mockClipboard = { writeText: vi.fn(() => Promise.resolve()) };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).workbox = { clipboard: mockClipboard };

import RegexTesterPanel from "./RegexTesterPanel.tsx";
import { useRegexTesterStore, initialRegexTesterState } from "./store.ts";

describe("RegexTesterPanel", () => {
  beforeEach(() => {
    useRegexTesterStore.setState({ ...initialRegexTesterState });
    vi.clearAllMocks();
  });

  it("renders the panel container", () => {
    render(<RegexTesterPanel />);
    expect(screen.getByTestId("regex-tester-panel")).toBeInTheDocument();
  });

  it("renders regex input field", () => {
    render(<RegexTesterPanel />);
    expect(screen.getByTestId("regex-input")).toBeInTheDocument();
  });

  it("renders test text input field", () => {
    render(<RegexTesterPanel />);
    expect(screen.getByTestId("test-text-input")).toBeInTheDocument();
  });

  it("renders flag toggle buttons", () => {
    render(<RegexTesterPanel />);
    expect(screen.getByTestId("flag-g")).toBeInTheDocument();
    expect(screen.getByTestId("flag-i")).toBeInTheDocument();
    expect(screen.getByTestId("flag-m")).toBeInTheDocument();
    expect(screen.getByTestId("flag-s")).toBeInTheDocument();
    expect(screen.getByTestId("flag-u")).toBeInTheDocument();
  });

  it("renders template selector", () => {
    render(<RegexTesterPanel />);
    expect(screen.getByTestId("template-selector")).toBeInTheDocument();
  });

  it("renders match highlight area", () => {
    render(<RegexTesterPanel />);
    expect(screen.getByTestId("match-highlight")).toBeInTheDocument();
  });

  it("renders match details area", () => {
    render(<RegexTesterPanel />);
    expect(screen.getByTestId("match-details")).toBeInTheDocument();
  });

  it("renders copy regex button", () => {
    render(<RegexTesterPanel />);
    expect(screen.getByTestId("btn-copy-regex")).toBeInTheDocument();
  });

  it("toggles flag on click", async () => {
    render(<RegexTesterPanel />);
    const flagI = screen.getByTestId("flag-i");

    // Initially "g" only, so "i" is off
    await userEvent.click(flagI);
    expect(useRegexTesterStore.getState().flags).toContain("i");
  });

  it("displays match count after execution", () => {
    useRegexTesterStore.setState({
      pattern: "\\d+",
      flags: "g",
      testText: "abc 123 def 456"
    });
    useRegexTesterStore.getState().execute();
    render(<RegexTesterPanel />);
    expect(screen.getByTestId("match-count")).toHaveTextContent("2");
  });

  it("displays error message for invalid regex", () => {
    useRegexTesterStore.setState({
      pattern: "[unclosed",
      flags: "g",
      testText: "test"
    });
    useRegexTesterStore.getState().execute();
    render(<RegexTesterPanel />);
    expect(screen.getByTestId("regex-error")).toBeInTheDocument();
  });

  it("shows no error for valid regex", () => {
    useRegexTesterStore.setState({
      pattern: "\\d+",
      flags: "g",
      testText: "123"
    });
    useRegexTesterStore.getState().execute();
    render(<RegexTesterPanel />);
    expect(screen.queryByTestId("regex-error")).not.toBeInTheDocument();
  });

  it("displays highlight segments when matches exist", () => {
    useRegexTesterStore.setState({
      pattern: "\\d+",
      flags: "g",
      testText: "abc 123 def"
    });
    useRegexTesterStore.getState().execute();
    render(<RegexTesterPanel />);
    const highlighted = screen.getAllByTestId("highlight-match");
    expect(highlighted).toHaveLength(1);
    expect(highlighted[0].textContent).toBe("123");
  });

  it("displays match details with captures", () => {
    useRegexTesterStore.setState({
      pattern: "(\\d+)-(\\w+)",
      flags: "g",
      testText: "123-abc"
    });
    useRegexTesterStore.getState().execute();
    render(<RegexTesterPanel />);
    expect(screen.getByTestId("match-detail-0")).toBeInTheDocument();
  });
});
