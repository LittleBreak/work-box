import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock window.workbox
const mockWorkbox = {
  ai: {
    chat: vi.fn(),
    getModels: vi.fn(() => Promise.resolve([])),
    getConversations: vi.fn(() => Promise.resolve([])),
    getHistory: vi.fn(() => Promise.resolve([])),
    deleteConversation: vi.fn(() => Promise.resolve()),
    onStream: vi.fn(() => () => {})
  }
};
vi.stubGlobal("window", { workbox: mockWorkbox });

import { useChatStore } from "./store";

describe("useChatStore", () => {
  beforeEach(() => {
    // 重置 store 状态
    useChatStore.setState({
      conversations: [],
      currentConversationId: null,
      messages: {},
      isStreaming: false,
      streamingText: "",
      selectedModel: "gpt-4o"
    });
    vi.clearAllMocks();
  });

  // 正常路径：初始状态
  it("初始状态包含空对话列表和默认模型", () => {
    const state = useChatStore.getState();
    expect(state.conversations).toEqual([]);
    expect(state.currentConversationId).toBeNull();
    expect(state.isStreaming).toBe(false);
    expect(state.selectedModel).toBe("gpt-4o");
  });

  // 正常路径：创建新对话
  it("createConversation 添加新对话并设为当前", () => {
    const store = useChatStore.getState();
    store.createConversation("conv-1", "新对话");
    const state = useChatStore.getState();
    expect(state.conversations).toHaveLength(1);
    expect(state.currentConversationId).toBe("conv-1");
  });

  // 正常路径：切换对话
  it("switchConversation 切换当前对话 ID", () => {
    const store = useChatStore.getState();
    store.createConversation("conv-1", "对话1");
    store.createConversation("conv-2", "对话2");
    store.switchConversation("conv-1");
    expect(useChatStore.getState().currentConversationId).toBe("conv-1");
  });

  // 正常路径：删除对话
  it("deleteConversation 移除对话并清除对应消息", () => {
    const store = useChatStore.getState();
    store.createConversation("conv-1", "对话1");
    store.addMessage("conv-1", { id: "msg-1", role: "user", content: "Hello" });
    store.deleteConversation("conv-1");
    const state = useChatStore.getState();
    expect(state.conversations).toHaveLength(0);
    expect(state.messages["conv-1"]).toBeUndefined();
  });

  // 正常路径：添加消息
  it("addMessage 向指定对话添加消息", () => {
    const store = useChatStore.getState();
    store.createConversation("conv-1", "对话");
    store.addMessage("conv-1", { id: "msg-1", role: "user", content: "Hello" });
    expect(useChatStore.getState().messages["conv-1"]).toHaveLength(1);
  });

  // 正常路径：更新流式文本
  it("appendStreamingText 追加流式文本", () => {
    const store = useChatStore.getState();
    store.setStreaming(true);
    store.appendStreamingText("Hello");
    store.appendStreamingText(" world");
    expect(useChatStore.getState().streamingText).toBe("Hello world");
  });

  // 正常路径：设置模型
  it("setSelectedModel 更新选中模型", () => {
    const store = useChatStore.getState();
    store.setSelectedModel("claude-sonnet-4-20250514");
    expect(useChatStore.getState().selectedModel).toBe("claude-sonnet-4-20250514");
  });

  // 边界条件：删除当前对话后 currentConversationId 置空
  it("删除当前对话后 currentConversationId 变为 null", () => {
    const store = useChatStore.getState();
    store.createConversation("conv-1", "对话");
    expect(useChatStore.getState().currentConversationId).toBe("conv-1");
    store.deleteConversation("conv-1");
    expect(useChatStore.getState().currentConversationId).toBeNull();
  });

  // 正常路径：removeMessagesFrom 移除目标消息及后续
  it("removeMessagesFrom 移除目标消息及其之后的消息", () => {
    const store = useChatStore.getState();
    store.createConversation("conv-rm", "对话");
    store.addMessage("conv-rm", { id: "msg-1", role: "user", content: "A" });
    store.addMessage("conv-rm", { id: "msg-2", role: "assistant", content: "B" });
    store.addMessage("conv-rm", { id: "msg-3", role: "user", content: "C" });

    store.removeMessagesFrom("conv-rm", "msg-2");
    const msgs = useChatStore.getState().messages["conv-rm"];
    expect(msgs).toHaveLength(1);
    expect(msgs![0].id).toBe("msg-1");
  });

  // 边界条件：removeMessagesFrom 第一条消息，清空全部
  it("removeMessagesFrom 第一条消息时清空全部", () => {
    const store = useChatStore.getState();
    store.createConversation("conv-rm2", "对话");
    store.addMessage("conv-rm2", { id: "msg-a", role: "user", content: "A" });
    store.addMessage("conv-rm2", { id: "msg-b", role: "assistant", content: "B" });

    store.removeMessagesFrom("conv-rm2", "msg-a");
    expect(useChatStore.getState().messages["conv-rm2"]).toHaveLength(0);
  });

  // 边界条件：removeMessagesFrom 不存在的消息不崩溃
  it("removeMessagesFrom 不存在的消息不崩溃", () => {
    const store = useChatStore.getState();
    store.createConversation("conv-rm3", "对话");
    store.addMessage("conv-rm3", { id: "msg-x", role: "user", content: "X" });

    expect(() => store.removeMessagesFrom("conv-rm3", "nonexistent")).not.toThrow();
    expect(useChatStore.getState().messages["conv-rm3"]).toHaveLength(1);
  });

  // 正常路径：updateLocalMessageContent 更新消息内容
  it("updateLocalMessageContent 更新指定消息内容", () => {
    const store = useChatStore.getState();
    store.createConversation("conv-upd", "对话");
    store.addMessage("conv-upd", { id: "msg-u1", role: "user", content: "Old" });

    store.updateLocalMessageContent("conv-upd", "msg-u1", "New content");
    const msgs = useChatStore.getState().messages["conv-upd"];
    expect(msgs![0].content).toBe("New content");
  });

  // 边界条件：updateLocalMessageContent 不存在的消息不崩溃
  it("updateLocalMessageContent 不存在的消息不崩溃", () => {
    const store = useChatStore.getState();
    store.createConversation("conv-upd2", "对话");
    expect(() => store.updateLocalMessageContent("conv-upd2", "nonexistent", "X")).not.toThrow();
  });

  // 正常路径：updateConversationSystemPrompt 更新 systemPrompt
  it("updateConversationSystemPrompt 更新对话的 systemPrompt", () => {
    const store = useChatStore.getState();
    store.createConversation("conv-sp", "对话");

    store.updateConversationSystemPrompt("conv-sp", "You are a coder.");
    const conv = useChatStore.getState().conversations.find((c) => c.id === "conv-sp");
    expect(conv!.systemPrompt).toBe("You are a coder.");
  });

  // 正常路径：updateConversationSystemPrompt 清除为 null
  it("updateConversationSystemPrompt 清除为 null", () => {
    const store = useChatStore.getState();
    store.createConversation("conv-sp2", "对话");
    store.updateConversationSystemPrompt("conv-sp2", "Some prompt");
    store.updateConversationSystemPrompt("conv-sp2", null);

    const conv = useChatStore.getState().conversations.find((c) => c.id === "conv-sp2");
    expect(conv!.systemPrompt).toBeNull();
  });
});
