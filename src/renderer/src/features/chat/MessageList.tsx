import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import type { ChatMessage } from "./store";

/** MessageList 属性 */
interface MessageListProps {
  messages: ChatMessage[];
  streamingText: string;
  isStreaming: boolean;
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
 */
export function MessageList({
  messages,
  streamingText,
  isStreaming
}: MessageListProps): React.JSX.Element {
  return (
    <div data-testid="message-list" className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[80%] rounded-lg px-4 py-2 ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground"
            }`}
          >
            {msg.role === "user" ? msg.content : <MarkdownContent content={msg.content} />}
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
