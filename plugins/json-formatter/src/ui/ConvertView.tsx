/**
 * Convert View
 *
 * 转换模式：JSON↔TS 互转。支持方向切换按钮和复制输出。
 */
import { useCallback } from "react";
import { useJsonFormatterStore } from "./store";

/** 转换视图组件 */
export function ConvertView(): React.JSX.Element {
  const convertInput = useJsonFormatterStore((s) => s.convertInput);
  const convertOutput = useJsonFormatterStore((s) => s.convertOutput);
  const convertDirection = useJsonFormatterStore((s) => s.convertDirection);
  const copySuccess = useJsonFormatterStore((s) => s.copySuccess);
  const setConvertInput = useJsonFormatterStore((s) => s.setConvertInput);
  const doConvert = useJsonFormatterStore((s) => s.doConvert);
  const toggleConvertDirection = useJsonFormatterStore((s) => s.toggleConvertDirection);
  const copyToClipboard = useJsonFormatterStore((s) => s.copyToClipboard);

  const handleCopy = useCallback(() => {
    void copyToClipboard(convertOutput);
  }, [copyToClipboard, convertOutput]);

  const isJsonToTs = convertDirection === "json-to-ts";

  return (
    <div className="flex h-full flex-col" data-testid="convert-view">
      {/* Action bar */}
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <button
          className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground hover:bg-primary/90"
          onClick={doConvert}
          data-testid="btn-convert"
        >
          Convert
        </button>
        <button
          className="rounded border px-3 py-1 text-sm hover:bg-muted"
          onClick={toggleConvertDirection}
          data-testid="btn-toggle-direction"
        >
          {isJsonToTs ? "JSON → TS" : "TS → JSON"}
        </button>
        <button
          className="ml-auto rounded border px-3 py-1 text-sm hover:bg-muted"
          onClick={handleCopy}
          disabled={!convertOutput}
          data-testid="btn-copy-convert"
        >
          {copySuccess ? "Copied!" : "Copy"}
        </button>
      </div>

      {/* Input / Output panels */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col border-r">
          <div className="px-3 py-1 text-xs text-muted-foreground">
            {isJsonToTs ? "JSON" : "TypeScript Interface"}
          </div>
          <textarea
            className="flex-1 resize-none bg-transparent p-3 font-mono text-sm outline-none"
            value={convertInput}
            onChange={(e) => setConvertInput(e.target.value)}
            placeholder={isJsonToTs ? "Paste JSON here..." : "Paste TypeScript interface here..."}
            spellCheck={false}
            data-testid="convert-input"
          />
        </div>
        <div className="flex flex-1 flex-col">
          <div className="px-3 py-1 text-xs text-muted-foreground">
            {isJsonToTs ? "TypeScript Interface" : "JSON Sample"}
          </div>
          <textarea
            className="flex-1 resize-none bg-transparent p-3 font-mono text-sm outline-none"
            value={convertOutput}
            readOnly
            data-testid="convert-output"
          />
        </div>
      </div>
    </div>
  );
}
