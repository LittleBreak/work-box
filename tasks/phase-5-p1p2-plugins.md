# Phase 5：内置插件（P1-P2）

> **目标**：丰富工具箱能力，实现 File Explorer、Git Helper、Snippet Manager、JSON Formatter、Regex Tester 五个内置插件，提升日常开发体验。
>
> **里程碑**：M5 - Beta（全部内置插件完成，基本可分发）

---

## 任务编号说明

Phase 5 共 10 个任务（5.1–5.2, 5.4–5.11），分为五个插件：

- **File Explorer 插件**（5.1–5.2）：插件骨架 + 文件服务 → UI
- **Git Helper 插件**（5.4–5.6）：插件骨架 + Git 服务 → UI → AI Tools + 命令注册
- **Snippet Manager 插件**（5.7–5.8）：后端存储服务 → UI
- **JSON Formatter 插件**（5.9–5.10）：逻辑层 → UI
- **Regex Tester 插件**（5.11）：完整实现

---

## Phase 5 执行前置（必须确认）

在开始任何 Task 前，先记录并确认以下信息：

- [ ] Phase 4 所有任务已完成且 `pnpm test` 全部通过
- [ ] `src/main/plugin/manager.ts` PluginManager 已在 `src/main/index.ts` 中激活，`loadAll()` 可加载 `plugins/` 下的插件
- [ ] `src/main/plugin/context.ts` PluginContext 8 个子模块可用（fs/shell/ai/commands/notification/workspace/storage）
- [ ] `packages/plugin-api/src/types.ts` 已定义 `PluginDefinition`、`PluginContext`、`ToolDefinition`、`Disposable`
- [ ] `src/shared/ipc-channels.ts` 已定义 fs/shell/ai/plugin/settings/clipboard/workspace/terminal 通道
- [ ] `src/preload/index.ts` 已暴露 `window.workbox.fs.*`、`window.workbox.clipboard.*`、`window.workbox.workspace.*`
- [ ] Terminal 插件（`plugins/terminal/`）已作为参考实现可用
- [ ] 路径别名 `@main`、`@renderer`、`@shared` 可用
- [ ] 本阶段不引入 `ARCHITECTURE.md` 与 `ROADMAP.md` 未声明的外部依赖
- [ ] 执行任务后必须更新任务状态：将对应的验收标准和交付物清单项标记为 `[x]`

---

## 任务依赖关系 & 推荐执行顺序

### 依赖关系图

```
P1 插件线：
5.1（File Explorer 骨架 + 文件服务）← Phase 4 完成
  └── 5.2（File Explorer UI）← 依赖 5.1 的 IPC 数据通道

5.4（Git Helper 骨架 + Git 服务）← Phase 4 完成
  └── 5.5（Git Helper UI）← 依赖 5.4 的 IPC 数据通道
        └── 5.6（Git Helper AI Tools + 命令）← 依赖 5.4 的 Git 服务

P2 插件线（独立于 P1，互相独立）：
5.7（Snippet Manager 后端）← Phase 4 完成
  └── 5.8（Snippet Manager UI）← 依赖 5.7 的 IPC 通道

5.9（JSON Formatter 逻辑）← Phase 4 完成
  └── 5.10（JSON Formatter UI）← 依赖 5.9 的逻辑模块

5.11（Regex Tester）← Phase 4 完成
```

### 推荐执行顺序

```
[5.1 → 5.2] ∥ [5.4 → 5.5 → 5.6] ∥ [5.7 → 5.8] ∥ [5.9 → 5.10] ∥ [5.11]
```

- P1 线（File Explorer 5.1–5.2）和 P1 线（Git Helper 5.4–5.6）**可并行执行**
- P2 线（5.7–5.8、5.9–5.10、5.11）**可并行执行**，且独立于 P1
- 每条线内部严格顺序

---

## TDD 分层策略

### A 类：有可测试行为的任务 → 严格 TDD（Red-Green-Refactor）

适用于：5.1、5.4、5.6、5.7、5.9、5.11

1. **Red**：先编写测试（正常路径 + 边界条件 + 错误处理），运行测试，确认失败
2. **Green**：编写最小代码使测试通过
3. **Refactor**：重构并再次运行测试确保通过

### B 类：纯配置/UI 骨架 → 验证式测试

适用于：5.2、5.5、5.8、5.10

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

## 5.1 File Explorer 插件骨架 + 文件系统服务

**目标**：创建 File Explorer 插件目录结构和清单，实现文件系统服务层（目录列表、文件预览、文件搜索、文件操作），注册 IPC handler 供 UI 使用。

**输入/前置条件**：

- 依赖：Phase 4 完成
- 需读取：`ARCHITECTURE.md` 第四节（4.1 插件目录结构、4.2 插件清单）、第九节（9.1 File Explorer）
- 当前状态：
  - `plugins/` 目录下仅有 `terminal/` 插件
  - `PluginContext.fs` 已提供 `readFile`、`writeFile`、`readDir`、`stat`、`watch`
  - `PluginContext.workspace.rootPath` 可获取工作区根路径

**验证策略**：A 类（严格 TDD）

**关键决策**：

| 决策项           | 方案                                                                       |
| ---------------- | -------------------------------------------------------------------------- |
| 插件包名         | `@workbox/plugin-file-explorer`，遵循 `@workbox/plugin-{name}` 约定        |
| 权限声明         | `["fs:read", "fs:write", "clipboard"]`                                     |
| 入口文件         | `main: "./src/index.ts"`, `ui: "./src/ui/FileExplorerPanel.tsx"`           |
| 文件系统操作     | 通过 `ctx.fs.*` API 操作，不直接 `import` Node.js `fs` 模块                |
| IPC 通道         | 插件本地 `constants.ts` 定义，格式 `file-explorer:{action}`                |
| 路径安全校验     | 所有文件操作必须校验路径合法性，防止路径穿越攻击                           |
| 预览文件大小限制 | 最大 500KB，超出返回截断标记                                               |
| 搜索深度限制     | 文件名搜索最大递归 10 层，内容搜索最大递归 5 层，跳过 > 1MB 文件           |
| 搜索结果限制     | 最多返回 100 条结果                                                        |
| 目录列表         | `ctx.fs.readDir()` + `ctx.fs.stat()` 组合获取，`Promise.all` 并行获取 stat |
| 删除操作         | 需通过 Electron `dialog.showMessageBox()` 确认                             |

**类型定义**（`plugins/file-explorer/src/constants.ts`）：

```typescript
interface FileTreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
  size: number;
  mtime: number;
}

interface FilePreviewResult {
  content: string;
  truncated: boolean;
  language: string; // 从扩展名推断
}

interface FileSearchResult {
  path: string;
  name: string;
  isDirectory: boolean;
  matches?: { line: number; text: string }[]; // 仅内容搜索
}

const FILE_EXPLORER_CHANNELS = {
  listDir: "file-explorer:listDir",
  readPreview: "file-explorer:readPreview",
  searchFiles: "file-explorer:searchFiles",
  createFile: "file-explorer:createFile",
  createDir: "file-explorer:createDir",
  rename: "file-explorer:rename",
  deleteItem: "file-explorer:deleteItem"
} as const;
```

**FileService API 设计**（`plugins/file-explorer/src/file-service.ts`）：

```typescript
class FileService {
  constructor(private ctx: PluginContext) {}

  /** 列出目录内容，返回带元数据的文件节点列表 */
  async listDir(dirPath: string): Promise<FileTreeNode[]>;

  /** 读取文件预览内容，超过 maxSize 截断 */
  async readPreview(filePath: string, maxSize?: number): Promise<FilePreviewResult>;

  /** 搜索文件，支持按文件名或内容搜索 */
  async searchFiles(
    rootPath: string,
    query: string,
    type: "name" | "content"
  ): Promise<FileSearchResult[]>;

  /** 创建新文件 */
  async createFile(filePath: string, content?: string): Promise<void>;

  /** 创建新目录 */
  async createDir(dirPath: string): Promise<void>;

  /** 重命名文件/目录 */
  async rename(oldPath: string, newPath: string): Promise<void>;

  /** 删除文件/目录 */
  async deleteItem(targetPath: string): Promise<void>;
}
```

**验收标准**：

- [x] 创建 `plugins/file-explorer/package.json`，包含完整 `workbox` 字段
- [x] 创建 `plugins/file-explorer/src/index.ts`，导出 `definePlugin()` 骨架
- [x] 创建 `plugins/file-explorer/src/ui/FileExplorerPanel.tsx`，导出占位 React 组件
- [x] 创建 `plugins/file-explorer/src/constants.ts`，定义 IPC 通道和类型
- [x] 实现 `plugins/file-explorer/src/file-service.ts`：
  - [x] `listDir()` 返回目录内容 + 文件元数据
  - [x] `readPreview()` 读取文件预览（含截断处理）
  - [x] `searchFiles()` 支持文件名搜索和内容搜索（含深度/大小/结果数限制）
  - [x] `createFile()` / `createDir()` 创建文件/目录
  - [x] `rename()` 重命名
  - [x] `deleteItem()` 删除（需路径安全校验）
- [x] 在 `activate()` 中注册 IPC handler（所有 `FILE_EXPLORER_CHANNELS`）
- [x] 在 `deactivate()` 中移除 IPC handler
- [x] 在 `src/preload/index.ts` 中暴露 `window.workbox.fileExplorer.*` API
- [x] 在 `src/shared/ipc-channels.ts` 中添加 `fileExplorer` 通道定义（文档注册）
- [x] 编写测试覆盖：
  - [x] `listDir` 正常列出、空目录、不存在路径
  - [x] `readPreview` 正常读取、大文件截断、二进制文件跳过
  - [x] `searchFiles` 文件名匹配、内容匹配、无结果、空查询
  - [x] `createFile` / `createDir` / `rename` / `deleteItem` 基本操作
  - [x] 路径穿越攻击拦截（如 `../../etc/passwd`）
- [x] `pnpm test` 全部通过

**交付物清单**：

- [x] `plugins/file-explorer/package.json` — 插件清单
- [x] `plugins/file-explorer/src/index.ts` — 插件入口
- [x] `plugins/file-explorer/src/index.test.ts` — 插件入口测试
- [x] `plugins/file-explorer/src/constants.ts` — IPC 通道 + 类型定义
- [x] `plugins/file-explorer/src/file-service.ts` — 文件服务实现
- [x] `plugins/file-explorer/src/file-service.test.ts` — 文件服务测试
- [x] `plugins/file-explorer/src/ui/FileExplorerPanel.tsx` — UI 占位组件
- [x] `src/preload/index.ts` — 新增 `window.workbox.fileExplorer.*`
- [x] `src/shared/ipc-channels.ts` — 新增 `fileExplorer` 通道

**参考文档**：

- `ARCHITECTURE.md` 4.1（插件目录结构，Lines 116-128）
- `ARCHITECTURE.md` 4.3（PluginContext API，Lines 199-253）— `ctx.fs.*` 用法
- `src/main/ipc/fs.handler.ts` — 路径安全校验逻辑参考
- `plugins/terminal/src/constants.ts` — 插件本地常量模式参考

**反模式警告**：

- ❌ 不要直接 `import fs from "fs"`，必须通过 `ctx.fs.*` 操作文件系统
- ❌ 不要跳过路径安全校验，`deleteItem("../../important-file")` 必须被拦截
- ❌ 不要在内容搜索中读取二进制文件（.png, .jpg, .zip 等），通过扩展名黑名单过滤
- ❌ 不要返回无限制的搜索结果，大目录树会导致 IPC 传输过慢
- ❌ 不要在 `readPreview` 中加载超大文件到内存，使用 `maxSize` 截断

---

## 5.2 File Explorer UI（树形视图 + 文件预览 + 搜索）

**目标**：实现 File Explorer 的 UI 组件，包括文件树视图、文件内容预览面板、搜索栏，以及文件操作的右键菜单。

**输入/前置条件**：

- 依赖：5.1 完成（IPC 通道就绪，`window.workbox.fileExplorer.*` 可用）
- 当前状态：
  - `FileExplorerPanel.tsx` 为占位组件
  - 文件操作 IPC 已注册

**验证策略**：B 类（验证式测试）

**关键决策**：

| 决策项       | 方案                                                                          |
| ------------ | ----------------------------------------------------------------------------- |
| 树形视图     | 自定义 React 组件（递归渲染），不引入外部树组件库                             |
| 懒加载       | 点击目录时按需加载子目录内容，不一次性加载整棵树                              |
| 文件图标     | 根据文件扩展名显示不同图标/颜色（Tailwind + emoji 或 SVG icon）               |
| 预览面板     | 文本文件显示内容（复用 Chat 已有的代码高亮方案），图片显示缩略图，JSON 格式化 |
| 搜索实现     | 输入关键词 → debounce 300ms → 调用 `searchFiles` IPC → 展示结果列表           |
| 文件操作入口 | 右键菜单（或 hover 时显示操作图标）：新建文件/目录、重命名、删除、复制路径    |
| 状态管理     | Zustand store 管理当前目录路径、展开节点、选中文件、搜索状态                  |

**组件层次结构**：

```
FileExplorerPanel.tsx       — 顶层容器，三栏布局：搜索栏 + 文件树 + 预览
  ├── SearchBar.tsx          — 搜索输入框 + 搜索模式切换（文件名/内容）
  ├── FileTree.tsx           — 递归树形视图
  │   └── FileTreeNode.tsx  — 单个文件/目录节点（图标 + 名称 + 操作按钮）
  └── FilePreview.tsx        — 文件内容预览面板
```

**Store 设计**（`plugins/file-explorer/src/ui/store.ts`）：

```typescript
interface FileExplorerState {
  rootPath: string;
  expandedPaths: Set<string>;
  selectedPath: string | null;
  treeData: Map<string, FileTreeNode[]>; // dirPath → children cache
  previewContent: FilePreviewResult | null;
  searchQuery: string;
  searchType: "name" | "content";
  searchResults: FileSearchResult[];
  isSearching: boolean;

  setRootPath(path: string): void;
  toggleExpand(dirPath: string): Promise<void>;
  selectFile(filePath: string): Promise<void>;
  search(query: string, type: "name" | "content"): Promise<void>;
  clearSearch(): void;
  refreshDir(dirPath: string): Promise<void>;
}
```

**验收标准**：

- [x] 实现 `plugins/file-explorer/src/ui/FileExplorerPanel.tsx`：
  - [x] 三区布局：搜索栏 + 文件树 + 预览面板
  - [x] 首次渲染加载 `rootPath` 根目录
- [x] 实现 `FileTree.tsx` + `FileTreeNode.tsx`：
  - [x] 递归渲染目录树，支持展开/折叠
  - [x] 点击目录时懒加载子目录内容
  - [x] 点击文件时在预览面板显示内容
  - [x] 文件/目录图标区分
  - [x] 右键菜单或操作按钮（新建、重命名、删除、复制路径）
- [x] 实现 `FilePreview.tsx`：
  - [x] 文本文件：显示代码高亮预览
  - [x] JSON 文件：格式化显示
  - [x] 图片文件：显示缩略图
  - [x] 大文件：显示截断提示
- [x] 实现 `SearchBar.tsx`：
  - [x] 搜索输入框 + debounce 300ms
  - [x] 搜索模式切换（文件名 / 内容）
  - [x] 搜索结果列表，点击跳转到文件
- [x] 实现 `store.ts`：
  - [x] 目录树状态管理
  - [x] 搜索状态管理
  - [x] 预览状态管理
- [x] 编写测试：
  - [x] store 状态管理测试（展开/折叠、选中、搜索）
  - [x] FileExplorerPanel 组件渲染测试
- [x] `pnpm test` 全部通过

**交付物清单**：

- [x] `plugins/file-explorer/src/ui/FileExplorerPanel.tsx` — 面板主组件
- [x] `plugins/file-explorer/src/ui/FileTree.tsx` — 树形视图
- [x] `plugins/file-explorer/src/ui/FileTreeNode.tsx` — 单节点组件
- [x] `plugins/file-explorer/src/ui/FilePreview.tsx` — 文件预览
- [x] `plugins/file-explorer/src/ui/SearchBar.tsx` — 搜索栏
- [x] `plugins/file-explorer/src/ui/store.ts` — 状态管理
- [x] `plugins/file-explorer/src/ui/store.test.ts` — 状态测试
- [x] `plugins/file-explorer/src/ui/FileExplorerPanel.test.tsx` — 组件测试

**反模式警告**：

- ❌ 不要一次性递归加载整棵目录树，大项目（如 node_modules）会卡死 UI
- ❌ 不要在每次 render 时重新加载目录数据，使用 store 缓存已加载的目录
- ❌ 不要在搜索每次键入时发起 IPC，使用 debounce（300ms）
- ❌ 不要在预览面板中尝试渲染二进制文件内容，检查文件类型后决定渲染方式

---

## 5.4 Git Helper 插件骨架 + Git 操作服务

**目标**：创建 Git Helper 插件目录结构和清单，实现 Git 操作服务层（状态查询、stage/unstage、commit、分支管理、diff、log），通过 IPC 通道供 UI 使用。

**输入/前置条件**：

- 依赖：Phase 4 完成
- 需读取：`ARCHITECTURE.md` 4.2（Git Helper 插件清单示例，Lines 130-157）、9.1（Git Helper 功能）
- 当前状态：
  - `PluginContext.shell.exec()` 已可用
  - `ARCHITECTURE.md` 4.2 提供了 Git Helper 的完整 package.json 示例

**验证策略**：A 类（严格 TDD）

**关键决策**：

| 决策项       | 方案                                                                          |
| ------------ | ----------------------------------------------------------------------------- |
| 插件包名     | `@workbox/plugin-git-helper`（ARCHITECTURE.md 4.2 示例一致）                  |
| 权限声明     | `["fs:read", "shell:exec"]`                                                   |
| Git 命令执行 | 通过 `ctx.shell.exec()` 执行 git CLI 命令                                     |
| 输出解析     | 使用 `--porcelain` / `--format` 等机器可读格式输出，降低解析复杂度            |
| 命令注入防护 | 校验分支名 `/^[\w\-\/\.]+$/`，commit message 使用 `-m` 参数传递而非字符串拼接 |
| cwd 默认值   | 默认使用 `ctx.workspace.rootPath`                                             |
| IPC 通道     | 插件本地 `constants.ts` 定义，格式 `git:{action}`                             |
| Diff 格式    | 使用 `git diff --unified=3` 标准 unified diff 格式                            |
| Log 数量限制 | 默认 50 条，最大 200 条                                                       |

**类型定义**（`plugins/git-helper/src/constants.ts`）：

```typescript
interface GitFileStatus {
  path: string;
  status: "modified" | "added" | "deleted" | "untracked" | "renamed" | "copied";
  staged: boolean;
  oldPath?: string;
}

interface GitBranch {
  name: string;
  current: boolean;
  remote?: string;
}

interface GitCommitInfo {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: string;
}

interface GitDiffLine {
  type: "add" | "remove" | "context";
  content: string;
}

interface GitDiffHunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: GitDiffLine[];
}

interface GitFileDiff {
  filePath: string;
  hunks: GitDiffHunk[];
}

const GIT_CHANNELS = {
  status: "git:status",
  stage: "git:stage",
  unstage: "git:unstage",
  commit: "git:commit",
  branches: "git:branches",
  checkout: "git:checkout",
  diff: "git:diff",
  log: "git:log"
} as const;
```

**GitService API 设计**（`plugins/git-helper/src/git-service.ts`）：

```typescript
class GitService {
  constructor(private ctx: PluginContext) {}

  async getStatus(cwd?: string): Promise<GitFileStatus[]>;
  async stage(paths: string[], cwd?: string): Promise<void>;
  async unstage(paths: string[], cwd?: string): Promise<void>;
  async commit(message: string, cwd?: string): Promise<void>;
  async getBranches(cwd?: string): Promise<GitBranch[]>;
  async checkout(branch: string, cwd?: string): Promise<void>;
  async getDiff(options?: {
    path?: string;
    staged?: boolean;
    cwd?: string;
  }): Promise<GitFileDiff[]>;
  async getLog(options?: { count?: number; cwd?: string }): Promise<GitCommitInfo[]>;
}
```

**Git 命令参考**（解析策略）：

```bash
# 状态（porcelain v1 格式：XY PATH 或 XY ORIG -> PATH）
git status --porcelain

# 分支列表
git branch -a --format="%(refname:short) %(HEAD) %(upstream:short)"

# Diff
git diff --unified=3 [--staged] [-- path]

# Log
git log --format="%H|%h|%s|%an|%aI" -n 50
```

**验收标准**：

- [x] 创建 `plugins/git-helper/package.json`（参照 ARCHITECTURE.md 4.2 示例）
- [x] 创建 `plugins/git-helper/src/index.ts`，导出 `definePlugin()` 骨架
- [x] 创建 `plugins/git-helper/src/ui/GitPanel.tsx`，导出占位 React 组件
- [x] 创建 `plugins/git-helper/src/constants.ts`，定义 IPC 通道和类型
- [x] 实现 `plugins/git-helper/src/git-service.ts`：
  - [x] `getStatus()` 解析 `git status --porcelain` 输出
  - [x] `stage()` / `unstage()` 批量操作
  - [x] `commit()` 提交（校验 commit message 非空）
  - [x] `getBranches()` 解析分支列表
  - [x] `checkout()` 切换分支（校验分支名合法性）
  - [x] `getDiff()` 解析 unified diff 格式输出
  - [x] `getLog()` 解析 log 格式输出
- [x] 在 `activate()` 中注册 IPC handler（所有 `GIT_CHANNELS`）
- [x] 在 `deactivate()` 中移除 IPC handler
- [x] 在 `src/preload/index.ts` 中暴露 `window.workbox.git.*` API
- [x] 在 `src/shared/ipc-channels.ts` 中添加 `git` 通道定义（文档注册）
- [x] 编写测试覆盖：
  - [x] `getStatus` 输出解析（modified, added, deleted, untracked, renamed）
  - [x] `getBranches` 输出解析
  - [x] `getDiff` unified diff 解析
  - [x] `getLog` 格式解析
  - [x] `checkout` 分支名校验（合法/非法）
  - [x] `commit` 空 message 拒绝
  - [x] 非 Git 仓库目录的错误处理
- [x] `pnpm test` 全部通过

**交付物清单**：

- [x] `plugins/git-helper/package.json` — 插件清单
- [x] `plugins/git-helper/src/index.ts` — 插件入口
- [x] `plugins/git-helper/src/index.test.ts` — 插件入口测试
- [x] `plugins/git-helper/src/constants.ts` — IPC 通道 + 类型定义
- [x] `plugins/git-helper/src/git-service.ts` — Git 操作服务
- [x] `plugins/git-helper/src/git-service.test.ts` — Git 服务测试
- [x] `plugins/git-helper/src/ui/GitPanel.tsx` — UI 占位组件
- [x] `src/preload/index.ts` — 新增 `window.workbox.git.*`
- [x] `src/shared/ipc-channels.ts` — 新增 `git` 通道

**参考文档**：

- `ARCHITECTURE.md` 4.2（Git Helper 插件清单示例，Lines 130-157）
- `ARCHITECTURE.md` 4.3（PluginContext API，Lines 199-253）— `ctx.shell.exec()` 用法
- `plugins/terminal/src/constants.ts` — 插件本地常量模式参考

**反模式警告**：

- ❌ 不要使用字符串拼接构造 git 命令，分支名和路径中可能有特殊字符，需校验或转义
- ❌ 不要解析 `git status` 的人类可读格式，使用 `--porcelain` 机器可读格式
- ❌ 不要在 `checkout` 中接受未校验的分支名（`; rm -rf /` 注入风险）
- ❌ 不要在 `getLog` 中返回无限制条数的 commit，设置上限（200）
- ❌ 不要忘记处理非 Git 仓库目录的情况（`git status` 返回非零退出码）

---

## 5.5 Git Helper UI（状态面板 + 提交 + 分支 + Diff + 历史）

**目标**：实现 Git Helper 的完整 UI 组件，包括文件状态面板、stage/unstage/commit 操作、分支列表与切换、Diff 查看器、Commit 历史时间线。

**输入/前置条件**：

- 依赖：5.4 完成（Git IPC 通道就绪，`window.workbox.git.*` 可用）
- 当前状态：
  - `GitPanel.tsx` 为占位组件
  - Git 操作 IPC 已注册

**验证策略**：B 类（验证式测试）

**关键决策**：

| 决策项       | 方案                                                                    |
| ------------ | ----------------------------------------------------------------------- |
| 布局模式     | 标签页式：Status / Branches / History 三个 Tab                          |
| Diff 查看器  | 内联显示 unified diff，`+` 行绿色背景，`-` 行红色背景，context 行无背景 |
| Stage 操作   | 文件列表每行显示 checkbox，勾选 = staged，取消 = unstaged               |
| Commit 输入  | Status Tab 底部固定 commit message 输入框 + 提交按钮                    |
| 状态自动刷新 | 切换 Tab 或执行操作后自动刷新状态                                       |
| 分支切换确认 | 有未提交更改时弹出确认对话框                                            |

**组件层次结构**：

```
GitPanel.tsx               — 顶层容器 + Tab 切换
  ├── StatusTab.tsx         — 文件状态列表 + stage/unstage + commit
  │   ├── StatusList.tsx   — 文件状态行列表
  │   ├── DiffViewer.tsx   — 选中文件的 diff 展示
  │   └── CommitInput.tsx  — commit message 输入 + 提交按钮
  ├── BranchTab.tsx        — 分支列表 + 切换
  └── HistoryTab.tsx       — commit 历史时间线
```

**Store 设计**（`plugins/git-helper/src/ui/store.ts`）：

```typescript
interface GitState {
  activeTab: "status" | "branches" | "history";
  files: GitFileStatus[];
  branches: GitBranch[];
  commits: GitCommitInfo[];
  selectedFilePath: string | null;
  fileDiff: GitFileDiff | null;
  commitMessage: string;
  isLoading: boolean;

  setActiveTab(tab: string): void;
  refreshStatus(): Promise<void>;
  toggleStage(path: string, currentlyStaged: boolean): Promise<void>;
  commit(): Promise<void>;
  refreshBranches(): Promise<void>;
  checkout(branch: string): Promise<void>;
  refreshHistory(): Promise<void>;
  selectFile(path: string): Promise<void>;
  setCommitMessage(msg: string): void;
}
```

**验收标准**：

- [ ] 实现 `GitPanel.tsx`：
  - [ ] Tab 切换：Status / Branches / History
  - [ ] 切换 Tab 时自动加载对应数据
- [ ] 实现 `StatusTab.tsx` + 子组件：
  - [ ] 显示文件状态列表（modified/added/deleted/untracked 区分颜色/图标）
  - [ ] 每个文件可 stage/unstage（checkbox 或按钮）
  - [ ] 点击文件显示 diff 内容
  - [ ] 底部 commit message 输入框 + 提交按钮
  - [ ] 提交后自动刷新状态
- [ ] 实现 `DiffViewer.tsx`：
  - [ ] 渲染 unified diff 格式（`+` 绿 / `-` 红 / context 灰）
  - [ ] 显示文件路径和 hunk header
- [ ] 实现 `BranchTab.tsx`：
  - [ ] 显示本地分支列表，当前分支高亮
  - [ ] 点击切换分支（有未提交更改时提示确认）
- [ ] 实现 `HistoryTab.tsx`：
  - [ ] 显示 commit 历史列表（hash、message、author、date）
  - [ ] 时间线样式展示
- [ ] 实现 `store.ts`：
  - [ ] 完整状态管理
- [ ] 编写测试：
  - [ ] store 测试（refreshStatus、toggleStage、commit、checkout）
  - [ ] GitPanel 组件渲染测试（Tab 切换、状态列表展示）
  - [ ] DiffViewer 渲染测试（正确颜色标记）
- [ ] `pnpm test` 全部通过

**交付物清单**：

- [ ] `plugins/git-helper/src/ui/GitPanel.tsx` — 面板主组件
- [ ] `plugins/git-helper/src/ui/GitPanel.test.tsx` — 面板测试
- [ ] `plugins/git-helper/src/ui/StatusTab.tsx` — 状态 Tab
- [ ] `plugins/git-helper/src/ui/StatusList.tsx` — 文件状态列表
- [ ] `plugins/git-helper/src/ui/DiffViewer.tsx` — Diff 查看器
- [ ] `plugins/git-helper/src/ui/DiffViewer.test.tsx` — Diff 渲染测试
- [ ] `plugins/git-helper/src/ui/CommitInput.tsx` — 提交输入
- [ ] `plugins/git-helper/src/ui/BranchTab.tsx` — 分支 Tab
- [ ] `plugins/git-helper/src/ui/HistoryTab.tsx` — 历史 Tab
- [ ] `plugins/git-helper/src/ui/store.ts` — 状态管理
- [ ] `plugins/git-helper/src/ui/store.test.ts` — 状态测试

**反模式警告**：

- ❌ 不要在 DiffViewer 中使用 dangerouslySetInnerHTML 渲染 diff 内容，防止 XSS
- ❌ 不要在每次组件 render 时触发 git status 请求，仅在显式刷新或操作后触发
- ❌ 不要在 commit 时允许空 message（前端也需校验，不仅依赖后端）
- ❌ 不要在 checkout 时静默丢弃未提交更改，必须先提示用户

---

## 5.6 Git Helper AI Tools + quick-commit 命令

**目标**：在 Git Helper 插件中注册 AI Tools（`git_status`、`git_commit`、`git_diff`、`git_log`），注册 `quick-commit` 命令（快捷键 `CmdOrCtrl+Shift+C`）。

**输入/前置条件**：

- 依赖：5.4 完成（GitService 可用）
- 需读取：`ARCHITECTURE.md` 4.2（Git Helper AI Tool 示例，Lines 161-196）、4.3（commands.register）

**验证策略**：A 类（严格 TDD）

**关键决策**：

| 决策项         | 方案                                                                |
| -------------- | ------------------------------------------------------------------- |
| `git_status`   | 返回人类可读的状态摘要（modified/staged/untracked 数量 + 文件列表） |
| `git_commit`   | 接受 message 参数，执行 `git add -A && git commit -m "..."`         |
| `git_diff`     | 返回 unified diff 文本（截断至 10000 字符）                         |
| `git_log`      | 返回最近 N 条 commit 的格式化列表                                   |
| `quick-commit` | 弹出输入框获取 commit message → stage all → commit                  |
| 安全约束       | `git_commit` 中的 message 需转义特殊字符                            |

**验收标准**：

- [ ] 在 `activate()` 中注册四个 AI Tool：
  - [ ] `git_status`：获取当前仓库状态
  - [ ] `git_commit`：stage all + commit（参数：message, cwd?）
  - [ ] `git_diff`：获取 diff 输出（参数：path?, staged?, cwd?）
  - [ ] `git_log`：获取 commit 历史（参数：count?, cwd?）
- [ ] 在 `activate()` 中注册 `quick-commit` 命令：
  - [ ] 快捷键 `CmdOrCtrl+Shift+C`
  - [ ] 执行流程：检查 status → 如果有更改 → stage all → commit
- [ ] 在 `deactivate()` 中注销所有 tool 和 command
- [ ] 编写测试覆盖：
  - [ ] 四个 AI Tool 正常执行和返回
  - [ ] `git_diff` 输出截断
  - [ ] 非 Git 仓库错误处理
  - [ ] `quick-commit` 无更改时的处理
  - [ ] Tool 和 command 注册/注销
- [ ] `pnpm test` 全部通过

**交付物清单**：

- [ ] `plugins/git-helper/src/index.ts` — 更新：注册 AI Tools + command
- [ ] `plugins/git-helper/src/index.test.ts` — 更新：AI Tool + command 测试

**参考文档**：

- `ARCHITECTURE.md` 4.2（Git Helper 示例，Lines 161-196）— `registerTool` + `commands.register`
- `ARCHITECTURE.md` 5.3（Tool Calling 流程，Lines 341-355）
- `plugins/terminal/src/command-executor.ts` — AI Tool 实现模式参考

**反模式警告**：

- ❌ 不要让 `git_commit` 在没有更改时执行 commit（`git commit` 会失败）
- ❌ 不要在 `git_diff` 中返回无限长度输出，截断至 10000 字符
- ❌ 不要忘记通过 `Disposable` 在 deactivate 时注销 tool 和 command
- ❌ `quick-commit` 的 commit message 不要硬编码，应提示用户输入

---

## 5.7 Snippet Manager 后端 + 存储

**目标**：创建 Snippet Manager 插件骨架，实现代码片段的 CRUD 服务（基于 `ctx.storage` 键值存储），注册 IPC handler 供 UI 使用。

**输入/前置条件**：

- 依赖：Phase 4 完成
- 需读取：`ARCHITECTURE.md` 4.3（PluginContext.storage API）、9.1（Snippet Manager 功能）
- 当前状态：
  - `ctx.storage.get/set/delete` 已可用
  - 插件键值存储已通过 `plugin_storage` 表实现

**验证策略**：A 类（严格 TDD）

**关键决策**：

| 决策项     | 方案                                                                                 |
| ---------- | ------------------------------------------------------------------------------------ |
| 插件包名   | `@workbox/plugin-snippet-manager`                                                    |
| 权限声明   | `["clipboard"]`（复制到剪贴板需要）                                                  |
| 存储策略   | 单 key `snippets` 存储 `Snippet[]` JSON 数组（初版简单方案，数据量 < 1000 条可接受） |
| Snippet ID | `crypto.randomUUID()`                                                                |
| 搜索方式   | 内存过滤（title + content 包含查询词，大小写不敏感）                                 |
| 标签管理   | 从所有 snippet 的 tags 字段中聚合去重，无独立标签表                                  |
| IPC 通道   | 插件本地 `constants.ts` 定义，格式 `snippet:{action}`                                |

**类型定义**（`plugins/snippet-manager/src/constants.ts`）：

```typescript
interface Snippet {
  id: string;
  title: string;
  content: string;
  language: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

interface SnippetInput {
  title: string;
  content: string;
  language: string;
  tags: string[];
}

const SNIPPET_CHANNELS = {
  list: "snippet:list",
  get: "snippet:get",
  create: "snippet:create",
  update: "snippet:update",
  delete: "snippet:delete",
  getTags: "snippet:getTags"
} as const;
```

**SnippetService API 设计**（`plugins/snippet-manager/src/snippet-service.ts`）：

```typescript
class SnippetService {
  constructor(private storage: PluginContext["storage"]) {}

  /** 列出片段，支持按查询词和标签过滤 */
  async list(query?: string, tag?: string): Promise<Snippet[]>;

  /** 获取单个片段 */
  async get(id: string): Promise<Snippet | null>;

  /** 创建新片段 */
  async create(input: SnippetInput): Promise<Snippet>;

  /** 更新片段 */
  async update(id: string, input: Partial<SnippetInput>): Promise<Snippet>;

  /** 删除片段 */
  async delete(id: string): Promise<void>;

  /** 获取所有已使用的标签列表 */
  async getTags(): Promise<string[]>;
}
```

**验收标准**：

- [ ] 创建 `plugins/snippet-manager/package.json`
- [ ] 创建 `plugins/snippet-manager/src/index.ts`，导出 `definePlugin()` 骨架
- [ ] 创建 `plugins/snippet-manager/src/ui/SnippetPanel.tsx`，导出占位组件
- [ ] 创建 `plugins/snippet-manager/src/constants.ts`
- [ ] 实现 `plugins/snippet-manager/src/snippet-service.ts`：
  - [ ] `list()` 全量列出 + 按 query/tag 过滤
  - [ ] `get()` 按 ID 获取
  - [ ] `create()` 创建片段（生成 ID + 时间戳）
  - [ ] `update()` 部分更新（更新 updatedAt）
  - [ ] `delete()` 删除
  - [ ] `getTags()` 聚合去重所有标签
- [ ] 在 `activate()` 中注册 IPC handler
- [ ] 在 `src/preload/index.ts` 中暴露 `window.workbox.snippet.*` API
- [ ] 在 `src/shared/ipc-channels.ts` 中添加 `snippet` 通道定义
- [ ] 编写测试覆盖：
  - [ ] CRUD 全流程（create → get → update → list → delete）
  - [ ] 搜索过滤（按 title、content、tag）
  - [ ] 空列表处理
  - [ ] 不存在 ID 的 get/update/delete 错误处理
  - [ ] 标签聚合去重
- [ ] `pnpm test` 全部通过

**交付物清单**：

- [ ] `plugins/snippet-manager/package.json` — 插件清单
- [ ] `plugins/snippet-manager/src/index.ts` — 插件入口
- [ ] `plugins/snippet-manager/src/index.test.ts` — 插件入口测试
- [ ] `plugins/snippet-manager/src/constants.ts` — IPC 通道 + 类型
- [ ] `plugins/snippet-manager/src/snippet-service.ts` — CRUD 服务
- [ ] `plugins/snippet-manager/src/snippet-service.test.ts` — 服务测试
- [ ] `plugins/snippet-manager/src/ui/SnippetPanel.tsx` — UI 占位组件
- [ ] `src/preload/index.ts` — 新增 `window.workbox.snippet.*`
- [ ] `src/shared/ipc-channels.ts` — 新增 `snippet` 通道

**反模式警告**：

- ❌ 不要为每个 snippet 使用独立 key 存储（`snippet:{id}`），会导致无法高效搜索和列出
- ❌ 不要忘记在 `update` 时更新 `updatedAt` 时间戳
- ❌ 不要在 `list` 中返回未排序的结果，按 `updatedAt` 降序排列
- ❌ 不要允许 `title` 或 `content` 为空字符串

---

## 5.8 Snippet Manager UI

**目标**：实现 Snippet Manager 的 UI 组件，包括片段列表、编辑器、搜索栏、标签过滤和剪贴板复制。

**输入/前置条件**：

- 依赖：5.7 完成（Snippet IPC 通道就绪）
- 当前状态：
  - `SnippetPanel.tsx` 为占位组件
  - `window.workbox.snippet.*` 和 `window.workbox.clipboard.writeText()` 已可用

**验证策略**：B 类（验证式测试）

**关键决策**：

| 决策项   | 方案                                                                   |
| -------- | ---------------------------------------------------------------------- |
| 布局     | 左右分栏：左侧片段列表（含搜索和标签过滤），右侧编辑/预览              |
| 编辑模式 | 新建/编辑时显示表单（标题 + 语言选择 + 标签输入 + 代码编辑区）         |
| 语法高亮 | 复用项目已有的代码高亮方案（Chat 功能中使用的库）                      |
| 标签输入 | Chip 式标签输入（输入文本 + 回车添加，点击 × 删除）                    |
| 语言列表 | 内置常用 30+ 语言选项（js, ts, py, go, java, rust, css, html, sql 等） |
| 复制反馈 | 点击复制按钮后显示 2 秒 "已复制" 提示                                  |

**组件层次结构**：

```
SnippetPanel.tsx           — 顶层容器，左右分栏
  ├── SnippetSidebar.tsx   — 左侧：搜索 + 标签过滤 + 片段列表
  │   ├── SearchInput.tsx — 搜索输入框
  │   ├── TagFilter.tsx   — 标签筛选 chips
  │   └── SnippetItem.tsx — 单个片段条目（标题 + 语言 + 标签预览）
  └── SnippetEditor.tsx    — 右侧：新建/编辑/预览
      ├── SnippetForm.tsx — 编辑表单
      └── SnippetView.tsx — 预览模式（代码高亮 + 复制按钮）
```

**验收标准**：

- [ ] 实现 `SnippetPanel.tsx`：左右分栏布局
- [ ] 实现 `SnippetSidebar.tsx`：
  - [ ] 搜索框：debounce 300ms 过滤片段
  - [ ] 标签过滤：显示所有标签 chip，点击过滤
  - [ ] 片段列表：显示标题、语言、标签预览
  - [ ] 新建按钮：打开编辑表单
- [ ] 实现 `SnippetEditor.tsx`：
  - [ ] 编辑模式：标题 + 语言下拉 + 标签 chip 输入 + 代码文本区
  - [ ] 预览模式：语法高亮代码展示 + 一键复制按钮
  - [ ] 保存/取消按钮
  - [ ] 删除按钮（带确认）
- [ ] 实现 `store.ts`：
  - [ ] snippets 列表状态
  - [ ] 搜索和过滤状态
  - [ ] 编辑状态（当前选中、是否编辑中）
- [ ] 一键复制：调用 `window.workbox.clipboard.writeText()` + 成功提示
- [ ] 编写测试：
  - [ ] store 测试（CRUD 操作、搜索过滤、标签选择）
  - [ ] SnippetPanel 组件渲染测试
- [ ] `pnpm test` 全部通过

**交付物清单**：

- [ ] `plugins/snippet-manager/src/ui/SnippetPanel.tsx` — 面板主组件
- [ ] `plugins/snippet-manager/src/ui/SnippetPanel.test.tsx` — 面板测试
- [ ] `plugins/snippet-manager/src/ui/SnippetSidebar.tsx` — 侧边栏
- [ ] `plugins/snippet-manager/src/ui/SnippetEditor.tsx` — 编辑器/预览
- [ ] `plugins/snippet-manager/src/ui/store.ts` — 状态管理
- [ ] `plugins/snippet-manager/src/ui/store.test.ts` — 状态测试

**反模式警告**：

- ❌ 不要在每次搜索时重新加载所有 snippet，在 store 中缓存完整列表后前端过滤
- ❌ 不要用 textarea 替代代码高亮编辑区，至少预览模式需要语法高亮
- ❌ 不要在删除片段时不做确认，需弹出确认对话框
- ❌ 不要硬编码语言列表在组件中，抽取为常量数组

---

## 5.9 JSON Formatter 逻辑层

**目标**：创建 JSON Formatter 插件骨架，实现 JSON 操作的核心逻辑（格式化/压缩、校验+错误定位、JSON→TS 类型生成、结构化 Diff）。

**输入/前置条件**：

- 依赖：Phase 4 完成
- 需读取：`ARCHITECTURE.md` 第九节（9.1 JSON Formatter 功能）
- 当前状态：无外部依赖需求，所有逻辑基于原生 `JSON` API 和自定义算法

**验证策略**：A 类（严格 TDD）

**关键决策**：

| 决策项             | 方案                                                                            |
| ------------------ | ------------------------------------------------------------------------------- |
| 插件包名           | `@workbox/plugin-json-formatter`                                                |
| 权限声明           | `["clipboard"]`（复制结果需要）                                                 |
| 格式化             | `JSON.stringify(parsed, null, 2)`                                               |
| 压缩               | `JSON.stringify(parsed)`                                                        |
| 校验 + 错误定位    | `JSON.parse()` catch + 自定义行列号解析                                         |
| JSON → TS 类型生成 | 递归推断类型，生成 `interface` 定义                                             |
| TS → JSON 样例生成 | 基础 interface 解析（正则匹配），支持 string/number/boolean/array/nested object |
| JSON Diff          | 结构化递归对比（added/removed/changed/unchanged），不引入外部 diff 库           |
| 逻辑运行位置       | **渲染进程**（纯计算逻辑，无需主进程能力）                                      |
| 插件后端           | 仅骨架，不注册 IPC handler（逻辑全在 renderer 侧）                              |

**核心函数设计**（`plugins/json-formatter/src/json-ops.ts`）：

```typescript
/** JSON 格式化（美化） */
function formatJson(input: string, indent?: number): string;

/** JSON 压缩 */
function compressJson(input: string): string;

/** JSON 校验，返回校验结果 */
function validateJson(input: string): JsonValidationResult;

/** JSON → TypeScript 接口定义 */
function jsonToTypeScript(input: string, rootName?: string): string;

/** TypeScript 接口 → JSON 样例（基础 interface 支持） */
function typeScriptToJson(input: string): string;

/** 结构化 JSON Diff */
function diffJson(a: string, b: string): JsonDiffEntry[];

// Types
interface JsonValidationResult {
  valid: boolean;
  error?: { message: string; line: number; column: number };
}

interface JsonDiffEntry {
  path: string;
  type: "added" | "removed" | "changed" | "unchanged";
  oldValue?: unknown;
  newValue?: unknown;
}
```

**JSON → TS 转换规则**：

```
string  → string
number  → number
boolean → boolean
null    → null
[]      → T[]（推断元素类型）
{}      → interface（递归）
```

**TS → JSON 转换规则**（仅支持基础 interface）：

```
string   → ""
number   → 0
boolean  → false
null     → null
T[]      → [defaultOf(T)]
interface → { ...defaults }
unknown  → null
```

**验收标准**：

- [ ] 创建 `plugins/json-formatter/package.json`
- [ ] 创建 `plugins/json-formatter/src/index.ts`，导出 `definePlugin()` 骨架（空 activate）
- [ ] 创建 `plugins/json-formatter/src/ui/JsonFormatterPanel.tsx`，导出占位组件
- [ ] 实现 `plugins/json-formatter/src/json-ops.ts`：
  - [ ] `formatJson()` 格式化 + 自定义缩进
  - [ ] `compressJson()` 压缩为单行
  - [ ] `validateJson()` 校验 + 错误行列号解析
  - [ ] `jsonToTypeScript()` 递归类型推断 + interface 生成
  - [ ] `typeScriptToJson()` 基础 interface 解析 + 样例生成
  - [ ] `diffJson()` 结构化递归对比
- [ ] 编写测试覆盖：
  - [ ] 格式化/压缩：正常 JSON、嵌套对象、数组
  - [ ] 校验：有效 JSON、无效 JSON（各种语法错误）、错误行列号准确性
  - [ ] JSON→TS：基本类型、嵌套对象、数组、混合类型数组、空对象
  - [ ] TS→JSON：基本 interface、嵌套 interface、可选属性
  - [ ] Diff：新增属性、删除属性、修改值、嵌套对象变更、数组变更
- [ ] `pnpm test` 全部通过

**交付物清单**：

- [ ] `plugins/json-formatter/package.json` — 插件清单
- [ ] `plugins/json-formatter/src/index.ts` — 插件入口（骨架）
- [ ] `plugins/json-formatter/src/json-ops.ts` — JSON 操作逻辑
- [ ] `plugins/json-formatter/src/json-ops.test.ts` — 操作逻辑测试
- [ ] `plugins/json-formatter/src/ui/JsonFormatterPanel.tsx` — UI 占位组件

**反模式警告**：

- ❌ 不要引入外部 diff 库（如 `json-diff`），使用自定义结构化对比
- ❌ 不要在 TS→JSON 中尝试支持复杂 TypeScript 语法（泛型、联合类型、枚举），仅支持基础 interface
- ❌ 不要用 `eval()` 解析 TypeScript 类型，使用正则匹配
- ❌ 不要在 `validateJson` 的错误消息中直接暴露原始异常堆栈，格式化为用户友好消息

---

## 5.10 JSON Formatter UI

**目标**：实现 JSON Formatter 的 UI 组件，包括双栏编辑器、操作工具栏、树形可视化、Diff 对比视图。

**输入/前置条件**：

- 依赖：5.9 完成（json-ops 逻辑模块可用）
- 当前状态：
  - `JsonFormatterPanel.tsx` 为占位组件
  - 所有逻辑函数已实现并通过测试

**验证策略**：B 类（验证式测试）

**关键决策**：

| 决策项    | 方案                                                                  |
| --------- | --------------------------------------------------------------------- |
| 布局      | 顶部工具栏 + 中间双栏（输入/输出）+ 底部状态栏                        |
| 模式切换  | Format / Validate / Convert / Diff / Tree 五个模式标签                |
| 输入方式  | textarea 输入，支持粘贴                                               |
| 树形视图  | 自定义递归 React 组件，展开/折叠 JSON 节点                            |
| Diff 视图 | 左右对比布局，changed 黄色、added 绿色、removed 红色高亮              |
| 错误展示  | 校验错误时在输入框下方显示错误信息 + 高亮错误行                       |
| 复制结果  | 一键复制输出内容到剪贴板（使用 `window.workbox.clipboard.writeText`） |

**组件层次结构**：

```
JsonFormatterPanel.tsx      — 顶层容器
  ├── Toolbar.tsx            — 模式切换 + 操作按钮（格式化/压缩/复制）
  ├── FormatView.tsx         — 格式化模式：输入 → 格式化输出
  ├── ValidateView.tsx       — 校验模式：输入 → 校验结果 + 错误定位
  ├── ConvertView.tsx        — 转换模式：JSON↔TS 互转
  ├── DiffView.tsx           — Diff 模式：左右对比
  └── TreeView.tsx           — 树形模式：JSON 树形可视化
```

**验收标准**：

- [ ] 实现 `JsonFormatterPanel.tsx`：模式标签切换 + 工具栏
- [ ] 实现 `FormatView.tsx`：
  - [ ] 左侧输入 textarea，右侧格式化输出
  - [ ] 格式化 / 压缩按钮
  - [ ] 复制输出按钮
- [ ] 实现 `ValidateView.tsx`：
  - [ ] 输入 JSON → 实时校验
  - [ ] 有效：显示绿色 ✓
  - [ ] 无效：显示错误信息 + 错误行高亮
- [ ] 实现 `ConvertView.tsx`：
  - [ ] JSON→TS：输入 JSON → 生成 TypeScript interface
  - [ ] TS→JSON：输入 TypeScript interface → 生成 JSON 样例
  - [ ] 方向切换按钮
- [ ] 实现 `DiffView.tsx`：
  - [ ] 左右两个 textarea 输入
  - [ ] Diff 按钮 → 下方显示差异列表
  - [ ] 颜色编码（added 绿 / removed 红 / changed 黄）
- [ ] 实现 `TreeView.tsx`：
  - [ ] 输入 JSON → 树形可视化
  - [ ] 支持展开/折叠节点
  - [ ] 显示 key、值类型、值内容
- [ ] 实现 `store.ts`：
  - [ ] 当前模式、输入输出内容、校验状态
- [ ] 编写测试：
  - [ ] store 测试
  - [ ] JsonFormatterPanel 组件渲染测试（模式切换）
  - [ ] TreeView 递归渲染测试
- [ ] `pnpm test` 全部通过

**交付物清单**：

- [ ] `plugins/json-formatter/src/ui/JsonFormatterPanel.tsx` — 面板主组件
- [ ] `plugins/json-formatter/src/ui/JsonFormatterPanel.test.tsx` — 面板测试
- [ ] `plugins/json-formatter/src/ui/Toolbar.tsx` — 工具栏
- [ ] `plugins/json-formatter/src/ui/FormatView.tsx` — 格式化视图
- [ ] `plugins/json-formatter/src/ui/ValidateView.tsx` — 校验视图
- [ ] `plugins/json-formatter/src/ui/ConvertView.tsx` — 转换视图
- [ ] `plugins/json-formatter/src/ui/DiffView.tsx` — Diff 视图
- [ ] `plugins/json-formatter/src/ui/TreeView.tsx` — 树形视图
- [ ] `plugins/json-formatter/src/ui/TreeView.test.tsx` — 树形视图测试
- [ ] `plugins/json-formatter/src/ui/store.ts` — 状态管理
- [ ] `plugins/json-formatter/src/ui/store.test.ts` — 状态测试

**反模式警告**：

- ❌ 不要在输入每个字符时触发格式化/校验，使用 debounce 或手动触发按钮
- ❌ 不要在 TreeView 中一次性展开所有节点（大 JSON 会卡死），默认仅展开第一层
- ❌ 不要尝试在 textarea 中实现真正的代码编辑器（行号、语法高亮），初版保持简单

---

## 5.11 Regex Tester 完整实现

**目标**：创建 Regex Tester 插件，实现正则表达式输入、测试文本输入、实时匹配高亮、匹配组提取、常用模板和 Flag 切换功能。

**输入/前置条件**：

- 依赖：Phase 4 完成
- 当前状态：纯渲染进程逻辑，无需主进程能力

**验证策略**：A 类（严格 TDD — 正则匹配逻辑）+ B 类（UI 组件）

**关键决策**：

| 决策项       | 方案                                                        |
| ------------ | ----------------------------------------------------------- |
| 插件包名     | `@workbox/plugin-regex-tester`                              |
| 权限声明     | `["clipboard"]`（复制正则/匹配结果需要）                    |
| 正则引擎     | 原生 `RegExp` API（运行在渲染进程）                         |
| 匹配方式     | `regex.exec()` 循环 + `matchAll()` 获取所有匹配             |
| 错误处理     | 无效正则时 `try { new RegExp(...) }` catch 并显示错误       |
| 高亮实现     | 将测试文本按匹配/非匹配区间拆分为 spans，匹配区间添加背景色 |
| 逻辑运行位置 | **渲染进程**（纯计算逻辑）                                  |
| 插件后端     | 仅骨架，不注册 IPC handler                                  |

**核心逻辑**（`plugins/regex-tester/src/regex-engine.ts`）：

```typescript
interface RegexMatch {
  fullMatch: string;
  index: number;
  length: number;
  groups: Record<string, string>;
  captures: string[];
}

/** 执行正则匹配，返回所有匹配结果 */
function executeRegex(pattern: string, flags: string, text: string): RegexMatch[];

/** 校验正则是否合法 */
function validateRegex(pattern: string, flags: string): { valid: boolean; error?: string };

/** 生成匹配高亮片段（用于 UI 渲染） */
function generateHighlightSegments(
  text: string,
  matches: RegexMatch[]
): Array<{ text: string; isMatch: boolean; matchIndex?: number }>;
```

**常用模板**（`plugins/regex-tester/src/templates.ts`）：

```typescript
const REGEX_TEMPLATES = [
  { name: "邮箱", pattern: "[\\w.-]+@[\\w.-]+\\.\\w+", flags: "g", description: "匹配邮箱地址" },
  { name: "手机号", pattern: "1[3-9]\\d{9}", flags: "g", description: "匹配中国大陆手机号" },
  {
    name: "URL",
    pattern: "https?://[\\w\\-._~:/?#\\[\\]@!$&'()*+,;=]+",
    flags: "gi",
    description: "匹配 HTTP/HTTPS URL"
  },
  { name: "IPv4", pattern: "(\\d{1,3}\\.){3}\\d{1,3}", flags: "g", description: "匹配 IPv4 地址" },
  {
    name: "日期 (YYYY-MM-DD)",
    pattern: "\\d{4}-\\d{2}-\\d{2}",
    flags: "g",
    description: "匹配日期格式"
  },
  {
    name: "十六进制颜色",
    pattern: "#[0-9a-fA-F]{3,8}",
    flags: "gi",
    description: "匹配十六进制颜色值"
  }
  // ...更多模板
];
```

**组件层次结构**：

```
RegexTesterPanel.tsx        — 顶层容器
  ├── RegexInput.tsx         — 正则输入框 + Flag 切换 (g/i/m/s/u)
  ├── TemplateSelector.tsx   — 常用模板下拉选择
  ├── TestTextInput.tsx      — 测试文本输入区（支持多行）
  ├── MatchHighlight.tsx     — 高亮渲染区（匹配文本着色显示）
  └── MatchDetails.tsx       — 匹配详情（匹配数量、各匹配组）
```

**验收标准**：

- [ ] 创建 `plugins/regex-tester/package.json`
- [ ] 创建 `plugins/regex-tester/src/index.ts`，导出 `definePlugin()` 骨架
- [ ] 实现 `plugins/regex-tester/src/regex-engine.ts`：
  - [ ] `executeRegex()` 获取所有匹配结果和捕获组
  - [ ] `validateRegex()` 校验正则合法性
  - [ ] `generateHighlightSegments()` 生成高亮分段
- [ ] 实现 `plugins/regex-tester/src/templates.ts`：
  - [ ] 至少 10 个常用正则模板
- [ ] 实现 `RegexTesterPanel.tsx`：
  - [ ] 正则输入框 + Flag 开关（g/i/m/s/u）
  - [ ] 测试文本输入区（多行 textarea）
  - [ ] 实时匹配高亮显示（输入变化时自动执行）
  - [ ] 匹配详情面板：匹配数量、各匹配的位置和捕获组
  - [ ] 模板选择器：点击模板自动填充正则和示例文本
  - [ ] 无效正则时显示错误提示
  - [ ] 复制正则按钮
- [ ] 实现 `store.ts`：
  - [ ] 正则 pattern、flags、测试文本、匹配结果
- [ ] 编写测试覆盖：
  - [ ] `executeRegex` 正常匹配、全局匹配、分组捕获、命名分组
  - [ ] `validateRegex` 合法/非法正则
  - [ ] `generateHighlightSegments` 分段正确性
  - [ ] 无匹配情况
  - [ ] 空正则或空文本
  - [ ] 模板数据结构校验
  - [ ] store 状态管理测试
  - [ ] 组件渲染测试
- [ ] `pnpm test` 全部通过

**交付物清单**：

- [ ] `plugins/regex-tester/package.json` — 插件清单
- [ ] `plugins/regex-tester/src/index.ts` — 插件入口（骨架）
- [ ] `plugins/regex-tester/src/regex-engine.ts` — 正则匹配引擎
- [ ] `plugins/regex-tester/src/regex-engine.test.ts` — 引擎测试
- [ ] `plugins/regex-tester/src/templates.ts` — 常用模板
- [ ] `plugins/regex-tester/src/templates.test.ts` — 模板校验测试
- [ ] `plugins/regex-tester/src/ui/RegexTesterPanel.tsx` — 面板主组件
- [ ] `plugins/regex-tester/src/ui/RegexTesterPanel.test.tsx` — 组件测试
- [ ] `plugins/regex-tester/src/ui/store.ts` — 状态管理
- [ ] `plugins/regex-tester/src/ui/store.test.ts` — 状态测试

**参考文档**：

- `ARCHITECTURE.md` 9.1（Regex Tester 功能描述，Line 570）
- `ARCHITECTURE.md` 4.1（插件目录结构，Lines 116-128）

**反模式警告**：

- ❌ 不要使用 `eval()` 或 `new Function()` 执行用户输入的正则，使用 `new RegExp()` + try/catch
- ❌ 不要在全局匹配时使用无限循环（`while (regex.exec(text))`），防止 ReDoS 攻击；添加匹配次数上限（如 1000）
- ❌ 不要在每次字符输入时立即执行匹配，使用 debounce（150ms）
- ❌ 不要忘记重置 `regex.lastIndex`，全局正则的状态会影响后续匹配

---

## Phase 5 完成后验证清单

完成所有 10 个任务后，执行以下最终验证：

### 功能验证

- [ ] `pnpm test` 全部通过（0 失败）
- [ ] File Explorer 插件：
  - [ ] 可浏览目录树，展开/折叠目录
  - [ ] 可预览文本文件、JSON 文件、图片文件
  - [ ] 可搜索文件（按文件名和内容）
  - [ ] 可新建、重命名、删除文件
- [ ] Git Helper 插件：
  - [ ] 可查看文件修改状态（modified/staged/untracked）
  - [ ] 可 stage/unstage/commit 操作
  - [ ] 可查看和切换分支
  - [ ] 可查看文件 Diff
  - [ ] 可查看 Commit 历史
  - [ ] `CmdOrCtrl+Shift+C` 快捷键触发 quick-commit
  - [ ] AI 可调用 `git_status`、`git_commit`、`git_diff`、`git_log`
- [ ] Snippet Manager 插件：
  - [ ] 可创建/编辑/删除代码片段
  - [ ] 可按标题/内容搜索片段
  - [ ] 可按标签过滤片段
  - [ ] 一键复制片段内容到剪贴板
  - [ ] 代码片段有语法高亮显示
- [ ] JSON Formatter 插件：
  - [ ] 可格式化/压缩 JSON
  - [ ] 可校验 JSON 并定位错误
  - [ ] 可将 JSON 转换为 TypeScript 类型
  - [ ] 可将 TypeScript 类型转换为 JSON 样例
  - [ ] 可对比两段 JSON 的差异
  - [ ] 可树形可视化浏览 JSON
- [ ] Regex Tester 插件：
  - [ ] 可输入正则和测试文本
  - [ ] 实时高亮匹配结果
  - [ ] 显示匹配组详情
  - [ ] 可选择常用模板
  - [ ] 可切换 Flags（g/i/m/s/u）

### 代码质量

- [ ] `pnpm lint` 无错误
- [ ] 无 `any` 类型使用（test mock 中的类型签名除外）
- [ ] 所有导出函数/类型有 JSDoc 注释
- [ ] 无安全漏洞（路径校验、命令注入防护、ReDoS 防护）

### 反模式检查

- [ ] `grep -r "import.*\"fs\"" plugins/` — 无直接 fs 导入（应通过 ctx.fs）
- [ ] `grep -r "eval\|new Function" plugins/` — 无 eval 使用
- [ ] `grep -r ": any" plugins/ src/` — 仅 test mock 中使用

---

## 自审 Review 报告

### 高优先级问题（必须修复）

- [x] **[H1]** File Explorer `deleteItem` / `rename` 操作缺少路径安全校验，存在路径穿越风险 → 已在 5.1 关键决策中添加"路径安全校验"要求，验收标准中添加"路径穿越攻击拦截"测试项
- [x] **[H2]** Git Helper 通过 `ctx.shell.exec()` 拼接 git 命令存在命令注入风险 → 已在 5.4 关键决策中添加分支名正则校验方案（`/^[\w\-\/\.]+$/`），commit message 使用 `-m` 参数传递

### 中优先级问题（必须修复）

- [x] **[M1]** JSON ↔ TS 转换范围未明确，TS→JSON 需解析 TypeScript AST 过于复杂 → 已在 5.9 关键决策中限定 TS→JSON 仅支持基础 interface（string/number/boolean/array/nested object），明确不支持泛型/联合类型/枚举
- [x] **[M2]** File Explorer 文件搜索缺少性能限制，大型项目（node_modules）可能导致卡顿 → 已在 5.1 关键决策中添加搜索深度限制（文件名 10 层、内容 5 层）、文件大小限制（跳过 > 1MB）、结果数限制（100 条）
- [x] **[M4]** Regex Tester 未考虑 ReDoS（正则拒绝服务）攻击风险 → 已在 5.11 反模式中添加匹配次数上限（1000 次），防止恶意正则导致浏览器卡死

### 低优先级问题（记录参考）

- [ ] **[L1]** Snippet Manager 使用单 key 存储所有 snippet，大量数据（> 1000 条）时性能可能下降。初版可接受，后续可优化为分 key 存储或使用 SQLite 直接查询
- [ ] **[L2]** 各插件 Preload 扩展导致 `src/preload/index.ts` 持续膨胀（File Explorer + Git Helper + Snippet Manager 各添加 7-8 个方法）。未来应考虑通用的 Plugin IPC 机制
- [ ] **[L3]** Git Helper 的 Diff 查看器功能较基础（仅支持 unified diff 格式的内联显示），未来可增强为 side-by-side 对比模式
- [ ] **[L4]** JSON Formatter 和 Regex Tester 的代码编辑区使用简单 textarea，未来可引入轻量代码编辑器（如 CodeMirror）提升体验
