import { createOpenAI } from "@ai-sdk/openai";
import type { AIProviderAdapter } from "../types";

/** 默认 Ollama OpenAI 兼容端点 */
const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434/v1";

/**
 * 创建 Ollama Provider 适配器。
 * 复用 @ai-sdk/openai 的 OpenAI 兼容协议指向 Ollama 端点。
 * @param settings - Provider 配置（baseUrl）
 */
export function createOllamaAdapter(settings: { baseUrl: string }): AIProviderAdapter {
  const baseURL = settings.baseUrl || DEFAULT_OLLAMA_BASE_URL;
  const provider = createOpenAI({
    baseURL,
    apiKey: "ollama" // Ollama 不需要 API Key，但 SDK 要求非空
  });

  return {
    id: "ollama",
    name: "Ollama",
    getModels: () => [], // Ollama 模型列表由用户手动输入
    createModel: (modelId: string) => provider(modelId)
  };
}
