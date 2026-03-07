/**
 * JSON Formatter Toolbar
 *
 * 模式标签切换组件，支持 Format / Validate / Convert / Diff / Tree 五个模式。
 */
import { useCallback } from "react";
import { useJsonFormatterStore } from "./store";
import type { JsonMode } from "./store";

/** 模式标签定义 */
interface TabDef {
  id: JsonMode;
  label: string;
}

/** 可用模式列表 */
const TABS: TabDef[] = [
  { id: "format", label: "Format" },
  { id: "validate", label: "Validate" },
  { id: "convert", label: "Convert" },
  { id: "diff", label: "Diff" },
  { id: "tree", label: "Tree" }
];

/** 模式切换工具栏 */
export function Toolbar(): React.JSX.Element {
  const mode = useJsonFormatterStore((s) => s.mode);
  const setMode = useJsonFormatterStore((s) => s.setMode);

  const handleTabClick = useCallback(
    (tab: JsonMode) => {
      setMode(tab);
    },
    [setMode]
  );

  return (
    <div className="flex items-center border-b px-2" data-testid="toolbar">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
            mode === tab.id
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => handleTabClick(tab.id)}
          data-testid={`tab-${tab.id}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
