import { create } from "zustand";

/** 消息数据 */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  toolCalls?: string;
  toolResult?: string;
}

/** 对话摘要 */
export interface ConversationSummary {
  id: string;
  title: string;
  systemPrompt?: string | null;
  createdAt?: number;
  updatedAt?: number;
}

/** Chat Store 状态 */
interface ChatState {
  conversations: ConversationSummary[];
  currentConversationId: string | null;
  messages: Record<string, ChatMessage[]>;
  isStreaming: boolean;
  streamingText: string;
  selectedModel: string;
  searchQuery: string;
  searchResults: ConversationSummary[] | null;
  createConversation: (id: string, title: string) => void;
  switchConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  addMessage: (conversationId: string, message: ChatMessage) => void;
  removeMessagesFrom: (conversationId: string, messageId: string) => void;
  updateLocalMessageContent: (
    conversationId: string,
    messageId: string,
    newContent: string
  ) => void;
  updateConversationSystemPrompt: (conversationId: string, systemPrompt: string | null) => void;
  appendStreamingText: (text: string) => void;
  setStreaming: (streaming: boolean) => void;
  setSelectedModel: (model: string) => void;
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: ConversationSummary[]) => void;
  clearSearch: () => void;
}

/** Chat Zustand Store */
export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  currentConversationId: null,
  messages: {},
  isStreaming: false,
  streamingText: "",
  selectedModel: "gpt-4o",
  searchQuery: "",
  searchResults: null,

  createConversation(id, title) {
    set((state) => ({
      conversations: [
        { id, title, createdAt: Date.now(), updatedAt: Date.now() },
        ...state.conversations
      ],
      currentConversationId: id,
      messages: { ...state.messages, [id]: [] }
    }));
  },

  switchConversation(id) {
    set({ currentConversationId: id });
  },

  deleteConversation(id) {
    set((state) => {
      const { [id]: _, ...remainingMessages } = state.messages;
      const filtered = state.conversations.filter((c) => c.id !== id);
      return {
        conversations: filtered,
        messages: remainingMessages,
        currentConversationId:
          state.currentConversationId === id ? null : state.currentConversationId
      };
    });
  },

  addMessage(conversationId, message) {
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [...(state.messages[conversationId] ?? []), message]
      }
    }));
  },

  removeMessagesFrom(conversationId, messageId) {
    set((state) => {
      const msgs = state.messages[conversationId] ?? [];
      const idx = msgs.findIndex((m) => m.id === messageId);
      if (idx === -1) return state;
      return {
        messages: {
          ...state.messages,
          [conversationId]: msgs.slice(0, idx)
        }
      };
    });
  },

  updateLocalMessageContent(conversationId, messageId, newContent) {
    set((state) => {
      const msgs = state.messages[conversationId] ?? [];
      return {
        messages: {
          ...state.messages,
          [conversationId]: msgs.map((m) =>
            m.id === messageId ? { ...m, content: newContent } : m
          )
        }
      };
    });
  },

  updateConversationSystemPrompt(conversationId, systemPrompt) {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, systemPrompt } : c
      )
    }));
  },

  appendStreamingText(text) {
    set((state) => ({
      streamingText: state.streamingText + text
    }));
  },

  setStreaming(streaming) {
    set({
      isStreaming: streaming,
      streamingText: ""
    });
  },

  setSelectedModel(model) {
    set({ selectedModel: model });
  },

  setSearchQuery(query) {
    set({ searchQuery: query });
  },

  setSearchResults(results) {
    set({ searchResults: results });
  },

  clearSearch() {
    set({ searchQuery: "", searchResults: null });
  }
}));
