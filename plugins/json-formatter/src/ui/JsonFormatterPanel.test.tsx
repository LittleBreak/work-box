/**
 * JsonFormatterPanel Tests
 *
 * 验证面板渲染、Tab 标签切换、各模式视图显示。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock clipboard (preserve jsdom window/document)
const mockClipboard = { writeText: vi.fn(() => Promise.resolve()) };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).workbox = { clipboard: mockClipboard };

import JsonFormatterPanel from "./JsonFormatterPanel";
import { useJsonFormatterStore, initialJsonFormatterState } from "./store";

describe("JsonFormatterPanel", () => {
  beforeEach(() => {
    useJsonFormatterStore.setState({ ...initialJsonFormatterState });
    vi.clearAllMocks();
  });

  it("renders the panel container", () => {
    render(<JsonFormatterPanel />);
    expect(screen.getByTestId("json-formatter-panel")).toBeInTheDocument();
  });

  it("renders all five mode tabs", () => {
    render(<JsonFormatterPanel />);
    expect(screen.getByTestId("tab-format")).toBeInTheDocument();
    expect(screen.getByTestId("tab-validate")).toBeInTheDocument();
    expect(screen.getByTestId("tab-convert")).toBeInTheDocument();
    expect(screen.getByTestId("tab-diff")).toBeInTheDocument();
    expect(screen.getByTestId("tab-tree")).toBeInTheDocument();
  });

  it("shows Format view by default", () => {
    render(<JsonFormatterPanel />);
    expect(screen.getByTestId("format-view")).toBeInTheDocument();
  });

  it("switches to Validate view on tab click", async () => {
    render(<JsonFormatterPanel />);
    await userEvent.click(screen.getByTestId("tab-validate"));
    expect(screen.getByTestId("validate-view")).toBeInTheDocument();
    expect(screen.queryByTestId("format-view")).not.toBeInTheDocument();
  });

  it("switches to Convert view on tab click", async () => {
    render(<JsonFormatterPanel />);
    await userEvent.click(screen.getByTestId("tab-convert"));
    expect(screen.getByTestId("convert-view")).toBeInTheDocument();
  });

  it("switches to Diff view on tab click", async () => {
    render(<JsonFormatterPanel />);
    await userEvent.click(screen.getByTestId("tab-diff"));
    expect(screen.getByTestId("diff-view")).toBeInTheDocument();
  });

  it("switches to Tree view on tab click", async () => {
    render(<JsonFormatterPanel />);
    await userEvent.click(screen.getByTestId("tab-tree"));
    expect(screen.getByTestId("tree-view")).toBeInTheDocument();
  });

  it("Format view has format and compress buttons", () => {
    render(<JsonFormatterPanel />);
    expect(screen.getByTestId("btn-format")).toBeInTheDocument();
    expect(screen.getByTestId("btn-compress")).toBeInTheDocument();
  });

  it("Format view formats JSON on button click", async () => {
    // Set input via store (userEvent.type treats { as special key)
    useJsonFormatterStore.setState({ formatInput: '{"a":1}' });
    render(<JsonFormatterPanel />);

    await userEvent.click(screen.getByTestId("btn-format"));

    const output = screen.getByTestId("format-output") as HTMLTextAreaElement;
    expect(output.value).toContain('"a": 1');
  });

  it("Validate view shows valid indicator for valid JSON", async () => {
    useJsonFormatterStore.setState({ validateInput: '{"key":"value"}' });
    render(<JsonFormatterPanel />);
    await userEvent.click(screen.getByTestId("tab-validate"));

    await userEvent.click(screen.getByTestId("btn-validate"));

    expect(screen.getByTestId("validation-indicator")).toHaveTextContent("Valid JSON");
  });

  it("Validate view shows error for invalid JSON", async () => {
    useJsonFormatterStore.setState({ validateInput: "{bad" });
    render(<JsonFormatterPanel />);
    await userEvent.click(screen.getByTestId("tab-validate"));

    await userEvent.click(screen.getByTestId("btn-validate"));

    expect(screen.getByTestId("validation-indicator")).toHaveTextContent("Invalid JSON");
    expect(screen.getByTestId("validation-error")).toBeInTheDocument();
  });

  it("Convert view has direction toggle button", async () => {
    render(<JsonFormatterPanel />);
    await userEvent.click(screen.getByTestId("tab-convert"));
    expect(screen.getByTestId("btn-toggle-direction")).toBeInTheDocument();
  });

  it("Diff view has diff button and two inputs", async () => {
    render(<JsonFormatterPanel />);
    await userEvent.click(screen.getByTestId("tab-diff"));
    expect(screen.getByTestId("btn-diff")).toBeInTheDocument();
    expect(screen.getByTestId("diff-left-input")).toBeInTheDocument();
    expect(screen.getByTestId("diff-right-input")).toBeInTheDocument();
  });

  it("Tree view has parse button and input", async () => {
    render(<JsonFormatterPanel />);
    await userEvent.click(screen.getByTestId("tab-tree"));
    expect(screen.getByTestId("btn-parse-tree")).toBeInTheDocument();
    expect(screen.getByTestId("tree-input")).toBeInTheDocument();
  });
});
