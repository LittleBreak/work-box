/**
 * Regex Tester UI Store
 *
 * Zustand 状态管理：正则 pattern、flags、测试文本、匹配结果、
 * 模板选择和剪贴板复制。
 */
import { create } from "zustand";
import { executeRegex, validateRegex } from "../regex-engine.ts";
import type { RegexMatch } from "../regex-engine.ts";
import type { RegexTemplate } from "../templates.ts";

/** Regex Tester UI 状态 */
interface RegexTesterState {
  /** 正则表达式字符串 */
  pattern: string;
  /** 正则标志位 */
  flags: string;
  /** 测试文本 */
  testText: string;
  /** 匹配结果 */
  matches: RegexMatch[];
  /** 错误信息（无效正则时） */
  error: string | null;
  /** 复制反馈 */
  copySuccess: boolean;

  /** 设置正则表达式 */
  setPattern: (pattern: string) => void;
  /** 设置标志位 */
  setFlags: (flags: string) => void;
  /** 设置测试文本 */
  setTestText: (text: string) => void;
  /** 切换单个标志位 */
  toggleFlag: (flag: string) => void;
  /** 执行匹配 */
  execute: () => void;
  /** 应用模板 */
  applyTemplate: (template: RegexTemplate) => void;
  /** 复制到剪贴板 */
  copyToClipboard: (text: string) => Promise<void>;
}

/** 初始状态值（导出用于测试重置） */
export const initialRegexTesterState = {
  pattern: "",
  flags: "g",
  testText: "",
  matches: [] as RegexMatch[],
  error: null as string | null,
  copySuccess: false
};

/** Regex Tester UI Zustand Store */
export const useRegexTesterStore = create<RegexTesterState>((set, get) => ({
  ...initialRegexTesterState,

  setPattern(pattern: string) {
    set({ pattern });
  },

  setFlags(flags: string) {
    set({ flags });
  },

  setTestText(text: string) {
    set({ testText: text });
  },

  toggleFlag(flag: string) {
    const { flags } = get();
    const newFlags = flags.includes(flag) ? flags.replace(flag, "") : flags + flag;
    set({ flags: newFlags });
  },

  execute() {
    const { pattern, flags, testText } = get();

    if (!pattern || !testText) {
      set({ matches: [], error: null });
      return;
    }

    const validation = validateRegex(pattern, flags);
    if (!validation.valid) {
      set({ matches: [], error: validation.error ?? "Invalid regex" });
      return;
    }

    const matches = executeRegex(pattern, flags, testText);
    set({ matches, error: null });
  },

  applyTemplate(template: RegexTemplate) {
    set({
      pattern: template.pattern,
      flags: template.flags,
      testText: template.sampleText
    });
    // Auto-execute after applying template
    get().execute();
  },

  async copyToClipboard(text: string) {
    try {
      await window.workbox.clipboard.writeText(text);
      set({ copySuccess: true });
      setTimeout(() => set({ copySuccess: false }), 2000);
    } catch {
      // Silently fail
    }
  }
}));
