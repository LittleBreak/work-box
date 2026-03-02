/**
 * JSON Formatter Panel
 *
 * 顶层容器组件，包含模式标签切换工具栏和五个功能视图：
 * Format / Validate / Convert / Diff / Tree。
 */
import { useJsonFormatterStore } from "./store.ts";
import { Toolbar } from "./Toolbar.tsx";
import { FormatView } from "./FormatView.tsx";
import { ValidateView } from "./ValidateView.tsx";
import { ConvertView } from "./ConvertView.tsx";
import { DiffView } from "./DiffView.tsx";
import { TreeView } from "./TreeView.tsx";

/** JSON Formatter 面板主组件 */
export function JsonFormatterPanel(): React.JSX.Element {
  const mode = useJsonFormatterStore((s) => s.mode);

  return (
    <div className="flex h-full flex-col" data-testid="json-formatter-panel">
      <Toolbar />
      <div className="flex-1 overflow-hidden">
        {mode === "format" && <FormatView />}
        {mode === "validate" && <ValidateView />}
        {mode === "convert" && <ConvertView />}
        {mode === "diff" && <DiffView />}
        {mode === "tree" && <TreeView />}
      </div>
    </div>
  );
}

export default JsonFormatterPanel;
