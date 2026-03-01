import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DiffViewer } from "./DiffViewer";
import type { GitFileDiff } from "../constants";

describe("DiffViewer", () => {
  it("没有 diff 数据时显示占位提示", () => {
    render(<DiffViewer diff={null} />);
    expect(screen.getByTestId("diff-empty")).toBeInTheDocument();
    expect(screen.getByText("选择文件以查看差异")).toBeInTheDocument();
  });

  it("没有 hunks 时显示无差异提示", () => {
    const diff: GitFileDiff = { filePath: "test.ts", hunks: [] };
    render(<DiffViewer diff={diff} />);
    expect(screen.getByTestId("diff-no-changes")).toBeInTheDocument();
  });

  it("正确渲染 diff 文件路径", () => {
    const diff: GitFileDiff = {
      filePath: "src/index.ts",
      hunks: [
        {
          oldStart: 1,
          oldCount: 1,
          newStart: 1,
          newCount: 1,
          lines: [{ type: "context", content: "line 1" }]
        }
      ]
    };
    render(<DiffViewer diff={diff} />);
    expect(screen.getByText("src/index.ts")).toBeInTheDocument();
  });

  it("正确渲染 hunk header", () => {
    const diff: GitFileDiff = {
      filePath: "test.ts",
      hunks: [
        {
          oldStart: 5,
          oldCount: 3,
          newStart: 5,
          newCount: 4,
          lines: [{ type: "context", content: "x" }]
        }
      ]
    };
    render(<DiffViewer diff={diff} />);
    expect(screen.getByTestId("hunk-header")).toHaveTextContent("@@ -5,3 +5,4 @@");
  });

  it("渲染添加行（绿色）", () => {
    const diff: GitFileDiff = {
      filePath: "test.ts",
      hunks: [
        {
          oldStart: 1,
          oldCount: 0,
          newStart: 1,
          newCount: 1,
          lines: [{ type: "add", content: "new line" }]
        }
      ]
    };
    render(<DiffViewer diff={diff} />);

    const addLines = screen.getAllByTestId("diff-line-add");
    expect(addLines).toHaveLength(1);
    expect(addLines[0]).toHaveTextContent("+new line");
  });

  it("渲染删除行（红色）", () => {
    const diff: GitFileDiff = {
      filePath: "test.ts",
      hunks: [
        {
          oldStart: 1,
          oldCount: 1,
          newStart: 1,
          newCount: 0,
          lines: [{ type: "remove", content: "old line" }]
        }
      ]
    };
    render(<DiffViewer diff={diff} />);

    const removeLines = screen.getAllByTestId("diff-line-remove");
    expect(removeLines).toHaveLength(1);
    expect(removeLines[0]).toHaveTextContent("-old line");
  });

  it("渲染上下文行", () => {
    const diff: GitFileDiff = {
      filePath: "test.ts",
      hunks: [
        {
          oldStart: 1,
          oldCount: 1,
          newStart: 1,
          newCount: 1,
          lines: [{ type: "context", content: "unchanged" }]
        }
      ]
    };
    render(<DiffViewer diff={diff} />);

    const contextLines = screen.getAllByTestId("diff-line-context");
    expect(contextLines).toHaveLength(1);
    expect(contextLines[0]).toHaveTextContent("unchanged");
  });

  it("渲染多个 hunk", () => {
    const diff: GitFileDiff = {
      filePath: "test.ts",
      hunks: [
        {
          oldStart: 1,
          oldCount: 1,
          newStart: 1,
          newCount: 1,
          lines: [{ type: "context", content: "first" }]
        },
        {
          oldStart: 10,
          oldCount: 1,
          newStart: 10,
          newCount: 2,
          lines: [
            { type: "context", content: "second" },
            { type: "add", content: "added" }
          ]
        }
      ]
    };
    render(<DiffViewer diff={diff} />);

    const headers = screen.getAllByTestId("hunk-header");
    expect(headers).toHaveLength(2);
  });

  it("混合添加、删除、上下文行的完整 diff", () => {
    const diff: GitFileDiff = {
      filePath: "src/app.ts",
      hunks: [
        {
          oldStart: 1,
          oldCount: 3,
          newStart: 1,
          newCount: 4,
          lines: [
            { type: "context", content: "import React from 'react';" },
            { type: "remove", content: "const old = true;" },
            { type: "add", content: "const updated = true;" },
            { type: "add", content: "const extra = false;" },
            { type: "context", content: "export default App;" }
          ]
        }
      ]
    };
    render(<DiffViewer diff={diff} />);

    expect(screen.getByTestId("diff-viewer")).toBeInTheDocument();
    expect(screen.getAllByTestId("diff-line-context")).toHaveLength(2);
    expect(screen.getAllByTestId("diff-line-add")).toHaveLength(2);
    expect(screen.getAllByTestId("diff-line-remove")).toHaveLength(1);
  });
});
