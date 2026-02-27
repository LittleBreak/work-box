import { describe, it, expect, vi } from "vitest";
import type { ModelInfo } from "../types";

// Mock AI SDK 模块
vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(() => vi.fn((modelId: string) => ({ modelId, provider: "openai" })))
}));
vi.mock("@ai-sdk/anthropic", () => ({
  createAnthropic: vi.fn(() => vi.fn((modelId: string) => ({ modelId, provider: "anthropic" })))
}));

import { createOpenAIAdapter } from "./openai";
import { createClaudeAdapter } from "./claude";
import { createOllamaAdapter } from "./ollama";
import { createProviderAdapter } from "./factory";

describe("createOpenAIAdapter", () => {
  // 正常路径：创建 OpenAI 适配器
  it("创建包含 id、name、getModels、createModel 的适配器", () => {
    const adapter = createOpenAIAdapter({ apiKey: "sk-test", baseUrl: "" });
    expect(adapter.id).toBe("openai");
    expect(adapter.name).toBe("OpenAI");
    expect(adapter.getModels().length).toBeGreaterThan(0);
    expect(typeof adapter.createModel).toBe("function");
  });

  // 正常路径：模型列表包含常用模型
  it("模型列表包含 gpt-4o 和 gpt-4o-mini", () => {
    const adapter = createOpenAIAdapter({ apiKey: "sk-test", baseUrl: "" });
    const modelIds = adapter.getModels().map((m: ModelInfo) => m.id);
    expect(modelIds).toContain("gpt-4o");
    expect(modelIds).toContain("gpt-4o-mini");
  });

  // 正常路径：createModel 返回有效模型对象
  it("createModel 使用指定 modelId 创建模型", () => {
    const adapter = createOpenAIAdapter({ apiKey: "sk-test", baseUrl: "" });
    const model = adapter.createModel("gpt-4o");
    expect(model).toBeDefined();
  });
});

describe("createClaudeAdapter", () => {
  // 正常路径：创建 Claude 适配器
  it("创建包含正确 id 和 name 的适配器", () => {
    const adapter = createClaudeAdapter({ apiKey: "sk-ant-test" });
    expect(adapter.id).toBe("claude");
    expect(adapter.name).toBe("Claude");
    expect(adapter.getModels().length).toBeGreaterThan(0);
  });

  // 正常路径：模型列表包含 Claude 模型
  it("模型列表包含 claude-sonnet-4-20250514", () => {
    const adapter = createClaudeAdapter({ apiKey: "sk-ant-test" });
    const modelIds = adapter.getModels().map((m: ModelInfo) => m.id);
    expect(modelIds).toContain("claude-sonnet-4-20250514");
  });
});

describe("createOllamaAdapter", () => {
  // 正常路径：创建 Ollama 适配器
  it("创建使用 OpenAI 兼容协议的适配器", () => {
    const adapter = createOllamaAdapter({ baseUrl: "http://localhost:11434/v1" });
    expect(adapter.id).toBe("ollama");
    expect(adapter.name).toBe("Ollama");
  });

  // 边界条件：空 baseUrl 使用默认值
  it("未提供 baseUrl 时使用默认 Ollama 端点", () => {
    const adapter = createOllamaAdapter({ baseUrl: "" });
    expect(adapter.id).toBe("ollama");
  });

  // 正常路径：模型列表为空（用户手动输入模型名）
  it("模型列表返回空数组", () => {
    const adapter = createOllamaAdapter({ baseUrl: "" });
    expect(adapter.getModels()).toEqual([]);
  });
});

describe("createProviderAdapter（工厂函数）", () => {
  // 正常路径：根据 settings 创建 OpenAI 适配器
  it("aiProvider 为 openai 时创建 OpenAI 适配器", () => {
    const adapter = createProviderAdapter({
      aiProvider: "openai",
      aiApiKey: "sk-test",
      aiBaseUrl: ""
    });
    expect(adapter.id).toBe("openai");
  });

  // 正常路径：根据 settings 创建 Claude 适配器
  it("aiProvider 为 claude 时创建 Claude 适配器", () => {
    const adapter = createProviderAdapter({
      aiProvider: "claude",
      aiApiKey: "sk-ant-test",
      aiBaseUrl: ""
    });
    expect(adapter.id).toBe("claude");
  });

  // 正常路径：根据 settings 创建 Ollama 适配器
  it("aiProvider 为 ollama 时创建 Ollama 适配器", () => {
    const adapter = createProviderAdapter({
      aiProvider: "ollama",
      aiApiKey: "",
      aiBaseUrl: "http://localhost:11434/v1"
    });
    expect(adapter.id).toBe("ollama");
  });

  // 正常路径：custom 使用 OpenAI 兼容协议
  it("aiProvider 为 custom 时创建 OpenAI 兼容适配器（使用自定义 baseUrl）", () => {
    const adapter = createProviderAdapter({
      aiProvider: "custom",
      aiApiKey: "sk-custom",
      aiBaseUrl: "https://my-proxy.example.com/v1"
    });
    expect(adapter.id).toBe("custom");
  });

  // 错误处理：未知 provider 抛出错误
  it("未知 aiProvider 值抛出错误", () => {
    expect(() =>
      createProviderAdapter({
        aiProvider: "unknown" as "openai",
        aiApiKey: "",
        aiBaseUrl: ""
      })
    ).toThrow(/unknown.*provider/i);
  });
});
