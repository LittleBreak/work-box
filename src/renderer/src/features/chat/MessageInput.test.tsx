import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MessageInput } from "./MessageInput";

describe("MessageInput", () => {
  // 正常路径：渲染输入框
  it("渲染文本输入区域", () => {
    render(<MessageInput onSend={vi.fn()} disabled={false} />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  // 正常路径：输入文本
  it("可以输入文本", () => {
    render(<MessageInput onSend={vi.fn()} disabled={false} />);
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Hello" } });
    expect(textarea).toHaveValue("Hello");
  });

  // 正常路径：发送按钮
  it("渲染发送按钮", () => {
    render(<MessageInput onSend={vi.fn()} disabled={false} />);
    expect(screen.getByRole("button", { name: /发送|send/i })).toBeInTheDocument();
  });

  // 正常路径：streaming 时禁用输入
  it("disabled 为 true 时输入框和按钮禁用", () => {
    render(<MessageInput onSend={vi.fn()} disabled={true} />);
    expect(screen.getByRole("textbox")).toBeDisabled();
    expect(screen.getByRole("button", { name: /发送|send/i })).toBeDisabled();
  });
});
