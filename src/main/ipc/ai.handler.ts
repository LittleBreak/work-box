import type { StreamEvent, ChatResult } from "@shared/types";
import type { ModelInfo } from "../ai/types";
import type { Conversation, Message } from "../storage/crud";

/** AI Handler 接口（供 IPC 注册使用） */
export interface AIHandler {
  chat(
    conversationId: string,
    content: string,
    send: (event: StreamEvent) => void
  ): Promise<ChatResult>;
  getModels(): ModelInfo[];
  getConversations(): Conversation[];
  getHistory(conversationId: string): Message[];
  deleteConversation(conversationId: string): void;
}

/** AI Service 所需的最小接口（便于 mock 测试） */
interface AIServiceLike {
  chat(
    conversationId: string,
    content: string,
    onEvent: (event: StreamEvent) => void
  ): Promise<ChatResult>;
  getConversations(): Conversation[];
  getHistory(conversationId: string): Message[];
  deleteConversation(conversationId: string): void;
  getModels?: () => ModelInfo[];
}

/**
 * 创建 AI IPC Handler。
 * 封装 AI Service 调用，提供 IPC 层接口。
 */
export function createAIHandler(service: AIServiceLike): AIHandler {
  return {
    async chat(conversationId, content, send) {
      return service.chat(conversationId, content, (event) => {
        send(event);
      });
    },

    getModels() {
      if (service.getModels) {
        return service.getModels();
      }
      return [];
    },

    getConversations() {
      return service.getConversations();
    },

    getHistory(conversationId) {
      return service.getHistory(conversationId);
    },

    deleteConversation(conversationId) {
      service.deleteConversation(conversationId);
    }
  };
}
