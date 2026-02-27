import { useState, useCallback } from "react";
import type { Attachment } from "./store";

/** 文件大小上限：100KB */
const MAX_FILE_SIZE = 100 * 1024;

/** MessageInput 属性 */
interface MessageInputProps {
  onSend: (content: string) => void;
  disabled: boolean;
  attachments: Attachment[];
  onAddAttachment: (attachment: Attachment) => void;
  onRemoveAttachment: (id: string) => void;
}

/** 格式化文件大小为人类可读字符串 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  return `${kb.toFixed(1)} KB`;
}

/**
 * 消息输入组件。
 * 多行文本输入，Ctrl+Enter / Cmd+Enter 发送。
 * 支持文件拖拽附件和附件按钮。
 */
export function MessageInput({
  onSend,
  disabled,
  attachments,
  onAddAttachment,
  onRemoveAttachment
}: MessageInputProps): React.JSX.Element {
  const [value, setValue] = useState("");
  const [isDragging, setIsDragging] = useState(false);

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

  /** 处理拖拽悬停 */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  /** 处理拖拽离开 */
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  /** 处理文件拖拽放置 */
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      for (const file of files) {
        if (file.size > MAX_FILE_SIZE) continue;

        const filePath = (file as File & { path?: string }).path ?? file.name;

        const reader = new FileReader();
        reader.onload = (): void => {
          const content = reader.result as string;
          onAddAttachment({
            id: crypto.randomUUID(),
            fileName: file.name,
            filePath,
            fileSize: file.size,
            content
          });
        };
        reader.readAsText(file);
      }
    },
    [onAddAttachment]
  );

  /** 处理附件按钮点击（通过 workbox.workspace.selectFile） */
  const handleAttachClick = useCallback(async () => {
    const workbox = (window as Record<string, unknown>).workbox as
      | {
          workspace?: { selectFile?: () => Promise<string | null> };
          fs?: {
            readFile?: (path: string) => Promise<string>;
            stat?: (path: string) => Promise<{ size: number }>;
          };
        }
      | undefined;

    if (!workbox?.workspace?.selectFile || !workbox?.fs?.readFile || !workbox?.fs?.stat) return;

    const filePath = await workbox.workspace.selectFile();
    if (!filePath) return;

    const stat = await workbox.fs.stat(filePath);
    if (stat.size > MAX_FILE_SIZE) return;

    const content = await workbox.fs.readFile(filePath);
    const fileName = filePath.split("/").pop() ?? filePath;

    onAddAttachment({
      id: crypto.randomUUID(),
      fileName,
      filePath,
      fileSize: stat.size,
      content
    });
  }, [onAddAttachment]);

  return (
    <div
      data-testid="message-input-area"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`border-t ${isDragging ? "bg-primary/10" : ""}`}
    >
      {/* 附件预览列表 */}
      {attachments.length > 0 && (
        <div data-testid="attachment-list" className="flex flex-wrap gap-2 px-4 pt-3">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-1.5 rounded-md border bg-muted/50 px-2 py-1 text-xs"
            >
              <span className="max-w-[120px] truncate font-medium">{att.fileName}</span>
              <span className="text-muted-foreground">{formatFileSize(att.fileSize)}</span>
              <button
                title={`移除 ${att.fileName}`}
                onClick={() => onRemoveAttachment(att.id)}
                className="ml-0.5 text-muted-foreground hover:text-destructive"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 输入区域 */}
      <div className="flex gap-2 p-4">
        <button
          title="添加附件"
          onClick={handleAttachClick}
          disabled={disabled}
          className="self-end rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          &#128206;
        </button>
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
    </div>
  );
}
