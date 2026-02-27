import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ChatView } from "./ChatView";
import { useChatStore } from "./store";

const defaultMock = {
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
};

// Mock store
vi.mock("./store", () => ({
  useChatStore: vi.fn(() => ({ ...defaultMock }))
}));

describe("ChatView", () => {
  beforeEach(() => {
    vi.mocked(useChatStore).mockReturnValue({ ...defaultMock });
  });

  afterEach(() => {
    // 清理 window.workbox mock
    delete (window as Record<string, unknown>).workbox;
  });

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

  // 错误路径：chat 调用失败时应重置 isStreaming
  it("chat 调用失败时重置 isStreaming 状态", async () => {
    const setStreaming = vi.fn();
    const addMessage = vi.fn();

    vi.mocked(useChatStore).mockReturnValue({
      ...defaultMock,
      currentConversationId: "conv-1",
      conversations: [{ id: "conv-1", title: "测试" }],
      messages: { "conv-1": [] },
      setStreaming,
      addMessage
    });

    // Mock window.workbox 让 chat 返回 rejected promise
    const unsubscribeFn = vi.fn();
    (window as Record<string, unknown>).workbox = {
      ai: {
        chat: vi.fn().mockRejectedValue(new Error("Not implemented")),
        onStream: vi.fn(() => unsubscribeFn)
      }
    };

    render(<ChatView />);

    // 模拟用户输入并发送消息
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "hello" } });
    fireEvent.click(screen.getByLabelText("发送"));

    // 应先设置 isStreaming(true)
    expect(setStreaming).toHaveBeenCalledWith(true);

    // chat 失败后应重置 isStreaming(false)
    await waitFor(() => {
      expect(setStreaming).toHaveBeenCalledWith(false);
    });

    // 应取消 stream 订阅
    expect(unsubscribeFn).toHaveBeenCalled();
  });

  // 边界条件：workbox.ai 不可用时不应卡住
  it("workbox.ai 不可用时重置 isStreaming", () => {
    const setStreaming = vi.fn();

    vi.mocked(useChatStore).mockReturnValue({
      ...defaultMock,
      currentConversationId: "conv-1",
      conversations: [{ id: "conv-1", title: "测试" }],
      messages: { "conv-1": [] },
      setStreaming
    });

    // window.workbox 不存在
    delete (window as Record<string, unknown>).workbox;

    render(<ChatView />);

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "hello" } });
    fireEvent.click(screen.getByLabelText("发送"));

    // 应重置 isStreaming(false) 因为 workbox 不可用
    expect(setStreaming).toHaveBeenCalledWith(false);
  });
});
