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
  regenerate(conversationId: string, send: (event: StreamEvent) => void): Promise<ChatResult>;
  updateSystemPrompt(conversationId: string, systemPrompt: string | null): void;
  deleteMessagesAfter(conversationId: string, messageId: string): void;
  updateMessageContent(messageId: string, content: string): void;
  getModels(): ModelInfo[];
  getConversations(): Conversation[];
  getHistory(conversationId: string): Message[];
  deleteConversation(conversationId: string): void;
  searchConversations(query: string): Conversation[];
  exportConversation(conversationId: string, format: string): Promise<string | null>;
}

/** AI Service 所需的最小接口（便于 mock 测试） */
interface AIServiceLike {
  chat(
    conversationId: string,
    content: string,
    onEvent: (event: StreamEvent) => void
  ): Promise<ChatResult>;
  regenerate(conversationId: string, onEvent: (event: StreamEvent) => void): Promise<ChatResult>;
  updateSystemPrompt(conversationId: string, systemPrompt: string | null): void;
  deleteMessagesAfter(conversationId: string, messageId: string): void;
  updateMessageContent?: (messageId: string, content: string) => void;
  getConversations(): Conversation[];
  getHistory(conversationId: string): Message[];
  deleteConversation(conversationId: string): void;
  getModels?: () => ModelInfo[];
  searchConversations?: (query: string) => Conversation[];
  exportConversation?: (conversationId: string, format: string) => Promise<string | null>;
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

    async regenerate(conversationId, send) {
      return service.regenerate(conversationId, (event) => {
        send(event);
      });
    },

    updateSystemPrompt(conversationId, systemPrompt) {
      service.updateSystemPrompt(conversationId, systemPrompt);
    },

    deleteMessagesAfter(conversationId, messageId) {
      service.deleteMessagesAfter(conversationId, messageId);
    },

    updateMessageContent(messageId, content) {
      if (service.updateMessageContent) {
        service.updateMessageContent(messageId, content);
      }
    },

    getConversations() {
      return service.getConversations();
    },

    getHistory(conversationId) {
      return service.getHistory(conversationId);
    },

    deleteConversation(conversationId) {
      service.deleteConversation(conversationId);
    },

    searchConversations(query) {
      if (service.searchConversations) {
        return service.searchConversations(query);
      }
      return [];
    },

    async exportConversation(conversationId, format) {
      if (service.exportConversation) {
        return service.exportConversation(conversationId, format);
      }
      return null;
    }
  };
}
