/**
 * TreeView Tests
 *
 * 验证 TreeView 递归渲染：展开/折叠节点、类型标签、值显示。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock clipboard (preserve jsdom window/document)
const mockClipboard = { writeText: vi.fn(() => Promise.resolve()) };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).workbox = { clipboard: mockClipboard };

import { TreeView } from "./TreeView";
import { useJsonFormatterStore, initialJsonFormatterState } from "./store";

describe("TreeView", () => {
  beforeEach(() => {
    useJsonFormatterStore.setState({ ...initialJsonFormatterState });
    vi.clearAllMocks();
  });

  it("renders tree-view container", () => {
    render(<TreeView />);
    expect(screen.getByTestId("tree-view")).toBeInTheDocument();
  });

  it("shows placeholder when no data parsed", () => {
    render(<TreeView />);
    expect(screen.getByText("Click Parse to visualize JSON")).toBeInTheDocument();
  });

  it("renders parsed object with correct keys", () => {
    useJsonFormatterStore.setState({
      treeData: { name: "Alice", age: 30 }
    });
    render(<TreeView />);

    expect(screen.getByText("name")).toBeInTheDocument();
    expect(screen.getByText("age")).toBeInTheDocument();
  });

  it("shows type labels for primitive values", () => {
    useJsonFormatterStore.setState({
      treeData: { str: "hello", num: 42, bool: true, nil: null }
    });
    render(<TreeView />);

    const types = screen.getAllByTestId("tree-type");
    const typeTexts = types.map((el) => el.textContent);
    expect(typeTexts).toContain("string");
    expect(typeTexts).toContain("number");
    expect(typeTexts).toContain("boolean");
    expect(typeTexts).toContain("null");
  });

  it("shows leaf values for primitives", () => {
    useJsonFormatterStore.setState({
      treeData: { greeting: "hello" }
    });
    render(<TreeView />);

    const values = screen.getAllByTestId("tree-value");
    expect(values.some((v) => v.textContent === '"hello"')).toBe(true);
  });

  it("renders nested objects with expand/collapse toggles", () => {
    useJsonFormatterStore.setState({
      treeData: { user: { name: "Alice" } }
    });
    render(<TreeView />);

    // First level expanded by default
    const toggles = screen.getAllByTestId("tree-toggle");
    expect(toggles.length).toBeGreaterThanOrEqual(1);
  });

  it("collapses nested node on toggle click", async () => {
    useJsonFormatterStore.setState({
      treeData: { user: { name: "Alice" } }
    });
    render(<TreeView />);

    // "user" node is expanded at first level → shows "name"
    expect(screen.getByText("name")).toBeInTheDocument();

    // Click toggle on "user" node to collapse
    const toggles = screen.getAllByTestId("tree-toggle");
    await userEvent.click(toggles[0]);

    // After collapse, "name" should no longer be visible
    expect(screen.queryByText("name")).not.toBeInTheDocument();
  });

  it("renders arrays with index keys", () => {
    useJsonFormatterStore.setState({
      treeData: { items: [10, 20, 30] }
    });
    render(<TreeView />);

    // Array type label
    const types = screen.getAllByTestId("tree-type");
    expect(types.some((t) => t.textContent?.includes("array"))).toBe(true);
  });

  it("shows error message when tree parsing fails", () => {
    useJsonFormatterStore.setState({
      treeError: "Unexpected token"
    });
    render(<TreeView />);

    expect(screen.getByTestId("tree-error-msg")).toHaveTextContent("Unexpected token");
  });

  it("has parse button", () => {
    render(<TreeView />);
    expect(screen.getByTestId("btn-parse-tree")).toBeInTheDocument();
  });

  it("has input textarea", () => {
    render(<TreeView />);
    expect(screen.getByTestId("tree-input")).toBeInTheDocument();
  });
});
