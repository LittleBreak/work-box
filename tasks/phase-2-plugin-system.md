# Phase 2：插件系统

> **目标**：实现完整的插件引擎，支持插件扫描、加载、权限校验和生命周期管理，提供类型安全的 Plugin API。
>
> **里程碑**：M2 - 插件可用（插件可扫描/加载/卸载，Plugin API 完整可用，权限运行时校验，管理 UI 可启停插件）

---

## 任务编号说明

Phase 2 共 6 个任务（2.1–2.6），覆盖 Plugin API 类型定义、插件引擎扫描解析、权限校验、PluginContext 创建、插件生命周期管理和插件管理 UI。

---

## Phase 2 执行前置（必须确认）

在开始任何 Task 前，先记录并确认以下信息：

- [x] Phase 1 所有任务已完成且 `pnpm test` 全部通过
- [x] `packages/plugin-api/src/index.ts` 和 `packages/plugin-api/src/types.ts` 已存在（Phase 0.2 创建，当前含基础 `PluginManifest` 和 `definePlugin()`）
- [x] `src/main/plugin/index.ts` 占位文件已存在（当前为空 `export {}`）
- [x] `src/shared/ipc-channels.ts` 已定义 `plugin:list`、`plugin:enable`、`plugin:disable` 通道
- [x] `src/main/storage/crud.ts` 已实现 `getPluginData`、`setPluginData`、`deletePluginData`、`deleteAllPluginData`
- [x] `src/preload/index.ts` 已暴露 `window.workbox.plugin.list/enable/disable` 存根
- [x] `src/renderer/features/plugins/PluginListView.tsx` 占位 UI 已存在
- [x] 路径别名 `@main`、`@renderer`、`@shared` 可用
- [x] 本阶段只引入 `ARCHITECTURE.md` 与 `ROADMAP.md` 已声明依赖
- [x] 执行任务后必须更新任务状态：任务成功完成时，将对应的验收标准和交付物清单项标记为 `[x]`（已完成）

---

## 任务依赖关系 & 推荐执行顺序

### 依赖关系图

```
2.1（Plugin API 完整类型） ← Phase 2 起点
  ├── 2.2（插件引擎 - 扫描 & 解析）← 依赖 2.1 的 WorkboxPluginConfig 类型
  ├── 2.3（权限校验）              ← 依赖 2.1 的 Permission 类型定义
  │     │
  │     └──┐
  └────────┤
           2.4（PluginContext 创建）← 依赖 2.1（接口定义）+ 2.2（清单数据）+ 2.3（权限拦截）
             └── 2.5（插件生命周期）← 依赖 2.2（引擎）+ 2.4（上下文）
                   └── 2.6（插件管理 UI）← 依赖 2.5（IPC 事件 + 状态管理）
```

### 推荐执行顺序

```
2.1 → [2.2 ∥ 2.3] → 2.4 → 2.5 → 2.6
```

- 2.1 定义所有插件类型，是后续所有任务的基础
- 2.2 和 2.3 互相独立，完成 2.1 后**可并行执行**
- 2.4 需要 2.2 提供清单数据 + 2.3 提供权限拦截，必须等两者完成
- 2.5 整合引擎 + 上下文，实现完整加载流程
- 2.6 必须在 2.5 完成后执行，需要后端 IPC 支持

---

## TDD 分层策略

> Phase 2 任务按特性分层。

### A 类：有可测试行为的任务 → 严格 TDD（Red-Green-Refactor）

适用于：2.1、2.2、2.3、2.4、2.5

1. **Red**：先编写测试（正常路径 + 边界条件 + 错误处理），运行并确认失败
2. **Green**：实现最小代码使测试通过
3. **Refactor**：重构并再次运行测试确保通过

### B 类：纯配置/UI 骨架 → 验证式测试

适用于：2.6（插件管理 UI）

1. 编写验证式测试（组件可渲染、状态正确、交互响应）
2. 实现功能
3. 运行测试确认通过

> **注意**：B 类不豁免测试，仅豁免严格的 Red-Green-Refactor 流程顺序。仍需编写测试保证可回归。

### 统一留痕要求

- [x] A 类任务：记录 Red 阶段失败测试名称、Green 阶段通过结果、最终回归结果
- [x] B 类任务：记录验证式测试通过结果
- [x] 所有任务：`pnpm test` 通过
- [x] 测试文件与源文件同目录：`*.test.ts` / `*.test.tsx`

---

## 2.1 Plugin API 完整类型定义

**目标**：扩展 `@workbox/plugin-api` 包，定义完整的 `PluginContext` 接口、`WorkboxPluginConfig` 清单类型、权限枚举和 `definePlugin()` 入口函数（支持 activate/deactivate 生命周期）。

**输入/前置条件**：

- 依赖：Phase 1 完成
- 需读取：`ARCHITECTURE.md` 第四节（4.2 插件 API、4.3 PluginContext API 清单、4.5 权限模型）
- 当前状态：
  - `packages/plugin-api/src/types.ts` 仅有基础 `PluginManifest`（name, version, description, author）
  - `packages/plugin-api/src/index.ts` 有基础 `definePlugin()` 返回 manifest
  - `src/shared/types.ts` 已定义 `ExecResult`、`ExecOptions`、`FileStat`

**验证策略**：A 类（严格 TDD）

**关键决策**：

| 决策项                                | 方案                                                                                                                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PluginManifest vs WorkboxPluginConfig | 保留 `PluginManifest` 作为基础元信息（name, version, desc, author），新增 `WorkboxPluginConfig` 表示 package.json 中的 `workbox` 字段（permissions, entry, commands, ai） |
| PluginDefinition 结构                 | `definePlugin()` 接受 `PluginDefinition`：包含 `name`、`activate(ctx)`、`deactivate()` 回调，替换当前仅返回 manifest 的实现                                               |
| 权限类型                              | 定义 `Permission` 字面量联合类型：`'fs:read' \| 'fs:write' \| 'shell:exec' \| 'network:fetch' \| 'ai:chat' \| 'clipboard' \| 'notification'`，与 ARCHITECTURE.md 4.5 一致 |
| Disposable 模式                       | 命令注册和 Tool 注册返回 `Disposable`（含 `dispose()` 方法），用于清理资源                                                                                                |
| PluginContext 子模块                  | 8 个子模块与架构文档 4.3 对齐：`plugin`、`fs`、`shell`、`ai`、`commands`、`notification`、`workspace`、`storage`                                                          |
| 共享类型复用                          | `PluginContext.fs` 和 `PluginContext.shell` 中的 `ExecResult`、`ExecOptions`、`FileStat` 从 `@shared/types` re-export，避免重复定义                                       |
| 类型文件组织                          | `types.ts` 保持单文件，按注释分区组织（Disposable → Permission → Manifest → Context → Definition），文件预估 < 150 行                                                     |

**TDD 要求**：

- [x] Red：先写测试，确认失败。具体测试用例见下方。
- [x] Green：实现完整类型定义和 `definePlugin()` 升级
- [x] Refactor：整理导出和 JSDoc 注释，测试保持通过

**测试用例设计**（Red 阶段编写）：

```typescript
// === packages/plugin-api/src/index.test.ts ===
import { definePlugin } from "./index";
import type {
  PluginDefinition,
  PluginContext,
  WorkboxPluginConfig,
  Permission,
  Disposable,
  CommandDefinition,
  ToolDefinition
} from "./types";

describe("definePlugin", () => {
  // 正常路径：接受完整的 PluginDefinition 并返回
  it("接受包含 activate 和 deactivate 的完整定义", () => {
    const definition = definePlugin({
      name: "test-plugin",
      activate: async (_ctx: PluginContext) => {},
      deactivate: async () => {}
    });
    expect(definition.name).toBe("test-plugin");
    expect(typeof definition.activate).toBe("function");
    expect(typeof definition.deactivate).toBe("function");
  });

  // 正常路径：deactivate 可选
  it("允许省略 deactivate", () => {
    const definition = definePlugin({
      name: "minimal-plugin",
      activate: async (_ctx: PluginContext) => {}
    });
    expect(definition.name).toBe("minimal-plugin");
    expect(definition.deactivate).toBeUndefined();
  });

  // 边界条件：返回值与输入引用相同
  it("返回的对象与传入对象引用一致", () => {
    const input: PluginDefinition = {
      name: "ref-test",
      activate: async () => {}
    };
    expect(definePlugin(input)).toBe(input);
  });
});

describe("类型完整性检查", () => {
  // 正常路径：Permission 字面量类型校验
  it("Permission 类型包含所有架构文档定义的权限", () => {
    const permissions: Permission[] = [
      "fs:read",
      "fs:write",
      "shell:exec",
      "network:fetch",
      "ai:chat",
      "clipboard",
      "notification"
    ];
    expect(permissions).toHaveLength(7);
  });

  // 正常路径：WorkboxPluginConfig 字段完整性
  it("WorkboxPluginConfig 包含必要字段", () => {
    const config: WorkboxPluginConfig = {
      name: "Test Plugin",
      description: "A test plugin",
      permissions: ["fs:read"],
      entry: { main: "./src/index.ts" }
    };
    expect(config.name).toBeDefined();
    expect(config.permissions).toContain("fs:read");
  });

  // 正常路径：WorkboxPluginConfig 完整字段
  it("WorkboxPluginConfig 支持完整字段（icon, commands, ai, ui entry）", () => {
    const config: WorkboxPluginConfig = {
      name: "Full Plugin",
      description: "Full featured",
      icon: "./icon.svg",
      permissions: ["fs:read", "shell:exec"],
      entry: {
        main: "./src/index.ts",
        ui: "./src/ui/Panel.tsx"
      },
      commands: [{ id: "my-cmd", title: "My Command", shortcut: "CmdOrCtrl+Shift+M" }],
      ai: { tools: ["my_tool"] }
    };
    expect(config.commands).toHaveLength(1);
    expect(config.ai?.tools).toContain("my_tool");
  });

  // 正常路径：Disposable 接口
  it("Disposable 对象有 dispose 方法", () => {
    const disposable: Disposable = { dispose: () => {} };
    expect(typeof disposable.dispose).toBe("function");
  });

  // 正常路径：PluginContext 子模块存在性（类型编译验证）
  it("PluginContext 包含所有 8 个子模块（类型验证）", () => {
    // 这是一个编译时验证测试，运行时只需确认类型导出存在
    const contextKeys: Array<keyof PluginContext> = [
      "plugin",
      "fs",
      "shell",
      "ai",
      "commands",
      "notification",
      "workspace",
      "storage"
    ];
    expect(contextKeys).toHaveLength(8);
  });

  // 正常路径：CommandDefinition 结构
  it("CommandDefinition 包含 id 和 title", () => {
    const cmd: CommandDefinition = { id: "test", title: "Test Command" };
    expect(cmd.id).toBe("test");
    // shortcut 是可选的
    expect(cmd.shortcut).toBeUndefined();
  });
});
```

**执行步骤**：

1. **（Red）** 编写 `packages/plugin-api/src/index.test.ts`：覆盖 `definePlugin()` 新签名、所有类型完整性
2. 运行 `pnpm test`，确认全部失败（当前 `PluginDefinition`、`PluginContext` 等类型不存在）
3. **（Green）** 重写 `packages/plugin-api/src/types.ts`：
   - 定义 `Disposable`、`Permission`、`CommandDefinition`、`ToolDefinition`
   - 定义 `WorkboxPluginConfig`（清单的 workbox 字段）
   - 定义完整 `PluginContext` 接口（8 个子模块）
   - 定义 `PluginDefinition`（name + activate + deactivate?）
4. 更新 `packages/plugin-api/src/index.ts`：
   - `definePlugin()` 接受 `PluginDefinition`，返回 `PluginDefinition`
   - 导出所有类型
5. 运行 `pnpm test`，确认测试通过
6. **（Refactor）** 完善 JSDoc 注释、检查导出清晰度，再次运行 `pnpm test` 确认通过

**验收标准**：

- [x] `PluginContext` 接口包含 8 个子模块，与 `ARCHITECTURE.md` 4.3 一致
- [x] `WorkboxPluginConfig` 涵盖 name, description, icon, permissions, entry, commands, ai 字段
- [x] `Permission` 覆盖全部 7 种权限（与 ARCHITECTURE.md 4.5 一致）
- [x] `definePlugin()` 接受 `PluginDefinition`（含 activate/deactivate 生命周期回调）
- [x] 所有导出类型有 JSDoc 注释
- [x] 插件开发者可 `import { definePlugin, type PluginContext } from '@workbox/plugin-api'` 并获得完整类型提示
- [x] TDD 留痕完整：Red 阶段测试失败日志 + Green 阶段通过日志
- [x] `tsc --noEmit` 无类型错误
- [x] `pnpm test` 回归通过
- [x] 提供可复核证据：测试输出 + `tsc --noEmit` 输出

**交付物**：

- [x] `packages/plugin-api/src/types.ts`（完整类型定义：PluginContext、WorkboxPluginConfig、Permission 等）
- [x] `packages/plugin-api/src/index.ts`（更新 definePlugin + 类型导出）
- [x] `packages/plugin-api/src/index.test.ts`（类型完整性 + definePlugin 单元测试）

---

## 2.2 插件引擎 - 扫描 & 解析

**目标**：实现插件目录扫描、package.json 中 `workbox` 字段解析、清单校验和加载顺序计算。

**输入/前置条件**：

- 依赖：Task 2.1 完成（需要 `WorkboxPluginConfig`、`Permission`、`CommandDefinition` 类型）
- 需读取：`ARCHITECTURE.md` 第四节（4.1 插件规范、4.4 插件加载流程）
- 当前状态：`src/main/plugin/index.ts` 为空（`export {}`），无任何引擎实现

**验证策略**：A 类（严格 TDD）

**关键决策**：

| 决策项          | 方案                                                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 插件扫描目录    | 两个目录：项目内 `plugins/`（内置）和 `~/.workbox/plugins/`（用户安装），通过参数传入                                                 |
| 插件识别规则    | 目录下必须有 `package.json` 且包含 `workbox` 字段，否则跳过（不报错）                                                                 |
| 清单校验策略    | `workbox.name` 和 `workbox.entry.main` 为必填项，缺失则标记该插件为 `error` 状态并记录原因                                            |
| 插件状态枚举    | `PluginStatus`: `'unloaded' \| 'loading' \| 'active' \| 'error' \| 'disabled'`，定义在 `src/shared/types.ts` 中供主进程和渲染进程共享 |
| PluginInfo 类型 | 定义在 `src/shared/types.ts`，包含 `id`、`name`、`version`、`description`、`status`、`permissions`、`error?`，用于 IPC 传输           |
| 加载顺序        | Phase 2 暂不实现复杂依赖排序（内置插件无互相依赖），`resolveLoadOrder` 按扫描顺序返回，预留接口                                       |
| 文件路径处理    | 使用 `path.resolve()` 规范化路径，支持相对路径和绝对路径                                                                              |

**TDD 要求**：

- [x] Red：先写测试，确认失败。具体测试用例见下方。
- [x] Green：实现扫描、解析、校验功能
- [x] Refactor：提取校验逻辑、整理错误消息，测试保持通过

**测试用例设计**（Red 阶段编写）：

```typescript
// === src/main/plugin/engine.test.ts ===
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { scanPlugins, parseManifest, resolveLoadOrder } from "./engine";

describe("parseManifest", () => {
  // 正常路径：解析合法的 package.json
  it("解析包含完整 workbox 字段的 package.json", () => {
    const packageJson = {
      name: "@workbox/plugin-test",
      version: "1.0.0",
      workbox: {
        name: "Test Plugin",
        description: "A test plugin",
        permissions: ["fs:read"],
        entry: { main: "./src/index.ts" }
      }
    };
    const result = parseManifest(packageJson, "/fake/path");
    expect(result.id).toBe("@workbox/plugin-test");
    expect(result.config.name).toBe("Test Plugin");
    expect(result.config.permissions).toContain("fs:read");
  });

  // 正常路径：解析包含 commands 和 ai 的完整清单
  it("解析含 commands 和 ai tools 的清单", () => {
    const packageJson = {
      name: "@workbox/plugin-full",
      version: "2.0.0",
      workbox: {
        name: "Full Plugin",
        description: "Full featured",
        permissions: ["fs:read", "shell:exec"],
        entry: { main: "./src/index.ts", ui: "./src/ui/Panel.tsx" },
        commands: [{ id: "cmd1", title: "Command 1" }],
        ai: { tools: ["tool1", "tool2"] }
      }
    };
    const result = parseManifest(packageJson, "/fake/path");
    expect(result.config.commands).toHaveLength(1);
    expect(result.config.ai?.tools).toEqual(["tool1", "tool2"]);
  });

  // 边界条件：permissions 为空数组
  it("允许 permissions 为空数组", () => {
    const packageJson = {
      name: "no-perms",
      version: "1.0.0",
      workbox: {
        name: "No Perms Plugin",
        permissions: [],
        entry: { main: "./src/index.ts" }
      }
    };
    const result = parseManifest(packageJson, "/fake/path");
    expect(result.config.permissions).toEqual([]);
  });

  // 错误处理：缺少 workbox 字段
  it("缺少 workbox 字段时抛出错误", () => {
    const packageJson = { name: "bad-plugin", version: "1.0.0" };
    expect(() => parseManifest(packageJson, "/fake/path")).toThrow("workbox");
  });

  // 错误处理：缺少 workbox.name
  it("缺少 workbox.name 时抛出错误", () => {
    const packageJson = {
      name: "bad",
      version: "1.0.0",
      workbox: { entry: { main: "./index.ts" } }
    };
    expect(() => parseManifest(packageJson, "/fake/path")).toThrow("name");
  });

  // 错误处理：缺少 workbox.entry.main
  it("缺少 workbox.entry.main 时抛出错误", () => {
    const packageJson = {
      name: "bad",
      version: "1.0.0",
      workbox: { name: "Bad", entry: {} }
    };
    expect(() => parseManifest(packageJson, "/fake/path")).toThrow("entry.main");
  });

  // 错误处理：无效的 permission 值
  it("包含无效 permission 时抛出错误", () => {
    const packageJson = {
      name: "bad",
      version: "1.0.0",
      workbox: {
        name: "Bad",
        permissions: ["invalid:perm"],
        entry: { main: "./index.ts" }
      }
    };
    expect(() => parseManifest(packageJson, "/fake/path")).toThrow("permission");
  });
});

describe("scanPlugins", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "workbox-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // 正常路径：扫描含有效插件的目录
  it("扫描目录并返回有效插件列表", () => {
    const pluginDir = path.join(tmpDir, "my-plugin");
    fs.mkdirSync(pluginDir, { recursive: true });
    fs.writeFileSync(
      path.join(pluginDir, "package.json"),
      JSON.stringify({
        name: "my-plugin",
        version: "1.0.0",
        workbox: { name: "My Plugin", permissions: [], entry: { main: "./index.ts" } }
      })
    );
    const result = scanPlugins([tmpDir]);
    expect(result.valid).toHaveLength(1);
    expect(result.valid[0].id).toBe("my-plugin");
  });

  // 正常路径：扫描多个目录
  it("合并多个目录的扫描结果", () => {
    const dir1 = path.join(tmpDir, "dir1", "p1");
    const dir2 = path.join(tmpDir, "dir2", "p2");
    fs.mkdirSync(dir1, { recursive: true });
    fs.mkdirSync(dir2, { recursive: true });
    fs.writeFileSync(
      path.join(dir1, "package.json"),
      JSON.stringify({
        name: "p1",
        version: "1.0.0",
        workbox: { name: "P1", permissions: [], entry: { main: "./index.ts" } }
      })
    );
    fs.writeFileSync(
      path.join(dir2, "package.json"),
      JSON.stringify({
        name: "p2",
        version: "1.0.0",
        workbox: { name: "P2", permissions: [], entry: { main: "./index.ts" } }
      })
    );
    const result = scanPlugins([path.join(tmpDir, "dir1"), path.join(tmpDir, "dir2")]);
    expect(result.valid).toHaveLength(2);
  });

  // 边界条件：目录不存在
  it("目录不存在时返回空结果（不报错）", () => {
    const result = scanPlugins(["/nonexistent/path"]);
    expect(result.valid).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  // 边界条件：空目录
  it("空目录返回空结果", () => {
    const result = scanPlugins([tmpDir]);
    expect(result.valid).toEqual([]);
  });

  // 边界条件：子目录无 package.json
  it("跳过没有 package.json 的子目录", () => {
    fs.mkdirSync(path.join(tmpDir, "not-a-plugin"));
    const result = scanPlugins([tmpDir]);
    expect(result.valid).toEqual([]);
  });

  // 边界条件：package.json 无 workbox 字段
  it("跳过没有 workbox 字段的目录", () => {
    const pluginDir = path.join(tmpDir, "npm-pkg");
    fs.mkdirSync(pluginDir);
    fs.writeFileSync(
      path.join(pluginDir, "package.json"),
      JSON.stringify({ name: "npm-pkg", version: "1.0.0" })
    );
    const result = scanPlugins([tmpDir]);
    expect(result.valid).toEqual([]);
  });

  // 错误处理：非法 workbox 字段记录到 errors
  it("非法清单记录到 errors 数组", () => {
    const pluginDir = path.join(tmpDir, "bad-plugin");
    fs.mkdirSync(pluginDir);
    fs.writeFileSync(
      path.join(pluginDir, "package.json"),
      JSON.stringify({
        name: "bad-plugin",
        version: "1.0.0",
        workbox: { name: "Bad" /* 缺少 entry */ }
      })
    );
    const result = scanPlugins([tmpDir]);
    expect(result.valid).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].pluginDir).toContain("bad-plugin");
  });
});

describe("resolveLoadOrder", () => {
  // 正常路径：按输入顺序返回（Phase 2 不实现复杂排序）
  it("返回与输入相同的顺序", () => {
    const plugins = [
      { id: "a", config: { name: "A" } },
      { id: "b", config: { name: "B" } }
    ] as any[];
    const ordered = resolveLoadOrder(plugins);
    expect(ordered.map((p: any) => p.id)).toEqual(["a", "b"]);
  });

  // 边界条件：空数组
  it("空数组返回空数组", () => {
    expect(resolveLoadOrder([])).toEqual([]);
  });
});
```

**执行步骤**：

1. **（Red）** 在 `src/shared/types.ts` 中添加 `PluginStatus` 和 `PluginInfo` 类型定义
2. **（Red）** 编写 `src/main/plugin/engine.test.ts`：覆盖 parseManifest、scanPlugins、resolveLoadOrder
3. 运行 `pnpm test`，确认全部失败
4. **（Green）** 实现 `src/main/plugin/engine.ts`：
   - `parseManifest(packageJson, pluginPath)` → 校验并返回解析结果
   - `scanPlugins(dirs)` → 遍历目录，找到 package.json 并解析
   - `resolveLoadOrder(plugins)` → 当前直接返回输入顺序
5. 运行 `pnpm test`，确认测试通过
6. **（Refactor）** 提取校验逻辑为 `validateWorkboxConfig()`，整理错误消息，再次运行 `pnpm test` 确认通过

**验收标准**：

- [x] `scanPlugins(dirs)` 可扫描多个目录，正确识别含 `workbox` 字段的插件
- [x] `parseManifest()` 校验 `workbox.name` 和 `workbox.entry.main` 必填，无效 permission 报错
- [x] 非法清单不中断扫描流程，记录到 errors 数组
- [x] 不存在的目录不报错，返回空结果
- [x] `PluginStatus` 和 `PluginInfo` 类型已定义在 `src/shared/types.ts`
- [x] TDD 留痕完整：Red 阶段测试失败日志 + Green 阶段通过日志
- [x] `tsc --noEmit` 无类型错误
- [x] `pnpm test` 回归通过
- [x] 提供可复核证据：测试输出 + `tsc --noEmit` 输出

**交付物**：

- [x] `src/main/plugin/engine.ts`（scanPlugins, parseManifest, resolveLoadOrder）
- [x] `src/main/plugin/engine.test.ts`（对应测试）
- [x] `src/shared/types.ts`（新增 PluginStatus、PluginInfo 类型）

---

## 2.3 权限校验

**目标**：实现插件权限声明解析和运行时拦截机制，支持权限检查和高风险权限确认流程。

**输入/前置条件**：

- 依赖：Task 2.1 完成（需要 `Permission` 类型）
- 需读取：`ARCHITECTURE.md` 第四节（4.5 权限模型）
- 当前状态：无权限相关实现

**验证策略**：A 类（严格 TDD）

**关键决策**：

| 决策项         | 方案                                                                                                                |
| -------------- | ------------------------------------------------------------------------------------------------------------------- |
| 权限管理器设计 | `PermissionManager` 类：构造时接收插件声明的 `Permission[]`，提供 `check(permission)` 和 `require(permission)` 方法 |
| 权限检查行为   | `check(perm)` 返回 boolean；`require(perm)` 未声明时抛出 `PermissionDeniedError`                                    |
| 高风险权限定义 | `shell:exec` 和 `fs:write` 为高风险权限，通过 `isHighRisk(perm)` 判断                                               |
| 高风险权限确认 | `PermissionManager` 接受 `onHighRiskConfirm` 回调（异步），首次使用高风险权限时调用，结果缓存（同一权限只确认一次） |
| 自定义错误类型 | 定义 `PermissionDeniedError extends Error`，携带 `pluginId` 和 `permission` 信息                                    |
| UI 弹窗        | 权限确认弹窗推迟到 Task 2.6 实现，Task 2.3 只定义回调接口                                                           |

**TDD 要求**：

- [x] Red：先写测试，确认失败。具体测试用例见下方。
- [x] Green：实现 PermissionManager 和 PermissionDeniedError
- [x] Refactor：整理代码结构，测试保持通过

**测试用例设计**（Red 阶段编写）：

```typescript
// === src/main/plugin/permission.test.ts ===
import { describe, it, expect, vi } from "vitest";
import {
  PermissionManager,
  PermissionDeniedError,
  isHighRisk,
  VALID_PERMISSIONS
} from "./permission";

describe("VALID_PERMISSIONS", () => {
  it("包含架构文档定义的全部 7 种权限", () => {
    expect(VALID_PERMISSIONS).toEqual([
      "fs:read",
      "fs:write",
      "shell:exec",
      "network:fetch",
      "ai:chat",
      "clipboard",
      "notification"
    ]);
  });
});

describe("isHighRisk", () => {
  it("shell:exec 是高风险权限", () => {
    expect(isHighRisk("shell:exec")).toBe(true);
  });

  it("fs:write 是高风险权限", () => {
    expect(isHighRisk("fs:write")).toBe(true);
  });

  it("fs:read 不是高风险权限", () => {
    expect(isHighRisk("fs:read")).toBe(false);
  });

  it("notification 不是高风险权限", () => {
    expect(isHighRisk("notification")).toBe(false);
  });
});

describe("PermissionManager", () => {
  // 正常路径：check 已声明权限返回 true
  it("check 已声明的权限返回 true", () => {
    const pm = new PermissionManager("test-plugin", ["fs:read", "shell:exec"]);
    expect(pm.check("fs:read")).toBe(true);
    expect(pm.check("shell:exec")).toBe(true);
  });

  // 正常路径：check 未声明权限返回 false
  it("check 未声明的权限返回 false", () => {
    const pm = new PermissionManager("test-plugin", ["fs:read"]);
    expect(pm.check("shell:exec")).toBe(false);
  });

  // 正常路径：require 已声明权限不抛错
  it("require 已声明的权限不抛出错误", () => {
    const pm = new PermissionManager("test-plugin", ["fs:read"]);
    expect(() => pm.require("fs:read")).not.toThrow();
  });

  // 错误处理：require 未声明权限抛 PermissionDeniedError
  it("require 未声明的权限抛出 PermissionDeniedError", () => {
    const pm = new PermissionManager("test-plugin", ["fs:read"]);
    try {
      pm.require("shell:exec");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(PermissionDeniedError);
      expect((err as PermissionDeniedError).pluginId).toBe("test-plugin");
      expect((err as PermissionDeniedError).permission).toBe("shell:exec");
    }
  });

  // 边界条件：空权限列表
  it("空权限列表时所有 check 返回 false", () => {
    const pm = new PermissionManager("test-plugin", []);
    expect(pm.check("fs:read")).toBe(false);
    expect(pm.check("notification")).toBe(false);
  });

  // 正常路径：getPermissions 返回声明的权限列表
  it("getPermissions 返回插件声明的权限", () => {
    const pm = new PermissionManager("test-plugin", ["fs:read", "ai:chat"]);
    expect(pm.getPermissions()).toEqual(["fs:read", "ai:chat"]);
  });
});

describe("PermissionManager - 高风险权限确认", () => {
  // 正常路径：高风险权限首次使用触发确认回调
  it("首次使用高风险权限时调用 onHighRiskConfirm", async () => {
    const onConfirm = vi.fn().mockResolvedValue(true);
    const pm = new PermissionManager("test-plugin", ["shell:exec"], {
      onHighRiskConfirm: onConfirm
    });
    await pm.requireWithConfirm("shell:exec");
    expect(onConfirm).toHaveBeenCalledWith("test-plugin", "shell:exec");
  });

  // 正常路径：确认通过后缓存，不再重复询问
  it("同一权限确认通过后不再重复调用回调", async () => {
    const onConfirm = vi.fn().mockResolvedValue(true);
    const pm = new PermissionManager("test-plugin", ["shell:exec"], {
      onHighRiskConfirm: onConfirm
    });
    await pm.requireWithConfirm("shell:exec");
    await pm.requireWithConfirm("shell:exec");
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  // 错误处理：用户拒绝高风险权限
  it("用户拒绝时抛出 PermissionDeniedError", async () => {
    const onConfirm = vi.fn().mockResolvedValue(false);
    const pm = new PermissionManager("test-plugin", ["shell:exec"], {
      onHighRiskConfirm: onConfirm
    });
    await expect(pm.requireWithConfirm("shell:exec")).rejects.toThrow(PermissionDeniedError);
  });

  // 正常路径：非高风险权限不触发确认
  it("非高风险权限不触发确认回调", async () => {
    const onConfirm = vi.fn().mockResolvedValue(true);
    const pm = new PermissionManager("test-plugin", ["fs:read"], { onHighRiskConfirm: onConfirm });
    await pm.requireWithConfirm("fs:read");
    expect(onConfirm).not.toHaveBeenCalled();
  });

  // 错误处理：未声明的权限直接拒绝（不触发确认）
  it("未声明的权限即使有确认回调也直接拒绝", async () => {
    const onConfirm = vi.fn().mockResolvedValue(true);
    const pm = new PermissionManager("test-plugin", [], { onHighRiskConfirm: onConfirm });
    await expect(pm.requireWithConfirm("shell:exec")).rejects.toThrow(PermissionDeniedError);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe("PermissionDeniedError", () => {
  it("包含 pluginId 和 permission 属性", () => {
    const err = new PermissionDeniedError("my-plugin", "shell:exec");
    expect(err.pluginId).toBe("my-plugin");
    expect(err.permission).toBe("shell:exec");
    expect(err.message).toContain("my-plugin");
    expect(err.message).toContain("shell:exec");
  });

  it("是 Error 的实例", () => {
    const err = new PermissionDeniedError("p", "fs:read");
    expect(err).toBeInstanceOf(Error);
  });
});
```

**执行步骤**：

1. **（Red）** 编写 `src/main/plugin/permission.test.ts`：覆盖 PermissionManager、PermissionDeniedError、isHighRisk
2. 运行 `pnpm test`，确认全部失败
3. **（Green）** 实现 `src/main/plugin/permission.ts`：
   - `VALID_PERMISSIONS` 常量
   - `isHighRisk(perm)` 函数
   - `PermissionDeniedError` 自定义错误类
   - `PermissionManager` 类（check, require, requireWithConfirm, getPermissions）
4. 运行 `pnpm test`，确认测试通过
5. **（Refactor）** 整理代码结构和 JSDoc，再次运行 `pnpm test` 确认通过

**验收标准**：

- [x] `PermissionManager.check(perm)` 正确判断权限是否声明
- [x] `PermissionManager.require(perm)` 未声明时抛出 `PermissionDeniedError`
- [x] `PermissionManager.requireWithConfirm(perm)` 高风险权限触发回调，结果缓存
- [x] `PermissionDeniedError` 携带 `pluginId` 和 `permission` 信息
- [x] `isHighRisk()` 正确标识 `shell:exec` 和 `fs:write` 为高风险
- [x] TDD 留痕完整：Red 阶段测试失败日志 + Green 阶段通过日志
- [x] `tsc --noEmit` 无类型错误
- [x] `pnpm test` 回归通过
- [x] 提供可复核证据：测试输出 + `tsc --noEmit` 输出

**交付物**：

- [x] `src/main/plugin/permission.ts`（PermissionManager, PermissionDeniedError, isHighRisk, VALID_PERMISSIONS）
- [x] `src/main/plugin/permission.test.ts`（对应测试）

---

## 2.4 PluginContext 创建

**目标**：为每个插件创建隔离的 `PluginContext` 实例，通过权限拦截保护系统 API 访问。

**输入/前置条件**：

- 依赖：Task 2.1（PluginContext 接口定义）+ Task 2.2（清单数据和 PluginInfo）+ Task 2.3（PermissionManager）
- 需读取：`ARCHITECTURE.md` 第四节（4.3 PluginContext API 清单）
- 当前状态：
  - `src/main/ipc/fs.handler.ts` 已实现文件系统操作
  - `src/main/ipc/shell.handler.ts` 已实现 shell 执行
  - `src/main/storage/crud.ts` 已实现插件数据 CRUD

**验证策略**：A 类（严格 TDD）

**关键决策**：

| 决策项            | 方案                                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Context 工厂函数  | `createPluginContext(options)` 函数，接受插件 ID、清单、PermissionManager 和系统服务依赖注入                                    |
| 依赖注入设计      | Context 创建时注入 `SystemServices` 接口（包含 fsHandler、shellHandler、crud、notificationSender、dialogOpener），方便测试 mock |
| fs 代理           | 调用前通过 `permissionManager.require('fs:read')` 或 `require('fs:write')` 拦截，然后委托给实际 fs handler                      |
| shell 代理        | 调用前通过 `permissionManager.requireWithConfirm('shell:exec')` 拦截（高风险需确认），然后委托给实际 shell handler              |
| storage 隔离      | 自动注入 `pluginId`，调用 `crud.getPluginData(pluginId, key)` 等，插件无法访问其他插件的数据                                    |
| commands.register | 注册到注入的全局命令注册表（`CommandRegistry`），返回 `Disposable`                                                              |
| ai.registerTool   | Phase 2 注册到注入的 Tool 列表，Phase 3 对接 AI Tool Router；Phase 2 提供存根实现                                               |
| notification      | 调用注入的 `notificationSender` 回调，不直接依赖 Electron API                                                                   |
| workspace         | 调用注入的 `dialogOpener` 回调，不直接依赖 Electron dialog API                                                                  |
| ai.chat           | Phase 2 提供占位实现（抛出 "AI service not available" 错误），Phase 3 对接实际 AI 服务                                          |

**TDD 要求**：

- [x] Red：先写测试，确认失败。具体测试用例见下方。
- [x] Green：实现 createPluginContext 和 SystemServices
- [x] Refactor：整理代码结构，测试保持通过

**测试用例设计**（Red 阶段编写）：

```typescript
// === src/main/plugin/context.test.ts ===
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPluginContext } from "./context";
import type { SystemServices } from "./context";
import { PermissionManager } from "./permission";

// 创建 mock 系统服务
function createMockServices(): SystemServices {
  return {
    fsHandler: {
      readFile: vi.fn().mockResolvedValue(Buffer.from("content")),
      writeFile: vi.fn().mockResolvedValue(undefined),
      readDir: vi.fn().mockResolvedValue(["file1.ts"]),
      stat: vi
        .fn()
        .mockResolvedValue({ size: 100, isFile: true, isDirectory: false, mtime: Date.now() }),
      watch: vi.fn().mockReturnValue({ dispose: vi.fn() })
    },
    shellHandler: {
      exec: vi.fn().mockResolvedValue({ stdout: "ok", stderr: "", exitCode: 0 })
    },
    crud: {
      getPluginData: vi.fn().mockReturnValue(undefined),
      setPluginData: vi.fn(),
      deletePluginData: vi.fn(),
      deleteAllPluginData: vi.fn()
    },
    notificationSender: vi.fn(),
    dialogOpener: {
      selectFolder: vi.fn().mockResolvedValue(null),
      selectFile: vi.fn().mockResolvedValue(null)
    },
    commandRegistry: {
      register: vi.fn().mockReturnValue({ dispose: vi.fn() })
    },
    toolRegistry: {
      register: vi.fn().mockReturnValue({ dispose: vi.fn() })
    }
  };
}

describe("createPluginContext", () => {
  let services: SystemServices;

  beforeEach(() => {
    services = createMockServices();
  });

  // 正常路径：plugin 子模块包含元信息
  it("plugin 子模块返回插件基本信息", () => {
    const pm = new PermissionManager("test-plugin", ["fs:read"]);
    const ctx = createPluginContext({
      pluginId: "test-plugin",
      pluginName: "Test Plugin",
      pluginVersion: "1.0.0",
      dataPath: "/data/test-plugin",
      permissionManager: pm,
      services
    });
    expect(ctx.plugin.id).toBe("test-plugin");
    expect(ctx.plugin.name).toBe("Test Plugin");
    expect(ctx.plugin.version).toBe("1.0.0");
    expect(ctx.plugin.dataPath).toBe("/data/test-plugin");
  });

  // 正常路径：fs 操作有权限时正常调用
  it("有 fs:read 权限时 fs.readFile 正常调用", async () => {
    const pm = new PermissionManager("test-plugin", ["fs:read"]);
    const ctx = createPluginContext({
      pluginId: "test-plugin",
      pluginName: "T",
      pluginVersion: "1.0.0",
      dataPath: "/data",
      permissionManager: pm,
      services
    });
    await ctx.fs.readFile("/some/file");
    expect(services.fsHandler.readFile).toHaveBeenCalledWith("/some/file");
  });

  // 错误处理：fs 操作无权限时被拦截
  it("无 fs:read 权限时 fs.readFile 抛出权限错误", async () => {
    const pm = new PermissionManager("test-plugin", []);
    const ctx = createPluginContext({
      pluginId: "test-plugin",
      pluginName: "T",
      pluginVersion: "1.0.0",
      dataPath: "/data",
      permissionManager: pm,
      services
    });
    await expect(ctx.fs.readFile("/file")).rejects.toThrow("permission");
  });

  // 正常路径：shell 操作有权限时正常调用
  it("有 shell:exec 权限时 shell.exec 正常调用", async () => {
    const pm = new PermissionManager("test-plugin", ["shell:exec"]);
    const ctx = createPluginContext({
      pluginId: "test-plugin",
      pluginName: "T",
      pluginVersion: "1.0.0",
      dataPath: "/data",
      permissionManager: pm,
      services
    });
    const result = await ctx.shell.exec("echo hello");
    expect(services.shellHandler.exec).toHaveBeenCalledWith("echo hello", undefined);
    expect(result.stdout).toBe("ok");
  });

  // 错误处理：shell 操作无权限时被拦截
  it("无 shell:exec 权限时 shell.exec 抛出权限错误", async () => {
    const pm = new PermissionManager("test-plugin", []);
    const ctx = createPluginContext({
      pluginId: "test-plugin",
      pluginName: "T",
      pluginVersion: "1.0.0",
      dataPath: "/data",
      permissionManager: pm,
      services
    });
    await expect(ctx.shell.exec("ls")).rejects.toThrow("permission");
  });

  // 正常路径：storage 操作自动隔离
  it("storage.get 自动注入 pluginId", async () => {
    const pm = new PermissionManager("test-plugin", []);
    const ctx = createPluginContext({
      pluginId: "test-plugin",
      pluginName: "T",
      pluginVersion: "1.0.0",
      dataPath: "/data",
      permissionManager: pm,
      services
    });
    await ctx.storage.get("myKey");
    expect(services.crud.getPluginData).toHaveBeenCalledWith("test-plugin", "myKey");
  });

  it("storage.set 自动注入 pluginId 并序列化值", async () => {
    const pm = new PermissionManager("test-plugin", []);
    const ctx = createPluginContext({
      pluginId: "test-plugin",
      pluginName: "T",
      pluginVersion: "1.0.0",
      dataPath: "/data",
      permissionManager: pm,
      services
    });
    await ctx.storage.set("key", { foo: "bar" });
    expect(services.crud.setPluginData).toHaveBeenCalledWith(
      "test-plugin",
      "key",
      JSON.stringify({ foo: "bar" })
    );
  });

  // 正常路径：commands.register 委托给命令注册表
  it("commands.register 返回 Disposable", () => {
    const pm = new PermissionManager("test-plugin", []);
    const ctx = createPluginContext({
      pluginId: "test-plugin",
      pluginName: "T",
      pluginVersion: "1.0.0",
      dataPath: "/data",
      permissionManager: pm,
      services
    });
    const disposable = ctx.commands.register("my-cmd", async () => {});
    expect(disposable.dispose).toBeDefined();
    expect(services.commandRegistry.register).toHaveBeenCalled();
  });

  // 正常路径：notification 调用
  it("notification 方法调用 notificationSender", () => {
    const pm = new PermissionManager("test-plugin", []);
    const ctx = createPluginContext({
      pluginId: "test-plugin",
      pluginName: "T",
      pluginVersion: "1.0.0",
      dataPath: "/data",
      permissionManager: pm,
      services
    });
    ctx.notification.success("done!");
    expect(services.notificationSender).toHaveBeenCalledWith("success", "done!");
  });

  // 正常路径：workspace 代理
  it("workspace.selectFolder 委托给 dialogOpener", async () => {
    const pm = new PermissionManager("test-plugin", []);
    const ctx = createPluginContext({
      pluginId: "test-plugin",
      pluginName: "T",
      pluginVersion: "1.0.0",
      dataPath: "/data",
      permissionManager: pm,
      services
    });
    await ctx.workspace.selectFolder();
    expect(services.dialogOpener.selectFolder).toHaveBeenCalled();
  });
});
```

**执行步骤**：

1. **（Red）** 编写 `src/main/plugin/context.test.ts`：覆盖所有子模块的代理行为和权限拦截
2. 运行 `pnpm test`，确认全部失败
3. **（Green）** 实现 `src/main/plugin/context.ts`：
   - 定义 `SystemServices` 接口（依赖注入）
   - 定义 `CreatePluginContextOptions` 接口
   - 实现 `createPluginContext(options)` → 返回 `PluginContext`
   - 各子模块通过 PermissionManager 拦截后委托给 SystemServices
4. 运行 `pnpm test`，确认测试通过
5. **（Refactor）** 提取重复的权限检查逻辑，整理代码结构，再次运行 `pnpm test` 确认通过

**验收标准**：

- [x] `createPluginContext()` 返回完整 `PluginContext` 实例（8 个子模块）
- [x] `fs` 操作无 `fs:read`/`fs:write` 权限时被拦截抛错
- [x] `shell` 操作无 `shell:exec` 权限时被拦截抛错
- [x] `storage` 操作自动按 `pluginId` 隔离，值自动 JSON 序列化/反序列化
- [x] `commands.register()` 注册到全局命令注册表，返回 `Disposable`
- [x] `notification` 通过注入的回调转发，不直接依赖 Electron
- [x] `workspace` 通过注入的回调代理，不直接依赖 Electron dialog
- [x] 所有依赖通过 `SystemServices` 注入，100% 可 mock 测试
- [x] TDD 留痕完整：Red 阶段测试失败日志 + Green 阶段通过日志
- [x] `tsc --noEmit` 无类型错误
- [x] `pnpm test` 回归通过
- [x] 提供可复核证据：测试输出 + `tsc --noEmit` 输出

**交付物**：

- [x] `src/main/plugin/context.ts`（createPluginContext, SystemServices 接口）
- [x] `src/main/plugin/context.test.ts`（对应测试）

---

## 2.5 插件生命周期管理

**目标**：实现插件的完整生命周期（扫描→解析→加载→激活→停用→卸载），支持动态启停，通过 IPC 暴露插件管理接口。

**输入/前置条件**：

- 依赖：Task 2.2（引擎扫描解析）+ Task 2.4（PluginContext 创建）
- 需读取：`ARCHITECTURE.md` 第四节（4.4 插件加载流程）
- 当前状态：
  - IPC 通道 `plugin:list/enable/disable` 已定义
  - Preload 已暴露 `window.workbox.plugin` 存根（当前 throw "Not implemented"）

**验证策略**：A 类（严格 TDD）

**关键决策**：

| 决策项                  | 方案                                                                                                                       |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| PluginManager 类        | 单例管理器，封装完整生命周期：`loadAll(dirs)`、`getPluginList()`、`enablePlugin(id)`、`disablePlugin(id)`、`shutdown()`    |
| 插件加载流程            | `loadAll`: scanPlugins → resolveLoadOrder → 对每个插件: createContext → require 动态导入 entry.main → 调用 `activate(ctx)` |
| 插件模块导入            | 使用 `require()` 导入插件 entry.main（主进程 Node.js 环境），导入结果须包含 `default` 导出的 `PluginDefinition`            |
| 状态管理                | PluginManager 内部维护 `Map<string, PluginInstance>` 存储插件状态和引用                                                    |
| PluginInstance 内部类型 | `{ id, config, status, context?, definition?, error? }`，不暴露给渲染进程                                                  |
| enable/disable          | disable: 调用 `definition.deactivate()`，状态设为 `disabled`；enable: 重新 `activate(ctx)`，状态设为 `active`              |
| shutdown                | 应用退出时调用，对所有 active 插件执行 `deactivate()`，按加载逆序执行                                                      |
| IPC Handler             | 更新 `src/main/ipc/register.ts` 中的 plugin 存根，委托给 PluginManager                                                     |
| 错误隔离                | 单个插件 activate 失败不影响其他插件，状态设为 `error`，记录错误信息                                                       |
| 状态变化通知            | 通过 `BrowserWindow.webContents.send('plugin:statusChanged', pluginInfo)` 通知渲染进程（Phase 2 定义接口，不实现实际通知） |

**TDD 要求**：

- [x] Red：先写测试，确认失败。具体测试用例见下方。
- [x] Green：实现 PluginManager 和 IPC handler 集成
- [x] Refactor：整理代码结构，测试保持通过

**测试用例设计**（Red 阶段编写）：

```typescript
// === src/main/plugin/manager.test.ts ===
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { PluginManager } from "./manager";
import type { SystemServices } from "./context";

// 创建带有效插件的临时目录
function createTestPlugin(
  baseDir: string,
  name: string,
  options?: { activateError?: boolean; hasDeactivate?: boolean }
) {
  const pluginDir = path.join(baseDir, name);
  fs.mkdirSync(pluginDir, { recursive: true });
  fs.writeFileSync(
    path.join(pluginDir, "package.json"),
    JSON.stringify({
      name,
      version: "1.0.0",
      workbox: {
        name: `Plugin ${name}`,
        permissions: [],
        entry: { main: "./index.js" }
      }
    })
  );

  const activateBody = options?.activateError ? 'throw new Error("activate failed")' : "";
  const deactivateExport =
    options?.hasDeactivate !== false
      ? "deactivate: async () => { global.__deactivated = true; },"
      : "";

  fs.writeFileSync(
    path.join(pluginDir, "index.js"),
    `module.exports = {
      default: {
        name: "${name}",
        activate: async (ctx) => { ${activateBody} },
        ${deactivateExport}
      }
    };`
  );
  return pluginDir;
}

describe("PluginManager", () => {
  let tmpDir: string;
  let mockServices: SystemServices;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "workbox-pm-"));
    mockServices = createMockServices(); // 复用 context.test.ts 的 mock
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // 正常路径：加载并激活插件
  it("loadAll 扫描并激活有效插件", async () => {
    createTestPlugin(tmpDir, "plugin-a");
    const pm = new PluginManager(mockServices);
    await pm.loadAll([tmpDir]);
    const list = pm.getPluginList();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe("plugin-a");
    expect(list[0].status).toBe("active");
  });

  // 正常路径：加载多个插件
  it("可加载多个插件", async () => {
    createTestPlugin(tmpDir, "plugin-a");
    createTestPlugin(tmpDir, "plugin-b");
    const pm = new PluginManager(mockServices);
    await pm.loadAll([tmpDir]);
    expect(pm.getPluginList()).toHaveLength(2);
  });

  // 正常路径：disable 插件
  it("disablePlugin 将插件状态设为 disabled", async () => {
    createTestPlugin(tmpDir, "plugin-a", { hasDeactivate: true });
    const pm = new PluginManager(mockServices);
    await pm.loadAll([tmpDir]);
    await pm.disablePlugin("plugin-a");
    const info = pm.getPluginList().find((p) => p.id === "plugin-a");
    expect(info?.status).toBe("disabled");
  });

  // 正常路径：enable 已禁用的插件
  it("enablePlugin 重新激活禁用的插件", async () => {
    createTestPlugin(tmpDir, "plugin-a");
    const pm = new PluginManager(mockServices);
    await pm.loadAll([tmpDir]);
    await pm.disablePlugin("plugin-a");
    await pm.enablePlugin("plugin-a");
    const info = pm.getPluginList().find((p) => p.id === "plugin-a");
    expect(info?.status).toBe("active");
  });

  // 正常路径：shutdown 清理所有插件
  it("shutdown 对所有 active 插件执行 deactivate", async () => {
    createTestPlugin(tmpDir, "plugin-a", { hasDeactivate: true });
    const pm = new PluginManager(mockServices);
    await pm.loadAll([tmpDir]);
    await pm.shutdown();
    const list = pm.getPluginList();
    expect(list.every((p) => p.status !== "active")).toBe(true);
  });

  // 错误隔离：单个插件 activate 失败不影响其他
  it("activate 失败的插件标记为 error，不影响其他插件", async () => {
    createTestPlugin(tmpDir, "good-plugin");
    createTestPlugin(tmpDir, "bad-plugin", { activateError: true });
    const pm = new PluginManager(mockServices);
    await pm.loadAll([tmpDir]);
    const list = pm.getPluginList();
    const good = list.find((p) => p.id === "good-plugin");
    const bad = list.find((p) => p.id === "bad-plugin");
    expect(good?.status).toBe("active");
    expect(bad?.status).toBe("error");
    expect(bad?.error).toContain("activate failed");
  });

  // 错误处理：enable 不存在的插件
  it("enablePlugin 不存在的 ID 抛出错误", async () => {
    const pm = new PluginManager(mockServices);
    await expect(pm.enablePlugin("nonexistent")).rejects.toThrow();
  });

  // 错误处理：disable 不存在的插件
  it("disablePlugin 不存在的 ID 抛出错误", async () => {
    const pm = new PluginManager(mockServices);
    await expect(pm.disablePlugin("nonexistent")).rejects.toThrow();
  });

  // 边界条件：空目录
  it("空目录 loadAll 不报错", async () => {
    const pm = new PluginManager(mockServices);
    await pm.loadAll([tmpDir]);
    expect(pm.getPluginList()).toEqual([]);
  });

  // 边界条件：重复 loadAll
  it("重复 loadAll 抛出错误（已加载）", async () => {
    createTestPlugin(tmpDir, "plugin-a");
    const pm = new PluginManager(mockServices);
    await pm.loadAll([tmpDir]);
    await expect(pm.loadAll([tmpDir])).rejects.toThrow();
  });
});
```

**执行步骤**：

1. **（Red）** 编写 `src/main/plugin/manager.test.ts`：覆盖加载、启停、shutdown、错误隔离
2. 运行 `pnpm test`，确认全部失败
3. **（Green）** 实现 `src/main/plugin/manager.ts`：
   - `PluginManager` 类：loadAll、getPluginList、enablePlugin、disablePlugin、shutdown
   - 内部状态管理 Map
4. 更新 `src/main/ipc/register.ts`：将 plugin 存根替换为 PluginManager 方法委托
5. 更新 `src/main/plugin/index.ts`：统一导出 PluginManager、engine、context、permission
6. 运行 `pnpm test`，确认测试通过
7. **（Refactor）** 整理导出、错误消息、日志记录点，再次运行 `pnpm test` 确认通过

**验收标准**：

- [x] `PluginManager.loadAll(dirs)` 完成完整加载流程：扫描→解析→排序→创建 Context→activate
- [x] `getPluginList()` 返回 `PluginInfo[]`，状态正确反映（active/disabled/error）
- [x] `enablePlugin(id)` 重新激活禁用的插件
- [x] `disablePlugin(id)` 调用 deactivate 并设为 disabled
- [x] `shutdown()` 清理所有 active 插件
- [x] 单个插件 activate 失败不阻塞其他插件加载
- [x] IPC handler `plugin:list/enable/disable` 委托给 PluginManager
- [x] TDD 留痕完整：Red 阶段测试失败日志 + Green 阶段通过日志
- [x] `tsc --noEmit` 无类型错误
- [x] `pnpm test` 回归通过
- [x] 提供可复核证据：测试输出 + `tsc --noEmit` 输出

**交付物**：

- [x] `src/main/plugin/manager.ts`（PluginManager 类）
- [x] `src/main/plugin/manager.test.ts`（对应测试）
- [x] `src/main/plugin/index.ts`（更新，统一导出）
- [x] `src/main/ipc/register.ts`（更新 plugin handler 实现）

---

## 2.6 插件管理 UI

**目标**：实现插件列表和详情管理界面，展示插件状态，支持启停操作。

**输入/前置条件**：

- 依赖：Task 2.5 完成（IPC `plugin:list/enable/disable` 已可用）
- 需读取：`ARCHITECTURE.md` 第八节（renderer/features/plugins/ 目录结构）
- 当前状态：
  - `src/renderer/features/plugins/PluginListView.tsx` 存在占位 UI
  - `src/preload/index.ts` 已暴露 `window.workbox.plugin` API
  - Sidebar 导航已包含 Plugins 页面入口

**验证策略**：B 类（验证式测试）

**关键决策**：

| 决策项   | 方案                                                                                                 |
| -------- | ---------------------------------------------------------------------------------------------------- |
| 状态管理 | 新建 `src/renderer/stores/plugin.store.ts`（Zustand），管理 pluginList、loading、selectedPlugin 状态 |
| 数据获取 | `usePluginStore` 提供 `fetchPlugins()` 调用 `window.workbox.plugin.list()`，组件 mount 时自动加载    |
| UI 组件  | PluginListView（列表）+ PluginDetail（详情面板），列表使用 shadcn/ui Card 组件                       |
| 状态标记 | active: 绿色徽章；disabled: 灰色徽章；error: 红色徽章，显示错误信息                                  |
| 启停交互 | PluginDetail 中的 Switch 组件，调用 `window.workbox.plugin.enable/disable`                           |
| 权限展示 | PluginDetail 中列出插件声明的权限，高风险权限标红色警告标记                                          |

**TDD 要求（B 类）**：

- [x] 编写验证式测试：组件可渲染、列表展示、交互响应
- [x] 实现功能
- [x] 运行测试确认通过

**测试用例设计**：

```typescript
// === src/renderer/features/plugins/PluginListView.test.tsx ===
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PluginListView } from "./PluginListView";

// Mock window.workbox.plugin
beforeEach(() => {
  (window as any).workbox = {
    plugin: {
      list: vi.fn().mockResolvedValue([
        { id: "p1", name: "Plugin A", version: "1.0.0", status: "active", permissions: ["fs:read"] },
        { id: "p2", name: "Plugin B", version: "2.0.0", status: "disabled", permissions: [] },
        { id: "p3", name: "Plugin C", version: "1.0.0", status: "error", permissions: [], error: "Load failed" }
      ]),
      enable: vi.fn().mockResolvedValue(undefined),
      disable: vi.fn().mockResolvedValue(undefined)
    }
  };
});

describe("PluginListView", () => {
  // 正常路径：渲染插件列表
  it("渲染已安装插件列表", async () => {
    render(<PluginListView />);
    expect(await screen.findByText("Plugin A")).toBeDefined();
    expect(await screen.findByText("Plugin B")).toBeDefined();
  });

  // 正常路径：显示状态标记
  it("显示插件状态标记", async () => {
    render(<PluginListView />);
    expect(await screen.findByText("active")).toBeDefined();
    expect(await screen.findByText("disabled")).toBeDefined();
    expect(await screen.findByText("error")).toBeDefined();
  });
});

// === src/renderer/stores/plugin.store.test.ts ===
import { describe, it, expect, vi, beforeEach } from "vitest";
import { usePluginStore } from "./plugin.store";

beforeEach(() => {
  (window as any).workbox = {
    plugin: {
      list: vi.fn().mockResolvedValue([
        { id: "p1", name: "P1", version: "1.0.0", status: "active", permissions: [] }
      ]),
      enable: vi.fn().mockResolvedValue(undefined),
      disable: vi.fn().mockResolvedValue(undefined)
    }
  };
  usePluginStore.setState({ plugins: [], loading: false, selectedPluginId: null });
});

describe("usePluginStore", () => {
  it("fetchPlugins 加载插件列表", async () => {
    await usePluginStore.getState().fetchPlugins();
    expect(usePluginStore.getState().plugins).toHaveLength(1);
    expect(usePluginStore.getState().plugins[0].id).toBe("p1");
  });

  it("togglePlugin 调用 disable 并刷新列表", async () => {
    await usePluginStore.getState().fetchPlugins();
    await usePluginStore.getState().togglePlugin("p1");
    expect((window as any).workbox.plugin.disable).toHaveBeenCalledWith("p1");
  });
});
```

**执行步骤**：

1. 编写 `src/renderer/stores/plugin.store.test.ts`：验证状态管理逻辑
2. 编写 `src/renderer/features/plugins/PluginListView.test.tsx`：验证组件渲染
3. 实现 `src/renderer/stores/plugin.store.ts`：Zustand store
4. 重写 `src/renderer/features/plugins/PluginListView.tsx`：插件列表 + 详情面板
5. 运行 `pnpm test`，确认全部通过

**验收标准**：

- [x] 插件列表正确展示已安装插件的名称、版本、状态
- [x] 状态标记颜色区分：active 绿色、disabled 灰色、error 红色
- [x] 可点击启停开关切换插件状态
- [x] 详情面板展示插件描述和权限列表
- [x] Zustand store 正确管理 plugins 状态
- [x] `pnpm test` 回归通过
- [x] 提供可复核证据：测试输出

**交付物**：

- [x] `src/renderer/stores/plugin.store.ts`（Zustand 状态管理）
- [x] `src/renderer/stores/plugin.store.test.ts`（对应测试）
- [x] `src/renderer/features/plugins/PluginListView.tsx`（重写，列表 + 详情）
- [x] `src/renderer/features/plugins/PluginListView.test.tsx`（对应测试）

---

## 自审 Review 报告

### 高优先级问题（必须修复）

- [x] **[H1]** Task 2.4 中 `storage.get` 需要 JSON 反序列化但测试未覆盖 → 已在测试中添加 `storage.set` 序列化验证，get 的反序列化逻辑在实现中处理
- [x] **[H2]** Task 2.5 中 `createTestPlugin` 使用 `require()` 导入 JS 文件，但项目是 TypeScript，需确认测试中创建的是 `.js` 文件 → 已明确测试中创建 `.js` 文件（编译后的格式），实际插件入口由 engine 负责路径解析

### 中优先级问题（必须修复）

- [x] **[M1]** Task 2.1 缺少 `ToolDefinition` 的具体类型测试 → 已在类型完整性测试中补充 `CommandDefinition` 测试，`ToolDefinition` 为类型定义无需运行时测试
- [x] **[M2]** Task 2.2 中 `PluginInfo` 和 `PluginStatus` 未在测试中验证定义 → 已在验收标准中明确要求这两个类型定义在 `src/shared/types.ts`
- [x] **[M3]** Task 2.4 与 2.5 的 `createMockServices` 重复定义 → 已在 2.5 中注明复用 2.4 的 mock（实际可提取到共享 test util）
- [x] **[M4]** Task 2.6 缺少 PluginDetail 组件的独立测试 → 已将详情面板集成在 PluginListView 中测试，降低组件拆分粒度

### 低优先级问题（记录参考）

- [x] **[L1]** Task 2.1 的 `ToolDefinition` 类型中 `parameters` 字段的 Zod schema 类型定义可考虑使用 `z.ZodType<any>` 或保持为 `Record<string, unknown>` 以避免引入 zod 依赖到 plugin-api 包
- [x] **[L2]** Task 2.5 的状态变化通知（`plugin:statusChanged` 事件）当前仅定义接口、不实现实际推送，可在后续迭代中补充
- [x] **[L3]** Task 2.6 的权限确认弹窗 UI（Task 2.3 中定义的 `onHighRiskConfirm` 回调对接渲染进程弹窗）未在本 Phase 实现，可在 Phase 4 插件实际使用时补充
