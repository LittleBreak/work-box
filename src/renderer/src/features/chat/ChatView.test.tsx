import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChatView } from "./ChatView";

// Mock store
vi.mock("./store", () => ({
  useChatStore: vi.fn(() => ({
    conversations: [],
    currentConversationId: null,
    messages: {},
    isStreaming: false,
    streamingText: "",
    selectedModel: "gpt-4o",
    createConversation: vi.fn(),
    switchConversation: vi.fn(),
    deleteConversation: vi.fn(),
    addMessage: vi.fn(),
    appendStreamingText: vi.fn(),
    setStreaming: vi.fn(),
    setSelectedModel: vi.fn()
  }))
}));

describe("ChatView", () => {
  // 正常路径：组件可渲染
  it("渲染 ChatView 组件", () => {
    render(<ChatView />);
    expect(screen.getByTestId("page-chat")).toBeInTheDocument();
  });

  // 正常路径：空态页面显示欢迎信息
  it("无对话时显示欢迎页面", () => {
    render(<ChatView />);
    expect(screen.getByText("开始对话")).toBeInTheDocument();
  });
});
