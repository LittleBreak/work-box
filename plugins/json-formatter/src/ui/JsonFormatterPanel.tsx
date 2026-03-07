/**
 * JSON Formatter Panel
 *
 * 顶层容器组件，包含模式标签切换工具栏和五个功能视图：
 * Format / Validate / Convert / Diff / Tree。
 */
import { useJsonFormatterStore } from "./store";
import { Toolbar } from "./Toolbar";
import { FormatView } from "./FormatView";
import { ValidateView } from "./ValidateView";
import { ConvertView } from "./ConvertView";
import { DiffView } from "./DiffView";
import { TreeView } from "./TreeView";

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
