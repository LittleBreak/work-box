# Work-Box 开发路径 & 可执行任务清单

> 基于 `ARCHITECTURE.md` 技术架构方案，拆解为可执行的开发阶段与任务。
> 每个任务标注 **优先级**、**预估复杂度**、**依赖关系** 和 **验收标准**。

---

## 阶段总览

| 阶段        | 目标              | 核心交付                                        |
| ----------- | ----------------- | ----------------------------------------------- |
| **Phase 0** | 项目脚手架 & 基建 | 可运行的 Electron 空壳 + 完整工具链             |
| **Phase 1** | 核心框架          | IPC 通信 + 数据存储 + App Shell UI              |
| **Phase 2** | 插件系统          | 插件引擎 + Plugin API + 插件加载流程            |
| **Phase 3** | AI 能力           | AI Service + 多 Provider + Chatbox UI           |
| **Phase 4** | 内置插件（P0）    | Terminal + AI Chatbox 完整功能                  |
| **Phase 5** | 内置插件（P1-P2） | File Explorer + Git Helper + Snippet Manager 等 |
| **Phase 6** | 打包分发 & 完善   | 多平台构建 + 自动更新 + 安全加固                |

---

## Phase 0：项目脚手架 & 基建

> 目标：从零搭建项目骨架，确保开发环境跑通。

### 0.1 初始化 electron-vite 项目

- [ ] 使用 `create electron-vite` 创建项目（React + TypeScript 模板）
- [ ] 验证 `pnpm dev` 启动后能看到 Electron 窗口 + React 页面
- **验收**：`pnpm dev` 启动无报错，窗口正常显示

### 0.2 配置 pnpm workspace (monorepo)

- [ ] 创建 `pnpm-workspace.yaml`，包含 `packages/*` 和 `plugins/*`
- [ ] 创建 `packages/plugin-api/` 包骨架（`package.json` + `src/index.ts` + `src/types.ts`）
- [ ] 确认 workspace 内包可以互相引用
- **验收**：`pnpm install` 成功，`packages/plugin-api` 可被 `src/` 引用

### 0.3 代码规范工具链

- [ ] 配置 ESLint（`@electron-toolkit/eslint-config-ts` + React 规则）
- [ ] 配置 Prettier（统一格式化）
- [ ] 配置 `lint-staged` + `husky` pre-commit hook
- [ ] 配置 Commitlint（Conventional Commits 规范）
- **验收**：提交代码时自动 lint & 格式化，不规范 commit message 被拦截

### 0.4 Tailwind CSS + shadcn/ui 集成

- [ ] 安装 Tailwind CSS v4，配置 `globals.css`
- [ ] 初始化 shadcn/ui（`components.json` + 工具函数）
- [ ] 添加几个基础组件验证（Button、Card）
- **验收**：渲染进程中使用 shadcn Button 组件正常显示

### 0.5 Vitest 测试框架

- [ ] 配置 Vitest（区分 main / renderer 测试环境）
- [ ] 编写一个 hello-world 测试用例验证流程通畅
- **验收**：`pnpm test` 能执行并通过

### 0.6 目录结构搭建

- [ ] 按架构文档创建完整目录骨架（空文件占位）：
  - `src/main/`, `src/preload/`, `src/renderer/`, `src/shared/`
  - `src/main/ipc/`, `src/main/plugin/`, `src/main/ai/`, `src/main/storage/`
  - `src/renderer/components/`, `src/renderer/features/`, `src/renderer/stores/`
  - `plugins/` (内置插件目录)
- **验收**：目录结构与 `ARCHITECTURE.md` 第八节一致

---

## Phase 1：核心框架

> 目标：打通 IPC 通信 + 数据存储 + 基础 UI 布局。
> 依赖：Phase 0 完成。

### 1.1 IPC 通信基础设施

- [ ] 实现 `src/shared/ipc-channels.ts`：定义所有 IPC 通道常量
- [ ] 实现 `src/shared/types.ts`：定义共享类型（`ExecResult`、`FileStat` 等）
- [ ] 实现 `src/preload/index.ts`：通过 `contextBridge` 暴露 `window.workbox` API
- [ ] 在主进程 `src/main/index.ts` 注册 IPC handler 骨架
- [ ] 实现类型安全的 IPC invoke 封装（renderer 端调用时有类型提示）
- **验收**：渲染进程可通过 `window.workbox.xxx()` 调用主进程方法并获得返回值

### 1.2 文件系统 IPC Handler

- [ ] 实现 `src/main/ipc/fs.handler.ts`
  - `readFile(path)` → 返回文件内容
  - `writeFile(path, data)` → 写入文件
  - `readDir(path)` → 返回目录列表
  - `stat(path)` → 返回文件元信息
- [ ] 添加路径安全校验（防止路径穿越攻击）
- [ ] 编写单元测试
- **验收**：renderer 可通过 IPC 读写本地文件，测试通过

### 1.3 Shell 执行 IPC Handler

- [ ] 实现 `src/main/ipc/shell.handler.ts`
  - `exec(command, options)` → 执行命令返回 stdout/stderr/exitCode
- [ ] 实现命令超时机制（默认 30s）
- [ ] 实现危险命令黑名单检测（`rm -rf /` 等）
- [ ] 编写单元测试
- **验收**：renderer 可通过 IPC 执行 shell 命令，有超时保护

### 1.4 SQLite 数据存储

- [ ] 安装 `better-sqlite3` + `drizzle-orm` + `drizzle-kit`
- [ ] 实现 `src/main/storage/database.ts`：数据库初始化 & 连接管理
- [ ] 实现 `src/main/storage/schema.ts`：Drizzle schema 定义（conversations、messages、plugin_storage、settings）
- [ ] 实现数据库迁移机制（`drizzle-kit` 或手动 migration）
- [ ] 确保数据库文件存放在 `~/.workbox/data.db`
- [ ] 编写 CRUD 单元测试
- **验收**：应用启动时自动创建/迁移数据库，CRUD 测试通过

### 1.5 App Shell 基础 UI

- [ ] 实现 `src/renderer/App.tsx`：根布局 + 路由（React Router 或简单条件渲染）
- [ ] 实现 `src/renderer/components/Layout/`：左侧导航栏 + 右侧内容区布局
- [ ] 实现 `src/renderer/components/Sidebar/`：可折叠侧边栏，图标导航
- [ ] 实现基础页面占位：首页、AI Chat、插件管理、设置
- [ ] 安装 Zustand，实现 `src/renderer/stores/app.store.ts`（当前页面、侧边栏状态等）
- [ ] 使用 shadcn/ui 组件构建界面
- **验收**：应用启动可看到侧边栏 + 内容区布局，点击导航可切换页面

### 1.6 设置页面 & 配置持久化

- [ ] 实现 `src/renderer/features/settings/SettingsView.tsx`
  - 通用设置：主题（亮/暗）、语言
  - AI 设置：Provider 配置（API Key、Base URL、模型选择）
  - 插件设置：插件目录路径
- [ ] 实现配置读写的 IPC（基于 settings 表或 `config.json`）
- [ ] 实现暗色模式切换
- **验收**：设置页可保存配置，重启应用后配置仍在

---

## Phase 2：插件系统

> 目标：实现完整的插件引擎，支持插件加载和生命周期管理。
> 依赖：Phase 1（IPC + 存储）完成。

### 2.1 Plugin API 包

- [ ] 实现 `packages/plugin-api/src/types.ts`：完整的 `PluginContext` 接口定义
  - `plugin`、`fs`、`shell`、`ai`、`commands`、`notification`、`workspace`、`storage` 全部接口
- [ ] 实现 `packages/plugin-api/src/index.ts`：`definePlugin()` 函数 + 类型导出
- [ ] 编写 JSDoc 注释，确保类型提示清晰
- [ ] 发布为 workspace 内部包 `@workbox/plugin-api`
- **验收**：插件开发者可 `import { definePlugin } from '@workbox/plugin-api'` 并获得完整类型提示

### 2.2 插件引擎 - 扫描 & 解析

- [ ] 实现 `src/main/plugin/engine.ts`：
  - `scanPlugins(dirs)` → 扫描 `plugins/` 和 `~/.workbox/plugins/` 目录
  - `parseManifest(packageJson)` → 解析 `workbox` 字段，校验合法性
  - `resolveLoadOrder(plugins)` → 按依赖关系排序
- [ ] 定义插件状态枚举：`unloaded` → `loading` → `active` → `error` → `disabled`
- [ ] 编写单元测试
- **验收**：能正确扫描、解析插件目录，非法清单会报错

### 2.3 PluginContext 创建

- [ ] 实现 `src/main/plugin/context.ts`：
  - 为每个插件创建隔离的 `PluginContext` 实例
  - `fs` 操作基于权限声明拦截
  - `shell` 操作基于权限声明拦截
  - `storage` 操作自动隔离到 `plugin_storage` 表（按 `plugin_id`）
  - `commands.register()` → 注册到全局命令注册表
  - `ai.registerTool()` → 注册到 AI Tool Router
  - `notification` → 通过 IPC 转发到渲染进程
  - `workspace` → 代理 Electron dialog API
- [ ] 编写单元测试
- **验收**：各 API 调用正常，未声明权限的调用被拦截并报错

### 2.4 权限校验

- [ ] 实现 `src/main/plugin/permission.ts`：
  - 解析插件 `permissions` 声明
  - 运行时拦截未授权调用
  - 高风险权限（`shell:exec`）首次使用时通知渲染进程弹窗确认
- [ ] 实现权限确认弹窗 UI
- **验收**：插件使用未声明权限时抛错，高风险权限弹窗确认后放行

### 2.5 插件生命周期

- [ ] 实现插件加载流程（对应架构文档 4.4）：
  - 扫描 → 解析 → 排序 → 创建 Context → 检查权限 → `activate(ctx)` → 注册命令/Tools/UI
- [ ] 实现 `deactivate()` 清理机制（应用退出 / 插件禁用时调用）
- [ ] 实现插件 enable/disable 动态切换
- [ ] 通过 IPC 事件通知渲染进程插件状态变化
- **验收**：应用启动时自动加载插件，退出时 deactivate，可动态启停

### 2.6 插件管理 UI

- [ ] 实现 `src/renderer/features/plugins/PluginList.tsx`：已安装插件列表
- [ ] 实现 `src/renderer/features/plugins/PluginDetail.tsx`：插件详情（描述、权限、启停开关）
- [ ] 显示插件状态标记（active / disabled / error）
- **验收**：UI 列表展示正确，可启停插件并实时反映状态

---

## Phase 3：AI 能力

> 目标：实现 AI 对话服务 + 多 Provider 支持 + Tool Calling。
> 依赖：Phase 2（插件系统，因 Tool Calling 需要路由到插件）。

### 3.1 AI Provider 适配器

- [ ] 安装 Vercel AI SDK（`ai`、`@ai-sdk/openai`、`@ai-sdk/anthropic`）
- [ ] 实现 `src/main/ai/providers/openai.ts`：OpenAI 兼容 Provider
- [ ] 实现 `src/main/ai/providers/claude.ts`：Anthropic Claude Provider
- [ ] 实现 `src/main/ai/providers/ollama.ts`：Ollama 本地模型 Provider
- [ ] 统一 Provider 接口：`chat(params) → AsyncIterable<StreamChunk>`
- [ ] 支持从 settings 读取 API Key / Base URL / 默认模型
- **验收**：三个 Provider 均可成功发起对话请求并收到流式响应

### 3.2 AI Service 核心

- [ ] 实现 `src/main/ai/service.ts`：
  - `createConversation()` → 创建新对话
  - `sendMessage(conversationId, content)` → 发送消息，返回流式响应
  - `getHistory(conversationId)` → 获取对话历史
  - `deleteConversation(conversationId)` → 删除对话
  - 对话上下文管理（自动裁剪过长上下文）
- [ ] 对话数据持久化到 SQLite（conversations + messages 表）
- [ ] 通过 IPC 将流式响应转发给渲染进程（`ai:stream` 事件）
- **验收**：可创建对话、发送消息、收到流式响应、重启后历史仍在

### 3.3 AI Tool Router

- [ ] 实现 `src/main/ai/tool-router.ts`：
  - 维护全局 Tool 注册表（插件通过 `ctx.ai.registerTool()` 注册）
  - 将注册的 Tools 转换为 AI SDK 的 tool 格式传给模型
  - 模型返回 `tool_call` 时，路由到对应插件 handler 执行
  - 将 tool 执行结果回传给模型继续生成
- [ ] 支持多轮 tool calling（一次对话中多次调用）
- [ ] Tool 执行结果存入 messages 表（`tool_calls` + `tool_result` 字段）
- **验收**：对话中模型能自动调用插件注册的 tool 并使用结果继续回复

### 3.4 AI IPC Handler

- [ ] 实现 `src/main/ipc/ai.handler.ts`：
  - `ai:chat` → 创建/继续对话
  - `ai:getModels` → 获取可用模型列表
  - `ai:getConversations` → 获取对话列表
  - `ai:deleteConversation` → 删除对话
  - `ai:stream` → 流式事件推送
- **验收**：渲染进程可通过 IPC 完成全部 AI 交互

### 3.5 AI Chatbox UI

- [ ] 实现 `src/renderer/features/chat/store.ts`：对话状态管理（Zustand）
  - 当前对话 ID、消息列表、流式状态、模型选择
- [ ] 实现 `src/renderer/features/chat/ChatView.tsx`：对话主视图
  - 左侧：对话历史列表（新建/删除/切换）
  - 右侧：消息区 + 输入区
- [ ] 实现 `src/renderer/features/chat/MessageList.tsx`：消息列表
  - 区分 user / assistant / tool 消息样式
  - Markdown 渲染（`react-markdown` + `remark-gfm`）
  - 代码块语法高亮（`rehype-highlight` 或 `shiki`）
  - Tool Call 展示（折叠/展开）
- [ ] 实现 `src/renderer/features/chat/MessageInput.tsx`：输入框
  - 多行文本输入，`Ctrl+Enter` 发送
  - 模型切换下拉
  - 附件按钮（附加文件内容到上下文）
- [ ] 流式响应渲染（打字机效果）
- [ ] 空态页面（无对话时的欢迎页）
- **验收**：完整的对话体验——新建对话、发消息、看到流式回复、切换模型、查看历史

---

## Phase 4：内置插件（P0）

> 目标：实现第一批核心插件，验证插件系统可用性。
> 依赖：Phase 2（插件系统） + Phase 3（AI 能力）。

### 4.1 Terminal 插件

- [ ] 创建 `plugins/terminal/` 目录结构 + `package.json` 清单
- [ ] 主进程端：
  - 使用 `node-pty` 创建伪终端实例
  - 支持多终端 session 管理
  - 实现 IPC 数据流转发（stdin/stdout）
- [ ] 渲染端 UI：
  - 集成 `xterm.js` 终端组件
  - 支持多 Tab（多终端 session）
  - 支持自定义字体、字号、主题
  - 支持终端 resize
- [ ] 注册命令：`open-terminal`（快捷键 `` Ctrl+` ``）
- [ ] 注册 AI Tool：`run_command`（AI 可在对话中执行终端命令）
- **验收**：可打开终端执行命令，支持多 Tab，AI 对话中可调用终端

### 4.2 AI Chatbox 增强

- [ ] 对话导出功能（Markdown / JSON 格式）
- [ ] 上下文附件：对话中拖拽/选择文件，内容作为上下文传给 AI
- [ ] 系统 Prompt 自定义（per conversation）
- [ ] 对话搜索（关键词搜索历史对话）
- [ ] 消息操作：复制、重新生成、编辑后重发
- **验收**：以上功能均可正常使用

---

## Phase 5：内置插件（P1-P2）

> 目标：丰富工具箱能力，提升日常开发体验。
> 依赖：Phase 4 完成。

### 5.1 File Explorer 插件（P1）

- [ ] 创建 `plugins/file-explorer/` 目录结构
- [ ] 功能实现：
  - 树形文件目录浏览
  - 文件内容预览（文本/图片/JSON）
  - 文件搜索（文件名 / 内容搜索）
  - 文件操作：新建、重命名、删除、复制路径
  - 文件拖拽到 AI 对话作为上下文
- [ ] 注册 AI Tool：`read_file`、`list_directory`、`search_files`
- **验收**：可浏览本地文件系统，操作文件，AI 可读取文件内容

### 5.2 Git Helper 插件（P1）

- [ ] 创建 `plugins/git-helper/` 目录结构
- [ ] 功能实现：
  - Git 状态面板（modified / staged / untracked 文件列表）
  - 一键 stage / unstage / commit
  - 分支列表 + 切换
  - Diff 查看器
  - Commit 历史时间线
- [ ] 注册 AI Tool：`git_status`、`git_commit`、`git_diff`、`git_log`
- [ ] 注册命令：`quick-commit`（快捷键 `CmdOrCtrl+Shift+C`）
- **验收**：可在应用内完成常用 Git 操作，AI 可调用 Git 工具

### 5.3 Snippet Manager 插件（P2）

- [ ] 创建 `plugins/snippet-manager/` 目录结构
- [ ] 功能实现：
  - 代码片段 CRUD
  - 分类/标签管理
  - 搜索（标题 + 内容）
  - 一键复制到剪贴板
  - 支持 30+ 语言语法高亮
- [ ] 数据存储：使用 plugin storage API
- **验收**：可创建/搜索/复制代码片段

### 5.4 JSON Formatter 插件（P2）

- [ ] 创建 `plugins/json-formatter/` 目录结构
- [ ] 功能实现：
  - JSON 格式化 / 压缩
  - JSON 校验 + 错误定位
  - JSON ↔ TypeScript 类型互转
  - JSON Diff 对比
  - 树形可视化浏览
- **验收**：可粘贴 JSON 并执行格式化/校验/转换

### 5.5 Regex Tester 插件（P2）

- [ ] 创建 `plugins/regex-tester/` 目录结构
- [ ] 功能实现：
  - 正则输入 + 测试文本输入
  - 实时匹配高亮
  - 匹配组提取
  - 常用正则模板（邮箱、手机号、URL 等）
  - Flag 切换（g / i / m）
- **验收**：输入正则和文本后实时显示匹配结果

---

## Phase 6：打包分发 & 完善

> 目标：完成产品化准备，可分发给用户使用。
> 依赖：Phase 4 完成（基础功能可用）。

### 6.1 应用打包

- [ ] 配置 `electron-builder`：
  - macOS：`.dmg` + `.zip`，Universal Binary（Intel + Apple Silicon）
  - Windows：NSIS 安装包 `.exe`
  - Linux：`.AppImage` + `.deb`
- [ ] 配置应用图标、名称、版本号
- [ ] 配置 native 模块（`better-sqlite3`、`node-pty`）的 rebuild
- [ ] CI 构建脚本（GitHub Actions）：多平台自动构建 + Release
- **验收**：三平台均可成功构建安装包并安装运行

### 6.2 自动更新

- [ ] 集成 `electron-updater`
- [ ] 配置更新源（GitHub Releases）
- [ ] 实现更新检查 + 下载 + 安装流程
- [ ] 实现更新提示 UI（有新版本时提醒用户）
- **验收**：发布新版本后，旧版本可检测到更新并完成升级

### 6.3 安全加固

- [ ] 确认所有 `BrowserWindow` 配置：
  - `contextIsolation: true`
  - `nodeIntegration: false`
  - `sandbox: true`（可选）
- [ ] CSP 策略配置（Content Security Policy）
- [ ] 审查所有 IPC handler 的输入校验
- [ ] 插件签名验证机制（或手动授权流程）
- **验收**：安全审查通过，无明显漏洞

### 6.4 性能优化

- [ ] 渲染进程：React 组件懒加载（`React.lazy` + `Suspense`）
- [ ] 主进程：插件并行加载（无依赖关系的并行 activate）
- [ ] SQLite 查询优化：添加索引，大列表分页
- [ ] 应用启动耗时分析 & 优化（目标 < 2s 显示 UI）
- **验收**：启动速度 < 2s，大数据量下操作流畅

### 6.5 错误处理 & 日志

- [ ] 实现全局错误边界（React ErrorBoundary）
- [ ] 主进程 uncaughtException / unhandledRejection 捕获
- [ ] 日志系统（`electron-log`）：写入 `~/.workbox/logs/`
- [ ] 插件错误隔离（单个插件崩溃不影响其他插件和主应用）
- **验收**：任何崩溃都有日志可追溯，插件错误被隔离

---

## 开发顺序建议（关键路径）

```
Phase 0 (脚手架)
    │
    ▼
Phase 1 (核心框架: IPC + Storage + UI Shell)
    │
    ├──────────────────┐
    ▼                  ▼
Phase 2 (插件系统)   Phase 6.5 (日志 & 错误处理，可提前做)
    │
    ▼
Phase 3 (AI 能力)
    │
    ├──────────────────┐
    ▼                  ▼
Phase 4 (P0 插件)   Phase 6.1-6.3 (打包 & 安全，可并行)
    │
    ▼
Phase 5 (P1-P2 插件，按需逐步完成)
    │
    ▼
Phase 6.4 (性能优化，收尾)
```

---

## 里程碑 Checklist

| 里程碑            | 标志                                         | 对应阶段 |
| ----------------- | -------------------------------------------- | -------- |
| **M0 - 骨架就绪** | 空壳 Electron 应用可运行，工具链完整         | Phase 0  |
| **M1 - 框架可用** | IPC 通信打通，App Shell 可导航，数据库可读写 | Phase 1  |
| **M2 - 插件可用** | 插件可加载/卸载，Plugin API 可用             | Phase 2  |
| **M3 - AI 可用**  | 可与 AI 对话，流式响应，Tool Calling 工作    | Phase 3  |
| **M4 - Alpha**    | Terminal + AI Chatbox 功能完整，可日常使用   | Phase 4  |
| **M5 - Beta**     | 全部内置插件完成，基本可分发                 | Phase 5  |
| **M6 - Release**  | 多平台打包，自动更新，安全审查通过           | Phase 6  |

---

## 技术风险 & 应对

| 风险                                       | 影响                  | 应对方案                                                      |
| ------------------------------------------ | --------------------- | ------------------------------------------------------------- |
| `better-sqlite3` native 模块跨平台编译问题 | 安装/构建失败         | 使用 `electron-rebuild`，CI 分平台构建                        |
| `node-pty` 在 Windows 上兼容性问题         | Terminal 插件功能受限 | 提前在 Windows 上验证，备选 `@xterm/addon-attach` + WebSocket |
| Electron 包体积过大                        | 安装包 > 200MB        | 精简 node_modules，使用 `asar` 打包，Tree-shaking             |
| 插件 API 设计不合理需要 breaking change    | 已有插件需要修改      | Phase 2 阶段充分验证，API 设计预留扩展点                      |
| AI Provider API 限流或不兼容               | 对话功能不稳定        | 实现 retry + fallback 机制，支持多 Provider 切换              |
