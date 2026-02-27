import { describe, it, expect, vi, beforeEach } from "vitest";
import type { StreamEvent } from "@shared/types";
import { createAIHandler } from "./ai.handler";

/** 创建 mock AI Service */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createMockService() {
  return {
    createConversation: vi.fn(() => ({ id: "conv-new", title: "新对话" })),
    chat: vi.fn(async (_convId: string, _content: string, onEvent: (e: StreamEvent) => void) => {
      onEvent({
        type: "text-delta",
        conversationId: "conv-1",
        textDelta: "Hi"
      });
      onEvent({
        type: "finish",
        conversationId: "conv-1",
        finishReason: "stop"
      });
      return { conversationId: "conv-1", messageId: "msg-1" };
    }),
    regenerate: vi.fn(async (convId: string, onEvent: (e: StreamEvent) => void) => {
      onEvent({
        type: "text-delta",
        conversationId: convId,
        textDelta: "Regenerated"
      });
      onEvent({
        type: "finish",
        conversationId: convId,
        finishReason: "stop"
      });
      return { conversationId: convId, messageId: "msg-regen" };
    }),
    updateSystemPrompt: vi.fn(),
    deleteMessagesAfter: vi.fn(),
    updateMessageContent: vi.fn(),
    getConversations: vi.fn(() => [
      { id: "conv-1", title: "Test conversation", createdAt: 1000, updatedAt: 2000 }
    ]),
    getHistory: vi.fn(() => [
      {
        id: "msg-1",
        conversationId: "conv-1",
        role: "user" as const,
        content: "Hello",
        createdAt: 1000
      }
    ]),
    deleteConversation: vi.fn(),
    getModels: vi.fn(() => [{ id: "gpt-4o", name: "GPT-4o", provider: "openai" }]),
    searchConversations: vi.fn((query: string) => {
      if (query === "React") {
        return [
          {
            id: "conv-1",
            title: "React 教程",
            systemPrompt: null,
            createdAt: 1000,
            updatedAt: 2000
          }
        ];
      }
      return [];
    }),
    exportConversation: vi.fn(async (_convId: string, _format: string) => "/tmp/export.md")
  };
}

describe("createAIHandler", () => {
  let handler: ReturnType<typeof createAIHandler>;
  let mockService: ReturnType<typeof createMockService>;

  beforeEach(() => {
    mockService = createMockService();
    handler = createAIHandler(mockService);
  });

  describe("chat", () => {
    // 正常路径：发起对话
    it("调用 service.chat 并返回结果", async () => {
      const mockSend = vi.fn();
      const result = await handler.chat("conv-1", "Hello", mockSend);
      expect(mockService.chat).toHaveBeenCalledWith("conv-1", "Hello", expect.any(Function));
      expect(result.conversationId).toBe("conv-1");
    });

    // 正常路径：流式事件通过 send 回调推送
    it("流式事件通过 send 回调推送给渲染进程", async () => {
      const mockSend = vi.fn();
      await handler.chat("conv-1", "Hello", mockSend);
      expect(mockSend).toHaveBeenCalled();
    });

    // 边界条件：空 conversationId 创建新对话
    it("空 conversationId 时创建新对话", async () => {
      const mockSend = vi.fn();
      mockService.chat.mockImplementation(async (convId, _content, onEvent) => {
        onEvent({
          type: "finish",
          conversationId: convId || "conv-new",
          finishReason: "stop"
        });
        return { conversationId: convId || "conv-new", messageId: "msg-new" };
      });
      const result = await handler.chat("", "Hello", mockSend);
      expect(result.conversationId).toBeDefined();
    });
  });

  describe("getModels", () => {
    // 正常路径：返回模型列表
    it("返回可用模型列表", () => {
      const models = handler.getModels();
      expect(models).toHaveLength(1);
      expect(models[0]!.id).toBe("gpt-4o");
    });
  });

  describe("getConversations", () => {
    // 正常路径：返回对话列表
    it("返回所有对话", () => {
      const conversations = handler.getConversations();
      expect(conversations).toHaveLength(1);
      expect(conversations[0]!.id).toBe("conv-1");
    });
  });

  describe("deleteConversation", () => {
    // 正常路径：删除对话
    it("调用 service.deleteConversation", () => {
      handler.deleteConversation("conv-1");
      expect(mockService.deleteConversation).toHaveBeenCalledWith("conv-1");
    });
  });

  describe("updateSystemPrompt", () => {
    it("代理到 service.updateSystemPrompt", () => {
      handler.updateSystemPrompt("conv-1", "New prompt");
      expect(mockService.updateSystemPrompt).toHaveBeenCalledWith("conv-1", "New prompt");
    });
  });

  describe("deleteMessagesAfter", () => {
    it("代理到 service.deleteMessagesAfter", () => {
      handler.deleteMessagesAfter("conv-1", "msg-1");
      expect(mockService.deleteMessagesAfter).toHaveBeenCalledWith("conv-1", "msg-1");
    });
  });

  describe("updateMessageContent", () => {
    it("代理到 service.updateMessageContent", () => {
      handler.updateMessageContent("msg-1", "Updated content");
      expect(mockService.updateMessageContent).toHaveBeenCalledWith("msg-1", "Updated content");
    });
  });

  describe("regenerate", () => {
    it("调用 service.regenerate 并返回结果", async () => {
      const mockSend = vi.fn();
      const result = await handler.regenerate("conv-1", mockSend);
      expect(mockService.regenerate).toHaveBeenCalledWith("conv-1", expect.any(Function));
      expect(result.conversationId).toBe("conv-1");
    });

    it("流式事件通过 send 回调推送", async () => {
      const mockSend = vi.fn();
      await handler.regenerate("conv-1", mockSend);
      expect(mockSend).toHaveBeenCalled();
    });
  });

  describe("searchConversations", () => {
    it("代理到 service.searchConversations 并返回结果", () => {
      const results = handler.searchConversations("React");
      expect(mockService.searchConversations).toHaveBeenCalledWith("React");
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("React 教程");
    });

    it("空查询返回空数组", () => {
      const results = handler.searchConversations("Python");
      expect(results).toEqual([]);
    });
  });

  describe("exportConversation", () => {
    it("代理到 service.exportConversation 并返回文件路径", async () => {
      const result = await handler.exportConversation("conv-1", "markdown");
      expect(mockService.exportConversation).toHaveBeenCalledWith("conv-1", "markdown");
      expect(result).toBe("/tmp/export.md");
    });
  });
});
