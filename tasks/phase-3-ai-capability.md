# Phase 3：AI 能力

> **目标**：实现 AI 对话服务 + 多 Provider 支持 + Tool Calling，基于 Vercel AI SDK 构建完整的 AI 交互链路。
>
> **里程碑**：M3 - AI 可用（可与 AI 对话，流式响应，Tool Calling 工作，对话持久化）

---

## 任务编号说明

Phase 3 共 5 个任务（3.1–3.5），覆盖 AI Provider 适配器、对话管理核心服务、Tool Call 路由、IPC 通信桥接和 AI Chatbox UI。

---

## Phase 3 执行前置（必须确认）

在开始任何 Task 前，先记录并确认以下信息：

- [x] Phase 2 所有任务已完成且 `pnpm test` 全部通过
- [x] `src/main/ai/index.ts` 占位文件已存在（当前为空 `export {}`）
- [x] `src/main/storage/crud.ts` 已实现对话和消息相关 CRUD：`insertConversation`、`getConversation`、`updateConversation`、`deleteConversation`、`insertMessage`、`getMessagesByConversation`
- [x] `src/main/storage/schema.ts` 已定义 `conversations`、`messages` 表（含 `tool_calls`、`tool_result` 字段）
- [x] `src/shared/ipc-channels.ts` 已定义 `ai.chat`、`ai.getModels` 通道（需扩展更多通道）
- [x] `src/shared/types.ts` 已定义 `AppSettings`（含 `aiProvider`、`aiApiKey`、`aiBaseUrl`、`aiModel`、`aiTemperature`）
- [x] `src/preload/index.ts` 已暴露 `window.workbox.ai.chat/getModels` 存根（需扩展）
- [x] `src/renderer/src/features/chat/ChatView.tsx` 占位 UI 已存在
- [x] `packages/plugin-api/src/types.ts` 已定义 `ToolDefinition`（含 `name`、`description`、`parameters`、`handler`）
- [x] `src/main/plugin/context.ts` 已实现 `PluginContext.ai.registerTool()` 接口
- [x] 路径别名 `@main`、`@renderer`、`@shared` 可用
- [x] 本阶段只引入 `ARCHITECTURE.md` 与 `ROADMAP.md` 已声明依赖（Vercel AI SDK 系列包）
- [x] 执行任务后必须更新任务状态：任务成功完成时，将对应的验收标准和交付物清单项标记为 `[x]`（已完成）

---

## 任务依赖关系 & 推荐执行顺序

### 依赖关系图

```
3.1（AI Provider 适配器）← Phase 3 起点
  └── 3.2（AI Service 核心）← 依赖 3.1 的 Provider Adapter
        ├── 3.3（AI Tool Router）← 依赖 3.2 的 Service + Phase 2 的 registerTool
        └── 3.4（AI IPC Handler）← 依赖 3.2 的 Service 方法
              └── 3.5（AI Chatbox UI）← 依赖 3.4 的 IPC 接口
```

### 推荐执行顺序

```
3.1 → 3.2 → [3.3 ∥ 3.4] → 3.5
```

- 3.1 安装依赖并实现 Provider 适配层，是后续所有任务的基础
- 3.2 实现对话管理核心，依赖 3.1 的 Provider 创建模型
- 3.3 和 3.4 互相独立：3.3 扩展 Service 的 Tool 能力，3.4 桥接 IPC 层，完成 3.2 后**可并行执行**
- 3.5 必须在 3.4 完成后执行，需要 IPC 接口支持 UI 交互；如果 3.3 未完成，UI 中 Tool Call 展示可先做占位

---

## TDD 分层策略

> Phase 3 任务按特性分层。

### A 类：有可测试行为的任务 → 严格 TDD（Red-Green-Refactor）

适用于：3.1、3.2、3.3、3.4

1. **Red**：先编写测试（正常路径 + 边界条件 + 错误处理），运行并确认失败
2. **Green**：实现最小代码使测试通过
3. **Refactor**：重构并再次运行测试确保通过

### B 类：纯配置/UI 骨架 → 验证式测试

适用于：3.5（AI Chatbox UI）

1. 编写验证式测试（组件可渲染、状态正确、交互响应）
2. 实现功能
3. 运行测试确认通过

> **注意**：B 类不豁免测试，仅豁免严格的 Red-Green-Refactor 流程顺序。仍需编写测试保证可回归。3.5 中的 Zustand store 逻辑部分仍建议以 A 类方式进行。

### 统一留痕要求

- [x] A 类任务：记录 Red 阶段失败测试名称、Green 阶段通过结果、最终回归结果
- [x] B 类任务：记录验证式测试通过结果
- [x] 所有任务：`pnpm test` 通过
- [x] 测试文件与源文件同目录：`*.test.ts` / `*.test.tsx`

---

## 3.1 AI Provider 适配器

**目标**：安装 Vercel AI SDK，实现多 AI Provider 的统一适配层，支持 OpenAI、Anthropic Claude 和 Ollama（OpenAI 兼容协议），提供工厂函数根据 `AppSettings` 创建对应 Provider 适配器。

**输入/前置条件**：

- 依赖：Phase 2 完成
- 需读取：`ARCHITECTURE.md` 第五节（5.2 多 Provider 支持）
- 当前状态：
  - `src/main/ai/index.ts` 为空占位（`export {}`）
  - `src/shared/types.ts` 中 `AppSettings.aiProvider` 类型为 `"openai" | "claude" | "custom"`，需扩展
  - Vercel AI SDK 未安装

**验证策略**：A 类（严格 TDD）

**关键决策**：

| 决策项              | 方案                                                                                                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Provider 接口设计   | 定义 `AIProviderAdapter` 接口，包含 `id`、`name`、`getModels()`、`createModel(modelId)`，不在 adapter 层重复 streaming 逻辑，由 Service 层调用 AI SDK 的 `streamText()` |
| Ollama 实现方式     | 复用 `@ai-sdk/openai` 的 `createOpenAI({ baseURL })` 指向 Ollama 的 OpenAI 兼容端点 `http://localhost:11434/v1`，无需额外依赖                                           |
| aiProvider 类型扩展 | 在 `AppSettings.aiProvider` 中增加 `"ollama"` 选项，`"custom"` 保留作为任意 OpenAI 兼容端点                                                                             |
| 模型列表策略        | OpenAI 和 Claude 使用硬编码常用模型列表（可后续扩展为 API 查询），Ollama 和 Custom 返回空列表（用户手动输入模型名）                                                     |
| 类型文件位置        | `AIProviderAdapter`、`ModelInfo` 等 main-only 类型定义在 `src/main/ai/types.ts`；`StreamEvent`、`ChatParams` 等跨进程类型定义在 `src/shared/types.ts`                   |
| Provider 工厂模式   | `createProviderAdapter(settings)` 工厂函数根据 `aiProvider` 字段选择并创建对应适配器                                                                                    |
| 安装的依赖包        | `ai`（AI SDK 核心）、`@ai-sdk/openai`（OpenAI + Ollama + Custom）、`@ai-sdk/anthropic`（Claude）、`zod`（Tool 参数 schema，AI SDK 依赖）                                |

**TDD 要求**：

- [x] Red：先写测试，确认失败。具体测试用例见下方。
- [x] Green：安装依赖、实现类型定义、Provider 适配器和工厂函数
- [x] Refactor：整理导出和 JSDoc 注释，测试保持通过

**测试用例设计**（Red 阶段编写）：

```typescript
// === src/main/ai/providers/providers.test.ts ===
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AIProviderAdapter, ModelInfo } from "../types";

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
        aiProvider: "unknown" as any,
        aiApiKey: "",
        aiBaseUrl: ""
      })
    ).toThrow(/unknown.*provider/i);
  });
});
```

**执行步骤**：

1. **（前置）** 安装 Vercel AI SDK 依赖：
   ```bash
   pnpm add ai @ai-sdk/openai @ai-sdk/anthropic zod
   ```
2. **（Red）** 创建测试文件：
   - `src/main/ai/providers/providers.test.ts`（Provider 适配器 + 工厂函数测试）
3. 创建类型文件 `src/main/ai/types.ts`（仅类型定义使测试可编译）
4. 运行 `pnpm test`，确认全部失败
5. **（Green）** 实现：
   - `src/main/ai/types.ts`：`AIProviderAdapter`、`ModelInfo`、`ProviderSettings`
   - `src/main/ai/providers/openai.ts`：`createOpenAIAdapter()`
   - `src/main/ai/providers/claude.ts`：`createClaudeAdapter()`
   - `src/main/ai/providers/ollama.ts`：`createOllamaAdapter()`
   - `src/main/ai/providers/factory.ts`：`createProviderAdapter()` 工厂函数
   - 更新 `src/shared/types.ts`：`AppSettings.aiProvider` 增加 `"ollama"` + `validateSettings` 同步更新
6. 运行 `pnpm test`，确认测试通过
7. **（Refactor）** 完善 JSDoc 注释、统一导出，再次运行 `pnpm test` 确认通过

**验收标准**：

- [x] 安装 Vercel AI SDK（`ai`、`@ai-sdk/openai`、`@ai-sdk/anthropic`、`zod`）
- [x] `AIProviderAdapter` 接口定义完整（`id`、`name`、`getModels()`、`createModel(modelId)`）
- [x] `ModelInfo` 类型定义完整（`id`、`name`、`provider`）
- [x] `createOpenAIAdapter()` 可创建 OpenAI 适配器，模型列表含常用模型
- [x] `createClaudeAdapter()` 可创建 Claude 适配器，模型列表含常用模型
- [x] `createOllamaAdapter()` 可创建 Ollama 适配器（复用 OpenAI 兼容协议）
- [x] `createProviderAdapter()` 工厂函数根据 `AppSettings` 正确创建对应适配器
- [x] `AppSettings.aiProvider` 已扩展支持 `"ollama"`，`validateSettings` 已同步
- [x] 所有导出函数/类型有 JSDoc 注释
- [x] TDD 留痕完整：Red 阶段测试失败日志 + Green 阶段通过日志
- [x] `pnpm test` 回归通过

**交付物**：

- [x] `src/main/ai/types.ts`（AI 层类型定义：`AIProviderAdapter`、`ModelInfo`、`ProviderSettings`）
- [x] `src/main/ai/providers/openai.ts`（OpenAI Provider 适配器）
- [x] `src/main/ai/providers/claude.ts`（Claude Provider 适配器）
- [x] `src/main/ai/providers/ollama.ts`（Ollama Provider 适配器）
- [x] `src/main/ai/providers/factory.ts`（Provider 工厂函数）
- [x] `src/main/ai/providers/providers.test.ts`（Provider 单元测试）
- [x] `src/shared/types.ts`（更新 `AppSettings.aiProvider` 类型 + `validateSettings`）

---

## 3.2 AI Service 核心

**目标**：实现对话管理核心服务，包含对话创建、消息收发、流式响应处理、历史持久化和上下文管理（自动裁剪过长上下文）。Service 是 AI 功能的中枢，协调 Provider 适配器、CRUD 存储和流式转发。

**输入/前置条件**：

- 依赖：Task 3.1 完成（需要 `AIProviderAdapter` 和 `createProviderAdapter` 工厂）+ Phase 1 Task 1.4（数据存储，`Crud` 接口已实现）
- 需读取：`ARCHITECTURE.md` 第五节（5.1 架构）、第七节（conversations / messages 表）
- 当前状态：
  - `src/main/storage/crud.ts` 已实现全部对话和消息 CRUD 操作
  - `src/main/storage/schema.ts` 已定义 `conversations`、`messages` 表
  - AI Service 未实现

**验证策略**：A 类（严格 TDD）

**关键决策**：

| 决策项           | 方案                                                                                                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Service 接口     | 提供 `createConversation()`、`chat(conversationId, content, onEvent)`、`getConversations()`、`getHistory(conversationId)`、`deleteConversation(conversationId)` 方法 |
| 依赖注入         | `createAIService(deps)` 工厂函数接收 `{ crud, adapter, toolRouter? }` 依赖，便于测试 mock                                                                            |
| 流式回调机制     | `chat()` 方法接收 `onEvent: (event: StreamEvent) => void` 回调参数，由调用方（IPC handler）决定如何转发给渲染进程                                                    |
| 对话 ID 生成     | 使用 `crypto.randomUUID()` 生成 UUID，消息 ID 同理                                                                                                                   |
| 上下文裁剪策略   | 按消息条数裁剪，保留最近 N 条消息（默认 50 条）+ 始终保留 system prompt。暂不实现 token 级裁剪（复杂度高，Phase 3 不需要）                                           |
| system prompt    | 默认空字符串，后续可通过 settings 配置。当非空时，作为第一条 system message 插入上下文                                                                               |
| 对话标题生成     | 首次创建对话时使用用户第一条消息的前 50 个字符作为标题                                                                                                               |
| 错误处理         | Provider 调用失败时发送 `{ type: 'error', error: message }` 事件，不抛异常，保持对话可用                                                                             |
| StreamEvent 类型 | 定义在 `src/shared/types.ts`，包含 `text-delta`、`tool-call`、`tool-result`、`finish`、`error` 五种事件                                                              |

**TDD 要求**：

- [x] Red：先写测试，确认失败。具体测试用例见下方。
- [x] Green：实现 AI Service 和共享类型
- [x] Refactor：提取辅助函数，优化错误处理，测试保持通过

**测试用例设计**（Red 阶段编写）：

```typescript
// === src/main/ai/service.test.ts ===
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Crud } from "../storage/crud";
import type { AIProviderAdapter } from "./types";
import type { StreamEvent } from "@shared/types";
import { createAIService } from "./service";

// 创建 mock Crud
function createMockCrud(): Crud {
  const conversations = new Map<string, any>();
  const messageStore = new Map<string, any[]>();
  return {
    insertConversation: vi.fn((params) => {
      conversations.set(params.id, params);
    }),
    getConversation: vi.fn((id) => conversations.get(id)),
    updateConversation: vi.fn(),
    deleteConversation: vi.fn((id) => {
      conversations.delete(id);
      messageStore.delete(id);
    }),
    insertMessage: vi.fn((params) => {
      const msgs = messageStore.get(params.conversationId) ?? [];
      msgs.push(params);
      messageStore.set(params.conversationId, msgs);
    }),
    getMessagesByConversation: vi.fn((convId) => messageStore.get(convId) ?? []),
    getSetting: vi.fn(),
    setSetting: vi.fn(),
    deleteSetting: vi.fn(),
    getAllSettings: vi.fn(() => []),
    deleteAllSettings: vi.fn(),
    getPluginData: vi.fn(),
    setPluginData: vi.fn(),
    deletePluginData: vi.fn(),
    deleteAllPluginData: vi.fn()
  };
}

// 创建 mock Provider Adapter
function createMockAdapter(): AIProviderAdapter {
  return {
    id: "mock",
    name: "Mock Provider",
    getModels: () => [{ id: "mock-model", name: "Mock Model", provider: "mock" }],
    createModel: vi.fn(() => ({ modelId: "mock-model" }) as any)
  };
}

// Mock streamText
vi.mock("ai", () => ({
  streamText: vi.fn()
}));

import { streamText } from "ai";
const mockStreamText = vi.mocked(streamText);

describe("createAIService", () => {
  let crud: Crud;
  let adapter: AIProviderAdapter;

  beforeEach(() => {
    crud = createMockCrud();
    adapter = createMockAdapter();
    vi.clearAllMocks();
  });

  describe("createConversation", () => {
    // 正常路径：创建新对话
    it("创建新对话并持久化", () => {
      const service = createAIService({ crud, adapter });
      const conv = service.createConversation();
      expect(conv.id).toBeDefined();
      expect(crud.insertConversation).toHaveBeenCalledOnce();
    });

    // 正常路径：对话标题使用默认值
    it("新对话使用默认标题", () => {
      const service = createAIService({ crud, adapter });
      const conv = service.createConversation();
      expect(conv.title).toBe("新对话");
    });
  });

  describe("getConversations", () => {
    // 正常路径：获取对话列表
    it("返回所有对话的列表", () => {
      const service = createAIService({ crud, adapter });
      service.getConversations();
      expect(crud.getAllConversations).toBeDefined();
    });
  });

  describe("getHistory", () => {
    // 正常路径：获取对话历史消息
    it("返回对话的所有消息", () => {
      const service = createAIService({ crud, adapter });
      const messages = service.getHistory("conv-1");
      expect(crud.getMessagesByConversation).toHaveBeenCalledWith("conv-1");
    });

    // 边界条件：对话不存在
    it("对话不存在时返回空数组", () => {
      const service = createAIService({ crud, adapter });
      const messages = service.getHistory("non-existent");
      expect(messages).toEqual([]);
    });
  });

  describe("deleteConversation", () => {
    // 正常路径：删除对话
    it("删除对话及其消息", () => {
      const service = createAIService({ crud, adapter });
      service.deleteConversation("conv-1");
      expect(crud.deleteConversation).toHaveBeenCalledWith("conv-1");
    });
  });

  describe("chat", () => {
    // 正常路径：发送消息并接收流式响应
    it("发送用户消息后接收 text-delta 和 finish 事件", async () => {
      // 模拟 streamText 返回流
      mockStreamText.mockReturnValue({
        fullStream: (async function* () {
          yield { type: "text-delta", textDelta: "Hello" };
          yield { type: "text-delta", textDelta: " world" };
          yield {
            type: "finish",
            finishReason: "stop",
            usage: { promptTokens: 10, completionTokens: 5 }
          };
        })(),
        text: Promise.resolve("Hello world")
      } as any);

      const service = createAIService({ crud, adapter });
      const conv = service.createConversation();
      const events: StreamEvent[] = [];
      await service.chat(conv.id, "Hi", (e) => events.push(e));

      expect(events.some((e) => e.type === "text-delta")).toBe(true);
      expect(events.some((e) => e.type === "finish")).toBe(true);
    });

    // 正常路径：用户消息和 AI 回复均持久化
    it("持久化用户消息和 AI 回复", async () => {
      mockStreamText.mockReturnValue({
        fullStream: (async function* () {
          yield { type: "text-delta", textDelta: "Reply" };
          yield {
            type: "finish",
            finishReason: "stop",
            usage: { promptTokens: 10, completionTokens: 5 }
          };
        })(),
        text: Promise.resolve("Reply")
      } as any);

      const service = createAIService({ crud, adapter });
      const conv = service.createConversation();
      await service.chat(conv.id, "Hello", () => {});

      // 用户消息 + AI 回复 = 2 次 insertMessage
      expect(crud.insertMessage).toHaveBeenCalledTimes(2);
    });

    // 正常路径：首次消息更新对话标题
    it("首次消息使用内容前 50 字符作为标题", async () => {
      mockStreamText.mockReturnValue({
        fullStream: (async function* () {
          yield {
            type: "finish",
            finishReason: "stop",
            usage: { promptTokens: 10, completionTokens: 0 }
          };
        })(),
        text: Promise.resolve("")
      } as any);

      const service = createAIService({ crud, adapter });
      const conv = service.createConversation();
      await service.chat(conv.id, "帮我解释一下 TypeScript 泛型的用法", () => {});

      expect(crud.updateConversation).toHaveBeenCalledWith(
        conv.id,
        expect.objectContaining({ title: "帮我解释一下 TypeScript 泛型的用法" })
      );
    });

    // 错误处理：Provider 调用失败发送 error 事件
    it("Provider 调用失败时发送 error 事件", async () => {
      mockStreamText.mockImplementation(() => {
        throw new Error("API key invalid");
      });

      const service = createAIService({ crud, adapter });
      const conv = service.createConversation();
      const events: StreamEvent[] = [];
      await service.chat(conv.id, "Hello", (e) => events.push(e));

      expect(events.some((e) => e.type === "error")).toBe(true);
    });

    // 边界条件：对话不存在时创建新对话
    it("conversationId 为空时自动创建新对话", async () => {
      mockStreamText.mockReturnValue({
        fullStream: (async function* () {
          yield {
            type: "finish",
            finishReason: "stop",
            usage: { promptTokens: 10, completionTokens: 0 }
          };
        })(),
        text: Promise.resolve("")
      } as any);

      const service = createAIService({ crud, adapter });
      const events: StreamEvent[] = [];
      const result = await service.chat("", "Hello", (e) => events.push(e));

      expect(result.conversationId).toBeDefined();
      expect(crud.insertConversation).toHaveBeenCalled();
    });
  });

  describe("上下文管理", () => {
    // 边界条件：超长对话自动裁剪
    it("超过 maxContextMessages 时裁剪旧消息", async () => {
      // 预先插入大量消息
      const manyMessages = Array.from({ length: 60 }, (_, i) => ({
        id: `msg-${i}`,
        conversationId: "conv-1",
        role: i % 2 === 0 ? "user" : "assistant",
        content: `Message ${i}`,
        toolCalls: null,
        toolResult: null,
        createdAt: Date.now() + i
      }));
      vi.mocked(crud.getMessagesByConversation).mockReturnValue(manyMessages as any);

      mockStreamText.mockReturnValue({
        fullStream: (async function* () {
          yield {
            type: "finish",
            finishReason: "stop",
            usage: { promptTokens: 10, completionTokens: 0 }
          };
        })(),
        text: Promise.resolve("")
      } as any);

      const service = createAIService({ crud, adapter, maxContextMessages: 10 });
      await service.chat("conv-1", "New message", () => {});

      // 验证传给 streamText 的 messages 不超过 maxContextMessages + 1（含新用户消息）
      const callArgs = mockStreamText.mock.calls[0][0];
      expect(callArgs.messages.length).toBeLessThanOrEqual(11);
    });
  });
});
```

**执行步骤**：

1. **（Red）** 创建测试文件 `src/main/ai/service.test.ts`
2. 在 `src/shared/types.ts` 中添加 `StreamEvent`、`ChatParams` 类型定义（使测试可编译）
3. 运行 `pnpm test`，确认全部失败
4. **（Green）** 实现：
   - `src/shared/types.ts`：添加 `StreamEvent` 联合类型、`ChatParams` 接口
   - `src/main/ai/service.ts`：`createAIService()` 工厂函数，实现所有对话管理方法
   - 注意：`crud.ts` 需要新增 `getAllConversations()` 方法来支持 `getConversations()`
5. 更新 `src/main/storage/crud.ts`：添加 `getAllConversations()` 方法（查询所有对话，按 `updatedAt` 降序）
6. 运行 `pnpm test`，确认测试通过
7. **（Refactor）** 提取上下文裁剪辅助函数、错误处理逻辑，再次运行 `pnpm test` 确认通过

**验收标准**：

- [x] `createAIService()` 工厂函数接收依赖注入参数并返回 Service 实例
- [x] `createConversation()` 创建新对话并持久化到 SQLite
- [x] `chat(conversationId, content, onEvent)` 发送消息、调用 Provider、流式回调、持久化
- [x] `getConversations()` 返回所有对话列表
- [x] `getHistory(conversationId)` 返回对话历史消息
- [x] `deleteConversation(conversationId)` 删除对话及其消息
- [x] 首次消息自动更新对话标题
- [x] 上下文裁剪：超过 `maxContextMessages` 时自动裁剪旧消息
- [x] Provider 调用失败时发送 `error` 事件，不抛异常
- [x] `StreamEvent` 类型定义在 `src/shared/types.ts`（跨进程共享）
- [x] `crud.ts` 新增 `getAllConversations()` 方法
- [x] TDD 留痕完整
- [x] `pnpm test` 回归通过

**交付物**：

- [x] `src/main/ai/service.ts`（AI 对话管理核心服务）
- [x] `src/main/ai/service.test.ts`（AI Service 单元测试）
- [x] `src/shared/types.ts`（更新：添加 `StreamEvent`、`ChatParams`、`ChatResult` 类型）
- [x] `src/main/storage/crud.ts`（更新：添加 `getAllConversations()` 方法及 `Crud` 接口更新）

---

## 3.3 AI Tool Router

**目标**：实现 AI Tool Call 路由机制，维护全局 Tool 注册表，将注册的 Tools 转换为 Vercel AI SDK 格式传给模型，并在模型发起 `tool_call` 时路由到对应插件 handler 执行。

**输入/前置条件**：

- 依赖：Task 3.2 完成（需要 Service 层协调 Tool Router）+ Phase 2（`PluginContext.ai.registerTool()` 接口已定义）
- 需读取：`ARCHITECTURE.md` 第五节（5.3 AI Tool Calling 流程）
- 当前状态：
  - `packages/plugin-api/src/types.ts` 已定义 `ToolDefinition`（`name`、`description`、`parameters`、`handler`）
  - `src/main/plugin/context.ts` 中 `ctx.ai.registerTool()` 返回 `Disposable`
  - Tool Router 未实现

**验证策略**：A 类（严格 TDD）

**关键决策**：

| 决策项                  | 方案                                                                                                                                                              |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tool 注册表数据结构     | `Map<string, ToolDefinition>`，key 为 tool name，value 为完整定义（含 handler）                                                                                   |
| Vercel AI SDK Tool 格式 | 使用 AI SDK 的 `tool()` 函数包装：`tool({ description, parameters: z.object(...), execute: handler })`，`parameters` 从 `Record<string, unknown>` 转为 Zod schema |
| 参数 Schema 转换        | `ToolDefinition.parameters` 为 JSON Schema 格式（`Record<string, unknown>`），使用 AI SDK 的 `jsonSchema()` 直接传入，无需手动转 Zod                              |
| Tool 执行结果类型       | handler 返回 `Promise<unknown>`，结果序列化为 JSON 字符串存入 `messages.tool_result`                                                                              |
| 多轮 Tool Calling       | 由 AI SDK 的 `maxSteps` 参数控制（默认 5），Service 层在 `streamText()` 调用时设置                                                                                |
| Tool Router 生命周期    | 单例模式，通过 `createToolRouter()` 创建，在 `PluginManager` 初始化时传入                                                                                         |
| 取消注册                | `registerTool()` 返回 `Disposable`，调用 `dispose()` 从 Map 中移除，插件卸载时自动调用                                                                            |

**TDD 要求**：

- [x] Red：先写测试，确认失败。具体测试用例见下方。
- [x] Green：实现 Tool Router
- [x] Refactor：优化 Schema 转换逻辑，测试保持通过

**测试用例设计**（Red 阶段编写）：

```typescript
// === src/main/ai/tool-router.test.ts ===
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ToolDefinition } from "@workbox/plugin-api";
import { createToolRouter } from "./tool-router";

describe("createToolRouter", () => {
  let router: ReturnType<typeof createToolRouter>;

  beforeEach(() => {
    router = createToolRouter();
  });

  describe("registerTool", () => {
    // 正常路径：注册 Tool
    it("注册 Tool 后可在注册表中找到", () => {
      const tool: ToolDefinition = {
        name: "test_tool",
        description: "A test tool",
        parameters: { type: "object", properties: { query: { type: "string" } } },
        handler: async () => "result"
      };
      router.registerTool(tool);
      expect(router.getRegisteredTools()).toHaveLength(1);
      expect(router.getRegisteredTools()[0].name).toBe("test_tool");
    });

    // 正常路径：返回 Disposable
    it("返回 Disposable 对象用于取消注册", () => {
      const tool: ToolDefinition = {
        name: "disposable_tool",
        description: "Will be disposed",
        parameters: {},
        handler: async () => "result"
      };
      const disposable = router.registerTool(tool);
      expect(typeof disposable.dispose).toBe("function");

      disposable.dispose();
      expect(router.getRegisteredTools()).toHaveLength(0);
    });

    // 边界条件：重复注册同名 Tool 覆盖旧的
    it("重复注册同名 Tool 覆盖旧定义", () => {
      const tool1: ToolDefinition = {
        name: "dup_tool",
        description: "Version 1",
        parameters: {},
        handler: async () => "v1"
      };
      const tool2: ToolDefinition = {
        name: "dup_tool",
        description: "Version 2",
        parameters: {},
        handler: async () => "v2"
      };
      router.registerTool(tool1);
      router.registerTool(tool2);
      expect(router.getRegisteredTools()).toHaveLength(1);
      expect(router.getRegisteredTools()[0].description).toBe("Version 2");
    });
  });

  describe("getToolsForAISDK", () => {
    // 正常路径：转换为 AI SDK 格式
    it("将注册的 Tools 转换为 AI SDK 兼容的 tool 对象", () => {
      router.registerTool({
        name: "get_weather",
        description: "Get weather for a location",
        parameters: {
          type: "object",
          properties: { location: { type: "string", description: "City name" } },
          required: ["location"]
        },
        handler: async (params) => ({ temp: 20, location: params.location })
      });

      const sdkTools = router.getToolsForAISDK();
      expect(sdkTools).toHaveProperty("get_weather");
      expect(sdkTools.get_weather).toBeDefined();
    });

    // 边界条件：无注册 Tool 返回空对象
    it("无注册 Tool 时返回空对象", () => {
      const sdkTools = router.getToolsForAISDK();
      expect(Object.keys(sdkTools)).toHaveLength(0);
    });
  });

  describe("executeTool", () => {
    // 正常路径：执行已注册的 Tool
    it("根据 toolName 调用对应 handler 并返回结果", async () => {
      router.registerTool({
        name: "echo",
        description: "Echo input",
        parameters: {},
        handler: async (params) => ({ echo: params.text })
      });

      const result = await router.executeTool("echo", { text: "hello" });
      expect(result).toEqual({ echo: "hello" });
    });

    // 错误处理：执行未注册的 Tool
    it("执行未注册的 Tool 抛出错误", async () => {
      await expect(router.executeTool("unknown_tool", {})).rejects.toThrow(/tool.*not.*found/i);
    });

    // 错误处理：Tool handler 抛出异常
    it("Tool handler 抛出异常时包装为可读错误", async () => {
      router.registerTool({
        name: "failing_tool",
        description: "Always fails",
        parameters: {},
        handler: async () => {
          throw new Error("Something went wrong");
        }
      });

      await expect(router.executeTool("failing_tool", {})).rejects.toThrow("Something went wrong");
    });
  });

  describe("clearTools", () => {
    // 正常路径：清空注册表
    it("清空所有已注册的 Tools", () => {
      router.registerTool({
        name: "tool1",
        description: "Tool 1",
        parameters: {},
        handler: async () => "result"
      });
      router.registerTool({
        name: "tool2",
        description: "Tool 2",
        parameters: {},
        handler: async () => "result"
      });
      expect(router.getRegisteredTools()).toHaveLength(2);

      router.clearTools();
      expect(router.getRegisteredTools()).toHaveLength(0);
    });
  });
});
```

**执行步骤**：

1. **（Red）** 创建测试文件 `src/main/ai/tool-router.test.ts`
2. 运行 `pnpm test`，确认全部失败
3. **（Green）** 实现 `src/main/ai/tool-router.ts`：
   - `createToolRouter()` 工厂函数
   - `registerTool(tool)` → 注册到 Map，返回 Disposable
   - `getRegisteredTools()` → 返回已注册 Tool 列表
   - `getToolsForAISDK()` → 转换为 AI SDK `tool()` 格式（使用 `jsonSchema()`）
   - `executeTool(name, params)` → 查找并执行 handler
   - `clearTools()` → 清空注册表
4. 更新 `src/main/plugin/context.ts` 中 `ctx.ai.registerTool()` 实现，连接到 Tool Router
5. 更新 `src/main/ai/service.ts` 中 `chat()` 方法，将 `toolRouter.getToolsForAISDK()` 传入 `streamText()` 的 `tools` 参数，设置 `maxSteps: 5`
6. 运行 `pnpm test`，确认测试通过
7. **（Refactor）** 整理代码，再次运行 `pnpm test` 确认通过

**验收标准**：

- [x] `createToolRouter()` 返回 Tool Router 实例
- [x] `registerTool()` 注册 Tool 到内部注册表并返回 `Disposable`
- [x] `getRegisteredTools()` 返回当前所有已注册 Tool 的信息
- [x] `getToolsForAISDK()` 正确转换为 Vercel AI SDK 的 `tool()` 格式
- [x] `executeTool()` 根据 tool name 路由到对应 handler 执行
- [x] `clearTools()` 清空注册表
- [x] 重复注册同名 Tool 覆盖旧定义
- [x] 未注册 Tool 的执行抛出明确错误
- [x] 插件卸载时通过 Disposable 自动取消注册
- [x] `streamText()` 调用时传入 `tools` 和 `maxSteps: 5`
- [x] TDD 留痕完整
- [x] `pnpm test` 回归通过

**交付物**：

- [x] `src/main/ai/tool-router.ts`（Tool Router 实现）
- [x] `src/main/ai/tool-router.test.ts`（Tool Router 单元测试）
- [x] `src/main/plugin/context.ts`（更新：`ctx.ai.registerTool()` 连接 Tool Router）
- [x] `src/main/ai/service.ts`（更新：`chat()` 集成 Tool Router）

---

## 3.4 AI IPC Handler

**目标**：实现 AI 相关的 IPC 通信接口，连接渲染进程和 AI 服务。包含请求-响应模式（对话 CRUD）和推送模式（流式事件），扩展现有 IPC 通道定义和 Preload 桥接。

**输入/前置条件**：

- 依赖：Task 3.2 完成（需要 AI Service 的对话管理方法）
- 需读取：`ARCHITECTURE.md` 第六节（IPC 通信设计 - ai 通道）
- 当前状态：
  - `src/shared/ipc-channels.ts` 仅定义 `ai.chat` 和 `ai.getModels`，需扩展
  - `src/main/ipc/register.ts` 中 `ai:chat` 和 `ai:getModels` 使用空壳 `notImplemented` handler
  - `src/preload/index.ts` 已暴露 `window.workbox.ai.chat/getModels` 存根，需扩展

**验证策略**：A 类（严格 TDD）

**关键决策**：

| 决策项            | 方案                                                                                                                                     |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| IPC 通道扩展      | 在 `IPC_CHANNELS.ai` 中新增 `getConversations`、`deleteConversation`、`stream` 三个通道                                                  |
| 请求-响应 vs 推送 | 对话 CRUD 使用 `ipcMain.handle()` + `ipcRenderer.invoke()`（请求-响应）；流式事件使用 `webContents.send()` + `ipcRenderer.on()`（推送）  |
| Handler 创建模式  | `createAIHandler(service)` 工厂函数，与 `settings.handler.ts` 模式一致                                                                   |
| setupAIHandlers   | `setupAIHandlers(ipcMain, service, getWebContents)` 注册所有 AI IPC handler                                                              |
| stream 推送实现   | `chat` handler 内部调用 `service.chat(id, content, onEvent)`，`onEvent` 回调中通过 `event.sender.send('ai:stream', data)` 推送到渲染进程 |
| Preload 扩展      | 新增 `ai.getConversations()`、`ai.deleteConversation(id)`、`ai.onStream(callback)` 三个方法                                              |
| onStream 退订     | `ai.onStream()` 返回清理函数 `() => void`，渲染进程在组件卸载时调用                                                                      |

**TDD 要求**：

- [x] Red：先写测试，确认失败。具体测试用例见下方。
- [x] Green：实现 IPC handler + 扩展通道定义 + 更新 Preload
- [x] Refactor：统一错误处理、优化 handler 结构，测试保持通过

**测试用例设计**（Red 阶段编写）：

```typescript
// === src/main/ipc/ai.handler.test.ts ===
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { StreamEvent } from "@shared/types";
import { createAIHandler } from "./ai.handler";

// Mock AI Service
function createMockService() {
  return {
    createConversation: vi.fn(() => ({ id: "conv-new", title: "新对话" })),
    chat: vi.fn(async (_convId: string, _content: string, onEvent: (e: StreamEvent) => void) => {
      onEvent({ type: "text-delta", conversationId: "conv-1", textDelta: "Hi" });
      onEvent({ type: "finish", conversationId: "conv-1", finishReason: "stop" });
      return { conversationId: "conv-1", messageId: "msg-1" };
    }),
    getConversations: vi.fn(() => [
      { id: "conv-1", title: "Test conversation", createdAt: 1000, updatedAt: 2000 }
    ]),
    getHistory: vi.fn(() => [
      { id: "msg-1", conversationId: "conv-1", role: "user", content: "Hello", createdAt: 1000 }
    ]),
    deleteConversation: vi.fn(),
    getModels: vi.fn(() => [{ id: "gpt-4o", name: "GPT-4o", provider: "openai" }])
  };
}

describe("createAIHandler", () => {
  let handler: ReturnType<typeof createAIHandler>;
  let mockService: ReturnType<typeof createMockService>;

  beforeEach(() => {
    mockService = createMockService();
    handler = createAIHandler(mockService as any);
  });

  describe("chat", () => {
    // 正常路径：发起对话
    it("调用 service.chat 并返回结果", async () => {
      const mockSend = vi.fn();
      const result = await handler.chat("conv-1", "Hello", mockSend);
      expect(mockService.chat).toHaveBeenCalledWith("conv-1", "Hello", expect.any(Function));
      expect(result.conversationId).toBe("conv-1");
    });

    // 正常路径：流式事件通过 send 回调推送
    it("流式事件通过 send 回调推送给渲染进程", async () => {
      const mockSend = vi.fn();
      await handler.chat("conv-1", "Hello", mockSend);
      expect(mockSend).toHaveBeenCalled();
    });

    // 边界条件：空 conversationId 创建新对话
    it("空 conversationId 时创建新对话", async () => {
      const mockSend = vi.fn();
      // 模拟 chat 接收空 conversationId 的行为
      mockService.chat.mockImplementation(async (convId, _content, onEvent) => {
        onEvent({ type: "finish", conversationId: convId || "conv-new", finishReason: "stop" });
        return { conversationId: convId || "conv-new", messageId: "msg-new" };
      });
      const result = await handler.chat("", "Hello", mockSend);
      expect(result.conversationId).toBeDefined();
    });
  });

  describe("getModels", () => {
    // 正常路径：返回模型列表
    it("返回可用模型列表", () => {
      const models = handler.getModels();
      expect(models).toHaveLength(1);
      expect(models[0].id).toBe("gpt-4o");
    });
  });

  describe("getConversations", () => {
    // 正常路径：返回对话列表
    it("返回所有对话", () => {
      const conversations = handler.getConversations();
      expect(conversations).toHaveLength(1);
      expect(conversations[0].id).toBe("conv-1");
    });
  });

  describe("deleteConversation", () => {
    // 正常路径：删除对话
    it("调用 service.deleteConversation", () => {
      handler.deleteConversation("conv-1");
      expect(mockService.deleteConversation).toHaveBeenCalledWith("conv-1");
    });
  });
});
```

**执行步骤**：

1. **（Red）** 创建测试文件 `src/main/ipc/ai.handler.test.ts`
2. 运行 `pnpm test`，确认全部失败
3. **（Green）** 实现：
   - 更新 `src/shared/ipc-channels.ts`：`IPC_CHANNELS.ai` 增加 `getConversations`、`deleteConversation`、`stream`
   - 实现 `src/main/ipc/ai.handler.ts`：
     - `createAIHandler(service)` 工厂函数
     - `setupAIHandlers(ipcMain, service)` 注册 IPC handler
     - `ai:chat` handler：接收 `{ conversationId, content }`，调用 `service.chat()`，通过 `event.sender.send('ai:stream', data)` 推送流式事件
     - `ai:getModels` handler：调用 `service.getModels()` 或 `adapter.getModels()`
     - `ai:getConversations` handler：调用 `service.getConversations()`
     - `ai:deleteConversation` handler：调用 `service.deleteConversation(id)`
   - 更新 `src/main/ipc/register.ts`：替换 ai 领域的空壳 handler，改为调用 `setupAIHandlers()`
   - 更新 `src/preload/index.ts`：扩展 `workbox.ai` 增加 `getConversations()`、`deleteConversation(id)`、`onStream(callback)`
4. 运行 `pnpm test`，确认测试通过
5. **（Refactor）** 统一错误处理，再次运行 `pnpm test` 确认通过

**验收标准**：

- [x] `IPC_CHANNELS.ai` 包含 `chat`、`getModels`、`getConversations`、`deleteConversation`、`stream` 五个通道
- [x] `createAIHandler(service)` 工厂函数返回所有 handler 方法
- [x] `setupAIHandlers()` 注册所有 AI IPC handler 到 `ipcMain`
- [x] `ai:chat` handler 调用 Service 并通过 `event.sender.send()` 推送流式事件
- [x] `ai:getModels` 返回可用模型列表
- [x] `ai:getConversations` 返回对话列表
- [x] `ai:deleteConversation` 删除指定对话
- [x] `register.ts` 中 ai 领域空壳 handler 已替换为真实实现
- [x] `preload/index.ts` 已扩展 `workbox.ai` 接口（含 `onStream` 退订函数）
- [x] TDD 留痕完整
- [x] `pnpm test` 回归通过

**交付物**：

- [x] `src/main/ipc/ai.handler.ts`（AI IPC Handler 实现）
- [x] `src/main/ipc/ai.handler.test.ts`（AI IPC Handler 单元测试）
- [x] `src/shared/ipc-channels.ts`（更新：扩展 `ai` 通道定义）
- [x] `src/main/ipc/register.ts`（更新：替换 ai 空壳 handler）
- [x] `src/preload/index.ts`（更新：扩展 `workbox.ai` 桥接接口）

---

## 3.5 AI Chatbox UI

**目标**：实现完整的 AI 对话界面，包含 Zustand 状态管理、对话列表、消息渲染（Markdown + 代码高亮）、消息输入、流式输出效果和 Tool Call 展示。

**输入/前置条件**：

- 依赖：Task 3.4 完成（需要完整的 AI IPC 接口）+ Phase 1 Task 1.5（App Shell UI 已完成）
- 需读取：`ARCHITECTURE.md` 第三节（渲染进程 - AI Chatbox）、第九节（9.2 AI Chatbox 功能细节）
- 当前状态：
  - `src/renderer/src/features/chat/ChatView.tsx` 为占位组件（仅显示 "AI Chat — coming soon"）
  - `src/renderer/src/stores/` 已有 `app.store.ts`（可参考 Zustand 用法）和 `plugin.store.ts`
  - 需安装 Markdown 渲染依赖

**验证策略**：B 类（验证式测试）。Zustand store 逻辑部分建议以 A 类方式进行。

**关键决策**：

| 决策项          | 方案                                                                                                                                                                                          |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Markdown 渲染   | `react-markdown` + `remark-gfm`（支持表格、删除线等 GFM 语法）                                                                                                                                |
| 代码高亮        | `rehype-highlight`（基于 highlight.js，轻量、支持自动语言检测）。暂不使用 shiki（体积大、配置复杂）                                                                                           |
| Chat Store 结构 | `conversations: ConversationSummary[]`、`currentConversationId: string \| null`、`messages: Map<string, Message[]>`、`isStreaming: boolean`、`streamingText: string`、`selectedModel: string` |
| 消息发送快捷键  | `Ctrl+Enter`（Windows/Linux）/ `Cmd+Enter`（macOS）发送，`Enter` 换行                                                                                                                         |
| 空态页面        | 无对话时显示欢迎文案 + 新建对话按钮                                                                                                                                                           |
| Tool Call 展示  | 折叠/展开面板，显示 tool name、参数和执行结果                                                                                                                                                 |
| 布局方式        | ChatView 采用左右分栏：左侧对话列表（可折叠，宽 240px），右侧消息区 + 输入框                                                                                                                  |
| 组件目录结构    | 所有 Chat 相关组件放在 `src/renderer/src/features/chat/` 下                                                                                                                                   |
| 附件功能        | Phase 3 先做按钮占位，不实现完整附件上传（推迟到后续阶段）                                                                                                                                    |
| 安装的依赖包    | `react-markdown`、`remark-gfm`、`rehype-highlight`、`highlight.js`                                                                                                                            |

**TDD 要求**：

- [x] 编写 Zustand store 测试（A 类风格：先写测试再实现）
- [x] 编写 ChatView、MessageList、MessageInput 组件渲染测试（B 类：验证式）
- [x] 所有测试通过

**测试用例设计**：

```typescript
// === src/renderer/src/features/chat/store.test.ts ===
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock window.workbox
const mockWorkbox = {
  ai: {
    chat: vi.fn(),
    getModels: vi.fn(() => Promise.resolve([])),
    getConversations: vi.fn(() => Promise.resolve([])),
    deleteConversation: vi.fn(() => Promise.resolve()),
    onStream: vi.fn(() => () => {})
  }
};
vi.stubGlobal("window", { workbox: mockWorkbox });

import { useChatStore } from "./store";

describe("useChatStore", () => {
  beforeEach(() => {
    // 重置 store 状态
    useChatStore.setState({
      conversations: [],
      currentConversationId: null,
      messages: {},
      isStreaming: false,
      streamingText: "",
      selectedModel: "gpt-4o"
    });
    vi.clearAllMocks();
  });

  // 正常路径：初始状态
  it("初始状态包含空对话列表和默认模型", () => {
    const state = useChatStore.getState();
    expect(state.conversations).toEqual([]);
    expect(state.currentConversationId).toBeNull();
    expect(state.isStreaming).toBe(false);
    expect(state.selectedModel).toBe("gpt-4o");
  });

  // 正常路径：创建新对话
  it("createConversation 添加新对话并设为当前", () => {
    const store = useChatStore.getState();
    store.createConversation("conv-1", "新对话");
    const state = useChatStore.getState();
    expect(state.conversations).toHaveLength(1);
    expect(state.currentConversationId).toBe("conv-1");
  });

  // 正常路径：切换对话
  it("switchConversation 切换当前对话 ID", () => {
    const store = useChatStore.getState();
    store.createConversation("conv-1", "对话1");
    store.createConversation("conv-2", "对话2");
    store.switchConversation("conv-1");
    expect(useChatStore.getState().currentConversationId).toBe("conv-1");
  });

  // 正常路径：删除对话
  it("deleteConversation 移除对话并清除对应消息", () => {
    const store = useChatStore.getState();
    store.createConversation("conv-1", "对话1");
    store.addMessage("conv-1", { id: "msg-1", role: "user", content: "Hello" });
    store.deleteConversation("conv-1");
    const state = useChatStore.getState();
    expect(state.conversations).toHaveLength(0);
    expect(state.messages["conv-1"]).toBeUndefined();
  });

  // 正常路径：添加消息
  it("addMessage 向指定对话添加消息", () => {
    const store = useChatStore.getState();
    store.createConversation("conv-1", "对话");
    store.addMessage("conv-1", { id: "msg-1", role: "user", content: "Hello" });
    expect(useChatStore.getState().messages["conv-1"]).toHaveLength(1);
  });

  // 正常路径：更新流式文本
  it("appendStreamingText 追加流式文本", () => {
    const store = useChatStore.getState();
    store.setStreaming(true);
    store.appendStreamingText("Hello");
    store.appendStreamingText(" world");
    expect(useChatStore.getState().streamingText).toBe("Hello world");
  });

  // 正常路径：设置模型
  it("setSelectedModel 更新选中模型", () => {
    const store = useChatStore.getState();
    store.setSelectedModel("claude-sonnet-4-20250514");
    expect(useChatStore.getState().selectedModel).toBe("claude-sonnet-4-20250514");
  });

  // 边界条件：删除当前对话后 currentConversationId 置空
  it("删除当前对话后 currentConversationId 变为 null", () => {
    const store = useChatStore.getState();
    store.createConversation("conv-1", "对话");
    expect(useChatStore.getState().currentConversationId).toBe("conv-1");
    store.deleteConversation("conv-1");
    expect(useChatStore.getState().currentConversationId).toBeNull();
  });
});

// === src/renderer/src/features/chat/ChatView.test.tsx ===
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChatView } from "./ChatView";

// Mock 子组件和 store
vi.mock("./store", () => ({
  useChatStore: vi.fn(() => ({
    conversations: [],
    currentConversationId: null,
    messages: {},
    isStreaming: false,
    streamingText: "",
    selectedModel: "gpt-4o",
    createConversation: vi.fn(),
    switchConversation: vi.fn(),
    deleteConversation: vi.fn()
  }))
}));

describe("ChatView", () => {
  // 正常路径：组件可渲染
  it("渲染 ChatView 组件", () => {
    render(<ChatView />);
    expect(screen.getByTestId("page-chat")).toBeInTheDocument();
  });

  // 正常路径：空态页面显示欢迎信息
  it("无对话时显示欢迎页面", () => {
    render(<ChatView />);
    expect(screen.getByText(/新建对话|开始对话/)).toBeInTheDocument();
  });
});

// === src/renderer/src/features/chat/MessageList.test.tsx ===
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageList } from "./MessageList";

describe("MessageList", () => {
  // 正常路径：渲染用户消息
  it("渲染用户消息", () => {
    render(
      <MessageList
        messages={[{ id: "1", role: "user", content: "Hello" }]}
        streamingText=""
        isStreaming={false}
      />
    );
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  // 正常路径：渲染 assistant 消息
  it("渲染 assistant 消息", () => {
    render(
      <MessageList
        messages={[{ id: "2", role: "assistant", content: "Hi there!" }]}
        streamingText=""
        isStreaming={false}
      />
    );
    expect(screen.getByText("Hi there!")).toBeInTheDocument();
  });

  // 正常路径：流式状态显示 streamingText
  it("流式状态下显示实时文本", () => {
    render(
      <MessageList
        messages={[{ id: "1", role: "user", content: "Hello" }]}
        streamingText="Thinking..."
        isStreaming={true}
      />
    );
    expect(screen.getByText("Thinking...")).toBeInTheDocument();
  });

  // 边界条件：空消息列表
  it("消息列表为空时不崩溃", () => {
    render(<MessageList messages={[]} streamingText="" isStreaming={false} />);
    expect(screen.getByTestId("message-list")).toBeInTheDocument();
  });
});

// === src/renderer/src/features/chat/MessageInput.test.tsx ===
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MessageInput } from "./MessageInput";

describe("MessageInput", () => {
  // 正常路径：渲染输入框
  it("渲染文本输入区域", () => {
    render(<MessageInput onSend={vi.fn()} disabled={false} />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  // 正常路径：输入文本
  it("可以输入文本", () => {
    render(<MessageInput onSend={vi.fn()} disabled={false} />);
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Hello" } });
    expect(textarea).toHaveValue("Hello");
  });

  // 正常路径：发送按钮
  it("渲染发送按钮", () => {
    render(<MessageInput onSend={vi.fn()} disabled={false} />);
    expect(screen.getByRole("button", { name: /发送|send/i })).toBeInTheDocument();
  });

  // 正常路径：streaming 时禁用输入
  it("disabled 为 true 时输入框和按钮禁用", () => {
    render(<MessageInput onSend={vi.fn()} disabled={true} />);
    expect(screen.getByRole("textbox")).toBeDisabled();
    expect(screen.getByRole("button", { name: /发送|send/i })).toBeDisabled();
  });
});
```

**执行步骤**：

1. **（前置）** 安装 UI 依赖：
   ```bash
   pnpm add react-markdown remark-gfm rehype-highlight highlight.js
   ```
2. 创建测试文件：
   - `src/renderer/src/features/chat/store.test.ts`（Zustand store 测试 — A 类风格）
   - `src/renderer/src/features/chat/ChatView.test.tsx`（ChatView 组件测试）
   - `src/renderer/src/features/chat/MessageList.test.tsx`（MessageList 组件测试）
   - `src/renderer/src/features/chat/MessageInput.test.tsx`（MessageInput 组件测试）
3. 运行 `pnpm test`，确认测试失败（store 和组件未实现）
4. 实现：
   - `src/renderer/src/features/chat/store.ts`：Zustand store
   - `src/renderer/src/features/chat/ChatView.tsx`：对话主视图（左右分栏）
   - `src/renderer/src/features/chat/MessageList.tsx`：消息列表（Markdown 渲染 + 代码高亮）
   - `src/renderer/src/features/chat/MessageInput.tsx`：消息输入框
5. 运行 `pnpm test`，确认测试通过
6. 微调 UI 样式和交互细节，再次运行 `pnpm test` 确认通过

**验收标准**：

- [x] 安装 Markdown 渲染依赖（`react-markdown`、`remark-gfm`、`rehype-highlight`、`highlight.js`）
- [x] Zustand store 包含对话列表、当前对话、消息、流式状态、模型选择等状态
- [x] Store actions 完整：`createConversation`、`switchConversation`、`deleteConversation`、`addMessage`、`appendStreamingText`、`setStreaming`、`setSelectedModel`
- [x] ChatView 左右分栏布局：左侧对话列表，右侧消息区 + 输入区
- [x] 空态页面：无对话时显示欢迎信息和新建对话入口
- [x] MessageList 区分 user / assistant / tool 消息样式
- [x] MessageList 支持 Markdown 渲染（含 GFM 语法）
- [x] MessageList 支持代码块语法高亮
- [x] MessageList 支持 Tool Call 折叠/展开展示
- [x] MessageInput 多行文本输入，`Ctrl+Enter`（macOS `Cmd+Enter`）发送
- [x] MessageInput 显示模型切换下拉
- [x] 流式响应实时渲染（打字机效果）
- [x] 附件按钮占位（本阶段不实现上传功能）
- [x] 渲染进程通过 `window.workbox.ai.onStream()` 订阅流式事件
- [x] 组件卸载时正确退订 stream 事件
- [x] 所有测试通过
- [x] `pnpm test` 回归通过

**交付物**：

- [x] `src/renderer/src/features/chat/store.ts`（Chat Zustand Store）
- [x] `src/renderer/src/features/chat/store.test.ts`（Store 单元测试）
- [x] `src/renderer/src/features/chat/ChatView.tsx`（对话主视图 — 替换占位组件）
- [x] `src/renderer/src/features/chat/ChatView.test.tsx`（ChatView 组件测试）
- [x] `src/renderer/src/features/chat/MessageList.tsx`（消息列表组件）
- [x] `src/renderer/src/features/chat/MessageList.test.tsx`（MessageList 组件测试）
- [x] `src/renderer/src/features/chat/MessageInput.tsx`（消息输入组件）
- [x] `src/renderer/src/features/chat/MessageInput.test.tsx`（MessageInput 组件测试）

---

## 自审 Review 报告

### 高优先级问题（必须修复）

- [x] **[H1]** `crud.ts` 缺少 `getAllConversations()` 方法，Task 3.2 依赖此方法获取对话列表 → 已在 Task 3.2 执行步骤中明确要求新增此方法，并在交付物中标注 `crud.ts` 更新
- [x] **[H2]** `AppSettings.aiProvider` 当前类型为 `"openai" | "claude" | "custom"`，缺少 `"ollama"`，Task 3.1 的 Ollama Provider 需要此选项 → 已在 Task 3.1 执行步骤和交付物中明确要求更新 `AppSettings.aiProvider` 和 `validateSettings`
- [x] **[H3]** `IPC_CHANNELS.ai` 当前仅有 `chat` 和 `getModels`，Task 3.4 需要新增 `getConversations`、`deleteConversation`、`stream` → 已在 Task 3.4 中明确扩展通道定义

### 中优先级问题（必须修复）

- [x] **[M1]** 原 Phase 3 文档缺少前置检查清单（Phase 2 有此内容） → 已添加完整的执行前置检查清单
- [x] **[M2]** 原文档缺少依赖关系图和推荐执行顺序 → 已添加完整的依赖图和执行顺序说明
- [x] **[M3]** 原文档缺少 TDD 分层策略（A 类 / B 类分类） → 已添加 TDD 分层策略，3.1-3.4 为 A 类，3.5 为 B 类
- [x] **[M4]** 原文档缺少关键决策表（技术选型、接口设计等） → 已为每个任务添加关键决策表
- [x] **[M5]** 原文档缺少详细测试用例代码 → 已为每个任务编写具体测试代码
- [x] **[M6]** 原文档缺少具体执行步骤（Red-Green-Refactor 流程） → 已为每个任务添加详细执行步骤
- [x] **[M7]** 原文档缺少交付物清单 → 已为每个任务添加具体文件路径的交付物清单
- [x] **[M8]** `StreamEvent` 类型未在原文档中定义结构 → 已在 Task 3.2 关键决策中明确 `StreamEvent` 包含五种事件类型

### 低优先级问题（记录参考）

- [x] **[L1]** Task 3.5 的 UI 详细交互规范（动画、间距、颜色）未在文档中指定，可在实现阶段参考 shadcn/ui 默认风格
- [x] **[L2]** Ollama 模型列表动态查询（通过 `http://localhost:11434/api/tags`）未在 Phase 3 实现，`getModels()` 返回空列表，用户需手动输入模型名
- [x] **[L3]** 对话导出功能（Markdown / JSON）在 ARCHITECTURE.md 9.2 中提及但未纳入 Phase 3 任务，可在后续阶段添加
- [x] **[L4]** `aiSystemPrompt` 配置未纳入 AppSettings，默认空字符串，可在后续需求中添加
- [x] **[L5]** Token 级上下文裁剪（基于 tiktoken 等库）未在 Phase 3 实现，使用消息条数裁剪作为简化方案
