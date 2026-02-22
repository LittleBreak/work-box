# Phase 0：项目脚手架 & 基建

> **目标**：从零搭建项目骨架，确保开发环境跑通，交付可运行的 Electron 空壳 + 完整工具链。

> **里程碑**：M0 - 骨架就绪

---

## 0.1 初始化 electron-vite 项目

**目标**：使用 electron-vite 创建 React + TypeScript 项目模板，确保开发环境可运行。

**输入/前置条件**：

- 无前置依赖（项目起点）
- 需读取：`ARCHITECTURE.md` 第二节（技术选型）、第八节（目录结构）

**验收标准**：

- [ ] 使用 `create electron-vite` 创建项目（React + TypeScript 模板）
- [ ] `pnpm dev` 启动无报错，窗口正常显示
- [ ] Electron 窗口中可看到 React 页面

**参考**：`ARCHITECTURE.md` 第二节（技术选型）、第三节（系统架构 - 进程模型）

---

## 0.2 配置 pnpm workspace (monorepo)

**目标**：配置 monorepo 结构，支持多包管理。

**输入/前置条件**：

- 依赖：Task 0.1 完成
- 需读取：`ARCHITECTURE.md` 第八节（项目目录结构）

**验收标准**：

- [ ] 创建 `pnpm-workspace.yaml`，包含 `packages/*` 和 `plugins/*`
- [ ] 创建 `packages/plugin-api/` 包骨架（`package.json` + `src/index.ts` + `src/types.ts`）
- [ ] `pnpm install` 成功，`packages/plugin-api` 可被 `src/` 引用
- [ ] workspace 内包可以互相引用

**参考**：`ARCHITECTURE.md` 第八节（项目目录结构）

---

## 0.3 代码规范工具链

**目标**：配置代码规范和 Git 提交规范工具链。

**输入/前置条件**：

- 依赖：Task 0.1 完成
- 需读取：`ARCHITECTURE.md` 第十一节（开发规范）

**验收标准**：

- [ ] 配置 ESLint（`@electron-toolkit/eslint-config-ts` + React 规则）
- [ ] 配置 Prettier（统一格式化）
- [ ] 配置 `lint-staged` + `husky` pre-commit hook
- [ ] 配置 Commitlint（Conventional Commits 规范）
- [ ] 提交代码时自动 lint & 格式化
- [ ] 不规范 commit message 被拦截

**参考**：`ARCHITECTURE.md` 第十一节（开发规范 - 代码规范）

---

## 0.4 Tailwind CSS + shadcn/ui 集成

**目标**：集成 UI 样式方案和组件库。

**输入/前置条件**：

- 依赖：Task 0.1 完成
- 需读取：`ARCHITECTURE.md` 第二节（技术选型 - UI 组件库 / 样式方案）

**验收标准**：

- [ ] 安装 Tailwind CSS v4，配置 `globals.css`
- [ ] 初始化 shadcn/ui（`components.json` + 工具函数）
- [ ] 添加几个基础组件验证（Button、Card）
- [ ] 渲染进程中使用 shadcn Button 组件正常显示

**参考**：`ARCHITECTURE.md` 第二节（技术选型）

---

## 0.5 Vitest 测试框架

**目标**：配置测试框架，支持 TDD 开发流程。

**输入/前置条件**：

- 依赖：Task 0.1 完成
- 需读取：`ARCHITECTURE.md` 第二节（技术选型 - 测试）、`CLAUDE.md`（TDD 开发模式）

**验收标准**：

- [ ] 配置 Vitest（区分 main / renderer 测试环境）
- [ ] 编写一个 hello-world 测试用例验证流程通畅
- [ ] `pnpm test` 能执行并通过
- [ ] 测试文件与源文件同目录放置（`*.test.ts` / `*.test.tsx`）

**参考**：`ARCHITECTURE.md` 第二节（技术选型）

---

## 0.6 目录结构搭建

**目标**：按架构文档创建完整的目录骨架。

**输入/前置条件**：

- 依赖：Task 0.1 完成
- 需读取：`ARCHITECTURE.md` 第八节（项目目录结构）

**验收标准**：

- [ ] 创建 `src/main/`、`src/preload/`、`src/renderer/`、`src/shared/` 目录
- [ ] 创建 `src/main/ipc/`、`src/main/plugin/`、`src/main/ai/`、`src/main/storage/` 目录
- [ ] 创建 `src/renderer/components/`、`src/renderer/features/`、`src/renderer/stores/` 目录
- [ ] 创建 `plugins/` 内置插件目录
- [ ] 目录结构与 `ARCHITECTURE.md` 第八节一致

**参考**：`ARCHITECTURE.md` 第八节（项目目录结构）
