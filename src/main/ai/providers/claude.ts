import { createAnthropic } from "@ai-sdk/anthropic";
import type { AIProviderAdapter, ModelInfo } from "../types";

/** Claude 常用模型列表 */
const CLAUDE_MODELS: ModelInfo[] = [
  { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", provider: "claude" },
  { id: "claude-haiku-4-20250414", name: "Claude Haiku 4", provider: "claude" },
  { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", provider: "claude" },
  { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", provider: "claude" }
];

/**
 * 创建 Claude Provider 适配器。
 * @param settings - Provider 配置（apiKey）
 */
export function createClaudeAdapter(settings: { apiKey: string }): AIProviderAdapter {
  const provider = createAnthropic({
    apiKey: settings.apiKey
  });

  return {
    id: "claude",
    name: "Claude",
    getModels: () => CLAUDE_MODELS,
    createModel: (modelId: string) => provider(modelId)
  };
}
