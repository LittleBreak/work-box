# Phase 3：AI 能力

> **目标**：实现 AI 对话服务 + 多 Provider 支持 + Tool Calling。

> **里程碑**：M3 - AI 可用（可与 AI 对话，流式响应，Tool Calling 工作）

---

## 3.1 AI Provider 适配器

**目标**：实现多 AI Provider 的统一适配层，支持 OpenAI、Claude、Ollama。

**输入/前置条件**：

- 依赖：Phase 2（插件系统，因 Tool Calling 需要路由到插件）完成
- 需读取：`ARCHITECTURE.md` 第五节（AI 能力设计 - 5.2 多 Provider 支持）

**验收标准**：

- [ ] 安装 Vercel AI SDK（`ai`、`@ai-sdk/openai`、`@ai-sdk/anthropic`）
- [ ] 实现 `src/main/ai/providers/openai.ts`：OpenAI 兼容 Provider
- [ ] 实现 `src/main/ai/providers/claude.ts`：Anthropic Claude Provider
- [ ] 实现 `src/main/ai/providers/ollama.ts`：Ollama 本地模型 Provider
- [ ] 统一 Provider 接口：`chat(params) → AsyncIterable<StreamChunk>`
- [ ] 支持从 settings 读取 API Key / Base URL / 默认模型
- [ ] **TDD**：编写 Provider 接口一致性测试和 mock 测试
- [ ] 三个 Provider 均可成功发起对话请求并收到流式响应

**参考**：`ARCHITECTURE.md` 第五节（AI 能力设计 - 5.2 多 Provider 支持）

---

## 3.2 AI Service 核心

**目标**：实现对话管理核心服务，包含对话创建、消息收发、历史持久化。

**输入/前置条件**：

- 依赖：Task 3.1 + Phase 1 Task 1.4（数据存储）完成
- 需读取：`ARCHITECTURE.md` 第五节（5.1 架构）、第七节（conversations / messages 表）

**验收标准**：

- [ ] 实现 `src/main/ai/service.ts`：
  - [ ] `createConversation()` → 创建新对话
  - [ ] `sendMessage(conversationId, content)` → 发送消息，返回流式响应
  - [ ] `getHistory(conversationId)` → 获取对话历史
  - [ ] `deleteConversation(conversationId)` → 删除对话
  - [ ] 对话上下文管理（自动裁剪过长上下文）
- [ ] 对话数据持久化到 SQLite（conversations + messages 表）
- [ ] 通过 IPC 将流式响应转发给渲染进程（`ai:stream` 事件）
- [ ] **TDD**：编写对话 CRUD、上下文管理、持久化的单元测试
- [ ] 可创建对话、发送消息、收到流式响应、重启后历史仍在

**参考**：`ARCHITECTURE.md` 第五节（5.1 架构）、第七节（数据存储设计）

---

## 3.3 AI Tool Router

**目标**：实现 AI Tool Call 路由机制，将模型的工具调用分发到对应插件执行。

**输入/前置条件**：

- 依赖：Task 3.2 + Phase 2（插件系统 - `ctx.ai.registerTool()`）完成
- 需读取：`ARCHITECTURE.md` 第五节（5.3 AI Tool Calling 流程）

**验收标准**：

- [ ] 实现 `src/main/ai/tool-router.ts`：
  - [ ] 维护全局 Tool 注册表（插件通过 `ctx.ai.registerTool()` 注册）
  - [ ] 将注册的 Tools 转换为 AI SDK 的 tool 格式传给模型
  - [ ] 模型返回 `tool_call` 时，路由到对应插件 handler 执行
  - [ ] 将 tool 执行结果回传给模型继续生成
- [ ] 支持多轮 tool calling（一次对话中多次调用）
- [ ] Tool 执行结果存入 messages 表（`tool_calls` + `tool_result` 字段）
- [ ] **TDD**：编写 Tool 注册、路由分发、多轮调用的单元测试
- [ ] 对话中模型能自动调用插件注册的 tool 并使用结果继续回复

**参考**：`ARCHITECTURE.md` 第五节（5.3 AI Tool Calling 流程）

---

## 3.4 AI IPC Handler

**目标**：实现 AI 相关的 IPC 通信接口，连接渲染进程和 AI 服务。

**输入/前置条件**：

- 依赖：Task 3.2 完成
- 需读取：`ARCHITECTURE.md` 第六节（IPC 通信设计 - ai 通道）

**验收标准**：

- [ ] 实现 `src/main/ipc/ai.handler.ts`：
  - [ ] `ai:chat` → 创建/继续对话
  - [ ] `ai:getModels` → 获取可用模型列表
  - [ ] `ai:getConversations` → 获取对话列表
  - [ ] `ai:deleteConversation` → 删除对话
  - [ ] `ai:stream` → 流式事件推送
- [ ] **TDD**：编写各 IPC handler 的单元测试
- [ ] 渲染进程可通过 IPC 完成全部 AI 交互

**参考**：`ARCHITECTURE.md` 第六节（IPC 通信设计）

---

## 3.5 AI Chatbox UI

**目标**：实现完整的 AI 对话界面，包含对话管理、消息渲染、流式输出。

**输入/前置条件**：

- 依赖：Task 3.4 + Phase 1 Task 1.5（App Shell UI）完成
- 需读取：`ARCHITECTURE.md` 第三节（渲染进程 - AI Chatbox）、第九节（9.2 AI Chatbox 功能细节）

**验收标准**：

- [ ] 实现 `src/renderer/features/chat/store.ts`：对话状态管理（Zustand）
  - [ ] 当前对话 ID、消息列表、流式状态、模型选择
- [ ] 实现 `src/renderer/features/chat/ChatView.tsx`：对话主视图
  - [ ] 左侧：对话历史列表（新建/删除/切换）
  - [ ] 右侧：消息区 + 输入区
- [ ] 实现 `src/renderer/features/chat/MessageList.tsx`：消息列表
  - [ ] 区分 user / assistant / tool 消息样式
  - [ ] Markdown 渲染（`react-markdown` + `remark-gfm`）
  - [ ] 代码块语法高亮（`rehype-highlight` 或 `shiki`）
  - [ ] Tool Call 展示（折叠/展开）
- [ ] 实现 `src/renderer/features/chat/MessageInput.tsx`：输入框
  - [ ] 多行文本输入，`Ctrl+Enter` 发送
  - [ ] 模型切换下拉
  - [ ] 附件按钮（附加文件内容到上下文）
- [ ] 流式响应渲染（打字机效果）
- [ ] 空态页面（无对话时的欢迎页）
- [ ] **TDD**：编写 Zustand store 和组件渲染的测试
- [ ] 完整的对话体验——新建对话、发消息、看到流式回复、切换模型、查看历史

**参考**：`ARCHITECTURE.md` 第三节（渲染进程 - AI Chatbox）、第九节（9.2 AI Chatbox 功能细节）
