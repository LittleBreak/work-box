import { useChatStore } from "./store";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";

/**
 * AI 对话主视图。
 * 左右分栏：左侧对话列表，右侧消息区 + 输入区。
 */
export function ChatView(): React.JSX.Element {
  const {
    conversations,
    currentConversationId,
    messages,
    isStreaming,
    streamingText,
    createConversation,
    switchConversation,
    deleteConversation,
    addMessage,
    appendStreamingText,
    setStreaming
  } = useChatStore();

  const currentMessages = currentConversationId ? (messages[currentConversationId] ?? []) : [];

  const handleNewConversation = (): void => {
    const id = crypto.randomUUID();
    createConversation(id, "新对话");
  };

  const handleSend = (content: string): void => {
    if (!currentConversationId) return;

    // 添加用户消息到本地 store
    addMessage(currentConversationId, {
      id: crypto.randomUUID(),
      role: "user",
      content
    });

    // 开始流式响应
    setStreaming(true);

    // 调用后端 AI 接口
    const workbox = (window as Record<string, unknown>).workbox as
      | {
          ai?: {
            chat?: (id: string, c: string) => Promise<unknown>;
            onStream?: (cb: (e: Record<string, unknown>) => void) => () => void;
          };
        }
      | undefined;

    if (workbox?.ai?.onStream) {
      const unsubscribe = workbox.ai.onStream((event: Record<string, unknown>) => {
        if (event.type === "text-delta") {
          appendStreamingText(event.textDelta as string);
        } else if (event.type === "finish") {
          const text = useChatStore.getState().streamingText;
          if (text && currentConversationId) {
            addMessage(currentConversationId, {
              id: crypto.randomUUID(),
              role: "assistant",
              content: text
            });
          }
          setStreaming(false);
          unsubscribe();
        } else if (event.type === "error") {
          setStreaming(false);
          unsubscribe();
        }
      });

      workbox.ai.chat?.(currentConversationId, content);
    }
  };

  return (
    <div data-testid="page-chat" className="flex h-full">
      {/* 左侧：对话列表 */}
      <div className="flex w-60 flex-col border-r bg-muted/30">
        <div className="flex items-center justify-between border-b p-3">
          <span className="text-sm font-medium">对话</span>
          <button
            onClick={handleNewConversation}
            className="rounded-md px-2 py-1 text-xs hover:bg-muted"
          >
            新建对话
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => switchConversation(conv.id)}
              className={`flex cursor-pointer items-center justify-between px-3 py-2 text-sm hover:bg-muted ${
                conv.id === currentConversationId ? "bg-muted" : ""
              }`}
            >
              <span className="truncate">{conv.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConversation(conv.id);
                }}
                className="ml-2 text-xs text-muted-foreground hover:text-destructive"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 右侧：消息区 + 输入区 */}
      <div className="flex flex-1 flex-col">
        {currentConversationId ? (
          <>
            <MessageList
              messages={currentMessages}
              streamingText={streamingText}
              isStreaming={isStreaming}
            />
            <MessageInput onSend={handleSend} disabled={isStreaming} />
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <p className="text-lg text-muted-foreground">开始对话</p>
            <button
              onClick={handleNewConversation}
              className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
            >
              新建对话
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
