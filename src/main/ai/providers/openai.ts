import { createOpenAI } from "@ai-sdk/openai";
import type { AIProviderAdapter, ModelInfo, ProviderSettings } from "../types";

/** OpenAI 常用模型列表 */
const OPENAI_MODELS: ModelInfo[] = [
  { id: "gpt-4o", name: "GPT-4o", provider: "openai" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "openai" },
  { id: "gpt-4-turbo", name: "GPT-4 Turbo", provider: "openai" },
  { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", provider: "openai" },
  { id: "o1", name: "o1", provider: "openai" },
  { id: "o1-mini", name: "o1-mini", provider: "openai" }
];

/**
 * 创建 OpenAI Provider 适配器。
 * @param settings - Provider 配置（apiKey, baseUrl）
 */
export function createOpenAIAdapter(settings: ProviderSettings): AIProviderAdapter {
  const provider = createOpenAI({
    apiKey: settings.apiKey,
    ...(settings.baseUrl ? { baseURL: settings.baseUrl } : {})
  });

  return {
    id: "openai",
    name: "OpenAI",
    getModels: () => OPENAI_MODELS,
    createModel: (modelId: string) => provider(modelId)
  };
}
