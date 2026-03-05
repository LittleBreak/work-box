# 稳定性与开发者体验：高优先级问题修复

> **目标**：修复插件系统审查报告中 5 个高优先级的可维护性、易用性和可扩展性问题，提升代码质量和开发者体验
>
> **里程碑**：高优先级问题清零（P2/P4/P8/P10/P11 全部修复，`pnpm test` 零失败）

---

## 执行前置（必须确认）

- [ ] 已完成 `tasks/security-critical-task.md` 中的 S.1-S.4 严重安全问题修复
- [ ] 已阅读 `docs/report.md` 第一部分可维护性与易用性分析
- [ ] `pnpm test` 全部通过

---

## 任务依赖关系 & 推荐执行顺序

```
[Task D.1 window类型安全] ∥ [Task D.2 AI占位改善] ∥ [Task D.3 插件状态重构]
                                    ↓
              [Task D.4 插件依赖声明] → [Task D.5 插件间通信]
```

- D.1、D.2、D.3 无相互依赖，可并行
- D.4 建议在 D.3 完成后执行（涉及插件元数据扩展）
- D.5 依赖 D.4（通信机制需考虑依赖关系）

---

## 待完成

### Task D.1：window.workbox 全局类型声明

**TDD 策略**：B 类（验证式测试）

**详细需求**：

`plugin.store.ts:23-26` 使用 `as unknown` 绕过类型检查访问 `window.workbox`：

```typescript
const workbox = (window as unknown as Record<string, unknown>).workbox as {...};
```

每个使用处都需要手动断言类型，容易出错且无法获得 IDE 类型提示。

**修复方案**：创建全局类型声明文件，为 `window.workbox` 提供完整类型定义。

**依赖**：无

**执行步骤**：

1. 编写测试（Red）
   - [ ] 创建 `src/renderer/src/types/window.d.ts`（类型声明文件），验证编译通过
   - [ ] 修改 `plugin.store.ts` 移除 `as unknown` 断言，使用 `window.workbox` 直接访问
   - [ ] 运行 `pnpm test` 确认类型检查通过

2. 编写实现（Green）
   - [ ] 创建 `src/renderer/src/types/window.d.ts`：

     ```typescript
     import type { PluginInfo, ExecResult, AppSettings } from "@shared/types";

     interface WorkboxAPI {
       fs: {
         readFile(path: string): Promise<string>;
         writeFile(path: string, data: string): Promise<void>;
         readDir(path: string): Promise<string[]>;
         stat(
           path: string
         ): Promise<{ size: number; isDirectory: boolean; isFile: boolean; mtime: number }>;
       };
       shell: {
         exec(
           command: string,
           options?: { cwd?: string; timeout?: number; env?: Record<string, string> }
         ): Promise<ExecResult>;
       };
       plugin: {
         list(): Promise<PluginInfo[]>;
         enable(id: string): Promise<void>;
         disable(id: string): Promise<void>;
       };
       settings: {
         get(): Promise<AppSettings>;
         update(partial: Partial<AppSettings>): Promise<void>;
         reset(): Promise<void>;
       };
     }

     declare global {
       interface Window {
         workbox: WorkboxAPI;
       }
     }
     ```

   - [ ] 确保 `tsconfig` 包含此声明文件
   - [ ] 修改 `plugin.store.ts` 移除所有 `as unknown` 断言，直接使用 `window.workbox`
   - [ ] 检查渲染进程中其他使用 `window.workbox` 的位置，同步修改
   - [ ] 运行 `pnpm test` 确认全部 PASS

3. 重构（Refactor）
   - [ ] 确认类型声明与 preload 中 `contextBridge.exposeInMainWorld` 暴露的 API 一致
   - [ ] 运行 `pnpm test` 最终确认全部 PASS

**验收标准**：

- [ ] `window.workbox` 有完整的 TypeScript 类型定义
- [ ] 渲染进程代码中不再有 `as unknown` 类型断言访问 `window.workbox`
- [ ] IDE 对 `window.workbox.*` 提供自动补全
- [ ] 测试全部通过

---

### Task D.2：AI API 占位实现改善

**TDD 策略**：B 类（验证式测试）

**详细需求**：

`context.ts:111-123` 中 AI API 占位实现体验差：

- 返回 AsyncIterable 但只会抛错
- 错误信息不友好（仅 "AI service not available"）
- AsyncIterable 原型写法繁琐

**修复方案**：

1. 改为直接抛出带有明确修复指引的错误
2. 添加权限检查（`ai:chat`）
3. 完善 JSDoc 注释

**依赖**：无

**执行步骤**：

1. 编写测试（Red）
   - [ ] `src/main/plugin/context.test.ts` — 新增/更新 AI API 测试：
     - 测试 1：无 `ai:chat` 权限调用 `ctx.ai.chat()` 抛出 `PermissionDeniedError`
     - 测试 2：有 `ai:chat` 权限调用 `ctx.ai.chat()` 抛出包含 "not configured" 的错误
     - 测试 3：错误消息包含 "Phase 3" 或修复指引
   - [ ] 运行 `pnpm test` 确认新增测试 FAIL

2. 编写实现（Green）
   - [ ] 修改 `context.ts` 中 `ai.chat()` 实现：
     ```typescript
     ai: {
       chat(): AsyncIterable<unknown> {
         permissionManager.require("ai:chat");
         throw new Error(
           "AI service not configured. " +
           "AI chat will be available in Phase 3. " +
           "See ROADMAP.md for details."
         );
       },
       // ...
     }
     ```
   - [ ] 完善 `chat` 方法的 JSDoc 注释，说明参数和返回类型
   - [ ] 运行 `pnpm test` 确认全部 PASS

3. 重构（Refactor）
   - [ ] 运行 `pnpm test` 最终确认全部 PASS

**验收标准**：

- [ ] `ai.chat()` 调用前检查 `ai:chat` 权限
- [ ] 错误消息包含明确的修复指引
- [ ] JSDoc 注释完整
- [ ] 测试全部通过

---

### Task D.3：插件状态存储模式重构

**TDD 策略**：A 类（严格 Red-Green-Refactor）

**详细需求**：

所有示例插件使用模块级变量存储实例状态：

```typescript
// plugins/terminal/src/index.ts:16-20
let sessionManager: TerminalSessionManager | null = null;
let toolDisposable: Disposable | null = null;
```

**风险**：

- 插件重复 enable/disable 时可能导致资源泄漏
- 不清晰的资源生命周期
- 测试困难（需清理全局状态）

**修复方案**：在 activate 中创建隔离的上下文对象存储状态，通过 deactivate 清理。

**依赖**：无

**执行步骤**：

1. 编写测试（Red）
   - [ ] 为至少一个示例插件（如 `terminal`）编写重复 enable/disable 测试：
     - 测试 1：首次 activate 创建资源
     - 测试 2：deactivate 清理所有资源
     - 测试 3：再次 activate 后资源重新创建（不泄漏）
   - [ ] 运行 `pnpm test` 确认新增测试 FAIL

2. 编写实现（Green）
   - [ ] 重构 `plugins/terminal/src/index.ts`：
     - 将模块级变量替换为 activate 返回的闭包作用域
     - 在 deactivate 中清理所有创建的资源
   - [ ] 同样重构 `plugins/file-explorer/src/index.ts` 和 `plugins/git-helper/src/index.ts`
   - [ ] 运行 `pnpm test` 确认全部 PASS

3. 重构（Refactor）
   - [ ] 考虑提供一个 `createPluginState()` 辅助函数模板（可选）
   - [ ] 运行 `pnpm test` 最终确认全部 PASS

**验收标准**：

- [ ] 示例插件不再使用模块级变量存储实例状态
- [ ] 重复 enable/disable 不会导致资源泄漏
- [ ] 测试全部通过

---

### Task D.4：插件依赖声明支持

**TDD 策略**：A 类（严格 Red-Green-Refactor）

**详细需求**：

`WorkboxPluginConfig`（`packages/plugin-api/src/types.ts`）缺少 `dependencies` 字段，无法声明插件间依赖关系。`engine.ts:204-206` 的 `resolveLoadOrder()` 仅返回原数组（Phase 2 占位），未实现拓扑排序。

**修复方案**：

1. 在 `WorkboxPluginConfig` 中添加可选的 `dependencies` 字段
2. 在 `engine.ts` 中实现基于依赖关系的拓扑排序
3. 检测循环依赖并报错

**依赖**：无（但建议在 D.3 后执行）

**执行步骤**：

1. 编写测试（Red）
   - [ ] `src/main/plugin/engine.test.ts` — 新增依赖解析测试：
     - 测试 1：无依赖的插件按原顺序加载
     - 测试 2：A 依赖 B，B 先于 A 加载
     - 测试 3：A→B→C 依赖链正确排序
     - 测试 4：循环依赖（A→B→A）抛出错误
     - 测试 5：依赖的插件不存在时抛出错误或警告
     - 测试 6：`dependencies` 字段缺失时视为无依赖
   - [ ] `packages/plugin-api/src/types.ts` 类型测试：确认 `dependencies` 是可选字段
   - [ ] 运行 `pnpm test` 确认新增测试 FAIL

2. 编写实现（Green）
   - [ ] 在 `packages/plugin-api/src/types.ts` 的 `WorkboxPluginConfig` 中添加：
     ```typescript
     dependencies?: {
       requires?: string[];     // 依赖的其他插件 ID
       conflicts?: string[];    // 冲突的插件 ID
     };
     ```
   - [ ] 修改 `engine.ts` 的 `parseManifest()` 解析 `dependencies` 字段
   - [ ] 实现 `resolveLoadOrder()` 拓扑排序：
     - 构建有向图（插件 → 依赖列表）
     - 使用 Kahn 算法或 DFS 实现拓扑排序
     - 检测循环依赖并抛出错误
   - [ ] 运行 `pnpm test` 确认全部 PASS

3. 重构（Refactor）
   - [ ] 确保拓扑排序算法边界条件覆盖完整
   - [ ] 运行 `pnpm test` 最终确认全部 PASS

**验收标准**：

- [ ] `WorkboxPluginConfig` 支持 `dependencies.requires` 和 `dependencies.conflicts`
- [ ] `resolveLoadOrder()` 返回拓扑排序后的加载顺序
- [ ] 循环依赖被检测并报错
- [ ] 向后兼容：无 `dependencies` 字段的插件正常加载
- [ ] 测试全部通过

---

### Task D.5：插件间事件通信机制

**TDD 策略**：A 类（严格 Red-Green-Refactor）

**详细需求**：

当前插件系统中无法获取其他插件引用，无 event bus 或 pub/sub 机制，插件无法协作。

**修复方案**：在 `PluginContext` 中添加 `events` 命名空间，实现跨插件事件发布/订阅。

**依赖**：Task D.4（需理解插件间依赖关系）

**执行步骤**：

1. 编写测试（Red）
   - [ ] `src/main/plugin/event-bus.test.ts` — 新增事件总线测试：
     - 测试 1：`emit` 触发 `on` 注册的回调
     - 测试 2：`once` 回调只触发一次
     - 测试 3：`on` 返回的 Disposable 调用 `dispose()` 后不再触发
     - 测试 4：无监听器时 `emit` 不报错
     - 测试 5：多个监听器均被触发
     - 测试 6：事件名称带插件 ID 前缀的命名空间隔离
   - [ ] `src/main/plugin/context.test.ts` — 新增 `ctx.events` 测试
   - [ ] 运行 `pnpm test` 确认新增测试 FAIL

2. 编写实现（Green）
   - [ ] 创建 `src/main/plugin/event-bus.ts`：

     ```typescript
     export class PluginEventBus {
       private listeners: Map<string, Set<(data: unknown) => void>>;

       emit(eventName: string, data?: unknown): void;
       on(eventName: string, handler: (data: unknown) => void): Disposable;
       once(eventName: string, handler: (data: unknown) => void): Disposable;
       removeAll(pluginId?: string): void;
     }
     ```

   - [ ] 在 `packages/plugin-api/src/types.ts` 的 `PluginContext` 中添加：
     ```typescript
     events: {
       emit(eventName: string, data?: unknown): void;
       on(eventName: string, handler: (data: unknown) => void): Disposable;
       once(eventName: string, handler: (data: unknown) => void): Disposable;
     };
     ```
   - [ ] 在 `context.ts` 中集成 `PluginEventBus`（通过 `SystemServices` 注入共享实例）
   - [ ] 运行 `pnpm test` 确认全部 PASS

3. 重构（Refactor）
   - [ ] 确保插件 disable 时自动清理其注册的事件监听器
   - [ ] 运行 `pnpm test` 最终确认全部 PASS

**验收标准**：

- [ ] `PluginContext.events` 提供 `emit`、`on`、`once` 方法
- [ ] 跨插件事件通信正常工作
- [ ] 事件监听器返回 Disposable，支持手动取消
- [ ] 插件 disable 时自动清理事件监听器
- [ ] 测试全部通过

---

## 进行中

（当前无）

---

## 已完成

（当前无）
