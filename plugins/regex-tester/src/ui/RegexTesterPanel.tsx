/**
 * Regex Tester Panel
 *
 * 顶层容器组件，包含正则输入框、Flag 切换、模板选择、
 * 测试文本输入、匹配高亮、匹配详情面板。
 */
import { useCallback } from "react";
import { useRegexTesterStore } from "./store.ts";
import { generateHighlightSegments } from "../regex-engine.ts";
import { REGEX_TEMPLATES } from "../templates.ts";

/** 可切换的正则标志位 */
const FLAGS = ["g", "i", "m", "s", "u"] as const;

/** 正则输入区 + Flag 切换 */
function RegexInput(): React.JSX.Element {
  const pattern = useRegexTesterStore((s) => s.pattern);
  const flags = useRegexTesterStore((s) => s.flags);
  const error = useRegexTesterStore((s) => s.error);
  const copySuccess = useRegexTesterStore((s) => s.copySuccess);
  const setPattern = useRegexTesterStore((s) => s.setPattern);
  const toggleFlag = useRegexTesterStore((s) => s.toggleFlag);
  const execute = useRegexTesterStore((s) => s.execute);
  const copyToClipboard = useRegexTesterStore((s) => s.copyToClipboard);

  const handlePatternChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPattern(e.target.value);
      execute();
    },
    [setPattern, execute]
  );

  const handleCopy = useCallback(() => {
    void copyToClipboard(pattern);
  }, [copyToClipboard, pattern]);

  const handleToggle = useCallback(
    (flag: string) => {
      toggleFlag(flag);
      // Re-execute after flag change
      setTimeout(() => useRegexTesterStore.getState().execute(), 0);
    },
    [toggleFlag]
  );

  return (
    <div className="space-y-2 border-b px-3 py-3">
      {/* Pattern input row */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">/</span>
        <input
          className="flex-1 bg-transparent font-mono text-sm outline-none"
          value={pattern}
          onChange={handlePatternChange}
          placeholder="Enter regex pattern..."
          spellCheck={false}
          data-testid="regex-input"
        />
        <span className="text-sm text-muted-foreground">/</span>
        <span className="text-sm font-mono text-muted-foreground">{flags}</span>
        <button
          className="ml-2 rounded border px-2 py-0.5 text-xs hover:bg-muted"
          onClick={handleCopy}
          data-testid="btn-copy-regex"
        >
          {copySuccess ? "Copied!" : "Copy"}
        </button>
      </div>

      {/* Flag toggles */}
      <div className="flex items-center gap-1">
        <span className="mr-1 text-xs text-muted-foreground">Flags:</span>
        {FLAGS.map((flag) => (
          <button
            key={flag}
            className={`rounded px-2 py-0.5 text-xs font-mono transition-colors ${
              flags.includes(flag)
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => handleToggle(flag)}
            data-testid={`flag-${flag}`}
          >
            {flag}
          </button>
        ))}
      </div>

      {/* Error display */}
      {error && (
        <div className="text-sm text-red-500" data-testid="regex-error">
          {error}
        </div>
      )}
    </div>
  );
}

/** 模板选择器 */
function TemplateSelector(): React.JSX.Element {
  const applyTemplate = useRegexTesterStore((s) => s.applyTemplate);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const idx = parseInt(e.target.value, 10);
      if (!isNaN(idx) && idx >= 0 && idx < REGEX_TEMPLATES.length) {
        applyTemplate(REGEX_TEMPLATES[idx]);
      }
    },
    [applyTemplate]
  );

  return (
    <div className="flex items-center gap-2 border-b px-3 py-2">
      <span className="text-xs text-muted-foreground">Template:</span>
      <select
        className="flex-1 rounded border bg-transparent px-2 py-1 text-sm outline-none"
        onChange={handleChange}
        defaultValue=""
        data-testid="template-selector"
      >
        <option value="" disabled>
          Select a template...
        </option>
        {REGEX_TEMPLATES.map((tmpl, idx) => (
          <option key={tmpl.name} value={idx}>
            {tmpl.name} — {tmpl.description}
          </option>
        ))}
      </select>
    </div>
  );
}

/** 测试文本输入区 */
function TestTextInput(): React.JSX.Element {
  const testText = useRegexTesterStore((s) => s.testText);
  const setTestText = useRegexTesterStore((s) => s.setTestText);
  const execute = useRegexTesterStore((s) => s.execute);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setTestText(e.target.value);
      execute();
    },
    [setTestText, execute]
  );

  return (
    <div className="flex flex-col border-b">
      <div className="px-3 py-1 text-xs text-muted-foreground">Test Text</div>
      <textarea
        className="min-h-[80px] resize-none bg-transparent p-3 font-mono text-sm outline-none"
        value={testText}
        onChange={handleChange}
        placeholder="Enter test text..."
        spellCheck={false}
        data-testid="test-text-input"
      />
    </div>
  );
}

/** 匹配高亮展示区 */
function MatchHighlight(): React.JSX.Element {
  const testText = useRegexTesterStore((s) => s.testText);
  const matches = useRegexTesterStore((s) => s.matches);

  const segments = generateHighlightSegments(testText, matches);

  return (
    <div className="border-b" data-testid="match-highlight">
      <div className="px-3 py-1 text-xs text-muted-foreground">Matches</div>
      <div className="min-h-[60px] whitespace-pre-wrap break-all p-3 font-mono text-sm">
        {segments.length === 0 ? (
          <span className="text-muted-foreground">No matches</span>
        ) : (
          segments.map((seg, idx) =>
            seg.isMatch ? (
              <mark
                key={idx}
                className="rounded bg-yellow-300/50 px-0.5 text-foreground dark:bg-yellow-500/30"
                data-testid="highlight-match"
              >
                {seg.text}
              </mark>
            ) : (
              <span key={idx} data-testid="highlight-text">
                {seg.text}
              </span>
            )
          )
        )}
      </div>
    </div>
  );
}

/** 匹配详情面板 */
function MatchDetails(): React.JSX.Element {
  const matches = useRegexTesterStore((s) => s.matches);

  return (
    <div className="flex-1 overflow-auto" data-testid="match-details">
      <div className="flex items-center gap-2 px-3 py-1">
        <span className="text-xs text-muted-foreground">Details</span>
        <span
          className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono"
          data-testid="match-count"
        >
          {matches.length}
        </span>
      </div>
      {matches.length === 0 ? (
        <div className="px-3 py-2 text-sm text-muted-foreground">No matches found</div>
      ) : (
        <div className="space-y-1 px-3 pb-3">
          {matches.map((m, idx) => (
            <div
              key={idx}
              className="rounded border p-2 text-xs font-mono"
              data-testid={`match-detail-${idx}`}
            >
              <div>
                <span className="text-muted-foreground">Match {idx + 1}:</span>{" "}
                <span className="text-primary">{m.fullMatch}</span>
              </div>
              <div className="text-muted-foreground">
                index: {m.index}, length: {m.length}
              </div>
              {m.captures.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Groups:</span>{" "}
                  {m.captures.map((c, ci) => (
                    <span key={ci} className="mr-2">
                      ${ci + 1}=&quot;{c}&quot;
                    </span>
                  ))}
                </div>
              )}
              {Object.keys(m.groups).length > 0 && (
                <div>
                  <span className="text-muted-foreground">Named:</span>{" "}
                  {Object.entries(m.groups).map(([name, val]) => (
                    <span key={name} className="mr-2">
                      {name}=&quot;{val}&quot;
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Regex Tester 面板主组件 */
export function RegexTesterPanel(): React.JSX.Element {
  return (
    <div className="flex h-full flex-col" data-testid="regex-tester-panel">
      <RegexInput />
      <TemplateSelector />
      <TestTextInput />
      <MatchHighlight />
      <MatchDetails />
    </div>
  );
}

export default RegexTesterPanel;
