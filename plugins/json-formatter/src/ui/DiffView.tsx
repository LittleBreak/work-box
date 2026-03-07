/**
 * Diff View
 *
 * Diff 模式：左右两个 textarea 输入，点击 Diff 按钮后
 * 在下方显示结构化差异列表（颜色编码）。
 */
import { useJsonFormatterStore } from "./store";
import type { JsonDiffEntry } from "../json-ops";

/** 格式化值为显示字符串 */
function formatValue(value: unknown): string {
  if (value === undefined) return "undefined";
  return JSON.stringify(value);
}

/** Diff 条目颜色映射 */
const DIFF_COLORS: Record<JsonDiffEntry["type"], string> = {
  added: "bg-green-500/10 text-green-500",
  removed: "bg-red-500/10 text-red-500",
  changed: "bg-yellow-500/10 text-yellow-500",
  unchanged: "text-muted-foreground"
};

/** Diff 条目前缀 */
const DIFF_PREFIXES: Record<JsonDiffEntry["type"], string> = {
  added: "+",
  removed: "-",
  changed: "~",
  unchanged: " "
};

/** Diff 视图组件 */
export function DiffView(): React.JSX.Element {
  const diffLeft = useJsonFormatterStore((s) => s.diffLeft);
  const diffRight = useJsonFormatterStore((s) => s.diffRight);
  const diffEntries = useJsonFormatterStore((s) => s.diffEntries);
  const setDiffLeft = useJsonFormatterStore((s) => s.setDiffLeft);
  const setDiffRight = useJsonFormatterStore((s) => s.setDiffRight);
  const doDiff = useJsonFormatterStore((s) => s.doDiff);

  return (
    <div className="flex h-full flex-col" data-testid="diff-view">
      {/* Action bar */}
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <button
          className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground hover:bg-primary/90"
          onClick={doDiff}
          data-testid="btn-diff"
        >
          Diff
        </button>
      </div>

      {/* Input panels */}
      <div className="flex flex-1 overflow-hidden border-b">
        <div className="flex flex-1 flex-col border-r">
          <div className="px-3 py-1 text-xs text-muted-foreground">Left (Old)</div>
          <textarea
            className="flex-1 resize-none bg-transparent p-3 font-mono text-sm outline-none"
            value={diffLeft}
            onChange={(e) => setDiffLeft(e.target.value)}
            placeholder="Paste JSON A..."
            spellCheck={false}
            data-testid="diff-left-input"
          />
        </div>
        <div className="flex flex-1 flex-col">
          <div className="px-3 py-1 text-xs text-muted-foreground">Right (New)</div>
          <textarea
            className="flex-1 resize-none bg-transparent p-3 font-mono text-sm outline-none"
            value={diffRight}
            onChange={(e) => setDiffRight(e.target.value)}
            placeholder="Paste JSON B..."
            spellCheck={false}
            data-testid="diff-right-input"
          />
        </div>
      </div>

      {/* Diff results */}
      <div className="max-h-64 overflow-auto font-mono text-xs" data-testid="diff-results">
        {diffEntries.length === 0 ? (
          <div className="flex items-center justify-center p-4 text-muted-foreground">
            Click Diff to compare
          </div>
        ) : (
          diffEntries
            .filter((entry) => entry.type !== "unchanged")
            .map((entry, index) => (
              <div
                key={index}
                className={`px-3 py-1 ${DIFF_COLORS[entry.type]}`}
                data-testid={`diff-entry-${entry.type}`}
              >
                <span className="mr-2 select-none">{DIFF_PREFIXES[entry.type]}</span>
                <span className="font-medium">{entry.path}</span>
                {entry.type === "changed" && (
                  <span>
                    : {formatValue(entry.oldValue)} → {formatValue(entry.newValue)}
                  </span>
                )}
                {entry.type === "added" && <span>: {formatValue(entry.newValue)}</span>}
                {entry.type === "removed" && <span>: {formatValue(entry.oldValue)}</span>}
              </div>
            ))
        )}
      </div>
    </div>
  );
}
