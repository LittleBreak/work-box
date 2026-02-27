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
  searchQuery: "",
  searchResults: null,
  createConversation: vi.fn(),
  switchConversation: vi.fn(),
  deleteConversation: vi.fn(),
  addMessage: vi.fn(),
  removeMessagesFrom: vi.fn(),
  updateLocalMessageContent: vi.fn(),
  updateConversationSystemPrompt: vi.fn(),
  appendStreamingText: vi.fn(),
  setStreaming: vi.fn(),
  setSelectedModel: vi.fn(),
  setSearchQuery: vi.fn(),
  setSearchResults: vi.fn(),
  clearSearch: vi.fn()
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
    const textarea = screen.getByPlaceholderText("输入消息... (Ctrl+Enter 发送)");
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

    const textarea = screen.getByPlaceholderText("输入消息... (Ctrl+Enter 发送)");
    fireEvent.change(textarea, { target: { value: "hello" } });
    fireEvent.click(screen.getByLabelText("发送"));

    // 应重置 isStreaming(false) 因为 workbox 不可用
    expect(setStreaming).toHaveBeenCalledWith(false);
  });

  // 正常路径：系统 Prompt 按钮在有对话时显示
  it("有对话时显示系统 Prompt 齿轮按钮", () => {
    vi.mocked(useChatStore).mockReturnValue({
      ...defaultMock,
      currentConversationId: "conv-1",
      conversations: [{ id: "conv-1", title: "测试" }],
      messages: { "conv-1": [] }
    });

    render(<ChatView />);
    expect(screen.getByTitle("系统 Prompt")).toBeInTheDocument();
  });

  // 正常路径：点击齿轮按钮显示 Prompt 编辑对话框
  it("点击系统 Prompt 按钮显示编辑对话框", () => {
    vi.mocked(useChatStore).mockReturnValue({
      ...defaultMock,
      currentConversationId: "conv-1",
      conversations: [{ id: "conv-1", title: "测试" }],
      messages: { "conv-1": [] }
    });

    render(<ChatView />);
    fireEvent.click(screen.getByTitle("系统 Prompt"));
    expect(screen.getByPlaceholderText("输入系统 Prompt...")).toBeInTheDocument();
  });

  // 正常路径：保存系统 Prompt 调用 IPC 和 store
  it("保存系统 Prompt 后调用 store action", async () => {
    const updateConversationSystemPrompt = vi.fn();
    vi.mocked(useChatStore).mockReturnValue({
      ...defaultMock,
      currentConversationId: "conv-1",
      conversations: [{ id: "conv-1", title: "测试" }],
      messages: { "conv-1": [] },
      updateConversationSystemPrompt
    });

    (window as Record<string, unknown>).workbox = {
      ai: {
        updateSystemPrompt: vi.fn().mockResolvedValue(undefined),
        onStream: vi.fn(() => () => {})
      }
    };

    render(<ChatView />);
    fireEvent.click(screen.getByTitle("系统 Prompt"));

    const textarea = screen.getByPlaceholderText("输入系统 Prompt...");
    fireEvent.change(textarea, { target: { value: "Be helpful" } });
    fireEvent.click(screen.getByText("保存"));

    await waitFor(() => {
      expect(updateConversationSystemPrompt).toHaveBeenCalledWith("conv-1", "Be helpful");
    });
  });

  // 正常路径：MessageList 的 onCopy 调用 clipboard.writeText
  it("复制消息调用 clipboard.writeText", () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    (window as Record<string, unknown>).workbox = {
      clipboard: { writeText },
      ai: { onStream: vi.fn(() => () => {}) }
    };

    vi.mocked(useChatStore).mockReturnValue({
      ...defaultMock,
      currentConversationId: "conv-1",
      conversations: [{ id: "conv-1", title: "测试" }],
      messages: { "conv-1": [{ id: "msg-1", role: "user" as const, content: "Copy me" }] }
    });

    render(<ChatView />);
    fireEvent.click(screen.getByTitle("复制"));
    expect(writeText).toHaveBeenCalledWith("Copy me");
  });

  // ---- 搜索相关 ----

  // 正常路径：显示搜索输入框
  it("左侧面板显示搜索输入框", () => {
    render(<ChatView />);
    expect(screen.getByPlaceholderText("搜索对话...")).toBeInTheDocument();
  });

  // 正常路径：搜索输入触发搜索
  it("搜索输入调用 setSearchQuery", () => {
    const setSearchQuery = vi.fn();
    vi.mocked(useChatStore).mockReturnValue({
      ...defaultMock,
      setSearchQuery
    });

    render(<ChatView />);
    const input = screen.getByPlaceholderText("搜索对话...");
    fireEvent.change(input, { target: { value: "React" } });
    expect(setSearchQuery).toHaveBeenCalledWith("React");
  });

  // 正常路径：有搜索结果时显示搜索结果列表
  it("有搜索结果时显示搜索结果", () => {
    vi.mocked(useChatStore).mockReturnValue({
      ...defaultMock,
      searchQuery: "React",
      searchResults: [
        { id: "conv-s1", title: "React 教程" },
        { id: "conv-s2", title: "React 优化" }
      ]
    });

    render(<ChatView />);
    expect(screen.getByText("React 教程")).toBeInTheDocument();
    expect(screen.getByText("React 优化")).toBeInTheDocument();
  });

  // ---- 导出相关 ----

  // 正常路径：有对话时显示导出按钮
  it("有对话时显示导出按钮", () => {
    vi.mocked(useChatStore).mockReturnValue({
      ...defaultMock,
      currentConversationId: "conv-1",
      conversations: [{ id: "conv-1", title: "测试" }],
      messages: { "conv-1": [] }
    });

    render(<ChatView />);
    expect(screen.getByTitle("导出对话")).toBeInTheDocument();
  });

  // 正常路径：点击导出按钮显示格式选择
  it("点击导出按钮显示格式选择", () => {
    vi.mocked(useChatStore).mockReturnValue({
      ...defaultMock,
      currentConversationId: "conv-1",
      conversations: [{ id: "conv-1", title: "测试" }],
      messages: { "conv-1": [] }
    });

    render(<ChatView />);
    fireEvent.click(screen.getByTitle("导出对话"));
    expect(screen.getByText("Markdown")).toBeInTheDocument();
    expect(screen.getByText("JSON")).toBeInTheDocument();
  });

  // 正常路径：选择 Markdown 格式导出
  it("选择 Markdown 格式调用 exportConversation", async () => {
    const exportConversation = vi.fn().mockResolvedValue("/tmp/test.md");
    (window as Record<string, unknown>).workbox = {
      ai: {
        exportConversation,
        onStream: vi.fn(() => () => {})
      }
    };

    vi.mocked(useChatStore).mockReturnValue({
      ...defaultMock,
      currentConversationId: "conv-1",
      conversations: [{ id: "conv-1", title: "测试" }],
      messages: { "conv-1": [] }
    });

    render(<ChatView />);
    fireEvent.click(screen.getByTitle("导出对话"));
    fireEvent.click(screen.getByText("Markdown"));

    await waitFor(() => {
      expect(exportConversation).toHaveBeenCalledWith("conv-1", "markdown");
    });
  });
});
