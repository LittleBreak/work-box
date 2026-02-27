import { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import type { ChatMessage } from "./store";

/** MessageList 属性 */
interface MessageListProps {
  messages: ChatMessage[];
  streamingText: string;
  isStreaming: boolean;
  onCopy?: (id: string, content: string) => void;
  onRegenerate?: (id: string) => void;
  onEdit?: (id: string, newContent: string) => void;
}

/** remark / rehype 插件（避免每次渲染重建数组） */
const remarkPlugins = [remarkGfm];
const rehypePlugins = [rehypeHighlight];

/**
 * Markdown 渲染包装组件。
 * 使用 react-markdown + remark-gfm + rehype-highlight 渲染 AI 回复。
 */
function MarkdownContent({ content }: { content: string }): React.JSX.Element {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none break-words">
      <Markdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins}>
        {content}
      </Markdown>
    </div>
  );
}

/**
 * 消息列表组件。
 * 渲染对话消息，区分 user/assistant 样式，支持流式文本实时显示。
 * assistant 消息使用 Markdown 渲染。
 * 支持消息操作：复制、重新生成、编辑。
 */
export function MessageList({
  messages,
  streamingText,
  isStreaming,
  onCopy,
  onRegenerate,
  onEdit
}: MessageListProps): React.JSX.Element {
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");

  const handleEditStart = (msg: ChatMessage): void => {
    setEditingMessageId(msg.id);
    setEditingContent(msg.content);
  };

  const handleEditConfirm = (): void => {
    if (editingMessageId && onEdit) {
      onEdit(editingMessageId, editingContent);
    }
    setEditingMessageId(null);
    setEditingContent("");
  };

  const handleEditCancel = (): void => {
    setEditingMessageId(null);
    setEditingContent("");
  };

  return (
    <div data-testid="message-list" className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`group flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[80%] rounded-lg px-4 py-2 ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground"
            }`}
          >
            {editingMessageId === msg.id ? (
              <div className="flex flex-col gap-2">
                <textarea
                  className="w-full min-h-[60px] rounded border bg-background p-2 text-foreground"
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    title="确认"
                    onClick={handleEditConfirm}
                    className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground"
                  >
                    确认
                  </button>
                  <button
                    title="取消"
                    onClick={handleEditCancel}
                    className="rounded bg-muted px-2 py-1 text-xs text-foreground"
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : msg.role === "user" ? (
              msg.content
            ) : (
              <MarkdownContent content={msg.content} />
            )}
            {/* 操作按钮：非流式状态且非编辑模式时显示 */}
            {!isStreaming && editingMessageId !== msg.id && (
              <div className="mt-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {onCopy && (
                  <button
                    title="复制"
                    onClick={() => onCopy(msg.id, msg.content)}
                    className="rounded px-1.5 py-0.5 text-xs hover:bg-background/50"
                  >
                    复制
                  </button>
                )}
                {msg.role === "assistant" && onRegenerate && (
                  <button
                    title="重新生成"
                    onClick={() => onRegenerate(msg.id)}
                    className="rounded px-1.5 py-0.5 text-xs hover:bg-background/50"
                  >
                    重新生成
                  </button>
                )}
                {msg.role === "user" && onEdit && (
                  <button
                    title="编辑"
                    onClick={() => handleEditStart(msg)}
                    className="rounded px-1.5 py-0.5 text-xs hover:bg-background/50"
                  >
                    编辑
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
      {isStreaming && streamingText && (
        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-lg bg-muted px-4 py-2 text-foreground">
            <MarkdownContent content={streamingText} />
          </div>
        </div>
      )}
    </div>
  );
}
