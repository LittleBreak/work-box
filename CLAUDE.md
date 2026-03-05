# Work-Box 项目 Claude Code 指令

## 项目概述

Work-Box 是一款面向开发者的桌面端提效工具，采用 Electron + React 插件式架构，集成 AI 能力。
详细架构设计见 `ARCHITECTURE.md`，开发路线见 `ROADMAP.md`。

## 技术栈（必须遵守，不可替换）

- **桌面框架**: Electron v33+
- **前端框架**: React v19+
- **构建工具**: electron-vite (Vite v6+)
- **语言**: TypeScript v5.5+，全局 `strict: true`
- **包管理**: pnpm v9+，monorepo（`packages/*`, `plugins/*`）
- **UI**: Tailwind CSS v4 + shadcn/ui
- **状态管理**: Zustand v5+
- **AI SDK**: Vercel AI SDK
- **数据库**: SQLite (better-sqlite3) + Drizzle ORM
- **测试**: Vitest

## ⚠️ TDD 开发模式（强制，最高优先级）

本项目严格执行 Test-Driven Development，**任何代码实现都必须先有测试**。

### TDD 工作流（红-绿-重构）

1. **红（Red）**：根据需求先编写测试用例，运行测试，确认测试**全部失败**
2. **绿（Green）**：编写**最小可用**的实现代码，使测试通过
3. **重构（Refactor）**：在测试保护下优化代码，确保测试仍然通过

### TDD 硬性规则

- **禁止**在没有对应测试的情况下编写任何功能代码
- **禁止**先写实现再补测试
- 每次修改代码后**必须**运行 `pnpm test` 确认所有测试通过
- 测试文件与源文件同目录放置，命名为 `*.test.ts` 或 `*.test.tsx`
- 测试必须覆盖：正常路径、边界条件、错误处理
- 提交代码前所有测试必须通过（零失败容忍）

### TDD 执行检查清单

每个任务必须按以下顺序执行：

```
1. 分析需求 → 确定要实现的功能点
2. 编写测试 → 覆盖所有功能点和边界情况
3. 运行测试 → 确认全部 FAIL（红）
4. 编写实现 → 最小代码使测试通过
5. 运行测试 → 确认全部 PASS（绿）
6. 重构代码 → 优化实现，保持测试通过
7. 运行测试 → 最终确认全部 PASS
```

## 代码规范

### 命名约定

- 文件名：`kebab-case`（如 `fs-handler.ts`, `app-store.ts`）
- React 组件文件：`PascalCase`（如 `ChatView.tsx`, `Sidebar.tsx`）
- 测试文件：与源文件同名加 `.test` 后缀（如 `fs-handler.test.ts`）
- 变量/函数：`camelCase`
- 类型/接口/类：`PascalCase`
- 常量：`UPPER_SNAKE_CASE`

### 目录结构

严格遵循 `ARCHITECTURE.md` 第八节定义的目录结构：

```
src/
  main/          # Electron 主进程
    ipc/         # IPC 处理器
    plugin/      # 插件引擎
    ai/          # AI 服务
    storage/     # 数据存储
  preload/       # Preload 脚本
  renderer/      # 渲染进程（React）
    components/  # 通用组件
    features/    # 功能模块
    stores/      # Zustand 状态
  shared/        # 主进程/渲染进程共享代码
packages/
  plugin-api/    # @workbox/plugin-api 包
plugins/         # 内置插件
```

### 代码质量

- Commit 遵循 Conventional Commits 规范
- ESLint + Prettier 统一代码风格
- 所有导出的函数/类型必须有 JSDoc 注释
- 禁止使用 `any` 类型，必须显式定义类型
- 优先使用 `interface` 而非 `type`（除非需要联合类型或映射类型）

## 安全规范

- 渲染进程：`contextIsolation: true` + `nodeIntegration: false`
- 所有系统操作通过 IPC 在主进程执行，渲染进程不直接访问 Node.js API
- 文件系统操作必须做路径安全校验（防路径穿越）
- Shell 执行必须有危险命令检测
- 插件权限声明 + 运行时校验

## 常用命令

```bash
pnpm dev          # 启动开发环境
pnpm build        # 构建应用
pnpm test         # 运行所有测试
pnpm lint         # 代码检查
pnpm format       # 代码格式化
```

## IPC 通信约定

- 所有 IPC channel 在 `src/shared/ipc-channels.ts` 中统一定义
- Channel 命名格式：`domain:action`（如 `fs:readFile`, `shell:exec`）
- 渲染进程通过 `window.workbox.*` 调用，由 preload contextBridge 暴露
- 类型定义放在 `src/shared/types.ts`

## 任务驱动开发流程

本项目使用 `tasks/` 目录下的任务文档驱动开发，Claude Code 通过任务文件自动领取和执行任务。

### 任务文件规范

- 任务文档存放在 `tasks/` 目录，命名为 `<topic>-task.md`
- 每个任务文档包含：目标、前置条件、任务列表（含状态标记）、验收标准
- 任务模板见 `tasks/task-template.md`

### 任务领取流程

每次新对话开始时，如果用户要求"继续任务"或"领取下一个任务"：

1. **读取任务文件**：阅读用户指定的 `tasks/*.md` 文件
2. **确认前置条件**：检查"执行前置"清单是否满足
3. **领取任务**：从"待完成"（`- [ ]`）中选取第一个未阻塞的任务
4. **执行 TDD 流程**：按本文档的 TDD 规则完成任务
5. **更新任务状态**：任务完成后将对应的 `- [ ]` 改为 `- [x]`，包括验收标准和交付物清单
6. **运行测试**：确认 `pnpm test` 全部通过
7. **提交代码**：使用 Conventional Commits 规范提交

### 单次对话范围控制

- 每次对话只完成 **一个任务**（一个 `##` 级别的任务块）
- 任务完成后，向用户报告完成状态，等待用户确认后再清除上下文
- 如果任务过大，可以在对话中协商拆分为子任务

## 注意事项

- 不要引入 ARCHITECTURE.md 和 ROADMAP.md 中未列出的依赖
- 每个 Phase 开始前先阅读对应的 ROADMAP 章节确认需求
- 插件 API 的任何变更必须同步更新 `packages/plugin-api` 的类型定义
- 数据库 schema 变更必须通过 migration，不可直接修改
