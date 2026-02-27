import { randomUUID } from "node:crypto";
import { streamText } from "ai";
import type { Crud, Conversation, Message } from "../storage/crud";
import type { AIProviderAdapter } from "./types";
import type { StreamEvent, ChatResult } from "@shared/types";

/** AI Service 依赖注入参数 */
export interface AIServiceDeps {
  crud: Crud;
  adapter: AIProviderAdapter;
  /** 使用的模型名称（如 "gpt-4o"），默认取 adapter 第一个可用模型 */
  model?: string;
  maxContextMessages?: number;
}

/** AI Service 接口 */
export interface AIService {
  createConversation(): { id: string; title: string };
  chat(
    conversationId: string,
    content: string,
    onEvent: (event: StreamEvent) => void
  ): Promise<ChatResult>;
  getConversations(): Conversation[];
  getHistory(conversationId: string): Message[];
  deleteConversation(conversationId: string): void;
}

/** 默认最大上下文消息数 */
const DEFAULT_MAX_CONTEXT_MESSAGES = 50;

/**
 * 创建 AI 对话管理核心服务。
 * 协调 Provider 适配器、CRUD 存储和流式转发。
 */
export function createAIService(deps: AIServiceDeps): AIService {
  const { crud, adapter, model, maxContextMessages = DEFAULT_MAX_CONTEXT_MESSAGES } = deps;
  const resolvedModel = model || adapter.getModels()[0]?.id || "default";

  /** 跟踪每个对话是否已发送过消息（用于首次消息更新标题） */
  const conversationMessageCount = new Map<string, number>();

  return {
    createConversation() {
      const id = randomUUID();
      const now = Date.now();
      const title = "新对话";
      crud.insertConversation({ id, title, createdAt: now, updatedAt: now });
      conversationMessageCount.set(id, 0);
      return { id, title };
    },

    async chat(conversationId, content, onEvent) {
      // 确保对话在数据库中存在
      let convId = conversationId;
      if (!convId) {
        const conv = this.createConversation();
        convId = conv.id;
      } else if (!crud.getConversation(convId)) {
        const now = Date.now();
        crud.insertConversation({ id: convId, title: "新对话", createdAt: now, updatedAt: now });
        conversationMessageCount.set(convId, 0);
      }

      // 持久化用户消息
      const userMsgId = randomUUID();
      crud.insertMessage({
        id: userMsgId,
        conversationId: convId,
        role: "user",
        content,
        createdAt: Date.now()
      });

      // 首次消息更新对话标题
      const msgCount = conversationMessageCount.get(convId) ?? 0;
      if (msgCount === 0) {
        const title = content.slice(0, 50);
        crud.updateConversation(convId, { title, updatedAt: Date.now() });
      }
      conversationMessageCount.set(convId, msgCount + 1);

      try {
        // 获取历史消息并裁剪上下文
        const history = crud.getMessagesByConversation(convId);
        const contextMessages = trimContext(history, maxContextMessages);

        // 转换为 AI SDK 消息格式
        const sdkMessages = contextMessages.map((msg) => ({
          role: msg.role as "user" | "assistant" | "system",
          content: msg.content
        }));

        // 调用 AI Provider
        const model = adapter.createModel(resolvedModel);
        const result = streamText({
          model: model as Parameters<typeof streamText>[0]["model"],
          messages: sdkMessages
        });

        // 处理流式响应
        let fullText = "";
        for await (const chunk of result.fullStream) {
          if (chunk.type === "text-delta") {
            fullText += chunk.text;
            onEvent({
              type: "text-delta",
              conversationId: convId,
              textDelta: chunk.text
            });
          } else if (chunk.type === "tool-call") {
            onEvent({
              type: "tool-call",
              conversationId: convId,
              toolCallId: chunk.toolCallId,
              toolName: chunk.toolName,
              args: chunk.args as Record<string, unknown>
            });
          } else if (chunk.type === "tool-result") {
            onEvent({
              type: "tool-result",
              conversationId: convId,
              toolCallId: chunk.toolCallId,
              toolName: chunk.toolName,
              result: chunk.result
            });
          } else if (chunk.type === "finish") {
            onEvent({
              type: "finish",
              conversationId: convId,
              finishReason: chunk.finishReason ?? "stop"
            });
          }
        }

        // 持久化 AI 回复
        const assistantMsgId = randomUUID();
        crud.insertMessage({
          id: assistantMsgId,
          conversationId: convId,
          role: "assistant",
          content: fullText,
          createdAt: Date.now()
        });

        return { conversationId: convId, messageId: assistantMsgId };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        onEvent({
          type: "error",
          conversationId: convId,
          error: errorMsg
        });
        return { conversationId: convId, messageId: "" };
      }
    },

    getConversations() {
      return crud.getAllConversations();
    },

    getHistory(conversationId) {
      return crud.getMessagesByConversation(conversationId);
    },

    deleteConversation(conversationId) {
      crud.deleteConversation(conversationId);
      conversationMessageCount.delete(conversationId);
    }
  };
}

/**
 * 裁剪上下文消息，保留最近 N 条。
 * 始终保留 system 类型消息（如果有）。
 */
function trimContext(messages: Message[], maxMessages: number): Message[] {
  if (messages.length <= maxMessages) {
    return messages;
  }

  // 分离 system 消息和非 system 消息
  const systemMsgs = messages.filter((m) => m.role === "system");
  const nonSystemMsgs = messages.filter((m) => m.role !== "system");

  // 保留最近的非 system 消息
  const trimmed = nonSystemMsgs.slice(-maxMessages);

  // system 消息始终在最前面
  return [...systemMsgs, ...trimmed];
}
