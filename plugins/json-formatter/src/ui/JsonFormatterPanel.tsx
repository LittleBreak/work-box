/**
 * JSON Formatter Panel - 占位组件
 *
 * 将在 5.10 中实现完整 UI，包括双栏编辑器、操作工具栏、
 * 树形可视化和 Diff 对比视图。
 */

/** JSON Formatter 面板主组件 */
export function JsonFormatterPanel(): React.JSX.Element {
  return (
    <div data-testid="json-formatter-panel" className="flex h-full items-center justify-center">
      <p className="text-muted-foreground">JSON Formatter — Coming Soon</p>
    </div>
  );
}

export default JsonFormatterPanel;
