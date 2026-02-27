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

  // 正常路径：流式状态显示 streamingText
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

  // 边界条件：空消息列表
  it("消息列表为空时不崩溃", () => {
    render(<MessageList messages={[]} streamingText="" isStreaming={false} />);
    expect(screen.getByTestId("message-list")).toBeInTheDocument();
  });
});
