/**
 * Tree View
 *
 * 树形模式：输入 JSON 后点击解析，以递归树形结构可视化。
 * 支持展开/折叠节点，显示 key、值类型和值内容。
 * 默认仅展开第一层，防止大 JSON 卡死 UI。
 */
import { useState, useCallback } from "react";
import { useJsonFormatterStore } from "./store.ts";

/** 值的类型标签 */
function getTypeLabel(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return `array[${value.length}]`;
  return typeof value;
}

/** 值的类型颜色 */
function getTypeColor(value: unknown): string {
  if (value === null) return "text-orange-400";
  if (typeof value === "string") return "text-green-400";
  if (typeof value === "number") return "text-blue-400";
  if (typeof value === "boolean") return "text-purple-400";
  if (Array.isArray(value)) return "text-yellow-400";
  if (typeof value === "object") return "text-cyan-400";
  return "text-muted-foreground";
}

/** 检查值是否可展开（object 或 array） */
function isExpandable(value: unknown): boolean {
  if (value === null) return false;
  return typeof value === "object";
}

/** 格式化叶子值为显示字符串 */
function formatLeafValue(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return `"${value}"`;
  return String(value);
}

/** 单个树节点属性 */
interface TreeNodeProps {
  nodeKey: string;
  value: unknown;
  depth: number;
  defaultExpanded: boolean;
}

/** 单个树节点组件 */
function TreeNode({ nodeKey, value, depth, defaultExpanded }: TreeNodeProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const toggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const expandable = isExpandable(value);
  const indent = depth * 16;

  return (
    <div data-testid="tree-node">
      {/* Node row */}
      <div
        className="flex items-center gap-1 px-2 py-0.5 hover:bg-muted/50 text-sm font-mono"
        style={{ paddingLeft: `${indent + 8}px` }}
      >
        {/* Expand/collapse toggle */}
        {expandable ? (
          <button
            className="w-4 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={toggle}
            data-testid="tree-toggle"
          >
            {expanded ? "▾" : "▸"}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        {/* Key name */}
        <span className="text-foreground">{nodeKey}</span>
        <span className="text-muted-foreground">:</span>

        {/* Type label */}
        <span className={`text-xs ${getTypeColor(value)}`} data-testid="tree-type">
          {getTypeLabel(value)}
        </span>

        {/* Leaf value */}
        {!expandable && (
          <span className={`ml-1 ${getTypeColor(value)}`} data-testid="tree-value">
            {formatLeafValue(value)}
          </span>
        )}
      </div>

      {/* Children (if expanded) */}
      {expandable && expanded && (
        <div data-testid="tree-children">
          {Array.isArray(value)
            ? value.map((item, index) => (
                <TreeNode
                  key={index}
                  nodeKey={String(index)}
                  value={item}
                  depth={depth + 1}
                  defaultExpanded={false}
                />
              ))
            : Object.entries(value as Record<string, unknown>).map(([k, v]) => (
                <TreeNode key={k} nodeKey={k} value={v} depth={depth + 1} defaultExpanded={false} />
              ))}
        </div>
      )}
    </div>
  );
}

/** 树形视图主组件 */
export function TreeView(): React.JSX.Element {
  const treeInput = useJsonFormatterStore((s) => s.treeInput);
  const treeData = useJsonFormatterStore((s) => s.treeData);
  const treeError = useJsonFormatterStore((s) => s.treeError);
  const setTreeInput = useJsonFormatterStore((s) => s.setTreeInput);
  const parseTree = useJsonFormatterStore((s) => s.parseTree);

  return (
    <div className="flex h-full flex-col" data-testid="tree-view">
      {/* Action bar */}
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <button
          className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground hover:bg-primary/90"
          onClick={parseTree}
          data-testid="btn-parse-tree"
        >
          Parse
        </button>
        {treeError && (
          <span className="text-sm text-red-500" data-testid="tree-error-msg">
            {treeError}
          </span>
        )}
      </div>

      {/* Input + Tree split */}
      <div className="flex flex-1 overflow-hidden">
        {/* Input panel */}
        <div className="flex w-1/3 shrink-0 flex-col border-r">
          <div className="px-3 py-1 text-xs text-muted-foreground">Input</div>
          <textarea
            className="flex-1 resize-none bg-transparent p-3 font-mono text-sm outline-none"
            value={treeInput}
            onChange={(e) => setTreeInput(e.target.value)}
            placeholder="Paste JSON here..."
            spellCheck={false}
            data-testid="tree-input"
          />
        </div>

        {/* Tree visualization */}
        <div className="flex-1 overflow-auto" data-testid="tree-output">
          {treeData === null ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Click Parse to visualize JSON
            </div>
          ) : Array.isArray(treeData) ? (
            treeData.map((item, index) => (
              <TreeNode
                key={index}
                nodeKey={String(index)}
                value={item}
                depth={0}
                defaultExpanded={true}
              />
            ))
          ) : typeof treeData === "object" ? (
            Object.entries(treeData as Record<string, unknown>).map(([k, v]) => (
              <TreeNode key={k} nodeKey={k} value={v} depth={0} defaultExpanded={true} />
            ))
          ) : (
            <div className="p-3 font-mono text-sm">
              <span className={getTypeColor(treeData)}>{formatLeafValue(treeData)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
