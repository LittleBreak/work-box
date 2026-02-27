import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MessageList } from "./MessageList";

describe("MessageList", () => {
  // 正常路径：渲染用户消息
  it("渲染用户消息", () => {
    render(
      <MessageList
        messages={[{ id: "1", role: "user", content: "Hello" }]}
        streamingText=""
        isStreaming={false}
      />
    );
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  // 正常路径：渲染 assistant 消息
  it("渲染 assistant 消息", () => {
    render(
      <MessageList
        messages={[{ id: "2", role: "assistant", content: "Hi there!" }]}
        streamingText=""
        isStreaming={false}
      />
    );
    expect(screen.getByText("Hi there!")).toBeInTheDocument();
  });

  // 正常路径：assistant 消息使用 markdown 渲染
  it("assistant 消息以 markdown 格式渲染", () => {
    render(
      <MessageList
        messages={[{ id: "3", role: "assistant", content: "**bold text**" }]}
        streamingText=""
        isStreaming={false}
      />
    );
    const bold = screen.getByText("bold text");
    expect(bold.tagName).toBe("STRONG");
  });

  // 正常路径：markdown 渲染代码块
  it("assistant 消息渲染代码块", () => {
    const content = "```js\nconsole.log('hello');\n```";
    const { container } = render(
      <MessageList
        messages={[{ id: "4", role: "assistant", content }]}
        streamingText=""
        isStreaming={false}
      />
    );
    const codeEl = container.querySelector("code");
    expect(codeEl).not.toBeNull();
    expect(codeEl!.textContent).toContain("console.log");
  });

  // 正常路径：markdown 渲染列表
  it("assistant 消息渲染无序列表", () => {
    const content = "- item1\n- item2";
    render(
      <MessageList
        messages={[{ id: "5", role: "assistant", content }]}
        streamingText=""
        isStreaming={false}
      />
    );
    expect(screen.getByText("item1")).toBeInTheDocument();
    expect(screen.getByText("item2")).toBeInTheDocument();
  });

  // 正常路径：流式状态显示 streamingText（也用 markdown 渲染）
  it("流式状态下显示实时文本", () => {
    render(
      <MessageList
        messages={[{ id: "1", role: "user", content: "Hello" }]}
        streamingText="Thinking..."
        isStreaming={true}
      />
    );
    expect(screen.getByText("Thinking...")).toBeInTheDocument();
  });

  // 正常路径：流式文本也支持 markdown
  it("流式文本以 markdown 格式渲染", () => {
    render(<MessageList messages={[]} streamingText="**streaming bold**" isStreaming={true} />);
    const bold = screen.getByText("streaming bold");
    expect(bold.tagName).toBe("STRONG");
  });

  // 边界条件：空消息列表
  it("消息列表为空时不崩溃", () => {
    render(<MessageList messages={[]} streamingText="" isStreaming={false} />);
    expect(screen.getByTestId("message-list")).toBeInTheDocument();
  });

  // 正常路径：所有消息显示复制按钮
  it("每条消息显示复制按钮", () => {
    render(
      <MessageList
        messages={[
          { id: "1", role: "user", content: "Hello" },
          { id: "2", role: "assistant", content: "Hi" }
        ]}
        streamingText=""
        isStreaming={false}
        onCopy={vi.fn()}
      />
    );
    const copyButtons = screen.getAllByTitle("复制");
    expect(copyButtons).toHaveLength(2);
  });

  // 正常路径：assistant 消息显示重新生成按钮
  it("assistant 消息显示重新生成按钮", () => {
    render(
      <MessageList
        messages={[
          { id: "1", role: "user", content: "Hello" },
          { id: "2", role: "assistant", content: "Hi" }
        ]}
        streamingText=""
        isStreaming={false}
        onRegenerate={vi.fn()}
      />
    );
    const regenButtons = screen.getAllByTitle("重新生成");
    expect(regenButtons).toHaveLength(1);
  });

  // 正常路径：user 消息显示编辑按钮
  it("user 消息显示编辑按钮", () => {
    render(
      <MessageList
        messages={[
          { id: "1", role: "user", content: "Hello" },
          { id: "2", role: "assistant", content: "Hi" }
        ]}
        streamingText=""
        isStreaming={false}
        onEdit={vi.fn()}
      />
    );
    const editButtons = screen.getAllByTitle("编辑");
    expect(editButtons).toHaveLength(1);
  });

  // 正常路径：点击复制按钮调用 onCopy 回调
  it("点击复制按钮触发 onCopy 回调", () => {
    const onCopy = vi.fn();
    render(
      <MessageList
        messages={[{ id: "msg-1", role: "user", content: "Copy me" }]}
        streamingText=""
        isStreaming={false}
        onCopy={onCopy}
      />
    );
    fireEvent.click(screen.getByTitle("复制"));
    expect(onCopy).toHaveBeenCalledWith("msg-1", "Copy me");
  });

  // 正常路径：点击重新生成按钮调用 onRegenerate 回调
  it("点击重新生成按钮触发 onRegenerate 回调", () => {
    const onRegenerate = vi.fn();
    render(
      <MessageList
        messages={[{ id: "msg-2", role: "assistant", content: "Response" }]}
        streamingText=""
        isStreaming={false}
        onRegenerate={onRegenerate}
      />
    );
    fireEvent.click(screen.getByTitle("重新生成"));
    expect(onRegenerate).toHaveBeenCalledWith("msg-2");
  });

  // 正常路径：编辑模式 — 点击编辑显示 textarea
  it("点击编辑按钮进入编辑模式", () => {
    render(
      <MessageList
        messages={[{ id: "msg-e", role: "user", content: "Edit me" }]}
        streamingText=""
        isStreaming={false}
        onEdit={vi.fn()}
      />
    );
    fireEvent.click(screen.getByTitle("编辑"));
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  // 正常路径：编辑模式 — 确认后调用 onEdit 回调
  it("编辑确认后调用 onEdit 回调", () => {
    const onEdit = vi.fn();
    render(
      <MessageList
        messages={[{ id: "msg-e2", role: "user", content: "Old text" }]}
        streamingText=""
        isStreaming={false}
        onEdit={onEdit}
      />
    );
    fireEvent.click(screen.getByTitle("编辑"));
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "New text" } });
    fireEvent.click(screen.getByTitle("确认"));
    expect(onEdit).toHaveBeenCalledWith("msg-e2", "New text");
  });

  // 正常路径：编辑模式 — 取消后恢复原内容
  it("编辑取消后恢复原内容", () => {
    render(
      <MessageList
        messages={[{ id: "msg-e3", role: "user", content: "Keep me" }]}
        streamingText=""
        isStreaming={false}
        onEdit={vi.fn()}
      />
    );
    fireEvent.click(screen.getByTitle("编辑"));
    fireEvent.click(screen.getByTitle("取消"));
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByText("Keep me")).toBeInTheDocument();
  });

  // 边界条件：流式输出期间不显示操作按钮
  it("流式输出期间不显示操作按钮", () => {
    render(
      <MessageList
        messages={[{ id: "1", role: "user", content: "Hello" }]}
        streamingText="Thinking..."
        isStreaming={true}
        onCopy={vi.fn()}
        onEdit={vi.fn()}
      />
    );
    expect(screen.queryByTitle("复制")).not.toBeInTheDocument();
    expect(screen.queryByTitle("编辑")).not.toBeInTheDocument();
  });
});
