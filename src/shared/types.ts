/** 主进程/渲染进程共享类型定义 */

/** Shell 命令执行结果 */
export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  signal?: string;
}

/** Shell 命令执行选项 */
export interface ExecOptions {
  cwd?: string;
  timeout?: number;
  env?: Record<string, string>;
}

/** 文件元信息 */
export interface FileStat {
  size: number;
  isDirectory: boolean;
  isFile: boolean;
  mtime: number;
}

// ---- 运行时辅助函数 ----

/** 创建 ExecResult 对象 */
export function createExecResult(params: {
  stdout: string;
  stderr: string;
  exitCode: number;
  signal?: string;
}): ExecResult {
  return {
    stdout: params.stdout,
    stderr: params.stderr,
    exitCode: params.exitCode,
    signal: params.signal
  };
}

/** 创建 FileStat 对象 */
export function createFileStat(params: {
  size: number;
  isDirectory: boolean;
  isFile: boolean;
  mtime: number;
}): FileStat {
  return {
    size: params.size,
    isDirectory: params.isDirectory,
    isFile: params.isFile,
    mtime: params.mtime
  };
}

// ---- 应用设置 ----

/** 应用设置接口 - 所有可持久化的用户设置 */
export interface AppSettings {
  // ---- 通用设置 ----
  theme: "light" | "dark";
  language: "en" | "zh"; // 占位，本阶段不实现 i18n

  // ---- AI 设置 ----
  aiProvider: "openai" | "claude" | "ollama" | "custom";
  aiApiKey: string; // 存储时不加密
  aiBaseUrl: string; // 自定义 API 端点
  aiModel: string; // 当前选择的模型名称
  aiTemperature: number; // 范围 [0, 2]

  // ---- 插件设置 ----
  pluginDir: string; // 插件目录路径，只读展示
}

/** 默认设置值 */
export const DEFAULT_SETTINGS: AppSettings = {
  theme: "dark",
  language: "zh",
  aiProvider: "openai",
  aiApiKey: "",
  aiBaseUrl: "https://api.openai.com/v1",
  aiModel: "gpt-4o",
  aiTemperature: 0.7,
  pluginDir: "~/.workbox/plugins"
};

/** 校验部分设置值，不通过时 throw Error */
export function validateSettings(partial: Partial<AppSettings>): void {
  if ("theme" in partial && partial.theme !== "light" && partial.theme !== "dark") {
    throw new Error(`Invalid theme: ${partial.theme}. Must be 'light' or 'dark'`);
  }
  if ("language" in partial && partial.language !== "en" && partial.language !== "zh") {
    throw new Error(`Invalid language: ${partial.language}. Must be 'en' or 'zh'`);
  }
  if (
    "aiProvider" in partial &&
    partial.aiProvider !== "openai" &&
    partial.aiProvider !== "claude" &&
    partial.aiProvider !== "ollama" &&
    partial.aiProvider !== "custom"
  ) {
    throw new Error(
      `Invalid aiProvider: ${partial.aiProvider}. Must be 'openai', 'claude', 'ollama', or 'custom'`
    );
  }
  if ("aiTemperature" in partial) {
    const temp = partial.aiTemperature!;
    if (typeof temp !== "number" || temp < 0 || temp > 2) {
      throw new Error(`Invalid aiTemperature: ${temp}. Must be a number in [0, 2]`);
    }
  }
  if ("aiApiKey" in partial && typeof partial.aiApiKey !== "string") {
    throw new Error("aiApiKey must be a string");
  }
  if ("aiBaseUrl" in partial && typeof partial.aiBaseUrl !== "string") {
    throw new Error("aiBaseUrl must be a string");
  }
  if ("aiModel" in partial && typeof partial.aiModel !== "string") {
    throw new Error("aiModel must be a string");
  }
  if ("pluginDir" in partial && typeof partial.pluginDir !== "string") {
    throw new Error("pluginDir must be a string");
  }
}

/** ExecResult 类型守卫 */
export function isExecResult(value: unknown): value is ExecResult {
  if (value === null || value === undefined || typeof value !== "object") {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.stdout === "string" &&
    typeof obj.stderr === "string" &&
    typeof obj.exitCode === "number"
  );
}

// ---- AI 流式事件 ----

/** AI 流式响应事件联合类型 */
export type StreamEvent =
  | StreamEventTextDelta
  | StreamEventToolCall
  | StreamEventToolResult
  | StreamEventFinish
  | StreamEventError;

/** 文本增量事件 */
export interface StreamEventTextDelta {
  type: "text-delta";
  conversationId: string;
  textDelta: string;
}

/** Tool Call 发起事件 */
export interface StreamEventToolCall {
  type: "tool-call";
  conversationId: string;
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
}

/** Tool Call 结果事件 */
export interface StreamEventToolResult {
  type: "tool-result";
  conversationId: string;
  toolCallId: string;
  toolName: string;
  result: unknown;
}

/** 流式完成事件 */
export interface StreamEventFinish {
  type: "finish";
  conversationId: string;
  finishReason: string;
}

/** 流式错误事件 */
export interface StreamEventError {
  type: "error";
  conversationId: string;
  error: string;
}

/** AI 对话请求参数 */
export interface ChatParams {
  conversationId: string;
  content: string;
  model?: string;
}

/** AI 对话返回结果 */
export interface ChatResult {
  conversationId: string;
  messageId: string;
}

// ---- 插件系统 ----

/** Plugin runtime status */
export type PluginStatus = "unloaded" | "loading" | "active" | "error" | "disabled";

// ---- Terminal 类型 ----

/** Terminal session 创建选项 */
export interface TerminalCreateOptions {
  cols?: number;
  rows?: number;
  cwd?: string;
}

/** Terminal session 信息 */
export interface TerminalSessionInfo {
  sessionId: string;
}

/** Plugin info for IPC transport between main and renderer */
export interface PluginInfo {
  id: string;
  name: string;
  version: string;
  description?: string;
  status: PluginStatus;
  permissions: string[];
  hasUI: boolean;
  error?: string;
}
