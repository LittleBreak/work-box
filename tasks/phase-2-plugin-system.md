# Phase 2：插件系统

> **目标**：实现完整的插件引擎，支持插件加载和生命周期管理。

> **里程碑**：M2 - 插件可用（插件可加载/卸载，Plugin API 可用）

---

## 2.1 Plugin API 包

**目标**：定义完整的插件 API 类型和 `definePlugin()` 入口函数。

**输入/前置条件**：

- 依赖：Phase 1（IPC + 存储）完成
- 需读取：`ARCHITECTURE.md` 第四节（插件系统设计 - 4.2 插件 API、4.3 PluginContext API 清单）

**验收标准**：

- [ ] 实现 `packages/plugin-api/src/types.ts`：完整的 `PluginContext` 接口定义
  - [ ] `plugin`、`fs`、`shell`、`ai`、`commands`、`notification`、`workspace`、`storage` 全部接口
- [ ] 实现 `packages/plugin-api/src/index.ts`：`definePlugin()` 函数 + 类型导出
- [ ] 编写 JSDoc 注释，确保类型提示清晰
- [ ] 发布为 workspace 内部包 `@workbox/plugin-api`
- [ ] **TDD**：编写类型校验测试和 `definePlugin()` 函数的单元测试
- [ ] 插件开发者可 `import { definePlugin } from '@workbox/plugin-api'` 并获得完整类型提示

**参考**：`ARCHITECTURE.md` 第四节（插件系统设计 - 4.2、4.3）

---

## 2.2 插件引擎 - 扫描 & 解析

**目标**：实现插件目录扫描和清单解析功能。

**输入/前置条件**：

- 依赖：Task 2.1 完成
- 需读取：`ARCHITECTURE.md` 第四节（4.1 插件规范、4.4 插件加载流程）

**验收标准**：

- [ ] 实现 `src/main/plugin/engine.ts`：
  - [ ] `scanPlugins(dirs)` → 扫描 `plugins/` 和 `~/.workbox/plugins/` 目录
  - [ ] `parseManifest(packageJson)` → 解析 `workbox` 字段，校验合法性
  - [ ] `resolveLoadOrder(plugins)` → 按依赖关系排序
- [ ] 定义插件状态枚举：`unloaded` → `loading` → `active` → `error` → `disabled`
- [ ] **TDD**：编写单元测试，覆盖正常扫描、非法清单报错、依赖排序场景
- [ ] 能正确扫描、解析插件目录，非法清单会报错

**参考**：`ARCHITECTURE.md` 第四节（4.1 插件规范、4.4 插件加载流程）

---

## 2.3 PluginContext 创建

**目标**：为每个插件创建隔离的运行时上下文。

**输入/前置条件**：

- 依赖：Task 2.1 + Task 2.2 完成
- 需读取：`ARCHITECTURE.md` 第四节（4.3 PluginContext API 清单）

**验收标准**：

- [ ] 实现 `src/main/plugin/context.ts`：
  - [ ] 为每个插件创建隔离的 `PluginContext` 实例
  - [ ] `fs` 操作基于权限声明拦截
  - [ ] `shell` 操作基于权限声明拦截
  - [ ] `storage` 操作自动隔离到 `plugin_storage` 表（按 `plugin_id`）
  - [ ] `commands.register()` → 注册到全局命令注册表
  - [ ] `ai.registerTool()` → 注册到 AI Tool Router
  - [ ] `notification` → 通过 IPC 转发到渲染进程
  - [ ] `workspace` → 代理 Electron dialog API
- [ ] **TDD**：编写单元测试，覆盖各 API 调用和权限拦截场景
- [ ] 各 API 调用正常，未声明权限的调用被拦截并报错

**参考**：`ARCHITECTURE.md` 第四节（4.3 PluginContext API 清单）

---

## 2.4 权限校验

**目标**：实现插件权限声明解析和运行时拦截机制。

**输入/前置条件**：

- 依赖：Task 2.3 完成
- 需读取：`ARCHITECTURE.md` 第四节（4.5 权限模型）

**验收标准**：

- [ ] 实现 `src/main/plugin/permission.ts`：
  - [ ] 解析插件 `permissions` 声明
  - [ ] 运行时拦截未授权调用
  - [ ] 高风险权限（`shell:exec`）首次使用时通知渲染进程弹窗确认
- [ ] 实现权限确认弹窗 UI
- [ ] **TDD**：编写单元测试，覆盖权限声明解析、未授权拦截、高风险权限确认场景
- [ ] 插件使用未声明权限时抛错，高风险权限弹窗确认后放行

**参考**：`ARCHITECTURE.md` 第四节（4.5 权限模型）

---

## 2.5 插件生命周期

**目标**：实现插件的完整生命周期管理（加载、激活、禁用、卸载）。

**输入/前置条件**：

- 依赖：Task 2.2 + Task 2.3 + Task 2.4 完成
- 需读取：`ARCHITECTURE.md` 第四节（4.4 插件加载流程）

**验收标准**：

- [ ] 实现插件加载流程：
  - [ ] 扫描 → 解析 → 排序 → 创建 Context → 检查权限 → `activate(ctx)` → 注册命令/Tools/UI
- [ ] 实现 `deactivate()` 清理机制（应用退出 / 插件禁用时调用）
- [ ] 实现插件 enable/disable 动态切换
- [ ] 通过 IPC 事件通知渲染进程插件状态变化
- [ ] **TDD**：编写单元测试，覆盖完整加载流程、deactivate 清理、动态启停场景
- [ ] 应用启动时自动加载插件，退出时 deactivate，可动态启停

**参考**：`ARCHITECTURE.md` 第四节（4.4 插件加载流程）

---

## 2.6 插件管理 UI

**目标**：实现插件列表和详情管理界面。

**输入/前置条件**：

- 依赖：Task 2.5 完成 + Phase 1 App Shell UI 完成
- 需读取：`ARCHITECTURE.md` 第八节（renderer/features/plugins/ 目录结构）

**验收标准**：

- [ ] 实现 `src/renderer/features/plugins/PluginList.tsx`：已安装插件列表
- [ ] 实现 `src/renderer/features/plugins/PluginDetail.tsx`：插件详情（描述、权限、启停开关）
- [ ] 显示插件状态标记（active / disabled / error）
- [ ] **TDD**：编写组件渲染和交互的测试
- [ ] UI 列表展示正确，可启停插件并实时反映状态

**参考**：`ARCHITECTURE.md` 第八节（项目目录结构 - renderer/features/plugins/）
