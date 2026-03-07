/**
 * UrlParserTab
 *
 * URL 参数解析标签页，展示 URL 结构分解和 query 参数表格。
 */
import { useState } from "react";
import { parseUrl, type ParsedUrl } from "../url-parser";

/** URL 参数解析标签页组件 */
export function UrlParserTab(): React.JSX.Element {
  const [input, setInput] = useState("");
  const [parsed, setParsed] = useState<ParsedUrl | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleParse = (): void => {
    setError(null);
    setParsed(null);
    try {
      setParsed(parseUrl(input));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleCopyParam = (index: number): void => {
    if (!parsed) return;
    const param = parsed.params[index];
    window.workbox.clipboard.writeText(`${param.key}=${param.value}`);
  };

  return (
    <div className="flex flex-col gap-3" data-testid="parser-tab">
      <div className="flex gap-2">
        <input
          data-testid="parser-input"
          className="flex-1 rounded border p-2 font-mono text-sm dark:border-gray-600 dark:bg-gray-800"
          placeholder="输入 URL..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          data-testid="btn-parse"
          className="rounded bg-blue-500 px-4 py-1.5 text-sm text-white hover:bg-blue-600"
          onClick={handleParse}
        >
          解析
        </button>
      </div>

      {error && (
        <div
          data-testid="parser-error"
          className="rounded bg-red-50 p-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400"
        >
          {error}
        </div>
      )}

      {parsed && (
        <>
          <div className="rounded border p-3 text-sm dark:border-gray-600">
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
              <span className="font-medium text-gray-500">Protocol</span>
              <span data-testid="url-protocol" className="font-mono">
                {parsed.protocol}
              </span>
              <span className="font-medium text-gray-500">Host</span>
              <span data-testid="url-host" className="font-mono">
                {parsed.host}
              </span>
              <span className="font-medium text-gray-500">Pathname</span>
              <span data-testid="url-pathname" className="font-mono">
                {parsed.pathname}
              </span>
              <span className="font-medium text-gray-500">Search</span>
              <span data-testid="url-search" className="font-mono">
                {parsed.search}
              </span>
              <span className="font-medium text-gray-500">Hash</span>
              <span data-testid="url-hash" className="font-mono">
                {parsed.hash}
              </span>
            </div>
          </div>

          {parsed.params.length === 0 ? (
            <div
              data-testid="no-params"
              className="rounded bg-gray-50 p-3 text-center text-sm text-gray-500 dark:bg-gray-800"
            >
              无 query 参数
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-600">
                  <th className="p-2 text-left font-medium text-gray-500">参数名</th>
                  <th className="p-2 text-left font-medium text-gray-500">值</th>
                  <th className="w-16 p-2" />
                </tr>
              </thead>
              <tbody>
                {parsed.params.map((param, i) => (
                  <tr key={i} className="border-b dark:border-gray-700">
                    <td className="p-2 font-mono">{param.key}</td>
                    <td className="p-2 font-mono">{param.value}</td>
                    <td className="p-2">
                      <button
                        data-testid={`btn-copy-param-${i}`}
                        className="rounded bg-gray-200 px-2 py-0.5 text-xs hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
                        onClick={() => handleCopyParam(i)}
                      >
                        复制
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
