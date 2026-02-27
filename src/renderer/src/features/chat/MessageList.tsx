import type { ChatMessage } from "./store";

/** MessageList 属性 */
interface MessageListProps {
  messages: ChatMessage[];
  streamingText: string;
  isStreaming: boolean;
}

/**
 * 消息列表组件。
 * 渲染对话消息，区分 user/assistant 样式，支持流式文本实时显示。
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
            {msg.content}
          </div>
        </div>
      ))}
      {isStreaming && streamingText && (
        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-lg bg-muted px-4 py-2 text-foreground">
            {streamingText}
          </div>
        </div>
      )}
    </div>
  );
}
