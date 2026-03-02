/**
 * Format View
 *
 * 格式化模式：左侧输入 textarea，右侧格式化/压缩输出。
 * 提供格式化、压缩和复制输出按钮。
 */
import { useCallback } from "react";
import { useJsonFormatterStore } from "./store.ts";

/** 格式化视图组件 */
export function FormatView(): React.JSX.Element {
  const formatInput = useJsonFormatterStore((s) => s.formatInput);
  const formatOutput = useJsonFormatterStore((s) => s.formatOutput);
  const copySuccess = useJsonFormatterStore((s) => s.copySuccess);
  const setFormatInput = useJsonFormatterStore((s) => s.setFormatInput);
  const doFormat = useJsonFormatterStore((s) => s.doFormat);
  const doCompress = useJsonFormatterStore((s) => s.doCompress);
  const copyToClipboard = useJsonFormatterStore((s) => s.copyToClipboard);

  const handleCopy = useCallback(() => {
    void copyToClipboard(formatOutput);
  }, [copyToClipboard, formatOutput]);

  return (
    <div className="flex h-full flex-col" data-testid="format-view">
      {/* Action buttons */}
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <button
          className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground hover:bg-primary/90"
          onClick={doFormat}
          data-testid="btn-format"
        >
          Format
        </button>
        <button
          className="rounded bg-secondary px-3 py-1 text-sm text-secondary-foreground hover:bg-secondary/90"
          onClick={doCompress}
          data-testid="btn-compress"
        >
          Compress
        </button>
        <button
          className="ml-auto rounded border px-3 py-1 text-sm hover:bg-muted"
          onClick={handleCopy}
          disabled={!formatOutput}
          data-testid="btn-copy"
        >
          {copySuccess ? "Copied!" : "Copy"}
        </button>
      </div>

      {/* Input / Output panels */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col border-r">
          <div className="px-3 py-1 text-xs text-muted-foreground">Input</div>
          <textarea
            className="flex-1 resize-none bg-transparent p-3 font-mono text-sm outline-none"
            value={formatInput}
            onChange={(e) => setFormatInput(e.target.value)}
            placeholder="Paste JSON here..."
            spellCheck={false}
            data-testid="format-input"
          />
        </div>
        <div className="flex flex-1 flex-col">
          <div className="px-3 py-1 text-xs text-muted-foreground">Output</div>
          <textarea
            className="flex-1 resize-none bg-transparent p-3 font-mono text-sm outline-none"
            value={formatOutput}
            readOnly
            data-testid="format-output"
          />
        </div>
      </div>
    </div>
  );
}
