/**
 * Validate View
 *
 * 校验模式：输入 JSON → 点击校验按钮 → 显示校验结果。
 * 有效 JSON 显示绿色 ✓，无效显示红色错误信息和行列号。
 */
import { useJsonFormatterStore } from "./store.ts";

/** 校验视图组件 */
export function ValidateView(): React.JSX.Element {
  const validateInput = useJsonFormatterStore((s) => s.validateInput);
  const validationResult = useJsonFormatterStore((s) => s.validationResult);
  const setValidateInput = useJsonFormatterStore((s) => s.setValidateInput);
  const doValidate = useJsonFormatterStore((s) => s.doValidate);

  return (
    <div className="flex h-full flex-col" data-testid="validate-view">
      {/* Action bar */}
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <button
          className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground hover:bg-primary/90"
          onClick={doValidate}
          data-testid="btn-validate"
        >
          Validate
        </button>

        {/* Validation result indicator */}
        {validationResult && (
          <span
            className={`text-sm font-medium ${validationResult.valid ? "text-green-500" : "text-red-500"}`}
            data-testid="validation-indicator"
          >
            {validationResult.valid ? "Valid JSON" : "Invalid JSON"}
          </span>
        )}
      </div>

      {/* Input area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <textarea
          className="flex-1 resize-none bg-transparent p-3 font-mono text-sm outline-none"
          value={validateInput}
          onChange={(e) => setValidateInput(e.target.value)}
          placeholder="Paste JSON to validate..."
          spellCheck={false}
          data-testid="validate-input"
        />

        {/* Error details */}
        {validationResult && !validationResult.valid && validationResult.error && (
          <div
            className="border-t bg-red-500/5 px-3 py-2 text-sm text-red-500"
            data-testid="validation-error"
          >
            <span className="font-medium">
              Line {validationResult.error.line}, Column {validationResult.error.column}:
            </span>{" "}
            {validationResult.error.message}
          </div>
        )}
      </div>
    </div>
  );
}
