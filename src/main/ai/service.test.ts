import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Crud } from "../storage/crud";
import type { AIProviderAdapter } from "./types";
import type { StreamEvent } from "@shared/types";
import { createAIService } from "./service";

/** 创建 mock Crud */
function createMockCrud(): Crud {
  const conversationStore = new Map<string, Record<string, unknown>>();
  const messageStore = new Map<string, Array<Record<string, unknown>>>();
  return {
    insertConversation: vi.fn((params) => {
      conversationStore.set(params.id, params);
    }),
    getConversation: vi.fn(
      (id) => conversationStore.get(id) as ReturnType<Crud["getConversation"]>
    ),
    updateConversation: vi.fn(),
    deleteConversation: vi.fn((id) => {
      conversationStore.delete(id);
      messageStore.delete(id);
    }),
    getAllConversations: vi.fn(
      () => Array.from(conversationStore.values()) as ReturnType<Crud["getAllConversations"]>
    ),
    insertMessage: vi.fn((params) => {
      const msgs = messageStore.get(params.conversationId) ?? [];
      msgs.push(params);
      messageStore.set(params.conversationId, msgs);
    }),
    getMessagesByConversation: vi.fn(
      (convId) => (messageStore.get(convId) ?? []) as ReturnType<Crud["getMessagesByConversation"]>
    ),
    getSetting: vi.fn(),
    setSetting: vi.fn(),
    deleteSetting: vi.fn(),
    getAllSettings: vi.fn(() => []),
    deleteAllSettings: vi.fn(),
    getPluginData: vi.fn(),
    setPluginData: vi.fn(),
    deletePluginData: vi.fn(),
    deleteAllPluginData: vi.fn()
  };
}

/** 创建 mock Provider Adapter */
function createMockAdapter(): AIProviderAdapter {
  return {
    id: "mock",
    name: "Mock Provider",
    getModels: () => [{ id: "mock-model", name: "Mock Model", provider: "mock" }],
    createModel: vi.fn(() => ({ modelId: "mock-model" }) as unknown)
  };
}

// Mock streamText
vi.mock("ai", () => ({
  streamText: vi.fn()
}));

import { streamText } from "ai";
const mockStreamText = vi.mocked(streamText);

describe("createAIService", () => {
  let crud: Crud;
  let adapter: AIProviderAdapter;

  beforeEach(() => {
    crud = createMockCrud();
    adapter = createMockAdapter();
    vi.clearAllMocks();
  });

  describe("createConversation", () => {
    // 正常路径：创建新对话
    it("创建新对话并持久化", () => {
      const service = createAIService({ crud, adapter });
      const conv = service.createConversation();
      expect(conv.id).toBeDefined();
      expect(crud.insertConversation).toHaveBeenCalledOnce();
    });

    // 正常路径：对话标题使用默认值
    it("新对话使用默认标题", () => {
      const service = createAIService({ crud, adapter });
      const conv = service.createConversation();
      expect(conv.title).toBe("新对话");
    });
  });

  describe("getConversations", () => {
    // 正常路径：获取对话列表
    it("返回所有对话的列表", () => {
      const service = createAIService({ crud, adapter });
      service.getConversations();
      expect(crud.getAllConversations).toHaveBeenCalled();
    });
  });

  describe("getHistory", () => {
    // 正常路径：获取对话历史消息
    it("返回对话的所有消息", () => {
      const service = createAIService({ crud, adapter });
      service.getHistory("conv-1");
      expect(crud.getMessagesByConversation).toHaveBeenCalledWith("conv-1");
    });

    // 边界条件：对话不存在
    it("对话不存在时返回空数组", () => {
      const service = createAIService({ crud, adapter });
      const msgs = service.getHistory("non-existent");
      expect(msgs).toEqual([]);
    });
  });

  describe("deleteConversation", () => {
    // 正常路径：删除对话
    it("删除对话及其消息", () => {
      const service = createAIService({ crud, adapter });
      service.deleteConversation("conv-1");
      expect(crud.deleteConversation).toHaveBeenCalledWith("conv-1");
    });
  });

  describe("chat", () => {
    // 正常路径：发送消息并接收流式响应
    it("发送用户消息后接收 text-delta 和 finish 事件", async () => {
      mockStreamText.mockReturnValue({
        fullStream: (async function* () {
          yield { type: "text-delta", text: "Hello" };
          yield { type: "text-delta", text: " world" };
          yield {
            type: "finish",
            finishReason: "stop",
            usage: { promptTokens: 10, completionTokens: 5 }
          };
        })(),
        text: Promise.resolve("Hello world")
      } as ReturnType<typeof streamText>);

      const service = createAIService({ crud, adapter });
      const conv = service.createConversation();
      const events: StreamEvent[] = [];
      await service.chat(conv.id, "Hi", (e) => events.push(e));

      expect(events.some((e) => e.type === "text-delta")).toBe(true);
      expect(events.some((e) => e.type === "finish")).toBe(true);
    });

    // 正常路径：使用配置的模型名称调用 Provider
    it("使用 deps 中配置的 model 而非硬编码值", async () => {
      mockStreamText.mockReturnValue({
        fullStream: (async function* () {
          yield {
            type: "finish",
            finishReason: "stop",
            usage: { promptTokens: 10, completionTokens: 0 }
          };
        })(),
        text: Promise.resolve("")
      } as ReturnType<typeof streamText>);

      const service = createAIService({ crud, adapter, model: "gpt-4o" });
      const conv = service.createConversation();
      await service.chat(conv.id, "Hi", () => {});

      expect(adapter.createModel).toHaveBeenCalledWith("gpt-4o");
    });

    // 正常路径：用户消息和 AI 回复均持久化
    it("持久化用户消息和 AI 回复", async () => {
      mockStreamText.mockReturnValue({
        fullStream: (async function* () {
          yield { type: "text-delta", text: "Reply" };
          yield {
            type: "finish",
            finishReason: "stop",
            usage: { promptTokens: 10, completionTokens: 5 }
          };
        })(),
        text: Promise.resolve("Reply")
      } as ReturnType<typeof streamText>);

      const service = createAIService({ crud, adapter });
      const conv = service.createConversation();
      await service.chat(conv.id, "Hello", () => {});

      // 用户消息 + AI 回复 = 2 次 insertMessage
      expect(crud.insertMessage).toHaveBeenCalledTimes(2);
    });

    // 正常路径：首次消息更新对话标题
    it("首次消息使用内容前 50 字符作为标题", async () => {
      mockStreamText.mockReturnValue({
        fullStream: (async function* () {
          yield {
            type: "finish",
            finishReason: "stop",
            usage: { promptTokens: 10, completionTokens: 0 }
          };
        })(),
        text: Promise.resolve("")
      } as ReturnType<typeof streamText>);

      const service = createAIService({ crud, adapter });
      const conv = service.createConversation();
      await service.chat(conv.id, "帮我解释一下 TypeScript 泛型的用法", () => {});

      expect(crud.updateConversation).toHaveBeenCalledWith(
        conv.id,
        expect.objectContaining({ title: "帮我解释一下 TypeScript 泛型的用法" })
      );
    });

    // 错误处理：Provider 调用失败发送 error 事件
    it("Provider 调用失败时发送 error 事件", async () => {
      mockStreamText.mockImplementation(() => {
        throw new Error("API key invalid");
      });

      const service = createAIService({ crud, adapter });
      const conv = service.createConversation();
      const events: StreamEvent[] = [];
      await service.chat(conv.id, "Hello", (e) => events.push(e));

      expect(events.some((e) => e.type === "error")).toBe(true);
    });

    // 边界条件：conversationId 存在但数据库中无记录时自动创建
    it("conversationId 存在但数据库中无记录时自动创建对话", async () => {
      mockStreamText.mockReturnValue({
        fullStream: (async function* () {
          yield {
            type: "finish",
            finishReason: "stop",
            usage: { promptTokens: 10, completionTokens: 0 }
          };
        })(),
        text: Promise.resolve("")
      } as ReturnType<typeof streamText>);

      const service = createAIService({ crud, adapter });
      const externalId = "external-conv-id-not-in-db";
      const events: StreamEvent[] = [];
      const result = await service.chat(externalId, "Hello", (e) => events.push(e));

      // 应使用传入的 conversationId（不生成新的）
      expect(result.conversationId).toBe(externalId);
      // 应在数据库中创建对话记录
      expect(crud.insertConversation).toHaveBeenCalledWith(
        expect.objectContaining({ id: externalId })
      );
      // 消息应正常插入不报错
      expect(crud.insertMessage).toHaveBeenCalled();
    });

    // 边界条件：对话不存在时创建新对话
    it("conversationId 为空时自动创建新对话", async () => {
      mockStreamText.mockReturnValue({
        fullStream: (async function* () {
          yield {
            type: "finish",
            finishReason: "stop",
            usage: { promptTokens: 10, completionTokens: 0 }
          };
        })(),
        text: Promise.resolve("")
      } as ReturnType<typeof streamText>);

      const service = createAIService({ crud, adapter });
      const events: StreamEvent[] = [];
      const result = await service.chat("", "Hello", (e) => events.push(e));

      expect(result.conversationId).toBeDefined();
      expect(crud.insertConversation).toHaveBeenCalled();
    });
  });

  describe("上下文管理", () => {
    // 边界条件：超长对话自动裁剪
    it("超过 maxContextMessages 时裁剪旧消息", async () => {
      // 预先插入大量消息
      const manyMessages = Array.from({ length: 60 }, (_, i) => ({
        id: `msg-${i}`,
        conversationId: "conv-1",
        role: i % 2 === 0 ? "user" : "assistant",
        content: `Message ${i}`,
        toolCalls: null,
        toolResult: null,
        createdAt: Date.now() + i
      }));
      vi.mocked(crud.getMessagesByConversation).mockReturnValue(
        manyMessages as ReturnType<Crud["getMessagesByConversation"]>
      );

      mockStreamText.mockReturnValue({
        fullStream: (async function* () {
          yield {
            type: "finish",
            finishReason: "stop",
            usage: { promptTokens: 10, completionTokens: 0 }
          };
        })(),
        text: Promise.resolve("")
      } as ReturnType<typeof streamText>);

      const service = createAIService({ crud, adapter, maxContextMessages: 10 });
      await service.chat("conv-1", "New message", () => {});

      // 验证传给 streamText 的 messages 不超过 maxContextMessages + 1（含新用户消息）
      const callArgs = mockStreamText.mock.calls[0]![0];
      expect((callArgs as Record<string, unknown[]>).messages.length).toBeLessThanOrEqual(11);
    });
  });
});
