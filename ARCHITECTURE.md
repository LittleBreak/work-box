# Work-Box 开发提效百宝箱 - 技术架构方案

## 一、项目概述

### 1.1 项目定位

Work-Box 是一款面向开发者的桌面端提效工具，采用插件式架构设计，集成 AI 能力，提供一站式的开发辅助体验。

### 1.2 核心目标

- **插件化**：功能以插件形式组织，新增能力只需注册插件，零侵入核心代码
- **系统级权限**：完整访问本机文件系统、执行命令脚本、管理进程
- **AI 原生**：内置类 Chatbox 的 AI 对话交互，插件可直接调用 AI 能力

### 1.3 目标用户

前端/后端/全栈开发者，追求工作流自动化和开发效率提升。

---

## 二、技术选型

| 层级      | 技术                    | 版本   | 选型理由                                                     |
| --------- | ----------------------- | ------ | ------------------------------------------------------------ |
| 桌面框架  | Electron                | v33+   | 成熟稳定，系统权限完整，生态丰富                             |
| 前端框架  | React                   | v19+   | 生态最大，组件库丰富，适合复杂 UI                            |
| 构建工具  | Vite                    | v6+    | 极速 HMR，Electron 集成方案成熟                              |
| 脚手架    | electron-vite           | latest | 开箱即用的 Electron + Vite 集成方案                          |
| UI 组件库 | shadcn/ui               | latest | 非黑盒依赖，源码级组件，完全可定制，基于 Radix UI + Tailwind |
| 样式方案  | Tailwind CSS            | v4+    | 原子化 CSS，快速开发                                         |
| 状态管理  | Zustand                 | v5+    | 轻量、直觉式、TypeScript 友好                                |
| AI SDK    | Vercel AI SDK           | latest | 统一多模型接入，流式响应支持好                               |
| 数据存储  | SQLite (better-sqlite3) | latest | 本地嵌入式数据库，无需额外服务                               |
| ORM       | Drizzle ORM             | latest | 类型安全、轻量、支持 SQLite                                  |
| 语言      | TypeScript              | v5.5+  | 全栈类型安全                                                 |
| 包管理    | pnpm                    | v9+    | 速度快、磁盘占用小、monorepo 支持好                          |
| 测试      | Vitest                  | latest | 与 Vite 生态统一，速度快                                     |

---

## 三、系统架构

### 3.1 整体架构图

```
┌─────────────────────────────────────────────────────────┐
│                     Renderer Process                     │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────────┐  │
│  │  App Shell   │ │  AI Chatbox  │ │   Plugin UIs     │  │
│  │  (Layout /   │ │  (对话交互)   │ │  (插件渲染区域)   │  │
│  │   Router)    │ │              │ │                  │  │
│  └──────┬───────┘ └──────┬───────┘ └────────┬─────────┘  │
│         │                │                  │            │
│  ┌──────┴────────────────┴──────────────────┴─────────┐  │
│  │              Preload Bridge (IPC)                   │  │
│  └────────────────────────┬───────────────────────────┘  │
└───────────────────────────┼──────────────────────────────┘
                            │ IPC (contextBridge)
┌───────────────────────────┼──────────────────────────────┐
│                     Main Process                         │
│  ┌────────────────────────┴───────────────────────────┐  │
│  │                  IPC Router                         │  │
│  └──┬──────────┬──────────┬───────────┬───────────────┘  │
│     │          │          │           │                   │
│  ┌──┴───┐  ┌──┴───┐  ┌──┴────┐  ┌──┴──────────────┐   │
│  │Plugin│  │ File │  │ Shell │  │   AI Service     │   │
│  │Engine│  │System│  │Executor│  │(Multi-Provider) │   │
│  └──┬───┘  └──────┘  └───────┘  └─────────────────┘   │
│     │                                                    │
│  ┌──┴──────────────────────────────────────────────┐    │
│  │              Plugin Instances                    │    │
│  │  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐           │    │
│  │  │ P1  │  │ P2  │  │ P3  │  │ ... │           │    │
│  │  └─────┘  └─────┘  └─────┘  └─────┘           │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │         Storage Layer (SQLite + fs)              │    │
│  └─────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

### 3.2 进程模型

#### Main Process（主进程）

主进程是应用的核心，负责：

- **插件引擎**：加载、初始化、管理插件生命周期
- **文件系统服务**：提供文件读写、目录遍历、文件监听能力
- **Shell 执行器**：安全执行命令脚本，管理子进程
- **AI 服务层**：管理 AI Provider，处理对话请求，流式响应转发
- **数据存储**：SQLite 数据库操作，配置持久化
- **IPC 路由**：统一处理渲染进程的调用请求

#### Renderer Process（渲染进程）

渲染进程负责 UI 展示：

- **App Shell**：应用主框架，侧边栏导航 + 内容区布局
- **AI Chatbox**：对话式交互界面，支持 Markdown 渲染、代码高亮
- **Plugin UI**：插件自定义的 UI 面板，动态挂载

#### Preload Bridge（预加载桥）

安全的进程间通信桥梁，通过 `contextBridge` 暴露受控 API。

---

## 四、插件系统设计

### 4.1 插件规范

每个插件是一个独立的 npm 包或本地目录，需遵循以下规范：

#### 目录结构

```
plugins/
  └── my-plugin/
      ├── package.json          # 插件元信息
      ├── src/
      │   ├── index.ts          # 主进程入口（Plugin Backend）
      │   └── ui/               # 可选：渲染进程 UI
      │       └── Panel.tsx
      └── assets/               # 可选：静态资源
          └── icon.svg
```

#### 插件清单 (package.json)

```jsonc
{
  "name": "@workbox/plugin-git-helper",
  "version": "1.0.0",
  "workbox": {
    "name": "Git Helper",
    "description": "一键 Git 操作助手",
    "icon": "./assets/icon.svg",
    "permissions": ["fs:read", "shell:exec"],
    "entry": {
      "main": "./src/index.ts",
      "ui": "./src/ui/Panel.tsx"
    },
    "commands": [
      {
        "id": "quick-commit",
        "title": "Quick Commit",
        "shortcut": "CmdOrCtrl+Shift+C"
      }
    ],
    "ai": {
      "tools": ["git_status", "git_commit"]
    }
  }
}
```

### 4.2 插件 API

```typescript
import { definePlugin } from '@workbox/plugin-api'

export default definePlugin({
  name: 'git-helper',

  // 插件激活时调用
  async activate(ctx: PluginContext) {
    // 注册命令
    ctx.commands.register('quick-commit', async () => {
      const status = await ctx.shell.exec('git status --porcelain')
      if (status.stdout) {
        await ctx.shell.exec('git add -A && git commit -m "quick commit"')
        ctx.notification.success('Commit 成功')
      }
    })

    // 注册 AI Tool（供 AI 对话时调用）
    ctx.ai.registerTool({
      name: 'git_status',
      description: '获取当前 Git 仓库状态',
      parameters: z.object({
        path: z.string().optional().describe('仓库路径')
      }),
      handler: async ({ path }) => {
        const cwd = path || ctx.workspace.rootPath
        return ctx.shell.exec('git status', { cwd })
      }
    })
  },

  // 插件停用时调用
  async deactivate() {
    // 清理资源
  }
})
```

### 4.3 PluginContext API 清单

```typescript
interface PluginContext {
  // 插件元信息
  plugin: { id: string; name: string; version: string; dataPath: string }

  // 文件系统
  fs: {
    readFile(path: string): Promise<Buffer>
    writeFile(path: string, data: Buffer | string): Promise<void>
    readDir(path: string): Promise<string[]>
    watch(path: string, callback: WatchCallback): Disposable
    stat(path: string): Promise<FileStat>
  }

  // 命令执行
  shell: {
    exec(command: string, options?: ExecOptions): Promise<ExecResult>
    spawn(command: string, args: string[], options?: SpawnOptions): ChildProcess
  }

  // AI 能力
  ai: {
    chat(messages: Message[], options?: ChatOptions): AsyncIterable<StreamChunk>
    registerTool(tool: ToolDefinition): Disposable
  }

  // 命令注册
  commands: {
    register(id: string, handler: CommandHandler): Disposable
  }

  // UI 通知
  notification: {
    success(message: string): void
    error(message: string): void
    info(message: string): void
  }

  // 工作区
  workspace: {
    rootPath: string
    selectFolder(): Promise<string | null>
    selectFile(filters?: FileFilter[]): Promise<string | null>
  }

  // 键值存储（插件私有）
  storage: {
    get<T>(key: string): Promise<T | null>
    set<T>(key: string, value: T): Promise<void>
    delete(key: string): Promise<void>
  }
}
```

### 4.4 插件加载流程

```
应用启动
  │
  ├─ 1. 扫描插件目录 (built-in + user plugins)
  │
  ├─ 2. 解析每个插件的 package.json
  │     └─ 校验 workbox 字段合法性
  │
  ├─ 3. 按依赖关系排序
  │
  ├─ 4. 逐个加载插件
  │     ├─ 创建 PluginContext（注入受限 API）
  │     ├─ 检查权限声明
  │     ├─ 调用 activate(ctx)
  │     └─ 注册命令 / AI Tools / UI 面板
  │
  └─ 5. 通知渲染进程：插件就绪，渲染导航和 UI
```

### 4.5 权限模型

插件需在清单中声明所需权限，未声明的权限调用会被拦截：

| 权限标识        | 说明         | 风险等级 |
| --------------- | ------------ | -------- |
| `fs:read`       | 读取文件系统 | 低       |
| `fs:write`      | 写入文件系统 | 中       |
| `shell:exec`    | 执行命令     | 高       |
| `network:fetch` | 发起网络请求 | 中       |
| `ai:chat`       | 调用 AI 对话 | 低       |
| `clipboard`     | 读写剪贴板   | 低       |
| `notification`  | 发送系统通知 | 低       |

高风险权限在插件首次激活时需用户确认。

---

## 五、AI 能力设计

### 5.1 架构

```
┌─────────────────────────────────────┐
│           AI Chatbox UI             │
│  (消息列表 / 输入框 / 流式渲染)      │
└──────────────┬──────────────────────┘
               │ IPC
┌──────────────┴──────────────────────┐
│           AI Service                │
│  ┌───────────────────────────────┐  │
│  │      Conversation Manager     │  │
│  │  (多轮对话 / 上下文管理)        │  │
│  └──────────────┬────────────────┘  │
│  ┌──────────────┴────────────────┐  │
│  │        Tool Router            │  │
│  │  (路由 AI Tool Call 到插件)    │  │
│  └──────────────┬────────────────┘  │
│  ┌──────────────┴────────────────┐  │
│  │      Provider Adapter         │  │
│  │  ┌────────┐ ┌──────┐ ┌────┐  │  │
│  │  │ OpenAI │ │Claude│ │自定义│  │  │
│  │  └────────┘ └──────┘ └────┘  │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### 5.2 多 Provider 支持

```typescript
interface AIProvider {
  id: string
  name: string
  models: ModelInfo[]
  chat(params: ChatParams): AsyncIterable<StreamChunk>
}

// 内置 Provider
const providers = [
  new OpenAIProvider({ apiKey, baseUrl }), // 兼容 OpenAI 协议
  new ClaudeProvider({ apiKey }), // Anthropic Claude
  new OllamaProvider({ host }) // 本地模型
]
```

### 5.3 AI Tool Calling 流程

插件注册的 AI Tool 可在对话中被模型自动调用：

```
用户: "帮我看一下当前 Git 状态，然后提交所有修改"
  │
  ├─ AI 模型识别意图，调用 tool: git_status
  │   └─ Tool Router 路由到 git-helper 插件 → 执行 → 返回结果
  │
  ├─ AI 模型根据结果，调用 tool: git_commit
  │   └─ Tool Router 路由到 git-helper 插件 → 执行 → 返回结果
  │
  └─ AI 模型生成最终回复：「已提交 3 个文件的修改...」
```

---

## 六、IPC 通信设计

### 6.1 通信架构

采用类型安全的 IPC 通信方案，避免字符串 channel 的维护问题：

```typescript
// shared/ipc-channels.ts — 统一定义所有 IPC 通道
export const IPC = {
  fs: {
    readFile: 'fs:readFile',
    writeFile: 'fs:writeFile',
    readDir: 'fs:readDir'
  },
  shell: {
    exec: 'shell:exec'
  },
  ai: {
    chat: 'ai:chat', // 双向流式通信
    getModels: 'ai:getModels'
  },
  plugin: {
    list: 'plugin:list',
    enable: 'plugin:enable',
    disable: 'plugin:disable'
  }
} as const
```

### 6.2 Preload 安全暴露

```typescript
// preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('workbox', {
  fs: {
    readFile: (path: string) => ipcRenderer.invoke('fs:readFile', path),
    writeFile: (path: string, data: string) => ipcRenderer.invoke('fs:writeFile', path, data)
  },
  shell: {
    exec: (cmd: string) => ipcRenderer.invoke('shell:exec', cmd)
  },
  ai: {
    chat: (messages: any[]) => ipcRenderer.invoke('ai:chat', messages),
    onStream: (cb: (chunk: any) => void) => {
      ipcRenderer.on('ai:stream', (_, chunk) => cb(chunk))
      return () => ipcRenderer.removeAllListeners('ai:stream')
    }
  },
  plugin: {
    list: () => ipcRenderer.invoke('plugin:list')
  }
})
```

---

## 七、数据存储设计

### 7.1 SQLite 数据库 Schema

```sql
-- AI 对话历史
CREATE TABLE conversations (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id),
  role            TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system', 'tool')),
  content         TEXT NOT NULL,
  tool_calls      TEXT,          -- JSON: AI 发起的 tool calls
  tool_result     TEXT,          -- JSON: tool 执行结果
  created_at      INTEGER NOT NULL
);

-- 插件数据
CREATE TABLE plugin_storage (
  plugin_id  TEXT NOT NULL,
  key        TEXT NOT NULL,
  value      TEXT NOT NULL,      -- JSON serialized
  PRIMARY KEY (plugin_id, key)
);

-- 应用配置
CREATE TABLE settings (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL            -- JSON serialized
);
```

### 7.2 存储位置

```
~/.workbox/
  ├── config.json          # 应用全局配置
  ├── data.db              # SQLite 数据库
  ├── plugins/             # 用户安装的插件
  │   └── ...
  └── logs/                # 应用日志
      └── ...
```

---

## 八、项目目录结构

```
work-box/
  ├── package.json
  ├── pnpm-workspace.yaml
  ├── electron.vite.config.ts
  │
  ├── packages/
  │   └── plugin-api/              # 插件 API 包（供插件开发者使用）
  │       ├── package.json
  │       └── src/
  │           ├── index.ts         # definePlugin, 类型导出
  │           └── types.ts         # PluginContext 等类型定义
  │
  ├── src/
  │   ├── main/                    # Electron 主进程
  │   │   ├── index.ts             # 入口：创建窗口、初始化服务
  │   │   ├── ipc/                 # IPC 处理器
  │   │   │   ├── fs.handler.ts
  │   │   │   ├── shell.handler.ts
  │   │   │   └── ai.handler.ts
  │   │   ├── plugin/              # 插件引擎
  │   │   │   ├── engine.ts        # 插件加载、生命周期管理
  │   │   │   ├── context.ts       # PluginContext 创建
  │   │   │   └── permission.ts    # 权限校验
  │   │   ├── ai/                  # AI 服务
  │   │   │   ├── service.ts       # 对话管理
  │   │   │   ├── tool-router.ts   # Tool Call 路由
  │   │   │   └── providers/       # AI Provider 适配器
  │   │   │       ├── openai.ts
  │   │   │       ├── claude.ts
  │   │   │       └── ollama.ts
  │   │   └── storage/             # 数据存储
  │   │       ├── database.ts      # SQLite 初始化
  │   │       └── schema.ts        # Drizzle Schema
  │   │
  │   ├── preload/                 # Preload 脚本
  │   │   └── index.ts
  │   │
  │   ├── renderer/                # 渲染进程（React）
  │   │   ├── index.html
  │   │   ├── main.tsx             # React 入口
  │   │   ├── App.tsx
  │   │   ├── components/          # 通用组件
  │   │   │   ├── Layout/
  │   │   │   ├── Sidebar/
  │   │   │   └── common/
  │   │   ├── features/            # 功能模块
  │   │   │   ├── chat/            # AI 对话
  │   │   │   │   ├── ChatView.tsx
  │   │   │   │   ├── MessageList.tsx
  │   │   │   │   ├── MessageInput.tsx
  │   │   │   │   └── store.ts
  │   │   │   ├── plugins/         # 插件管理
  │   │   │   │   ├── PluginList.tsx
  │   │   │   │   └── PluginDetail.tsx
  │   │   │   └── settings/        # 设置
  │   │   │       └── SettingsView.tsx
  │   │   ├── stores/              # 全局状态
  │   │   │   └── app.store.ts
  │   │   └── styles/
  │   │       └── globals.css
  │   │
  │   └── shared/                  # 主进程/渲染进程共享
  │       ├── ipc-channels.ts      # IPC 通道定义
  │       └── types.ts             # 共享类型
  │
  ├── plugins/                     # 内置插件
  │   ├── file-explorer/           # 文件浏览器
  │   ├── terminal/                # 内置终端
  │   ├── snippet-manager/         # 代码片段管理
  │   └── git-helper/              # Git 助手
  │
  └── resources/                   # 应用资源（图标等）
```

---

## 九、核心功能规划

### 9.1 内置插件（第一期）

| 插件            | 功能                                 | 优先级 |
| --------------- | ------------------------------------ | ------ |
| AI Chatbox      | 多模型对话、上下文管理、Tool Calling | P0     |
| Terminal        | 内嵌终端、命令快捷执行               | P0     |
| File Explorer   | 文件浏览、快速打开、搜索             | P1     |
| Git Helper      | Git 状态查看、一键提交、分支管理     | P1     |
| Snippet Manager | 代码片段收藏、搜索、一键复制         | P2     |
| JSON Formatter  | JSON 格式化、对比、转换              | P2     |
| Regex Tester    | 正则表达式在线测试                   | P2     |

### 9.2 AI Chatbox 功能细节

- 多轮对话与历史管理
- 流式响应渲染
- Markdown + 代码高亮（Syntax Highlighting）
- 多模型切换（OpenAI / Claude / 本地模型）
- Tool Calling：对话中调用插件注册的工具
- 上下文附件：可在对话中附加文件内容
- 对话导出（Markdown / JSON）

---

## 十、构建与分发

### 10.1 构建工具链

```
electron-vite (开发 & 构建)
  ├── Main Process    → esbuild 编译
  ├── Preload         → esbuild 编译
  └── Renderer        → Vite + React 编译
```

### 10.2 应用打包

使用 `electron-builder` 进行多平台打包：

| 平台    | 格式                 | 说明                       |
| ------- | -------------------- | -------------------------- |
| macOS   | `.dmg` / `.zip`      | 支持 Apple Silicon & Intel |
| Windows | `.exe` (NSIS)        | 安装包                     |
| Linux   | `.AppImage` / `.deb` | 通用发行                   |

### 10.3 自动更新

使用 `electron-updater` 实现静默自动更新，更新源可配置为 GitHub Releases 或自建服务器。

---

## 十一、开发规范

### 11.1 代码规范

- ESLint + Prettier 统一代码风格
- 严格 TypeScript（`strict: true`）
- Commit 遵循 Conventional Commits 规范
- 插件 API 变更需同步更新类型定义和文档

### 11.2 安全规范

- 渲染进程启用 `contextIsolation: true` + `nodeIntegration: false`
- 所有系统操作通过 IPC 在主进程执行
- 插件权限声明 + 运行时校验
- 用户安装的三方插件需签名或用户手动授权

---

## 十二、后续演进方向

1. **插件市场**：搭建插件发布和分发平台，支持在线安装
2. **MCP 协议支持**：接入 Model Context Protocol，与更多 AI 工具互通
3. **协作功能**：团队共享插件配置和代码片段
4. **远程开发支持**：SSH 连接远程机器，远程文件操作和命令执行
5. **自定义主题**：支持主题插件，自定义界面风格
