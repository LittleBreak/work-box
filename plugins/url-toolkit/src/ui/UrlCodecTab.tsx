/**
 * UrlCodecTab
 *
 * URL 编解码功能标签页，支持完整 URL 和组件模式。
 */
import { useState } from "react";
import { encodeFullUrl, decodeFullUrl, encodeComponent, decodeComponent } from "../url-codec";

/** 编解码模式 */
type CodecMode = "full" | "component";

/** URL 编解码标签页组件 */
export function UrlCodecTab(): React.JSX.Element {
  const [mode, setMode] = useState<CodecMode>("full");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleEncode = (): void => {
    setError(null);
    try {
      const result = mode === "full" ? encodeFullUrl(input) : encodeComponent(input);
      setOutput(result);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleDecode = (): void => {
    setError(null);
    try {
      const result = mode === "full" ? decodeFullUrl(input) : decodeComponent(input);
      setOutput(result);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleCopy = (): void => {
    window.workbox.clipboard.writeText(output);
  };

  return (
    <div className="flex flex-col gap-3" data-testid="codec-tab">
      <div className="flex gap-2">
        <button
          data-testid="mode-full"
          className={`rounded px-3 py-1 text-sm ${
            mode === "full" ? "bg-blue-500 text-white" : "bg-gray-200 dark:bg-gray-700"
          }`}
          onClick={() => setMode("full")}
        >
          完整 URL
        </button>
        <button
          data-testid="mode-component"
          className={`rounded px-3 py-1 text-sm ${
            mode === "component" ? "bg-blue-500 text-white" : "bg-gray-200 dark:bg-gray-700"
          }`}
          onClick={() => setMode("component")}
        >
          URL 组件
        </button>
      </div>

      <textarea
        data-testid="codec-input"
        className="w-full rounded border p-2 font-mono text-sm dark:border-gray-600 dark:bg-gray-800"
        rows={4}
        placeholder="输入要编码/解码的内容..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      <div className="flex gap-2">
        <button
          data-testid="btn-encode"
          className="rounded bg-blue-500 px-4 py-1.5 text-sm text-white hover:bg-blue-600"
          onClick={handleEncode}
        >
          编码
        </button>
        <button
          data-testid="btn-decode"
          className="rounded bg-green-500 px-4 py-1.5 text-sm text-white hover:bg-green-600"
          onClick={handleDecode}
        >
          解码
        </button>
      </div>

      {error && (
        <div
          data-testid="codec-error"
          className="rounded bg-red-50 p-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400"
        >
          {error}
        </div>
      )}

      <div className="relative">
        <textarea
          data-testid="codec-output"
          className="w-full rounded border p-2 font-mono text-sm dark:border-gray-600 dark:bg-gray-800"
          rows={4}
          readOnly
          value={output}
        />
        {output && (
          <button
            data-testid="btn-copy"
            className="absolute right-2 top-2 rounded bg-gray-200 px-2 py-1 text-xs hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
            onClick={handleCopy}
          >
            复制
          </button>
        )}
      </div>
    </div>
  );
}
