import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
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
});
