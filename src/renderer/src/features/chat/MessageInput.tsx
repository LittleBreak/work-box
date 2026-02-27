import { useState, useCallback } from "react";

/** MessageInput 属性 */
interface MessageInputProps {
  onSend: (content: string) => void;
  disabled: boolean;
}

/**
 * 消息输入组件。
 * 多行文本输入，Ctrl+Enter / Cmd+Enter 发送。
 */
export function MessageInput({ onSend, disabled }: MessageInputProps): React.JSX.Element {
  const [value, setValue] = useState("");

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue("");
  }, [value, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="flex gap-2 border-t p-4">
      <textarea
        role="textbox"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="输入消息... (Ctrl+Enter 发送)"
        className="min-h-[60px] flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        rows={3}
      />
      <button
        onClick={handleSend}
        disabled={disabled}
        aria-label="发送"
        className="self-end rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        发送
      </button>
    </div>
  );
}
