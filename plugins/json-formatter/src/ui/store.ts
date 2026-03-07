import { create } from "zustand";
import {
  formatJson,
  compressJson,
  validateJson,
  jsonToTypeScript,
  typeScriptToJson,
  diffJson
} from "../json-ops";
import type { JsonValidationResult, JsonDiffEntry } from "../json-ops";

/** JSON Formatter 面板模式 */
export type JsonMode = "format" | "validate" | "convert" | "diff" | "tree";

/** JSON↔TS 转换方向 */
export type ConvertDirection = "json-to-ts" | "ts-to-json";

/** JSON Formatter UI 状态 */
interface JsonFormatterState {
  /** 当前模式 */
  mode: JsonMode;
  /** 格式化模式：输入内容 */
  formatInput: string;
  /** 格式化模式：输出内容 */
  formatOutput: string;
  /** 校验模式：输入内容 */
  validateInput: string;
  /** 校验模式：校验结果 */
  validationResult: JsonValidationResult | null;
  /** 转换模式：输入内容 */
  convertInput: string;
  /** 转换模式：输出内容 */
  convertOutput: string;
  /** 转换模式：方向 */
  convertDirection: ConvertDirection;
  /** Diff 模式：左侧输入 */
  diffLeft: string;
  /** Diff 模式：右侧输入 */
  diffRight: string;
  /** Diff 模式：差异结果 */
  diffEntries: JsonDiffEntry[];
  /** 树形模式：输入内容 */
  treeInput: string;
  /** 树形模式：解析后的 JSON 数据 */
  treeData: unknown;
  /** 树形模式：解析错误 */
  treeError: string | null;
  /** 复制反馈 */
  copySuccess: boolean;

  /** 切换模式 */
  setMode: (mode: JsonMode) => void;
  /** 执行格式化 */
  doFormat: () => void;
  /** 执行压缩 */
  doCompress: () => void;
  /** 执行校验 */
  doValidate: () => void;
  /** 执行转换 */
  doConvert: () => void;
  /** 切换转换方向 */
  toggleConvertDirection: () => void;
  /** 执行 Diff */
  doDiff: () => void;
  /** 解析树形数据 */
  parseTree: () => void;
  /** 复制到剪贴板 */
  copyToClipboard: (text: string) => Promise<void>;
  /** 设置格式化输入 */
  setFormatInput: (value: string) => void;
  /** 设置校验输入 */
  setValidateInput: (value: string) => void;
  /** 设置转换输入 */
  setConvertInput: (value: string) => void;
  /** 设置 Diff 左侧输入 */
  setDiffLeft: (value: string) => void;
  /** 设置 Diff 右侧输入 */
  setDiffRight: (value: string) => void;
  /** 设置树形输入 */
  setTreeInput: (value: string) => void;
}

/** 初始状态值（导出用于测试重置） */
export const initialJsonFormatterState = {
  mode: "format" as JsonMode,
  formatInput: "",
  formatOutput: "",
  validateInput: "",
  validationResult: null as JsonValidationResult | null,
  convertInput: "",
  convertOutput: "",
  convertDirection: "json-to-ts" as ConvertDirection,
  diffLeft: "",
  diffRight: "",
  diffEntries: [] as JsonDiffEntry[],
  treeInput: "",
  treeData: null as unknown,
  treeError: null as string | null,
  copySuccess: false
};

/** JSON Formatter UI Zustand Store */
export const useJsonFormatterStore = create<JsonFormatterState>((set, get) => ({
  ...initialJsonFormatterState,

  setMode(mode: JsonMode) {
    set({ mode });
  },

  doFormat() {
    const { formatInput } = get();
    try {
      const output = formatJson(formatInput);
      set({ formatOutput: output });
    } catch (e) {
      set({ formatOutput: `Error: ${e instanceof Error ? e.message : String(e)}` });
    }
  },

  doCompress() {
    const { formatInput } = get();
    try {
      const output = compressJson(formatInput);
      set({ formatOutput: output });
    } catch (e) {
      set({ formatOutput: `Error: ${e instanceof Error ? e.message : String(e)}` });
    }
  },

  doValidate() {
    const { validateInput } = get();
    const result = validateJson(validateInput);
    set({ validationResult: result });
  },

  doConvert() {
    const { convertInput, convertDirection } = get();
    try {
      const output =
        convertDirection === "json-to-ts"
          ? jsonToTypeScript(convertInput)
          : typeScriptToJson(convertInput);
      set({ convertOutput: output });
    } catch (e) {
      set({ convertOutput: `Error: ${e instanceof Error ? e.message : String(e)}` });
    }
  },

  toggleConvertDirection() {
    const { convertDirection } = get();
    set({
      convertDirection: convertDirection === "json-to-ts" ? "ts-to-json" : "json-to-ts",
      convertInput: "",
      convertOutput: ""
    });
  },

  doDiff() {
    const { diffLeft, diffRight } = get();
    try {
      const entries = diffJson(diffLeft, diffRight);
      set({ diffEntries: entries });
    } catch (e) {
      set({
        diffEntries: [
          {
            path: "",
            type: "changed",
            oldValue: `Error: ${e instanceof Error ? e.message : String(e)}`
          }
        ]
      });
    }
  },

  parseTree() {
    const { treeInput } = get();
    try {
      const data: unknown = JSON.parse(treeInput);
      set({ treeData: data, treeError: null });
    } catch (e) {
      set({ treeData: null, treeError: e instanceof Error ? e.message : String(e) });
    }
  },

  async copyToClipboard(text: string) {
    try {
      await window.workbox.clipboard.writeText(text);
      set({ copySuccess: true });
      setTimeout(() => set({ copySuccess: false }), 2000);
    } catch {
      // Silently fail
    }
  },

  setFormatInput(value: string) {
    set({ formatInput: value });
  },

  setValidateInput(value: string) {
    set({ validateInput: value });
  },

  setConvertInput(value: string) {
    set({ convertInput: value });
  },

  setDiffLeft(value: string) {
    set({ diffLeft: value });
  },

  setDiffRight(value: string) {
    set({ diffRight: value });
  },

  setTreeInput(value: string) {
    set({ treeInput: value });
  }
}));
