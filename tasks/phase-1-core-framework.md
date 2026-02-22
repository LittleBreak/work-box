# Phase 1：核心框架

> **目标**：打通 IPC 通信 + 数据存储 + 基础 UI 布局。

> **里程碑**：M1 - 框架可用（IPC 通信打通，App Shell 可导航，数据库可读写）

---

## 1.1 IPC 通信基础设施

**目标**：建立类型安全的 IPC 通信框架，打通主进程与渲染进程。

**输入/前置条件**：

- 依赖：Phase 0 完成
- 需读取：`ARCHITECTURE.md` 第六节（IPC 通信设计）、第三节（进程模型）

**验收标准**：

- [ ] 实现 `src/shared/ipc-channels.ts`：定义所有 IPC 通道常量
- [ ] 实现 `src/shared/types.ts`：定义共享类型（`ExecResult`、`FileStat` 等）
- [ ] 实现 `src/preload/index.ts`：通过 `contextBridge` 暴露 `window.workbox` API
- [ ] 在主进程 `src/main/index.ts` 注册 IPC handler 骨架
- [ ] 实现类型安全的 IPC invoke 封装（renderer 端调用时有类型提示）
- [ ] 渲染进程可通过 `window.workbox.xxx()` 调用主进程方法并获得返回值
- [ ] **TDD**：编写 IPC 通道定义和类型的单元测试

**参考**：`ARCHITECTURE.md` 第六节（IPC 通信设计）

---

## 1.2 文件系统 IPC Handler

**目标**：实现文件系统操作的 IPC 处理器，支持安全的文件读写。

**输入/前置条件**：

- 依赖：Task 1.1 完成
- 需读取：`ARCHITECTURE.md` 第三节（主进程 - 文件系统服务）、第四节（权限模型）

**验收标准**：

- [ ] 实现 `src/main/ipc/fs.handler.ts`
  - [ ] `readFile(path)` → 返回文件内容
  - [ ] `writeFile(path, data)` → 写入文件
  - [ ] `readDir(path)` → 返回目录列表
  - [ ] `stat(path)` → 返回文件元信息
- [ ] 添加路径安全校验（防止路径穿越攻击）
- [ ] **TDD**：编写单元测试，覆盖正常路径、边界条件、路径穿越攻击场景
- [ ] renderer 可通过 IPC 读写本地文件，测试通过

**参考**：`ARCHITECTURE.md` 第三节（主进程）、第十一节（安全规范）

---

## 1.3 Shell 执行 IPC Handler

**目标**：实现安全的 Shell 命令执行，带超时和危险命令检测。

**输入/前置条件**：

- 依赖：Task 1.1 完成
- 需读取：`ARCHITECTURE.md` 第三节（主进程 - Shell 执行器）

**验收标准**：

- [ ] 实现 `src/main/ipc/shell.handler.ts`
  - [ ] `exec(command, options)` → 执行命令返回 stdout/stderr/exitCode
- [ ] 实现命令超时机制（默认 30s）
- [ ] 实现危险命令黑名单检测（`rm -rf /` 等）
- [ ] **TDD**：编写单元测试，覆盖正常执行、超时、危险命令拦截场景
- [ ] renderer 可通过 IPC 执行 shell 命令，有超时保护

**参考**：`ARCHITECTURE.md` 第三节（主进程 - Shell 执行器）、第十一节（安全规范）

---

## 1.4 SQLite 数据存储

**目标**：实现本地数据持久化，包括数据库初始化、Schema 定义和迁移机制。

**输入/前置条件**：

- 依赖：Task 1.1 完成
- 需读取：`ARCHITECTURE.md` 第七节（数据存储设计）

**验收标准**：

- [ ] 安装 `better-sqlite3` + `drizzle-orm` + `drizzle-kit`
- [ ] 实现 `src/main/storage/database.ts`：数据库初始化 & 连接管理
- [ ] 实现 `src/main/storage/schema.ts`：Drizzle schema 定义（conversations、messages、plugin_storage、settings）
- [ ] 实现数据库迁移机制（`drizzle-kit` 或手动 migration）
- [ ] 数据库文件存放在 `~/.workbox/data.db`
- [ ] **TDD**：编写 CRUD 单元测试，覆盖所有表的基本操作
- [ ] 应用启动时自动创建/迁移数据库，CRUD 测试通过

**参考**：`ARCHITECTURE.md` 第七节（数据存储设计）

---

## 1.5 App Shell 基础 UI

**目标**：构建应用主框架 UI，包括侧边栏导航和页面布局。

**输入/前置条件**：

- 依赖：Phase 0（Tailwind + shadcn/ui）完成
- 需读取：`ARCHITECTURE.md` 第三节（渲染进程）、第八节（renderer 目录结构）

**验收标准**：

- [ ] 实现 `src/renderer/App.tsx`：根布局 + 路由（React Router 或简单条件渲染）
- [ ] 实现 `src/renderer/components/Layout/`：左侧导航栏 + 右侧内容区布局
- [ ] 实现 `src/renderer/components/Sidebar/`：可折叠侧边栏，图标导航
- [ ] 实现基础页面占位：首页、AI Chat、插件管理、设置
- [ ] 安装 Zustand，实现 `src/renderer/stores/app.store.ts`（当前页面、侧边栏状态等）
- [ ] 使用 shadcn/ui 组件构建界面
- [ ] **TDD**：编写 Zustand store 的单元测试
- [ ] 应用启动可看到侧边栏 + 内容区布局，点击导航可切换页面

**参考**：`ARCHITECTURE.md` 第三节（渲染进程）、第八节（项目目录结构）

---

## 1.6 设置页面 & 配置持久化

**目标**：实现应用设置页面，配置可持久化存储。

**输入/前置条件**：

- 依赖：Task 1.4（数据存储）+ Task 1.5（App Shell UI）完成
- 需读取：`ARCHITECTURE.md` 第七节（数据存储 - settings 表）

**验收标准**：

- [ ] 实现 `src/renderer/features/settings/SettingsView.tsx`
  - [ ] 通用设置：主题（亮/暗）、语言
  - [ ] AI 设置：Provider 配置（API Key、Base URL、模型选择）
  - [ ] 插件设置：插件目录路径
- [ ] 实现配置读写的 IPC（基于 settings 表或 `config.json`）
- [ ] 实现暗色模式切换
- [ ] **TDD**：编写配置读写逻辑的单元测试
- [ ] 设置页可保存配置，重启应用后配置仍在

**参考**：`ARCHITECTURE.md` 第七节（数据存储设计 - settings 表）
