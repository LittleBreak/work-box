import { useState, useRef, useCallback, useEffect } from "react";
import { useChatStore } from "./store";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";

/** 获取 workbox API（类型安全） */
function getWorkbox():
  | {
      ai?: {
        chat?: (id: string, c: string) => Promise<unknown>;
        onStream?: (cb: (e: Record<string, unknown>) => void) => () => void;
        regenerate?: (id: string) => Promise<unknown>;
        updateSystemPrompt?: (id: string, prompt: string | null) => Promise<void>;
        deleteMessagesAfter?: (convId: string, msgId: string) => Promise<void>;
        updateMessageContent?: (msgId: string, content: string) => Promise<void>;
        searchConversations?: (query: string) => Promise<unknown[]>;
        exportConversation?: (convId: string, format: string) => Promise<string | null>;
      };
      clipboard?: {
        writeText?: (text: string) => Promise<void>;
      };
    }
  | undefined {
  return (window as Record<string, unknown>).workbox as ReturnType<typeof getWorkbox>;
}

/** 搜索 debounce 延迟（毫秒） */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * AI 对话主视图。
 * 左右分栏：左侧对话列表（含搜索），右侧消息区 + 输入区。
 */
export function ChatView(): React.JSX.Element {
  const {
    conversations,
    currentConversationId,
    messages,
    isStreaming,
    streamingText,
    searchQuery,
    searchResults,
    createConversation,
    switchConversation,
    deleteConversation,
    addMessage,
    removeMessagesFrom,
    updateLocalMessageContent,
    updateConversationSystemPrompt,
    appendStreamingText,
    setStreaming,
    setSearchQuery,
    setSearchResults,
    clearSearch
  } = useChatStore();

  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [systemPromptDraft, setSystemPromptDraft] = useState("");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentMessages = currentConversationId ? (messages[currentConversationId] ?? []) : [];
  const currentConversation = conversations.find((c) => c.id === currentConversationId);

  // 决定左侧显示的对话列表：有搜索结果时显示搜索结果，否则显示全部
  const displayedConversations = searchResults ?? conversations;

  const handleNewConversation = (): void => {
    const id = crypto.randomUUID();
    createConversation(id, "新对话");
  };

  /** 搜索输入处理（debounce 300ms） */
  const handleSearchInput = useCallback(
    (value: string): void => {
      setSearchQuery(value);

      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }

      if (!value.trim()) {
        clearSearch();
        return;
      }

      searchTimerRef.current = setTimeout(() => {
        const workbox = getWorkbox();
        workbox?.ai?.searchConversations?.(value).then((results) => {
          setSearchResults(
            results as Array<{ id: string; title: string; systemPrompt?: string | null }>
          );
        });
      }, SEARCH_DEBOUNCE_MS);
    },
    [setSearchQuery, setSearchResults, clearSearch]
  );

  // 清理 debounce timer
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, []);

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

    const workbox = getWorkbox();
    if (!workbox?.ai?.onStream || !workbox?.ai?.chat) {
      setStreaming(false);
      return;
    }

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

    workbox.ai.chat(currentConversationId, content).catch(() => {
      setStreaming(false);
      unsubscribe();
    });
  };

  /** 复制消息内容到剪贴板 */
  const handleCopy = (_id: string, content: string): void => {
    const workbox = getWorkbox();
    workbox?.clipboard?.writeText?.(content);
  };

  /** 重新生成 assistant 消息 */
  const handleRegenerate = (assistantMsgId: string): void => {
    if (!currentConversationId) return;

    const workbox = getWorkbox();
    if (!workbox?.ai?.onStream || !workbox?.ai?.regenerate || !workbox?.ai?.deleteMessagesAfter)
      return;

    // 从本地 store 中移除目标消息及后续
    removeMessagesFrom(currentConversationId, assistantMsgId);

    // 从数据库中删除
    workbox.ai.deleteMessagesAfter(currentConversationId, assistantMsgId);

    // 开始流式响应
    setStreaming(true);

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

    workbox.ai.regenerate(currentConversationId).catch(() => {
      setStreaming(false);
      unsubscribe();
    });
  };

  /** 编辑用户消息并重新生成回复 */
  const handleEdit = (messageId: string, newContent: string): void => {
    if (!currentConversationId) return;

    const workbox = getWorkbox();
    if (
      !workbox?.ai?.onStream ||
      !workbox?.ai?.regenerate ||
      !workbox?.ai?.updateMessageContent ||
      !workbox?.ai?.deleteMessagesAfter
    )
      return;

    // 更新本地 store 中的消息内容
    updateLocalMessageContent(currentConversationId, messageId, newContent);

    // 找到编辑消息之后的下一条消息
    const msgs = messages[currentConversationId] ?? [];
    const editIdx = msgs.findIndex((m) => m.id === messageId);
    const nextMsg = editIdx >= 0 && editIdx < msgs.length - 1 ? msgs[editIdx + 1] : null;

    // 更新数据库中的消息内容
    workbox.ai.updateMessageContent(messageId, newContent);

    // 如果有后续消息，删除它们
    if (nextMsg) {
      removeMessagesFrom(currentConversationId, nextMsg.id);
      workbox.ai.deleteMessagesAfter(currentConversationId, nextMsg.id);
    }

    // 开始流式响应
    setStreaming(true);

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

    workbox.ai.regenerate(currentConversationId).catch(() => {
      setStreaming(false);
      unsubscribe();
    });
  };

  /** 打开系统 Prompt 编辑对话框 */
  const handleOpenSystemPrompt = (): void => {
    setSystemPromptDraft(currentConversation?.systemPrompt ?? "");
    setShowSystemPrompt(true);
  };

  /** 保存系统 Prompt */
  const handleSaveSystemPrompt = (): void => {
    if (!currentConversationId) return;
    const prompt = systemPromptDraft.trim() || null;
    const workbox = getWorkbox();
    workbox?.ai?.updateSystemPrompt?.(currentConversationId, prompt);
    updateConversationSystemPrompt(currentConversationId, prompt);
    setShowSystemPrompt(false);
  };

  /** 导出对话 */
  const handleExport = (format: string): void => {
    if (!currentConversationId) return;
    const workbox = getWorkbox();
    workbox?.ai?.exportConversation?.(currentConversationId, format);
    setShowExportMenu(false);
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

        {/* 搜索框 */}
        <div className="border-b px-3 py-2">
          <input
            type="text"
            placeholder="搜索对话..."
            value={searchQuery}
            onChange={(e) => handleSearchInput(e.target.value)}
            className="w-full rounded border bg-background px-2 py-1 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {displayedConversations.map((conv) => (
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
            {/* 顶部工具栏 */}
            <div className="flex items-center justify-end gap-1 border-b px-4 py-2">
              <div className="relative">
                <button
                  title="导出对话"
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  &#8681;
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 top-full z-10 mt-1 w-32 rounded-md border bg-background shadow-md">
                    <button
                      onClick={() => handleExport("markdown")}
                      className="w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
                    >
                      Markdown
                    </button>
                    <button
                      onClick={() => handleExport("json")}
                      className="w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
                    >
                      JSON
                    </button>
                  </div>
                )}
              </div>
              <button
                title="系统 Prompt"
                onClick={handleOpenSystemPrompt}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                &#9881;
              </button>
            </div>
            <MessageList
              messages={currentMessages}
              streamingText={streamingText}
              isStreaming={isStreaming}
              onCopy={handleCopy}
              onRegenerate={handleRegenerate}
              onEdit={handleEdit}
            />
            <MessageInput onSend={handleSend} disabled={isStreaming} />

            {/* 系统 Prompt 对话框 */}
            {showSystemPrompt && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="w-[480px] rounded-lg bg-background p-6 shadow-lg">
                  <h3 className="mb-4 text-lg font-medium">系统 Prompt</h3>
                  <textarea
                    className="w-full min-h-[120px] rounded border bg-muted p-3 text-sm"
                    placeholder="输入系统 Prompt..."
                    value={systemPromptDraft}
                    onChange={(e) => setSystemPromptDraft(e.target.value)}
                  />
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      onClick={() => setShowSystemPrompt(false)}
                      className="rounded-md px-3 py-1.5 text-sm hover:bg-muted"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleSaveSystemPrompt}
                      className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90"
                    >
                      保存
                    </button>
                  </div>
                </div>
              </div>
            )}
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
