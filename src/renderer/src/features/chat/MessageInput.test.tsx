import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MessageInput } from "./MessageInput";
import type { Attachment } from "./store";

describe("MessageInput", () => {
  // 正常路径：渲染输入框
  it("渲染文本输入区域", () => {
    render(
      <MessageInput
        onSend={vi.fn()}
        disabled={false}
        attachments={[]}
        onAddAttachment={vi.fn()}
        onRemoveAttachment={vi.fn()}
      />
    );
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  // 正常路径：输入文本
  it("可以输入文本", () => {
    render(
      <MessageInput
        onSend={vi.fn()}
        disabled={false}
        attachments={[]}
        onAddAttachment={vi.fn()}
        onRemoveAttachment={vi.fn()}
      />
    );
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Hello" } });
    expect(textarea).toHaveValue("Hello");
  });

  // 正常路径：发送按钮
  it("渲染发送按钮", () => {
    render(
      <MessageInput
        onSend={vi.fn()}
        disabled={false}
        attachments={[]}
        onAddAttachment={vi.fn()}
        onRemoveAttachment={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /发送|send/i })).toBeInTheDocument();
  });

  // 正常路径：streaming 时禁用输入
  it("disabled 为 true 时输入框和按钮禁用", () => {
    render(
      <MessageInput
        onSend={vi.fn()}
        disabled={true}
        attachments={[]}
        onAddAttachment={vi.fn()}
        onRemoveAttachment={vi.fn()}
      />
    );
    expect(screen.getByRole("textbox")).toBeDisabled();
    expect(screen.getByRole("button", { name: /发送|send/i })).toBeDisabled();
  });

  // ---- 附件相关 ----

  // 正常路径：渲染附件按钮
  it("渲染附件按钮", () => {
    render(
      <MessageInput
        onSend={vi.fn()}
        disabled={false}
        attachments={[]}
        onAddAttachment={vi.fn()}
        onRemoveAttachment={vi.fn()}
      />
    );
    expect(screen.getByTitle("添加附件")).toBeInTheDocument();
  });

  // 正常路径：显示附件预览列表
  it("显示附件预览列表", () => {
    const attachments: Attachment[] = [
      { id: "att-1", fileName: "main.ts", filePath: "/main.ts", fileSize: 2048, content: "code" },
      { id: "att-2", fileName: "utils.ts", filePath: "/utils.ts", fileSize: 512, content: "utils" }
    ];
    render(
      <MessageInput
        onSend={vi.fn()}
        disabled={false}
        attachments={attachments}
        onAddAttachment={vi.fn()}
        onRemoveAttachment={vi.fn()}
      />
    );
    expect(screen.getByText("main.ts")).toBeInTheDocument();
    expect(screen.getByText("utils.ts")).toBeInTheDocument();
  });

  // 正常路径：附件预览显示文件大小
  it("附件预览显示文件大小", () => {
    const attachments: Attachment[] = [
      { id: "att-1", fileName: "main.ts", filePath: "/main.ts", fileSize: 2048, content: "code" }
    ];
    render(
      <MessageInput
        onSend={vi.fn()}
        disabled={false}
        attachments={attachments}
        onAddAttachment={vi.fn()}
        onRemoveAttachment={vi.fn()}
      />
    );
    expect(screen.getByText("2.0 KB")).toBeInTheDocument();
  });

  // 正常路径：点击删除按钮调用 onRemoveAttachment
  it("点击附件删除按钮调用 onRemoveAttachment", () => {
    const onRemoveAttachment = vi.fn();
    const attachments: Attachment[] = [
      { id: "att-1", fileName: "main.ts", filePath: "/main.ts", fileSize: 2048, content: "code" }
    ];
    render(
      <MessageInput
        onSend={vi.fn()}
        disabled={false}
        attachments={attachments}
        onAddAttachment={vi.fn()}
        onRemoveAttachment={onRemoveAttachment}
      />
    );
    const deleteBtn = screen.getByTitle("移除 main.ts");
    fireEvent.click(deleteBtn);
    expect(onRemoveAttachment).toHaveBeenCalledWith("att-1");
  });

  // 正常路径：拖拽文件到输入区域
  it("拖拽文件触发 onAddAttachment", async () => {
    const onAddAttachment = vi.fn();
    render(
      <MessageInput
        onSend={vi.fn()}
        disabled={false}
        attachments={[]}
        onAddAttachment={onAddAttachment}
        onRemoveAttachment={vi.fn()}
      />
    );

    const dropZone = screen.getByTestId("message-input-area");

    // 模拟 drag over
    fireEvent.dragOver(dropZone, {
      dataTransfer: { types: ["Files"] }
    });

    // 模拟 drop with File
    const file = new File(["console.log('hello')"], "test.ts", { type: "text/plain" });
    Object.defineProperty(file, "path", { value: "/path/to/test.ts" });

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file],
        types: ["Files"]
      }
    });

    // FileReader.readAsText is async
    await waitFor(() => {
      expect(onAddAttachment).toHaveBeenCalledWith(
        expect.objectContaining({
          fileName: "test.ts",
          filePath: "/path/to/test.ts"
        })
      );
    });
  });

  // 边界条件：拖拽大文件（>100KB）不添加附件
  it("拖拽超过 100KB 的文件不添加附件", () => {
    const onAddAttachment = vi.fn();
    render(
      <MessageInput
        onSend={vi.fn()}
        disabled={false}
        attachments={[]}
        onAddAttachment={onAddAttachment}
        onRemoveAttachment={vi.fn()}
      />
    );

    const dropZone = screen.getByTestId("message-input-area");

    // 创建大文件（>100KB）
    const bigContent = "x".repeat(102401);
    const file = new File([bigContent], "big.ts", { type: "text/plain" });
    Object.defineProperty(file, "path", { value: "/path/to/big.ts" });

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file],
        types: ["Files"]
      }
    });

    expect(onAddAttachment).not.toHaveBeenCalled();
  });

  // 正常路径：无附件时不显示附件预览区域
  it("无附件时不显示附件预览区域", () => {
    render(
      <MessageInput
        onSend={vi.fn()}
        disabled={false}
        attachments={[]}
        onAddAttachment={vi.fn()}
        onRemoveAttachment={vi.fn()}
      />
    );
    expect(screen.queryByTestId("attachment-list")).not.toBeInTheDocument();
  });
});
