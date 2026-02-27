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
  createConversation: (id: string, title: string) => void;
  switchConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  addMessage: (conversationId: string, message: ChatMessage) => void;
  appendStreamingText: (text: string) => void;
  setStreaming: (streaming: boolean) => void;
  setSelectedModel: (model: string) => void;
}

/** Chat Zustand Store */
export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  currentConversationId: null,
  messages: {},
  isStreaming: false,
  streamingText: "",
  selectedModel: "gpt-4o",

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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [id]: _removed, ...remainingMessages } = state.messages;
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

  appendStreamingText(text) {
    set((state) => ({
      streamingText: state.streamingText + text
    }));
  },

  setStreaming(streaming) {
    set({
      isStreaming: streaming,
      ...(streaming ? {} : { streamingText: "" })
    });
  },

  setSelectedModel(model) {
    set({ selectedModel: model });
  }
}));
