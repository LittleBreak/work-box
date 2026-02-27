import type { AIProviderAdapter } from "../types";
import { createOpenAIAdapter } from "./openai";
import { createClaudeAdapter } from "./claude";
import { createOllamaAdapter } from "./ollama";

/** Provider 工厂函数所需配置 */
interface ProviderFactorySettings {
  aiProvider: string;
  aiApiKey: string;
  aiBaseUrl: string;
}

/**
 * 根据 AppSettings 创建对应的 AI Provider 适配器。
 * @param settings - 包含 aiProvider、aiApiKey、aiBaseUrl 的设置
 * @throws 未知 provider 类型时抛出错误
 */
export function createProviderAdapter(settings: ProviderFactorySettings): AIProviderAdapter {
  switch (settings.aiProvider) {
    case "openai":
      return createOpenAIAdapter({ apiKey: settings.aiApiKey, baseUrl: settings.aiBaseUrl });

    case "claude":
      return createClaudeAdapter({ apiKey: settings.aiApiKey });

    case "ollama":
      return createOllamaAdapter({ baseUrl: settings.aiBaseUrl });

    case "custom":
      return {
        ...createOpenAIAdapter({ apiKey: settings.aiApiKey, baseUrl: settings.aiBaseUrl }),
        id: "custom",
        name: "Custom"
      };

    default:
      throw new Error(`Unknown provider: ${settings.aiProvider}`);
  }
}
