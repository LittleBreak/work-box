# Phase 4：内置插件（P0）

> **目标**：实现第一批核心插件（Terminal），验证插件系统可用性；增强 AI Chatbox 功能至日常可用状态。
>
> **里程碑**：M4 - Alpha（Terminal + AI Chatbox 功能完整，可日常使用）

---

## 任务编号说明

Phase 4 共 7 个任务（4.1–4.7），分为两大块：

- **Terminal 插件**（4.1–4.4）：从插件骨架 → 后端 PTY 管理 → 前端 xterm.js UI → AI Tool 集成
- **AI Chatbox 增强**（4.5–4.7）：消息操作与系统 Prompt → 导出与搜索 → 文件附件

---

## Phase 4 执行前置（必须确认）

在开始任何 Task 前，先记录并确认以下信息：

- [ ] Phase 2 + Phase 3 所有任务已完成且 `pnpm test` 全部通过
- [ ] `src/main/plugin/engine.ts` 已实现 `scanPlugins()`、`parseManifest()`、`resolveLoadOrder()`
- [ ] `src/main/plugin/context.ts` 已实现完整 `PluginContext`（fs/shell/ai/commands/notification/workspace/storage）
- [ ] `src/main/plugin/manager.ts` 已实现 `loadAll()`、`enablePlugin()`、`disablePlugin()`、`shutdown()`
- [ ] `src/main/ai/service.ts` 已实现 `createConversation()`、`chat()`、`getHistory()`、`deleteConversation()`
- [ ] `src/main/ai/tool-router.ts` 已实现 Tool 注册表和路由执行
- [ ] `src/main/ipc/ai.handler.ts` 已实现 AI 相关 IPC handler
- [ ] `src/renderer/src/features/chat/` 下 ChatView、MessageList、MessageInput、store 已实现
- [ ] `src/main/storage/schema.ts` 已定义 conversations、messages、plugin_storage、settings 表
- [ ] `src/main/storage/crud.ts` 已实现对话和消息 CRUD 操作
- [ ] `packages/plugin-api/src/types.ts` 已定义 `PluginDefinition`、`PluginContext`、`ToolDefinition`
- [ ] `src/shared/ipc-channels.ts` 已定义 fs/shell/ai/plugin/settings 通道
- [ ] 路径别名 `@main`、`@renderer`、`@shared` 可用
- [ ] 本阶段只引入 `ARCHITECTURE.md` 与 `ROADMAP.md` 已声明依赖（`node-pty`、`@xterm/xterm`、`@xterm/addon-fit`）
- [ ] 执行任务后必须更新任务状态：将对应的验收标准和交付物清单项标记为 `[x]`

---

## 任务依赖关系 & 推荐执行顺序

### 依赖关系图

```
4.1（Terminal 插件骨架 + PluginManager 激活）← Phase 4 起点
  └── 4.2（Terminal 后端：node-pty session 管理）← 依赖 4.1 的插件骨架
        └── 4.3（Terminal 前端：xterm.js UI）← 依赖 4.2 的 IPC 数据通道
              └── 4.4（Terminal AI Tool：run_command）← 依赖 4.2 的 session 管理

4.5（消息操作 + 系统 Prompt）← 独立于 Terminal，依赖 Phase 3
  └── 4.6（对话导出 + 搜索）← 依赖 4.5 的 CRUD 扩展
        └── 4.7（文件附件上下文）← 依赖 4.6 的 UI 模式
```

### 推荐执行顺序

```
[4.1 → 4.2 → 4.3 → 4.4] ∥ [4.5 → 4.6 → 4.7]
```

- Terminal 线（4.1–4.4）和 Chatbox 增强线（4.5–4.7）**可并行执行**
- Terminal 线内部严格顺序：骨架 → 后端 → 前端 → AI Tool
- Chatbox 线内部严格顺序：消息操作 → 导出搜索 → 文件附件

---

## TDD 分层策略

### A 类：有可测试行为的任务 → 严格 TDD（Red-Green-Refactor）

适用于：4.1、4.2、4.4、4.5、4.6、4.7

1. **Red**：先编写测试（正常路径 + 边界条件 + 错误处理），运行并确认失败
2. **Green**：实现最小代码使测试通过
3. **Refactor**：重构并再次运行测试确保通过

### B 类：纯配置/UI 骨架 → 验证式测试

适用于：4.3（Terminal UI 组件）

1. 编写验证式测试（组件可渲染、交互响应）
2. 实现功能
3. 运行测试确认通过

> **注意**：B 类不豁免测试，仅豁免严格的 Red-Green-Refactor 流程顺序。仍需编写测试保证可回归。

### 统一留痕要求

- [ ] A 类任务：记录 Red 阶段失败测试名称、Green 阶段通过结果、最终回归结果
- [ ] B 类任务：记录验证式测试通过结果
- [ ] 所有任务：`pnpm test` 通过
- [ ] 测试文件与源文件同目录：`*.test.ts` / `*.test.tsx`

---

## 4.1 Terminal 插件骨架 + PluginManager 激活

**目标**：创建 Terminal 插件的目录结构和 package.json 清单，同时在主进程中激活 PluginManager，使插件系统真正运行起来。

**输入/前置条件**：

- 依赖：Phase 2（插件系统）+ Phase 3（AI 能力）完成
- 需读取：`ARCHITECTURE.md` 第四节（4.1 插件目录结构、4.2 插件清单格式）
- 当前状态：
  - `plugins/` 目录仅有 `.gitkeep`，无实际插件
  - `src/main/plugin/manager.ts` 已实现但**未在 `src/main/index.ts` 中实例化**
  - `src/main/ipc/register.ts` 中 plugin handler 已注册但 PluginManager 未激活

**验证策略**：A 类（严格 TDD）

**关键决策**：

| 决策项             | 方案                                                                   |
| ------------------ | ---------------------------------------------------------------------- |
| 插件包名           | `@workbox/plugin-terminal`，遵循 `@workbox/plugin-{name}` 约定         |
| 权限声明           | `["shell:exec"]`（Terminal 需要执行命令的权限）                        |
| 入口文件           | `main: "./src/index.ts"`, `ui: "./src/ui/TerminalPanel.tsx"`           |
| 命令注册           | `id: "open-terminal"`, `shortcut: "CmdOrCtrl+\`"`                      |
| AI Tools           | `["run_command"]`                                                      |
| PluginManager 激活 | 在 `src/main/index.ts` 的 `app.whenReady()` 中实例化并调用 `loadAll()` |

**验收标准**：

- [x] 创建 `plugins/terminal/package.json`，包含完整 `workbox` 字段
- [x] 创建 `plugins/terminal/src/index.ts`，导出 `definePlugin()` 骨架（activate/deactivate 为空实现）
- [x] 创建 `plugins/terminal/src/ui/TerminalPanel.tsx`，导出占位 React 组件
- [x] 在 `src/main/index.ts` 中实例化 `PluginManager` 并调用 `loadAll()`
- [x] 编写测试验证：
  - [x] `parseManifest()` 可正确解析 Terminal 插件的 package.json
  - [x] PluginManager 可扫描到 Terminal 插件
  - [x] Terminal 插件 `activate()` 被调用且不报错
- [x] `pnpm test` 全部通过（pre-existing crud/settings 失败除外）

**交付物清单**：

- [x] `plugins/terminal/package.json` — 插件清单
- [x] `plugins/terminal/src/index.ts` — 插件入口（骨架）
- [x] `plugins/terminal/src/ui/TerminalPanel.tsx` — UI 占位组件
- [x] `src/main/index.ts` — 添加 PluginManager 激活代码
- [x] `plugins/terminal/src/index.test.ts` — 插件骨架测试

**参考文档**：

- `ARCHITECTURE.md` 4.1（插件目录结构，Lines 116-128）
- `ARCHITECTURE.md` 4.2（插件清单格式，Lines 130-157）— 参考 Git Helper 示例清单
- `ARCHITECTURE.md` 4.3（definePlugin 模式，Lines 161-196）

**反模式警告**：

- ❌ 不要在 Terminal 插件的 `package.json` 中使用 `main` 字段（Node.js 的），用 `workbox.entry.main`
- ❌ 不要在插件内直接 `import` Node.js 模块，通过 `ctx` 上下文操作
- ❌ 不要跳过 PluginManager 激活步骤，否则后续任务的插件无法加载

---

## 4.2 Terminal 后端：node-pty Session 管理

**目标**：安装 `node-pty`，实现多终端 session 的生命周期管理（创建、写入、resize、销毁），通过 IPC 通道转发 PTY 数据流。

**输入/前置条件**：

- 依赖：4.1 完成（Terminal 插件骨架已就绪）
- 需安装：`node-pty`（native 模块，需 electron-rebuild）
- 当前状态：
  - `node-pty` 未安装
  - Terminal 插件 activate() 为空实现
  - `src/shared/ipc-channels.ts` 无 terminal 相关通道

**验证策略**：A 类（严格 TDD）

**关键决策**：

| 决策项           | 方案                                                                                                  |
| ---------------- | ----------------------------------------------------------------------------------------------------- |
| node-pty 安装    | `pnpm add node-pty`，使用 `electron-rebuild` 或 `@electron/rebuild` 编译 native 模块                  |
| Session 管理架构 | `TerminalSessionManager` 类，维护 `Map<string, IPty>` 实例池                                          |
| IPC 通道命名     | `terminal:create`、`terminal:write`、`terminal:resize`、`terminal:close`、`terminal:data`（数据推送） |
| 数据流方向       | stdin: renderer → main（invoke），stdout: main → renderer（IPC event push via `webContents.send`）    |
| 默认 Shell       | macOS: `zsh`（`process.env.SHELL`），Windows: `powershell.exe`，Linux: `bash`                         |
| Session ID       | 使用 `crypto.randomUUID()` 生成                                                                       |

**API 设计**：

```typescript
// plugins/terminal/src/session-manager.ts
class TerminalSessionManager {
  /** 创建新终端 session，返回 sessionId */
  create(options?: { cols?: number; rows?: number; cwd?: string }): string;

  /** 向指定 session 写入数据（用户输入） */
  write(sessionId: string, data: string): void;

  /** 调整终端尺寸 */
  resize(sessionId: string, cols: number, rows: number): void;

  /** 关闭并销毁指定 session */
  close(sessionId: string): void;

  /** 关闭所有 session（插件 deactivate 时调用） */
  closeAll(): void;

  /** 注册数据回调（stdout 输出） */
  onData(sessionId: string, callback: (data: string) => void): void;

  /** 注册 session 退出回调 */
  onExit(sessionId: string, callback: (exitCode: number) => void): void;

  /** 获取所有活跃 session ID */
  listSessions(): string[];
}
```

**node-pty 关键 API 参考**：

```typescript
import * as pty from "node-pty";

// 创建 PTY 实例
const shell = process.platform === "win32" ? "powershell.exe" : process.env.SHELL || "bash";
const ptyProcess = pty.spawn(shell, [], {
  name: "xterm-256color",
  cols: 80,
  rows: 30,
  cwd: process.env.HOME,
  env: process.env as Record<string, string>
});

// 监听输出
ptyProcess.onData((data: string) => {
  /* 转发到 renderer */
});

// 监听退出
ptyProcess.onExit(({ exitCode }) => {
  /* 清理资源 */
});

// 写入输入
ptyProcess.write("ls -la\r");

// 调整尺寸
ptyProcess.resize(120, 40);

// 销毁
ptyProcess.kill();
```

**IPC 通道定义**（添加到 `src/shared/ipc-channels.ts`）：

```typescript
terminal: {
  create: "terminal:create",       // invoke: (options?) → sessionId
  write: "terminal:write",         // invoke: (sessionId, data) → void
  resize: "terminal:resize",       // invoke: (sessionId, cols, rows) → void
  close: "terminal:close",         // invoke: (sessionId) → void
  list: "terminal:list",           // invoke: () → string[]
  data: "terminal:data",           // event push: (sessionId, data) → renderer
  exit: "terminal:exit"            // event push: (sessionId, exitCode) → renderer
}
```

**验收标准**：

- [x] 安装 `node-pty` 并成功编译（`pnpm install` + `electron-rebuild`）
- [x] 实现 `plugins/terminal/src/session-manager.ts`：
  - [x] `create()` 创建 PTY 实例并返回 sessionId
  - [x] `write()` 向 PTY stdin 写入数据
  - [x] `resize()` 调整 PTY 终端尺寸
  - [x] `close()` 销毁单个 PTY 实例，释放资源
  - [x] `closeAll()` 关闭所有 session
  - [x] `onData()` / `onExit()` 回调注册
  - [x] `listSessions()` 返回活跃 session 列表
- [x] 在 `src/shared/ipc-channels.ts` 中添加 terminal 相关通道
- [x] 在 `src/shared/types.ts` 中添加 Terminal 相关类型定义
- [x] 在 `plugins/terminal/src/index.ts` 的 `activate()` 中注册 IPC handler：
  - [x] `terminal:create` → 调用 sessionManager.create()
  - [x] `terminal:write` → 调用 sessionManager.write()
  - [x] `terminal:resize` → 调用 sessionManager.resize()
  - [x] `terminal:close` → 调用 sessionManager.close()
  - [x] `terminal:list` → 调用 sessionManager.listSessions()
  - [x] stdout 数据通过 `webContents.send("terminal:data", sessionId, data)` 推送
- [x] 在 `deactivate()` 中调用 `sessionManager.closeAll()` 清理资源
- [x] 在 `src/preload/index.ts` 中暴露 `window.workbox.terminal.*` API
- [x] 编写测试覆盖：
  - [x] session 创建和销毁
  - [x] 多 session 并发管理
  - [x] write 和 onData 数据流转
  - [x] resize 调用
  - [x] closeAll 批量清理
  - [x] 无效 sessionId 错误处理
- [x] `pnpm test` 全部通过

**交付物清单**：

- [x] `plugins/terminal/src/session-manager.ts` — SessionManager 实现
- [x] `plugins/terminal/src/session-manager.test.ts` — SessionManager 测试
- [x] `plugins/terminal/src/index.ts` — 更新 activate/deactivate 逻辑
- [x] `src/shared/ipc-channels.ts` — 添加 terminal 通道
- [x] `src/shared/types.ts` — 添加 Terminal 类型
- [x] `src/preload/index.ts` — 暴露 terminal API

**参考文档**：

- `ARCHITECTURE.md` 6.1（IPC 通道命名约定，Lines 366-391）— `domain:action` 格式
- `ARCHITECTURE.md` 6.2（Preload Bridge 模式，Lines 396-422）
- `ARCHITECTURE.md` 4.3（Plugin activate 模式，Lines 161-196）

**反模式警告**：

- ❌ 不要在 renderer 进程中直接 `import` node-pty，必须通过 IPC
- ❌ 不要使用 WebSocket 转发 PTY 数据，Electron IPC 足够且更简单
- ❌ 不要忘记在 `deactivate()` 中清理 PTY 进程，否则会导致僵尸进程
- ❌ 不要硬编码 shell 路径，使用 `process.env.SHELL` 或平台检测
- ❌ node-pty `onData` 回调可能在进程销毁后仍被触发，需要检查 session 是否仍存在

---

## 4.3 Terminal 前端：xterm.js UI

**目标**：安装 `@xterm/xterm` 和 `@xterm/addon-fit`，实现嵌入式终端 UI 组件，支持多 Tab 切换、终端 resize 自适应。

**输入/前置条件**：

- 依赖：4.2 完成（terminal IPC 通道已就绪，可发送/接收数据）
- 需安装：`@xterm/xterm`、`@xterm/addon-fit`
- 当前状态：
  - `plugins/terminal/src/ui/TerminalPanel.tsx` 为占位组件
  - `window.workbox.terminal.*` API 已在 preload 暴露

**验证策略**：B 类（验证式测试）

**关键决策**：

| 决策项        | 方案                                                                   |
| ------------- | ---------------------------------------------------------------------- |
| xterm.js 版本 | `@xterm/xterm@^5.x`（v5 使用 `@xterm/` 命名空间）                      |
| 自适应 addon  | `@xterm/addon-fit` — 自动计算 cols/rows 并触发 resize                  |
| 多 Tab 实现   | Zustand store 管理 tab 列表 + activeTabId，每个 tab 关联一个 sessionId |
| CSS 导入      | `@xterm/xterm/css/xterm.css` 在组件中导入                              |
| React 集成    | 使用 `useRef` + `useEffect` 手动 mount/unmount xterm.js Terminal 实例  |
| 主题支持      | xterm.js `ITheme` 配置，对应暗色/亮色两套颜色                          |

**xterm.js 关键 API 参考**：

```typescript
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

// 创建 Terminal 实例
const terminal = new Terminal({
  fontFamily: '"Cascadia Code", "Fira Code", monospace',
  fontSize: 14,
  theme: { background: "#1e1e1e", foreground: "#d4d4d4" },
  cursorBlink: true
});

// 加载 FitAddon
const fitAddon = new FitAddon();
terminal.loadAddon(fitAddon);

// 挂载到 DOM
terminal.open(containerElement);
fitAddon.fit(); // 自动计算 cols/rows

// 监听用户输入 → 发送到 main 进程
terminal.onData((data) => {
  window.workbox.terminal.write(sessionId, data);
});

// 接收 main 进程 stdout → 写入 terminal
window.workbox.terminal.onData(sessionId, (data) => {
  terminal.write(data);
});

// 监听 resize
const resizeObserver = new ResizeObserver(() => {
  fitAddon.fit();
  const { cols, rows } = fitAddon.proposeDimensions() ?? { cols: 80, rows: 30 };
  window.workbox.terminal.resize(sessionId, cols, rows);
});
resizeObserver.observe(containerElement);

// 清理
terminal.dispose();
resizeObserver.disconnect();
```

**组件层次结构**：

```
TerminalPanel.tsx          — 顶层容器，管理 Tab 列表
  ├── TerminalTabs.tsx     — Tab 栏（新建 Tab / 切换 / 关闭 Tab）
  └── TerminalInstance.tsx — 单个终端实例（xterm.js mount point）
```

**Store 设计**（`plugins/terminal/src/ui/store.ts`）：

```typescript
interface TerminalTab {
  id: string; // tab UUID
  sessionId: string; // 对应的 PTY session ID
  title: string; // 显示标题（默认 "Terminal 1"）
}

interface TerminalState {
  tabs: TerminalTab[];
  activeTabId: string | null;

  createTab(): Promise<void>;
  closeTab(tabId: string): Promise<void>;
  setActiveTab(tabId: string): void;
  updateTabTitle(tabId: string, title: string): void;
}
```

**验收标准**：

- [ ] 安装 `@xterm/xterm` 和 `@xterm/addon-fit`
- [ ] 实现 `plugins/terminal/src/ui/TerminalPanel.tsx`：
  - [ ] 显示 Tab 栏，支持创建新 Tab、切换 Tab、关闭 Tab
  - [ ] 每个 Tab 对应一个 xterm.js Terminal 实例
  - [ ] 关闭 Tab 时同时关闭对应 PTY session
- [ ] 实现 `plugins/terminal/src/ui/TerminalInstance.tsx`：
  - [ ] 使用 `useRef` + `useEffect` mount xterm.js Terminal
  - [ ] 用户键入 → 通过 IPC 发送到 PTY stdin
  - [ ] PTY stdout → 通过 IPC 接收并 `terminal.write()`
  - [ ] 容器 resize → `fitAddon.fit()` + IPC `terminal:resize`
  - [ ] 组件卸载时 `terminal.dispose()` + 清理 listeners
- [ ] 实现 `plugins/terminal/src/ui/store.ts`：
  - [ ] Tab 列表状态管理
  - [ ] createTab / closeTab / setActiveTab 操作
- [ ] 支持自定义字体、字号（从 AppSettings 读取或使用默认值）
- [ ] 支持暗色/亮色主题切换
- [ ] 编写测试：
  - [ ] store 状态管理测试（createTab、closeTab、setActiveTab）
  - [ ] TerminalPanel 组件渲染测试（Tab 栏展示、新建按钮）
- [ ] `pnpm test` 全部通过

**交付物清单**：

- [ ] `plugins/terminal/src/ui/TerminalPanel.tsx` — 终端面板主组件
- [ ] `plugins/terminal/src/ui/TerminalInstance.tsx` — 单终端实例组件
- [ ] `plugins/terminal/src/ui/TerminalTabs.tsx` — Tab 栏组件
- [ ] `plugins/terminal/src/ui/store.ts` — Terminal UI 状态管理
- [ ] `plugins/terminal/src/ui/store.test.ts` — store 测试
- [ ] `plugins/terminal/src/ui/TerminalPanel.test.tsx` — UI 组件测试

**参考文档**：

- `ARCHITECTURE.md` 4.1（插件 UI 目录，Lines 116-128）— `src/ui/Panel.tsx`
- `ARCHITECTURE.md` 8（目录结构，Lines 479-554）— renderer features 组织方式

**反模式警告**：

- ❌ 不要在每次 render 时创建新的 Terminal 实例，必须用 `useRef` 缓存
- ❌ 不要忘记导入 `@xterm/xterm/css/xterm.css`，否则终端无样式
- ❌ 不要在 Terminal `onData` 中直接操作 DOM，使用 React 状态管理
- ❌ 不要忽略 ResizeObserver 清理，会导致内存泄漏
- ❌ 不要将 `FitAddon` 实例定义为组件状态（会导致不必要的重渲染），用 `useRef`

---

## 4.4 Terminal AI Tool：run_command

**目标**：在 Terminal 插件中注册 `run_command` AI Tool，使 AI 对话中可以执行终端命令并返回结果。

**输入/前置条件**：

- 依赖：4.2 完成（TerminalSessionManager 可用）
- 需读取：`ARCHITECTURE.md` 4.3（AI Tool 注册模式）、5.3（Tool Calling 流程）
- 当前状态：
  - `ctx.ai.registerTool()` API 已在 PluginContext 中实现
  - AI Tool Router 已实现 tool 注册和路由执行
  - Terminal 插件 package.json 已声明 `ai.tools: ["run_command"]`

**验证策略**：A 类（严格 TDD）

**关键决策**：

| 决策项      | 方案                                                                                                      |
| ----------- | --------------------------------------------------------------------------------------------------------- |
| Tool 名称   | `run_command`（snake_case，遵循 AI Tool 命名约定）                                                        |
| 执行方式    | 创建临时 PTY session 执行命令，收集输出后销毁，不复用 UI 的 session                                       |
| 超时机制    | 默认 30 秒超时，超时后 kill 进程并返回错误                                                                |
| 输出限制    | 最大收集 10000 字符输出，超出时截断并附加提示                                                             |
| 安全考虑    | 复用 `src/main/ipc/shell.handler.ts` 中的危险命令检测逻辑                                                 |
| 参数 schema | 使用 Zod：`z.object({ command: z.string(), cwd: z.string().optional(), timeout: z.number().optional() })` |

**Tool 定义**：

```typescript
ctx.ai.registerTool({
  name: "run_command",
  description: "在终端中执行命令并返回输出结果。可用于运行 shell 命令、查看文件、编译代码等操作。",
  parameters: z.object({
    command: z.string().describe("要执行的 shell 命令"),
    cwd: z.string().optional().describe("工作目录，默认为用户 HOME 目录"),
    timeout: z.number().optional().describe("超时时间（毫秒），默认 30000")
  }),
  handler: async ({ command, cwd, timeout }) => {
    // 1. 危险命令检测
    // 2. 创建临时 PTY session
    // 3. 写入命令
    // 4. 收集输出直到命令完成或超时
    // 5. 销毁 session
    // 6. 返回 { stdout, exitCode }
  }
});
```

**验收标准**：

- [ ] 在 Terminal 插件 `activate()` 中调用 `ctx.ai.registerTool()` 注册 `run_command`
- [ ] 实现 `plugins/terminal/src/command-executor.ts`：
  - [ ] 接收命令字符串，创建临时 PTY 执行
  - [ ] 收集 stdout 输出
  - [ ] 支持超时控制（默认 30s）
  - [ ] 输出长度截断（最大 10000 字符）
  - [ ] 危险命令检测（复用已有逻辑）
  - [ ] 返回 `{ stdout: string; exitCode: number }` 或错误信息
- [ ] 在 `deactivate()` 中清理 tool 注册（通过 `Disposable` 返回值）
- [ ] 编写测试覆盖：
  - [ ] 简单命令执行并返回正确输出
  - [ ] 命令超时处理
  - [ ] 输出截断
  - [ ] 危险命令被拦截
  - [ ] 无效命令的错误处理
  - [ ] Tool 注册和注销
- [ ] `pnpm test` 全部通过

**交付物清单**：

- [ ] `plugins/terminal/src/command-executor.ts` — 命令执行器
- [ ] `plugins/terminal/src/command-executor.test.ts` — 执行器测试
- [ ] `plugins/terminal/src/index.ts` — 更新：注册 run_command AI Tool

**参考文档**：

- `ARCHITECTURE.md` 4.3（registerTool 模式，Lines 168-189）— Git Helper 示例
- `ARCHITECTURE.md` 5.3（Tool Calling 流程，Lines 341-355）
- `src/main/ipc/shell.handler.ts` — 危险命令检测逻辑（可复用）

**反模式警告**：

- ❌ 不要让 AI Tool 复用 UI 的终端 session，应创建独立临时 session
- ❌ 不要忘记超时控制，长时间运行的命令（如 `tail -f`）会阻塞 AI 响应
- ❌ 不要返回无限制长度的输出，大文件会超出 AI 模型上下文限制
- ❌ 不要跳过危险命令检测，`rm -rf /` 等命令必须拦截
- ❌ 不要忘记通过 `Disposable` 在 deactivate 时注销 tool

---

## 4.5 消息操作 + 系统 Prompt 自定义

**目标**：实现对话消息的复制、重新生成、编辑后重发功能，以及 per-conversation 的系统 Prompt 自定义。

**输入/前置条件**：

- 依赖：Phase 3 Task 3.5 完成（Chat UI 已就绪）
- 需读取：`ARCHITECTURE.md` 第九节（9.2 AI Chatbox 功能细节）
- 当前状态：
  - `src/renderer/src/features/chat/MessageList.tsx` 已渲染消息，但无操作按钮
  - `src/renderer/src/features/chat/store.ts` 有基础消息管理，无 regenerate/edit
  - `conversations` 表无 `system_prompt` 列
  - 无 clipboard IPC handler

**验证策略**：A 类（严格 TDD）

**关键决策**：

| 决策项           | 方案                                                                                |
| ---------------- | ----------------------------------------------------------------------------------- |
| 复制实现         | 新增 `clipboard:writeText` IPC 通道，main 进程调用 `electron.clipboard.writeText()` |
| 重新生成         | 从 store 中找到目标消息，删除该消息及之后的所有消息，重新发送最后一条 user 消息     |
| 编辑重发         | 修改目标 user 消息内容，删除之后所有消息，重新发送                                  |
| 消息删除持久化   | 新增 CRUD 方法 `deleteMessagesAfter(conversationId, messageId)`                     |
| 系统 Prompt 存储 | 在 conversations 表增加 `system_prompt` 列（需数据库 migration）                    |
| 系统 Prompt 注入 | AI Service `chat()` 方法读取 conversation.systemPrompt，作为 system message 前置    |
| 默认系统 Prompt  | 无自定义时使用空值（不注入 system message），由 Provider 自行决定默认行为           |

**数据库 Migration**：

```sql
-- 在 conversations 表新增 system_prompt 列
ALTER TABLE conversations ADD COLUMN system_prompt TEXT DEFAULT NULL;
```

**新增 IPC 通道**：

```typescript
// src/shared/ipc-channels.ts 新增
clipboard: {
  writeText: "clipboard:writeText"          // (text: string) → void
},
ai: {
  // ... existing
  updateSystemPrompt: "ai:updateSystemPrompt",  // (conversationId, prompt) → void
  deleteMessagesAfter: "ai:deleteMessagesAfter"  // (conversationId, messageId) → void
}
```

**验收标准**：

- [ ] **数据库 Migration**：
  - [ ] 在 conversations 表新增 `system_prompt` 列
  - [ ] 更新 `src/main/storage/schema.ts` 中 conversations 定义
  - [ ] 更新相关 CRUD 类型定义
- [ ] **复制功能**：
  - [ ] 新增 `src/main/ipc/clipboard.handler.ts`
  - [ ] 在 `src/shared/ipc-channels.ts` 添加 `clipboard:writeText`
  - [ ] 在 `src/preload/index.ts` 暴露 `window.workbox.clipboard.writeText()`
  - [ ] MessageList 中每条消息显示「复制」按钮
  - [ ] 点击后复制消息内容到剪贴板
- [ ] **重新生成**：
  - [ ] 在 chat store 中新增 `regenerateMessage(conversationId, messageId)` action
  - [ ] 新增 CRUD 方法 `deleteMessagesAfter(conversationId, messageId)`
  - [ ] 新增 IPC 通道 `ai:deleteMessagesAfter`
  - [ ] MessageList 中 assistant 消息显示「重新生成」按钮
  - [ ] 点击后删除该消息及后续消息，重新发送上一条 user 消息
- [ ] **编辑后重发**：
  - [ ] 在 chat store 中新增 `editAndResendMessage(conversationId, messageId, newContent)` action
  - [ ] MessageList 中 user 消息显示「编辑」按钮
  - [ ] 点击后消息内容变为可编辑文本框，确认后删除后续消息并重新发送
- [ ] **系统 Prompt 自定义**：
  - [ ] 新增 IPC 通道 `ai:updateSystemPrompt`
  - [ ] 在 AI Service `chat()` 中读取 conversation.systemPrompt 并注入
  - [ ] 在 ChatView 中添加系统 Prompt 设置入口（对话级别的齿轮图标或菜单）
  - [ ] 弹出文本框让用户编辑系统 Prompt，保存到数据库
- [ ] 编写测试覆盖：
  - [ ] clipboard handler 测试
  - [ ] store regenerateMessage 测试（消息删除 + 重发逻辑）
  - [ ] store editAndResendMessage 测试
  - [ ] CRUD deleteMessagesAfter 测试
  - [ ] systemPrompt 存储和读取测试
  - [ ] AI Service 注入 systemPrompt 测试
- [ ] `pnpm test` 全部通过

**交付物清单**：

- [ ] `src/main/storage/schema.ts` — 新增 systemPrompt 列
- [ ] `src/main/storage/crud.ts` — 新增 deleteMessagesAfter、更新 conversation 字段
- [ ] `src/main/storage/crud.test.ts` — 新增测试
- [ ] `src/main/ipc/clipboard.handler.ts` — clipboard IPC handler
- [ ] `src/main/ipc/clipboard.handler.test.ts` — clipboard 测试
- [ ] `src/shared/ipc-channels.ts` — 新增 clipboard、AI 扩展通道
- [ ] `src/shared/types.ts` — 更新 Conversation 类型
- [ ] `src/preload/index.ts` — 暴露 clipboard、新增 AI API
- [ ] `src/main/ai/service.ts` — systemPrompt 注入逻辑
- [ ] `src/main/ai/service.test.ts` — systemPrompt 注入测试
- [ ] `src/main/ipc/ai.handler.ts` — 新增 handler
- [ ] `src/renderer/src/features/chat/store.ts` — regenerate + edit actions
- [ ] `src/renderer/src/features/chat/store.test.ts` — 新增测试
- [ ] `src/renderer/src/features/chat/MessageList.tsx` — 消息操作按钮 UI

**参考文档**：

- `ARCHITECTURE.md` 9.2（AI Chatbox 功能细节，Lines 572-580）
- `ARCHITECTURE.md` 6.1（IPC 通道命名约定）
- `src/main/ipc/fs.handler.ts` — IPC handler 实现模式参考
- `src/renderer/src/features/chat/store.ts` — 现有 store 模式参考

**反模式警告**：

- ❌ 不要在 renderer 中直接调用 `navigator.clipboard`，使用 Electron clipboard API 通过 IPC
- ❌ 不要在 regenerate 时只删除 UI 中的消息，必须同步删除数据库记录
- ❌ 不要修改已有消息的 `id`（重新生成时创建新消息，不复用旧 ID）
- ❌ 不要在 migration 中 DROP + CREATE 表，使用 `ALTER TABLE ADD COLUMN`
- ❌ systemPrompt 为 null 时不要注入空 system message，应该完全跳过

---

## 4.6 对话导出 + 搜索

**目标**：实现对话导出（Markdown / JSON 格式）和对话搜索（关键词搜索历史对话标题和内容）。

**输入/前置条件**：

- 依赖：4.5 完成（CRUD 扩展已就绪）
- 需读取：`ARCHITECTURE.md` 第九节（9.2 AI Chatbox 功能细节）
- 当前状态：
  - `crud.getConversation()` 和 `crud.getMessagesByConversation()` 已可用
  - `dialog.showSaveDialog()` 未通过 IPC 暴露

**验证策略**：A 类（严格 TDD）

**关键决策**：

| 决策项        | 方案                                                                  |
| ------------- | --------------------------------------------------------------------- |
| 导出触发方式  | IPC invoke `ai:exportConversation`，main 进程弹出文件保存对话框       |
| Markdown 格式 | `# {title}\n\n## User\n{content}\n\n## Assistant\n{content}\n\n---\n` |
| JSON 格式     | `{ conversation: {...}, messages: [...] }` 完整结构化数据             |
| 搜索实现      | SQLite LIKE 查询（Phase 4 不引入 FTS5，LIKE 足够满足早期需求）        |
| 搜索范围      | 搜索对话标题 + 消息内容，返回匹配的对话列表                           |
| 搜索 IPC      | `ai:searchConversations` — `(query: string) → Conversation[]`         |

**Markdown 导出模板**：

```markdown
# {conversation.title}

> Exported at {ISO date}
> Conversation created: {conversation.createdAt ISO}

---

**User** _{message.createdAt ISO}_

{message.content}

---

**Assistant** _{message.createdAt ISO}_

{message.content}

---
```

**验收标准**：

- [ ] **对话导出**：
  - [ ] 实现 `plugins/terminal/` 之外的导出逻辑（可放在 `src/main/ai/export.ts`）
  - [ ] 实现 `formatConversationAsMarkdown(conversation, messages)` 纯函数
  - [ ] 实现 `formatConversationAsJSON(conversation, messages)` 纯函数
  - [ ] 新增 IPC 通道 `ai:exportConversation`
  - [ ] Handler 中调用 `dialog.showSaveDialog()` 弹出保存对话框
  - [ ] 写入文件到用户选择的路径
  - [ ] 在 ChatView 中添加「导出」按钮（支持选择格式）
- [ ] **对话搜索**：
  - [ ] 在 `crud.ts` 中新增 `searchConversations(query: string): Conversation[]`
  - [ ] 使用 SQLite LIKE 匹配 conversation.title
  - [ ] 新增 IPC 通道 `ai:searchConversations`
  - [ ] 在 `src/preload/index.ts` 暴露搜索 API
  - [ ] 在 ChatView 左侧对话列表上方添加搜索框
  - [ ] 在 chat store 中新增 `searchQuery` / `searchResults` 状态
  - [ ] 输入关键词时实时过滤对话列表
- [ ] 编写测试覆盖：
  - [ ] Markdown 格式化输出测试（正常对话、空对话、含代码块的对话）
  - [ ] JSON 格式化输出测试
  - [ ] CRUD searchConversations 测试（匹配、无结果、空查询）
  - [ ] store 搜索状态管理测试
- [ ] `pnpm test` 全部通过

**交付物清单**：

- [ ] `src/main/ai/export.ts` — 导出格式化逻辑
- [ ] `src/main/ai/export.test.ts` — 导出格式化测试
- [ ] `src/main/storage/crud.ts` — 新增 searchConversations
- [ ] `src/main/storage/crud.test.ts` — 搜索测试
- [ ] `src/shared/ipc-channels.ts` — 新增导出和搜索通道
- [ ] `src/preload/index.ts` — 暴露新 API
- [ ] `src/main/ipc/ai.handler.ts` — 新增 handler
- [ ] `src/renderer/src/features/chat/store.ts` — 搜索状态
- [ ] `src/renderer/src/features/chat/store.test.ts` — 搜索测试
- [ ] `src/renderer/src/features/chat/ChatView.tsx` — 导出按钮 + 搜索框 UI

**参考文档**：

- `ARCHITECTURE.md` 9.2（AI Chatbox 功能细节，Lines 572-580）
- `src/main/storage/crud.ts` — 现有 CRUD 模式参考
- `src/main/ipc/ai.handler.ts` — IPC handler 模式参考

**反模式警告**：

- ❌ 不要在 renderer 进程中使用 `fs.writeFile` 写文件，必须通过 IPC 在 main 进程操作
- ❌ 不要在搜索中使用正则表达式（SQLite 不支持），使用 LIKE
- ❌ 不要在导出中包含 tool_calls/tool_result 的原始 JSON（可读性差），格式化为人类可读文本
- ❌ 不要在每次键入搜索字符时都发起 IPC 调用，使用 debounce（300ms）

---

## 4.7 文件附件上下文

**目标**：实现对话中拖拽/选择文件，将文件内容作为上下文附件传给 AI。

**输入/前置条件**：

- 依赖：4.5 完成（消息操作 UI 模式已建立）
- 需读取：`ARCHITECTURE.md` 第九节（9.2 AI Chatbox 功能细节）
- 当前状态：
  - `window.workbox.fs.readFile(path)` 已可用（返回 UTF-8 字符串）
  - `window.workbox.fs.stat(path)` 已可用（返回 FileStat）
  - MessageInput 无文件上传功能

**验证策略**：A 类（严格 TDD）

**关键决策**：

| 决策项         | 方案                                                                       |
| -------------- | -------------------------------------------------------------------------- |
| 附件来源       | 支持两种方式：① 拖拽文件到输入区域 ② 点击附件按钮选择文件                  |
| 文件读取       | 通过 `window.workbox.fs.readFile()` 读取文件内容（UTF-8）                  |
| 文件大小限制   | 最大 100KB，超过提示用户                                                   |
| 附件存储       | 仅在内存中（store state），不持久化到数据库                                |
| 上下文注入方式 | 将文件内容格式化为 `[File: filename.ext]\n{content}\n` 前置到 user message |
| 发送后清理     | 消息发送成功后自动清空附件列表                                             |
| 支持文件类型   | 所有文本文件（.ts, .js, .json, .md, .txt, .py, .go 等），二进制文件不支持  |

**Store 扩展**（`chat/store.ts`）：

```typescript
interface Attachment {
  id: string;        // UUID
  fileName: string;  // 文件名
  filePath: string;  // 完整路径
  fileSize: number;  // 字节数
  content: string;   // 文件内容（UTF-8）
}

// 新增 state
attachments: Attachment[];

// 新增 actions
addAttachment(attachment: Attachment): void;
removeAttachment(id: string): void;
clearAttachments(): void;
```

**验收标准**：

- [ ] **Store 扩展**：
  - [ ] 在 chat store 中新增 `attachments` 状态
  - [ ] 实现 `addAttachment` / `removeAttachment` / `clearAttachments` actions
  - [ ] 发送消息时将 attachments 内容注入 user message 前缀
  - [ ] 发送成功后自动 clearAttachments
- [ ] **MessageInput 拖拽支持**：
  - [ ] 添加 `onDragOver` / `onDrop` 事件处理
  - [ ] Drop 时读取文件路径，调用 `window.workbox.fs.readFile()` 获取内容
  - [ ] 检查文件大小（≤100KB），超出提示用户
  - [ ] 添加到 store attachments
- [ ] **附件按钮**：
  - [ ] 在 MessageInput 中添加「附件」图标按钮
  - [ ] 点击后调用 `window.workbox.workspace.selectFile()` 选择文件
  - [ ] 选择后读取文件内容并添加到 attachments
- [ ] **附件预览**：
  - [ ] 在输入框上方显示已添加的附件列表（文件名 + 大小 + 删除按钮）
  - [ ] 支持点击删除单个附件
- [ ] **上下文注入**：
  - [ ] 发送消息时，将附件内容按格式 `[File: {name}]\n{content}` 拼接到消息前
  - [ ] 拼接后的完整消息发送给 AI
- [ ] 编写测试覆盖：
  - [ ] store attachments CRUD 测试
  - [ ] 文件内容注入格式测试
  - [ ] 大小限制检查测试
  - [ ] 发送后自动清理测试
  - [ ] MessageInput 拖拽交互测试（mock drop event）
- [ ] `pnpm test` 全部通过

**交付物清单**：

- [ ] `src/renderer/src/features/chat/store.ts` — 新增 attachment 状态和 actions
- [ ] `src/renderer/src/features/chat/store.test.ts` — attachment 测试
- [ ] `src/renderer/src/features/chat/MessageInput.tsx` — 拖拽 + 附件按钮 + 预览
- [ ] `src/renderer/src/features/chat/MessageInput.test.tsx` — 拖拽交互测试

**参考文档**：

- `ARCHITECTURE.md` 9.2（AI Chatbox 功能细节，Lines 572-580）— "Context attachments: Attach file content to conversation"
- `src/main/ipc/fs.handler.ts` — 文件读取 API 参考
- `src/preload/index.ts` — 已暴露的 `window.workbox.fs.readFile()` 和 `window.workbox.workspace.selectFile()`

**反模式警告**：

- ❌ 不要尝试读取二进制文件（图片、PDF），只支持文本文件
- ❌ 不要将附件持久化到数据库，避免数据库膨胀
- ❌ 不要在附件内容中注入 Markdown 格式标记，保持原始内容
- ❌ 不要允许无限制的附件数量，建议最多 5 个附件/消息
- ❌ 不要忘记在发送失败时保留附件（只在成功后清理）

---

## Phase 4 完成后验证清单

完成所有 7 个任务后，执行以下最终验证：

### 功能验证

- [ ] `pnpm test` 全部通过（0 失败）
- [ ] Terminal 插件：
  - [ ] 打开应用后 Terminal 插件自动加载
  - [ ] 可创建终端 Tab 并执行命令
  - [ ] 支持多 Tab 并发操作
  - [ ] 终端 resize 自适应窗口大小
  - [ ] AI 对话中可使用 `run_command` 执行命令
- [ ] AI Chatbox 增强：
  - [ ] 可复制任意消息内容到剪贴板
  - [ ] 可重新生成 assistant 消息
  - [ ] 可编辑 user 消息并重新发送
  - [ ] 可自定义对话的系统 Prompt
  - [ ] 可导出对话为 Markdown 和 JSON 格式
  - [ ] 可搜索历史对话
  - [ ] 可拖拽文件作为上下文附件

### 代码质量

- [ ] `pnpm lint` 无错误
- [ ] 无 `any` 类型使用
- [ ] 所有导出函数/类型有 JSDoc 注释
- [ ] 无安全漏洞（IPC 输入校验、路径安全、命令检测）

### 反模式检查

- [ ] `grep -r "import.*node-pty" src/renderer/` — 应无结果（不应在 renderer 中导入 node-pty）
- [ ] `grep -r "navigator.clipboard" src/` — 应无结果（使用 Electron clipboard API）
- [ ] `grep -r ": any" plugins/ src/` — 应无结果（禁止 any 类型）
