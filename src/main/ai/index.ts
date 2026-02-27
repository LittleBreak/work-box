/** AI 服务模块 - 统一导出 */
export { createAIService } from "./service";
export type { AIService, AIServiceDeps } from "./service";
export { createToolRouter } from "./tool-router";
export type { ToolRouter } from "./tool-router";
export { createProviderAdapter } from "./providers/factory";
export { createOpenAIAdapter } from "./providers/openai";
export { createClaudeAdapter } from "./providers/claude";
export { createOllamaAdapter } from "./providers/ollama";
export type { AIProviderAdapter, ModelInfo, ProviderSettings } from "./types";
