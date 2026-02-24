# Phase 1：核心框架

> **目标**：打通 IPC 通信 + 数据存储 + 基础 UI 布局。
>
> **里程碑**：M1 - 框架可用（IPC 通信打通，App Shell 可导航，数据库可读写）

---

## 任务编号说明

Phase 1 共 6 个任务（1.1–1.6），覆盖 IPC 通信基础设施、文件系统与 Shell 执行的 IPC Handler、数据存储、App Shell UI 和设置页面。

---

## Phase 1 执行前置（必须确认）

在开始任何 Task 前，先记录并确认以下信息：

- [ ] Phase 0 所有任务已完成且 `pnpm test` 全部通过
- [ ] `src/shared/ipc-channels.ts` 和 `src/shared/types.ts` 占位文件已存在（Phase 0.6 创建）
- [ ] `src/main/ipc/index.ts`、`src/main/storage/index.ts` 占位模块已存在
- [ ] `src/renderer/src/components/`、`src/renderer/src/features/`、`src/renderer/src/stores/` 目录已存在
- [ ] 路径别名 `@main`、`@renderer`、`@shared` 可用
- [ ] 本阶段只引入 `ARCHITECTURE.md` 与 `ROADMAP.md` 已声明依赖
- [ ] 执行任务后必须更新任务状态：任务成功完成时，将对应的验收标准和交付物清单项标记为 `[x]`（已完成）

---

## 任务依赖关系 & 推荐执行顺序

### 依赖关系图

```
1.1（IPC 通信基础设施） ← Phase 1 起点
  ├── 1.2（文件系统 IPC Handler）  ← 依赖 1.1 提供 IPC 注册机制
  ├── 1.3（Shell 执行 IPC Handler）← 依赖 1.1 提供 IPC 注册机制
  ├── 1.4（SQLite 数据存储）       ← 依赖 1.1（settings IPC 通道定义）
  └── 1.5（App Shell 基础 UI）     ← 仅依赖 Phase 0（Tailwind + shadcn/ui）
        └── 1.6（设置页面 & 配置持久化）← 依赖 1.4（数据存储）+ 1.5（App Shell UI）
```

### 推荐执行顺序

```
1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6
```

- 1.1 定义所有 IPC 通道和共享类型，是 1.2/1.3/1.4 的基础
- 1.2 和 1.3 互相独立，可并行执行，但推荐顺序执行以避免 IPC 注册冲突
- 1.4 需要 1.1 的类型定义，独立于 1.2/1.3
- 1.5 仅依赖 Phase 0 的 UI 基建，理论上可与 1.1 并行，但推荐在 1.4 之后执行以便集成数据层
- 1.6 必须在 1.4 和 1.5 都完成后执行

---

## TDD 分层策略

> Phase 1 所有任务均包含可测试的业务逻辑，全部适用 **A 类（严格 TDD）**。
> 无 B 类豁免。每个任务必须严格执行 Red-Green-Refactor 流程。

### A 类：有可测试行为的任务 → 严格 TDD（Red-Green-Refactor）

适用于：1.1–1.6 全部任务

1. **Red**：先编写测试（正常路径 + 边界条件 + 错误处理），运行并确认失败
2. **Green**：实现最小代码使测试通过
3. **Refactor**：重构并再次运行测试确保通过

### 统一留痕要求

- [ ] 所有任务：记录 Red 阶段失败测试名称、Green 阶段通过结果、最终回归结果
- [ ] 所有任务：`pnpm test` 通过
- [ ] 测试文件与源文件同目录：`*.test.ts` / `*.test.tsx`

---

## 1.1 IPC 通信基础设施

**目标**：建立类型安全的 IPC 通信框架，打通主进程与渲染进程，定义所有 IPC 通道常量和共享类型。

**输入/前置条件**：

- 依赖：Phase 0 完成
- 需读取：`ARCHITECTURE.md` 第六节（IPC 通信设计）、第三节（进程模型）
- 当前状态：`src/shared/ipc-channels.ts` 和 `src/shared/types.ts` 已存在但为空占位

**验证策略**：A 类（严格 TDD）

**关键决策**：

| 决策项                | 方案                                                                                                                                                                                                                                                                                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| IPC 通道命名          | `domain:action` 格式（如 `fs:readFile`、`shell:exec`），统一在 `IPC_CHANNELS` 常量对象中定义                                                                                                                                                                                                                                                                        |
| 通道分组              | 按领域分组：`fs`（文件系统）、`shell`（命令执行）、`ai`（AI 服务）、`plugin`（插件管理）、`settings`（设置）                                                                                                                                                                                                                                                        |
| 共享类型定义          | Task 1.1 只定义 `ExecResult`、`ExecOptions`、`FileStat` 三个类型（含工厂函数和类型守卫）；`Message`、`ChatParams`、`StreamChunk` 推迟到 Phase 3（AI 任务）；`PluginInfo` 推迟到 Phase 2（插件系统）                                                                                                                                                                 |
| Preload 暴露 API 名称 | 使用 `window.workbox`，**替换**模板默认的 `window.electron` 和 `window.api`，移除 `@electron-toolkit/preload` 依赖，与 `ARCHITECTURE.md` 一致                                                                                                                                                                                                                       |
| 类型安全方案          | 通过 `src/preload/index.d.ts` 声明 `Window.workbox` 类型，renderer 端调用时有完整类型提示                                                                                                                                                                                                                                                                           |
| IPC Handler 注册方式  | 主进程使用 `ipcMain.handle(channel, handler)` 注册，通过统一的 `registerIPCHandlers()` 函数在 `app.whenReady()` 后批量注册。**Task 1.1 阶段 `register.ts` 内联空壳 handler（`async () => { throw new Error('Not implemented') }`），不 import 各领域 handler 文件**（`fs.handler.ts`、`shell.handler.ts` 等在后续 Task 1.2/1.3 中创建，届时替换对应的空壳 handler） |
| electron mock 策略    | 测试中通过 `vi.mock('electron', ...)` mock `ipcMain` 和 `ipcRenderer`，验证 handler 注册和调用逻辑                                                                                                                                                                                                                                                                  |
| AI 流式通信           | Task 1.1 preload 中 **不实现** `ai.onStream` 事件监听模式，仅暴露 `ai.chat` 的 invoke 封装；流式通信推迟到 Phase 3 AI 任务中实现                                                                                                                                                                                                                                    |
| 重复注册策略          | `registerIPCHandlers()` 被重复调用时**抛出错误**，标识已注册通道，防止重复绑定                                                                                                                                                                                                                                                                                      |

**TDD 要求**：

- [x] Red：先写测试，确认失败。具体测试用例见下方。
- [x] Green：实现 IPC 通道定义、共享类型、preload 桥接、主进程 handler 注册骨架，使测试通过
- [x] Refactor：统一导出风格和命名规范，测试保持通过

**测试用例设计**（Red 阶段编写）：

```typescript
// === src/shared/ipc-channels.test.ts ===
import { IPC_CHANNELS } from './ipc-channels'

describe('IPC_CHANNELS', () => {
  // 正常路径：通道常量存在且格式正确
  it('定义 fs 领域通道', () => {
    expect(IPC_CHANNELS.fs.readFile).toBe('fs:readFile')
    expect(IPC_CHANNELS.fs.writeFile).toBe('fs:writeFile')
    expect(IPC_CHANNELS.fs.readDir).toBe('fs:readDir')
    expect(IPC_CHANNELS.fs.stat).toBe('fs:stat')
  })

  it('定义 shell 领域通道', () => {
    expect(IPC_CHANNELS.shell.exec).toBe('shell:exec')
  })

  it('定义 ai 领域通道', () => {
    expect(IPC_CHANNELS.ai.chat).toBe('ai:chat')
    expect(IPC_CHANNELS.ai.getModels).toBe('ai:getModels')
  })

  it('定义 plugin 领域通道', () => {
    expect(IPC_CHANNELS.plugin.list).toBe('plugin:list')
    expect(IPC_CHANNELS.plugin.enable).toBe('plugin:enable')
    expect(IPC_CHANNELS.plugin.disable).toBe('plugin:disable')
  })

  it('定义 settings 领域通道', () => {
    expect(IPC_CHANNELS.settings.get).toBe('settings:get')
    expect(IPC_CHANNELS.settings.update).toBe('settings:update')
    expect(IPC_CHANNELS.settings.reset).toBe('settings:reset')
  })

  // 边界条件：通道对象是 as const（只读）
  it('IPC_CHANNELS 是只读的', () => {
    // TypeScript 层面的 as const 保证，运行时验证 frozen
    expect(typeof IPC_CHANNELS).toBe('object')
    expect(IPC_CHANNELS).toBeDefined()
  })

  // 正常路径：所有通道值遵循 domain:action 格式
  it('所有通道值遵循 domain:action 命名格式', () => {
    const pattern = /^[a-z]+:[a-zA-Z]+$/
    const allChannels = Object.values(IPC_CHANNELS).flatMap((domain) => Object.values(domain))
    allChannels.forEach((channel) => {
      expect(channel).toMatch(pattern)
    })
  })
})

// === src/shared/types.test.ts ===
// 注意：TypeScript interface 编译后不存在于 JavaScript 中，无法通过 import 解构获取。
// 因此不测试类型本身，而是导出**运行时辅助函数**（如工厂函数或类型守卫），测试这些函数的行为。
// 纯类型正确性由 `tsc --noEmit` 保证。
import { createExecResult, createFileStat, isExecResult } from './types'

describe('共享类型辅助函数', () => {
  describe('createExecResult', () => {
    // 正常路径：工厂函数创建符合结构的对象
    it('创建包含 stdout/stderr/exitCode 的结果对象', () => {
      const result = createExecResult({ stdout: 'hello', stderr: '', exitCode: 0 })
      expect(result.stdout).toBe('hello')
      expect(result.stderr).toBe('')
      expect(result.exitCode).toBe(0)
    })

    // 边界条件：支持可选 signal 字段
    it('支持可选 signal 字段', () => {
      const result = createExecResult({ stdout: '', stderr: '', exitCode: 1, signal: 'SIGTERM' })
      expect(result.signal).toBe('SIGTERM')
    })

    // 边界条件：未传 signal 时为 undefined
    it('未传 signal 时为 undefined', () => {
      const result = createExecResult({ stdout: '', stderr: '', exitCode: 0 })
      expect(result.signal).toBeUndefined()
    })
  })

  describe('createFileStat', () => {
    it('创建文件元信息对象', () => {
      const stat = createFileStat({
        size: 1024,
        isDirectory: false,
        isFile: true,
        mtime: 1700000000
      })
      expect(stat.size).toBe(1024)
      expect(stat.isFile).toBe(true)
      expect(stat.isDirectory).toBe(false)
      expect(stat.mtime).toBe(1700000000)
    })
  })

  describe('isExecResult（类型守卫）', () => {
    it('合法 ExecResult 返回 true', () => {
      expect(isExecResult({ stdout: '', stderr: '', exitCode: 0 })).toBe(true)
    })

    it('缺少必要字段返回 false', () => {
      expect(isExecResult({ stdout: '' })).toBe(false)
      expect(isExecResult(null)).toBe(false)
      expect(isExecResult('string')).toBe(false)
    })
  })
})

// === src/main/ipc/register.test.ts ===
// 测试 IPC Handler 注册机制（mock electron）
// 注意：每个测试必须通过 vi.resetModules() 清除模块缓存，
// 确保 registerIPCHandlers 内部的「已注册」状态被重置，
// 否则动态 import 会复用同一模块实例导致重复注册测试误判。
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn()
  }
}))

describe('IPC Handler 注册', () => {
  beforeEach(() => {
    vi.resetModules()
    // 重新设置 mock，因为 resetModules 会清除 mock 缓存
    vi.mock('electron', () => ({
      ipcMain: {
        handle: vi.fn(),
        on: vi.fn()
      }
    }))
  })

  it('registerIPCHandlers 注册所有领域 handler', async () => {
    const { ipcMain } = await import('electron')
    const { registerIPCHandlers } = await import('./register')

    registerIPCHandlers()

    // 验证注册了具体的通道名（空壳 handler）
    const registeredChannels = (ipcMain.handle as any).mock.calls.map((c: any[]) => c[0])
    // Task 1.1 阶段注册所有已定义通道的空壳 handler
    expect(registeredChannels).toContain('fs:readFile')
    expect(registeredChannels).toContain('fs:writeFile')
    expect(registeredChannels).toContain('fs:readDir')
    expect(registeredChannels).toContain('fs:stat')
    expect(registeredChannels).toContain('shell:exec')
    expect(registeredChannels).toContain('ai:chat')
    expect(registeredChannels).toContain('ai:getModels')
    expect(registeredChannels).toContain('plugin:list')
    expect(registeredChannels).toContain('plugin:enable')
    expect(registeredChannels).toContain('plugin:disable')
    expect(registeredChannels).toContain('settings:get')
    expect(registeredChannels).toContain('settings:update')
    expect(registeredChannels).toContain('settings:reset')
  })

  // 错误处理：重复注册应抛错
  it('不允许重复注册同一通道', async () => {
    const { registerIPCHandlers } = await import('./register')
    // 第一次注册成功
    registerIPCHandlers()
    // 第二次注册同样通道应抛出错误
    expect(() => registerIPCHandlers()).toThrow(/already registered|duplicate/i)
  })
})
```

**执行步骤**：

1. **（Red）** 编写 `src/shared/ipc-channels.test.ts`：测试通道常量定义、命名格式验证
2. **（Red）** 编写 `src/shared/types.test.ts`：测试共享类型的**运行时辅助函数**（工厂函数 `createExecResult`/`createFileStat`、类型守卫 `isExecResult`），纯 interface 正确性由 `tsc --noEmit` 保证
3. **（Red）** 编写 `src/main/ipc/register.test.ts`：测试 IPC handler 注册机制（mock electron）
4. 运行 `pnpm test`，确认全部失败
5. **（Green）** 实现 `src/shared/ipc-channels.ts`：按 `ARCHITECTURE.md` 6.1 定义所有通道常量
6. **（Green）** 实现 `src/shared/types.ts`：定义 `ExecResult`、`ExecOptions`、`FileStat` 三个接口；同时导出运行时辅助函数 `createExecResult()`、`createFileStat()`、`isExecResult()` 供测试和业务代码使用（`Message`/`ChatParams`/`StreamChunk` 推迟到 Phase 3，`PluginInfo` 推迟到 Phase 2）
7. **（Green）** 实现 `src/preload/index.ts`：移除 `@electron-toolkit/preload` 依赖和 `window.electron`/`window.api`，改为 `window.workbox`，通过 `contextBridge` 暴露 fs（readFile/writeFile/readDir/stat）/shell/ai/plugin/settings API
8. **（Green）** 更新 `src/preload/index.d.ts`：声明 `Window.workbox` 类型
9. **（Green）** 创建 `src/main/ipc/register.ts`：统一的 IPC handler 注册入口。**1.1 阶段所有 handler 直接在 `register.ts` 中内联为空壳函数**（如 `async () => { throw new Error('Not implemented') }`），不 import `fs.handler.ts`/`shell.handler.ts` 等尚不存在的领域 handler 文件；后续 Task 1.2/1.3/1.6 实现具体 handler 后再替换对应的空壳
10. **（Green）** 更新 `src/main/index.ts`：在 `app.whenReady()` 后调用 `registerIPCHandlers()`
11. 运行 `pnpm test`，确认测试通过
12. **（Refactor）** 统一导出风格，整理类型组织结构，再次运行 `pnpm test` 确认通过

**验收标准**：

- [x] `src/shared/ipc-channels.ts` 定义完整的 IPC 通道常量，包含 `fs`、`shell`、`ai`、`plugin`、`settings` 五个领域
- [x] `src/shared/types.ts` 定义 `ExecResult`、`ExecOptions`、`FileStat` 共享接口及对应运行时辅助函数（`Message`/`ChatParams`/`StreamChunk` 推迟到 Phase 3，`PluginInfo` 推迟到 Phase 2）
- [x] `src/preload/index.ts` 移除 `@electron-toolkit/preload` 依赖和 `window.electron`/`window.api`，通过 `contextBridge` 暴露 `window.workbox` API（包含 fs.readFile/writeFile/readDir/stat、shell、ai、plugin、settings）
- [x] `src/preload/index.d.ts` 声明 `Window.workbox` 完整类型，renderer 端有类型提示
- [x] `src/main/ipc/register.ts` 存在，提供 `registerIPCHandlers()` 函数
- [x] `src/main/index.ts` 在 `app.whenReady()` 后调用 `registerIPCHandlers()`
- [x] 实现类型安全的 IPC invoke 封装（renderer 端调用时有类型提示）
- [x] TDD 留痕完整：Red 阶段测试失败日志 + Green 阶段通过日志
- [x] `tsc --noEmit` 无类型错误
- [x] `pnpm test` 回归通过
- [x] 提供可复核证据：测试输出 + `tsc --noEmit` 输出

**交付物**：

- [x] `src/shared/ipc-channels.ts`（完整通道定义）
- [x] `src/shared/types.ts`（ExecResult/ExecOptions/FileStat 共享类型 + 辅助函数）
- [x] `src/preload/index.ts`（workbox API 桥接）
- [x] `src/preload/index.d.ts`（Window.workbox 类型声明）
- [x] `src/main/ipc/register.ts`（IPC 注册入口）
- [x] 对应的测试文件

---

## 1.2 文件系统 IPC Handler

**目标**：实现文件系统操作的 IPC 处理器，支持安全的文件读写，带路径穿越防护。

**输入/前置条件**：

- 依赖：Task 1.1 完成（IPC 通道定义 + 注册机制可用）
- 需读取：`ARCHITECTURE.md` 第三节（主进程 - 文件系统服务）、第四节（权限模型 - `fs:read`/`fs:write`）
- 当前状态：`src/main/ipc/index.ts` 为空占位，需创建 `fs.handler.ts`

**验证策略**：A 类（严格 TDD）

**关键决策**：

| 决策项                  | 方案                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Handler 文件命名        | `src/main/ipc/fs.handler.ts`（遵循 `ARCHITECTURE.md` 第八节目录结构）                                                                                                                                                                                                                                                                                                                                         |
| 路径安全策略            | 校验规则：① 必须是绝对路径 ② `path.resolve()` 后的路径必须以白名单中某个目录为前缀（即不能逃逸白名单）。注意 `resolve()` 结果本身永远不含 `..`，安全检测的本质是**前缀匹配**而非检查 `..` 分段 ③ 白名单（`allowedPaths`）默认 `[homedir()]`，测试中注入 `tmpdir()`                                                                                                                                            |
| `allowedPaths` 参数定位 | **仅为内部依赖注入参数，不暴露给 IPC / renderer**。纯业务函数（`readFile`/`writeFile` 等）接受可选的 `options.allowedPaths` 参数供测试注入 `tmpdir()`；IPC handler wrapper 调用业务函数时**不传递** `allowedPaths`，走默认 `[homedir()]`。Preload 层签名不变（`readFile(path: string)`）                                                                                                                      |
| 文件读取编码            | 默认 UTF-8 字符串返回，后续可扩展 Buffer 模式                                                                                                                                                                                                                                                                                                                                                                 |
| 错误处理                | 在 `src/main/ipc/fs.handler.ts` 中定义三个自定义错误类（均 extends `Error`），并导出：① `PathSecurityError` — 路径安全校验失败时抛出 ② `FileNotFoundError` — 捕获 Node.js `ENOENT` 错误后包装抛出（readFile/stat/readDir 场景） ③ `PermissionDeniedError` — 捕获 Node.js `EACCES`/`EPERM` 错误后包装抛出。业务函数统一 try-catch `fs/promises` 调用，按 `error.code` 映射为对应自定义错误类，未知错误原样抛出 |
| Node.js API 选择        | 使用 `fs/promises`（异步），不使用 `fs` 同步方法                                                                                                                                                                                                                                                                                                                                                              |
| 导出方式                | 导出 `setupFSHandlers(ipcMain)` 函数，由 `register.ts` 统一调用                                                                                                                                                                                                                                                                                                                                               |
| register.ts 集成方式    | 在 `register.ts` 的 `registerIPCHandlers()` 中，将 fs 领域的 4 行空壳 `ipcMain.handle(channel, notImplemented)` **替换**为 `setupFSHandlers(ipcMain)` 调用。`setupFSHandlers` 内部为 fs 的 4 个 channel 调用 `ipcMain.handle()`，不会重复注册。其余领域的空壳保持不变                                                                                                                                         |
| validatePath 最终位置   | 定义在 `fs.handler.ts` 中并导出，不单独提取文件。Refactor 阶段仅做代码整理，不改变文件位置                                                                                                                                                                                                                                                                                                                    |
| register.ts 守卫交互    | 1.1 实现的 `registerIPCHandlers()` 使用**函数级别** boolean flag 守卫（`let registered = false`），仅防止整个函数被重复调用。`setupFSHandlers(ipcMain)` 在 `registerIPCHandlers()` 内部、`registered = true` 之前被调用，不受守卫影响，不会与其他领域产生冲突                                                                                                                                                 |
| writeFile 父目录策略    | 目标文件的父目录不存在时，自动创建（等效 `mkdir -p`），使用 `fs.mkdir(dirname(filePath), { recursive: true })` 在校验路径安全后、写入前执行                                                                                                                                                                                                                                                                   |

**TDD 要求**：

- [x] Red：先写测试，确认失败。具体测试用例见下方。
- [x] Green：实现 fs handler 使测试通过
- [x] Refactor：整理代码结构和导出，测试保持通过（`validatePath` 保留在 `fs.handler.ts` 中，不单独提取文件）

**测试用例设计**（Red 阶段编写）：

```typescript
// === src/main/ipc/fs.handler.test.ts ===
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync } from 'fs'
import { join, resolve } from 'path'
import { tmpdir, homedir } from 'os'
// 纯业务逻辑函数 + 自定义错误类 + 路径校验函数，均从 fs.handler.ts 导入。
// IPC 注册由 setupFSHandlers 完成，测试中不涉及 IPC 层。
import {
  readFile,
  writeFile,
  readDir,
  stat,
  validatePath,
  PathSecurityError,
  FileNotFoundError,
  PermissionDeniedError
} from './fs.handler'

describe('fs.handler', () => {
  let testDir: string
  // 获取 resolve 后的真实 tmpdir 路径（macOS 上 /tmp 是 /private/tmp 的 symlink）
  const resolvedTmpBase = resolve(tmpdir())

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'workbox-test-'))
  })

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true })
  })

  describe('readFile', () => {
    // 正常路径
    it('读取文件返回 UTF-8 字符串内容', async () => {
      const filePath = join(testDir, 'test.txt')
      writeFileSync(filePath, 'hello world')
      // allowedPaths 是内部依赖注入参数，仅供测试使用
      const content = await readFile(filePath, { allowedPaths: [resolvedTmpBase] })
      expect(content).toBe('hello world')
    })

    // 边界条件：空文件
    it('读取空文件返回空字符串', async () => {
      const filePath = join(testDir, 'empty.txt')
      writeFileSync(filePath, '')
      const content = await readFile(filePath, { allowedPaths: [resolvedTmpBase] })
      expect(content).toBe('')
    })

    // 错误处理：文件不存在 → FileNotFoundError
    it('文件不存在时抛出 FileNotFoundError', async () => {
      await expect(
        readFile(join(testDir, 'nonexistent.txt'), { allowedPaths: [resolvedTmpBase] })
      ).rejects.toThrow(FileNotFoundError)
    })

    // 安全：路径穿越 — resolve 后逃逸白名单
    it('拒绝 resolve 后逃逸白名单的路径', async () => {
      // /tmp/../etc/passwd → resolve 为 /etc/passwd (或 /private/etc/passwd)
      // 不在 resolvedTmpBase 白名单前缀内，应拒绝
      await expect(
        readFile('/tmp/../etc/passwd', { allowedPaths: [resolvedTmpBase] })
      ).rejects.toThrow(PathSecurityError)
    })

    // 安全：非绝对路径
    it('拒绝相对路径', async () => {
      await expect(readFile('relative/path.txt')).rejects.toThrow(/absolute/i)
    })
  })

  describe('writeFile', () => {
    // 正常路径
    it('写入字符串内容到文件', async () => {
      const filePath = join(testDir, 'output.txt')
      await writeFile(filePath, 'written content', { allowedPaths: [resolvedTmpBase] })
      const content = readFileSync(filePath, 'utf-8')
      expect(content).toBe('written content')
    })

    // 正常路径：覆盖已有文件
    it('覆盖已有文件内容', async () => {
      const filePath = join(testDir, 'existing.txt')
      writeFileSync(filePath, 'old content')
      await writeFile(filePath, 'new content', { allowedPaths: [resolvedTmpBase] })
      expect(readFileSync(filePath, 'utf-8')).toBe('new content')
    })

    // 正常路径：父目录不存在时自动创建
    it('父目录不存在时自动创建后写入', async () => {
      const filePath = join(testDir, 'nested', 'deep', 'output.txt')
      await writeFile(filePath, 'auto-mkdir content', { allowedPaths: [resolvedTmpBase] })
      expect(readFileSync(filePath, 'utf-8')).toBe('auto-mkdir content')
    })

    // 安全：路径穿越
    it('拒绝 resolve 后逃逸白名单的写入', async () => {
      await expect(
        writeFile('/tmp/../etc/evil', 'data', { allowedPaths: [resolvedTmpBase] })
      ).rejects.toThrow(PathSecurityError)
    })
  })

  describe('readDir', () => {
    // 正常路径
    it('返回目录下的文件名列表', async () => {
      writeFileSync(join(testDir, 'a.txt'), '')
      writeFileSync(join(testDir, 'b.txt'), '')
      const list = await readDir(testDir, { allowedPaths: [resolvedTmpBase] })
      expect(list).toContain('a.txt')
      expect(list).toContain('b.txt')
    })

    // 边界条件：空目录
    it('空目录返回空数组', async () => {
      const emptyDir = join(testDir, 'empty')
      mkdirSync(emptyDir)
      const list = await readDir(emptyDir, { allowedPaths: [resolvedTmpBase] })
      expect(list).toEqual([])
    })

    // 错误处理：路径不是目录
    it('路径不是目录时抛出错误', async () => {
      const filePath = join(testDir, 'file.txt')
      writeFileSync(filePath, '')
      await expect(readDir(filePath, { allowedPaths: [resolvedTmpBase] })).rejects.toThrow()
    })

    // 错误处理：目录不存在 → FileNotFoundError
    it('目录不存在时抛出 FileNotFoundError', async () => {
      await expect(
        readDir(join(testDir, 'nonexistent'), { allowedPaths: [resolvedTmpBase] })
      ).rejects.toThrow(FileNotFoundError)
    })
  })

  describe('stat', () => {
    // 正常路径
    it('返回文件元信息', async () => {
      const filePath = join(testDir, 'info.txt')
      writeFileSync(filePath, 'data')
      const info = await stat(filePath, { allowedPaths: [resolvedTmpBase] })
      expect(info.isFile).toBe(true)
      expect(info.isDirectory).toBe(false)
      expect(info.size).toBeGreaterThan(0)
      expect(info.mtime).toBeGreaterThan(0)
    })

    // 正常路径：目录
    it('返回目录元信息', async () => {
      const info = await stat(testDir, { allowedPaths: [resolvedTmpBase] })
      expect(info.isDirectory).toBe(true)
      expect(info.isFile).toBe(false)
    })

    // 错误处理：路径不存在 → FileNotFoundError
    it('路径不存在时抛出 FileNotFoundError', async () => {
      await expect(
        stat(join(testDir, 'nope'), { allowedPaths: [resolvedTmpBase] })
      ).rejects.toThrow(FileNotFoundError)
    })
  })

  describe('validatePath（路径安全校验）', () => {
    it('允许用户 home 目录下的绝对路径（默认白名单）', () => {
      expect(() => validatePath(join(homedir(), 'Documents/test.txt'))).not.toThrow()
    })

    it('允许显式白名单目录下的路径', () => {
      const tmpBase = resolve(tmpdir())
      expect(() => validatePath(join(tmpBase, 'some-file.txt'), [tmpBase])).not.toThrow()
    })

    it('拒绝白名单外的路径', () => {
      expect(() => validatePath('/etc/passwd')).toThrow(PathSecurityError)
    })

    it('拒绝 resolve 后逃逸白名单的路径穿越', () => {
      // join(homedir(), '..', 'etc', 'passwd') → resolve 后不以 homedir() 为前缀，应拒绝
      expect(() => validatePath(join(homedir(), '..', 'etc', 'passwd'))).toThrow(PathSecurityError)
    })

    it('拒绝相对路径', () => {
      expect(() => validatePath('relative/path')).toThrow(/absolute/i)
    })
  })

  describe('错误类型包装', () => {
    // EACCES → PermissionDeniedError
    it('文件无读取权限时抛出 PermissionDeniedError', async () => {
      const filePath = join(testDir, 'no-access.txt')
      writeFileSync(filePath, 'secret')
      // 移除所有读取权限
      const { chmodSync } = await import('fs')
      chmodSync(filePath, 0o000)
      try {
        await expect(readFile(filePath, { allowedPaths: [resolvedTmpBase] })).rejects.toThrow(
          PermissionDeniedError
        )
      } finally {
        // 恢复权限以便 afterEach 清理
        chmodSync(filePath, 0o644)
      }
    })
  })

  describe('setupFSHandlers（IPC 集成）', () => {
    // 需要 mock electron 的 ipcMain
    it('注册 4 个 fs channel 到 ipcMain', async () => {
      const { setupFSHandlers } = await import('./fs.handler')
      const mockHandle = vi.fn()
      const mockIpcMain = { handle: mockHandle } as any

      setupFSHandlers(mockIpcMain)

      const registeredChannels = mockHandle.mock.calls.map((c: any[]) => c[0])
      expect(registeredChannels).toContain('fs:readFile')
      expect(registeredChannels).toContain('fs:writeFile')
      expect(registeredChannels).toContain('fs:readDir')
      expect(registeredChannels).toContain('fs:stat')
      expect(registeredChannels).toHaveLength(4)
    })

    it('handler wrapper 正确转发参数并返回结果', async () => {
      const { setupFSHandlers } = await import('./fs.handler')
      const handlers: Record<string, Function> = {}
      const mockIpcMain = {
        handle: vi.fn((channel: string, handler: Function) => {
          handlers[channel] = handler
        })
      } as any

      setupFSHandlers(mockIpcMain)

      // 准备测试文件（位于 homedir 下才能通过默认白名单）
      // 注意：此测试验证 handler wrapper 的转发逻辑，
      // 实际会走默认 allowedPaths=[homedir()]，
      // 因此只验证 handler 函数存在且可调用
      expect(handlers['fs:readFile']).toBeDefined()
      expect(typeof handlers['fs:readFile']).toBe('function')
    })
  })
})
```

**执行步骤**：

1. **（Red）** 编写 `src/main/ipc/fs.handler.test.ts`：覆盖 readFile/writeFile/readDir/stat 的正常路径、边界条件、错误处理、安全校验
2. 运行 `pnpm test`，确认全部失败
3. **（Green）** 创建 `src/main/ipc/fs.handler.ts`：
   - 定义自定义错误类：`PathSecurityError`、`FileNotFoundError`、`PermissionDeniedError`（均 extends `Error`），并导出
   - 实现 `validatePath(filePath, allowedPaths?)` 路径安全校验函数：① 拒绝非绝对路径 ② `path.resolve()` 后检查是否以白名单某个目录为前缀；`allowedPaths` 默认 `[homedir()]`，测试中注入 `[resolve(tmpdir())]`
   - 实现纯业务函数（均接受可选 `options?: { allowedPaths?: string[] }` 参数，IPC 层不传此参数）。业务函数统一 try-catch `fs/promises` 调用，按 `error.code` 映射自定义错误类（`ENOENT` → `FileNotFoundError`，`EACCES`/`EPERM` → `PermissionDeniedError`），未知错误原样抛出：
     - `readFile(filePath, options?)` → 校验路径 + 返回 UTF-8 字符串
     - `writeFile(filePath, data, options?)` → 校验路径 + 自动创建父目录（`fs.mkdir(dirname, { recursive: true })`）+ 写入文件
     - `readDir(dirPath, options?)` → 校验路径 + 返回目录列表
     - `stat(filePath, options?)` → 校验路径 + 返回 `FileStat` 结构
   - 实现 `setupFSHandlers(ipcMain)` 注册函数：内部为 4 个 fs channel 调用 `ipcMain.handle()`，handler wrapper 调用业务函数时不传 `allowedPaths`（走默认 `[homedir()]`）
4. 更新 `src/main/ipc/register.ts`：将 fs 领域的 4 行空壳 `ipcMain.handle(channel, notImplemented)` 替换为 `import { setupFSHandlers } from './fs.handler'` + `setupFSHandlers(ipcMain)` 调用
5. 运行 `pnpm test`，确认测试通过（包括 `register.test.ts` 回归——fs 通道仍被注册，只是 handler 从空壳变为真实实现）
6. **（Refactor）** 整理代码结构和导出，再次运行 `pnpm test` 确认通过

**验收标准**：

- [x] `src/main/ipc/fs.handler.ts` 存在，导出 `setupFSHandlers` 函数、纯业务函数（`readFile`/`writeFile`/`readDir`/`stat`/`validatePath`）、自定义错误类（`PathSecurityError`/`FileNotFoundError`/`PermissionDeniedError`）
- [x] 纯业务函数接受可选 `options?: { allowedPaths?: string[] }` 参数（内部依赖注入，不暴露给 IPC），默认白名单 `[homedir()]`
- [x] `setupFSHandlers(ipcMain)` 内部调用 `ipcMain.handle()` 注册 4 个 fs channel，handler wrapper 调用业务函数时不传 `allowedPaths`
- [x] `readFile(path)` → 返回文件内容（UTF-8 字符串）
- [x] `writeFile(path, data)` → 写入文件，父目录不存在时自动创建（`mkdir -p` 语义）
- [x] `readDir(path)` → 返回目录列表（`string[]`）
- [x] `stat(path)` → 返回 `FileStat`（size、isDirectory、isFile、mtime）
- [x] 路径安全校验：拒绝相对路径、`resolve()` 后做前缀匹配拒绝逃逸白名单的路径、默认仅允许 home 目录
- [x] 错误类型包装：`ENOENT` → `FileNotFoundError`，`EACCES`/`EPERM` → `PermissionDeniedError`，路径校验失败 → `PathSecurityError`，未知错误原样抛出
- [x] `setupFSHandlers(ipcMain)` 有独立测试验证：注册 4 个 fs channel、handler wrapper 可调用
- [x] `register.ts` 中 fs 领域空壳已替换为 `setupFSHandlers(ipcMain)` 调用，`register.test.ts` 回归通过
- [x] TDD 留痕完整：Red 阶段测试失败日志 + Green 阶段通过日志
- [x] renderer 可通过 `window.workbox.fs.readFile()` 调用（Preload 签名不变：`readFile(path: string): Promise<string>`）
- [x] `pnpm test` 回归通过
- [x] 提供可复核证据：测试输出

**交付物**：

- [x] `src/main/ipc/fs.handler.ts`（含自定义错误类、纯业务函数、`setupFSHandlers`、`validatePath`）
- [x] `src/main/ipc/fs.handler.test.ts`
- [x] `src/main/ipc/register.ts` 更新（fs 空壳替换为 `setupFSHandlers(ipcMain)` 调用）

---

## 1.3 Shell 执行 IPC Handler

**目标**：实现安全的 Shell 命令执行，带超时保护和危险命令黑名单检测。

**输入/前置条件**：

- 依赖：Task 1.1 完成（IPC 通道定义 + 注册机制可用）
- 需读取：`ARCHITECTURE.md` 第三节（主进程 - Shell 执行器）
- 当前状态：需创建 `src/main/ipc/shell.handler.ts`

**验证策略**：A 类（严格 TDD）

**关键决策**：

| 决策项           | 方案                                                                                                                                                                                                                                                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Handler 文件命名 | `src/main/ipc/shell.handler.ts`                                                                                                                                                                                                                                                                                      |
| Node.js API 选择 | 使用 `child_process.exec` 的 Promise 封装（`util.promisify(exec)`）                                                                                                                                                                                                                                                  |
| 超时默认值       | 30 秒（30000ms），可通过 `ExecOptions.timeout` 覆盖                                                                                                                                                                                                                                                                  |
| 危险命令黑名单   | 使用**词边界**正则匹配（`\b`），避免子串误判（如 `adding` 不会匹配 `dd`）。拦截规则：① `rm\s+-[^\s]*r[^\s]*f\s+/` 匹配 `rm -rf /` 及其变体（`rm -rf /*`、`rm -rfi /`），但**不拦截** `rm -rf ./dir` 等非根路径 ② `\bsudo\b`、`\bdd\b`、`\bmkfs\b`、`\bformat\b`、`\bshutdown\b`、`\breboot\b` 作为独立单词出现时拦截 |
| 返回结构         | `ExecResult { stdout, stderr, exitCode, signal? }`（使用 1.1 定义的共享类型）。**超时和命令失败统一返回 `ExecResult`**（不 throw），通过 `exitCode !== 0` 判断失败；仅在**危险命令拦截**和**空命令**等前置校验失败时 throw Error                                                                                     |
| CWD 处理         | `options.cwd` 可选，默认为用户 home 目录                                                                                                                                                                                                                                                                             |
| 环境变量过滤     | **继承** `process.env` 但过滤掉名称中包含 `KEY`、`SECRET`、`TOKEN`、`PASSWORD`、`CREDENTIAL` 的变量（大小写不敏感）；若 `options.env` 存在则**合并覆盖**到过滤后的环境变量（`{ ...filteredProcessEnv, ...options.env }`）                                                                                            |

**TDD 要求**：

- [x] Red：先写测试，确认失败。具体测试用例见下方。
- [x] Green：实现 shell handler 使测试通过
- [x] Refactor：提取危险命令检测为独立函数，测试保持通过

**测试用例设计**（Red 阶段编写）：

```typescript
// === src/main/ipc/shell.handler.test.ts ===
import * as cp from 'child_process'
import { vi, describe, it, expect } from 'vitest'
import { exec, isDangerousCommand, filterEnv, setupShellHandlers } from './shell.handler'

describe('shell.handler', () => {
  describe('exec', () => {
    // 正常路径：执行简单命令
    it('执行 echo 命令返回 stdout', async () => {
      const result = await exec('echo hello')
      expect(result.stdout.trim()).toBe('hello')
      expect(result.exitCode).toBe(0)
    })

    // 正常路径：命令失败返回非零 exitCode（不 throw）
    it('命令失败时返回非零 exitCode 和 stderr', async () => {
      const result = await exec('ls /nonexistent_path_12345')
      expect(result.exitCode).not.toBe(0)
      expect(result.stderr).toBeTruthy()
    })

    // 正常路径：支持自定义 cwd
    it('支持自定义工作目录', async () => {
      const result = await exec('pwd', { cwd: '/tmp' })
      expect(result.stdout.trim()).toContain('/tmp')
    })

    // 边界条件：空命令
    it('空命令抛出错误', async () => {
      await expect(exec('')).rejects.toThrow()
    })
  })

  describe('超时保护', () => {
    // 正常路径：超时后返回非零 exitCode 和 signal
    it('命令超时后返回非零 exitCode 和 SIGTERM signal', async () => {
      const result = await exec('sleep 10', { timeout: 500 })
      expect(result.exitCode).not.toBe(0)
      expect(result.signal).toBe('SIGTERM')
      expect(result.stderr).toBeTruthy() // 包含超时相关信息
    }, 5000)

    // 正常路径：默认超时 30s（通过 spy 验证传递给 child_process 的参数）
    it('默认超时为 30 秒', async () => {
      const cpExecSpy = vi.spyOn(cp, 'exec')
      await exec('echo fast')
      expect(cpExecSpy).toHaveBeenCalledWith(
        'echo fast',
        expect.objectContaining({ timeout: 30000 }),
        expect.any(Function)
      )
      cpExecSpy.mockRestore()
    })
  })

  describe('危险命令检测', () => {
    // 安全：拦截 rm -rf /
    it('拒绝 rm -rf /', async () => {
      await expect(exec('rm -rf /')).rejects.toThrow(/dangerous/i)
    })

    // 安全：拦截 sudo
    it('拒绝 sudo 命令', async () => {
      await expect(exec('sudo rm file')).rejects.toThrow(/dangerous/i)
    })

    // 安全：拦截 dd（词边界匹配）
    it('拒绝 dd 命令', async () => {
      await expect(exec('dd if=/dev/zero of=/dev/sda')).rejects.toThrow(/dangerous/i)
    })

    // 安全：拦截 mkfs（词边界匹配，含子命令如 mkfs.ext4）
    it('拒绝 mkfs 命令', async () => {
      await expect(exec('mkfs.ext4 /dev/sda1')).rejects.toThrow(/dangerous/i)
    })

    // 正常路径：允许安全命令
    it('允许安全命令通过', async () => {
      const result = await exec('echo safe')
      expect(result.exitCode).toBe(0)
    })

    // 边界条件：rm 非根目录不拦截
    it('允许 rm 非根目录命令', async () => {
      // rm -rf ./tmp 不应被拦截（只拦截 rm -rf / 根路径）
      await expect(exec('rm -rf ./tmp')).resolves.not.toThrow()
    })

    // 边界条件：包含黑名单子串但非独立命令的不拦截
    it('不误拦含黑名单子串的安全命令', async () => {
      // "adding" 包含 "dd"，但不应被拦截
      const result = await exec('echo adding')
      expect(result.exitCode).toBe(0)
    })
  })

  describe('环境变量过滤', () => {
    it('过滤含 KEY/SECRET/TOKEN/PASSWORD/CREDENTIAL 的变量', () => {
      const env = filterEnv({
        PATH: '/usr/bin',
        HOME: '/home/user',
        API_KEY: 'secret123',
        DB_PASSWORD: 'pass',
        MY_TOKEN: 'tok',
        AWS_SECRET_ACCESS_KEY: 'aws',
        NORMAL_VAR: 'ok'
      })
      expect(env.PATH).toBe('/usr/bin')
      expect(env.HOME).toBe('/home/user')
      expect(env.NORMAL_VAR).toBe('ok')
      expect(env).not.toHaveProperty('API_KEY')
      expect(env).not.toHaveProperty('DB_PASSWORD')
      expect(env).not.toHaveProperty('MY_TOKEN')
      expect(env).not.toHaveProperty('AWS_SECRET_ACCESS_KEY')
    })

    it('options.env 合并覆盖到过滤后的环境变量', () => {
      const env = filterEnv(
        { PATH: '/usr/bin', API_KEY: 'secret' },
        { CUSTOM: 'value', PATH: '/custom/bin' }
      )
      expect(env.PATH).toBe('/custom/bin') // options.env 覆盖
      expect(env.CUSTOM).toBe('value')
      expect(env).not.toHaveProperty('API_KEY')
    })
  })

  describe('isDangerousCommand', () => {
    it('使用词边界匹配，不误判子串', () => {
      expect(isDangerousCommand('echo adding')).toBe(false)
      expect(isDangerousCommand('dd if=/dev/zero of=/dev/sda')).toBe(true)
    })

    it('拦截 rm -rf / 及其变体但不拦截非根路径', () => {
      expect(isDangerousCommand('rm -rf /')).toBe(true)
      expect(isDangerousCommand('rm -rf /*')).toBe(true)
      expect(isDangerousCommand('rm -rf ./dir')).toBe(false)
    })
  })

  describe('setupShellHandlers', () => {
    it('注册 shell:exec channel', () => {
      const handleFn = vi.fn()
      const mockIpcMain = { handle: handleFn } as unknown as Electron.IpcMain
      setupShellHandlers(mockIpcMain)
      expect(handleFn).toHaveBeenCalledWith('shell:exec', expect.any(Function))
    })

    it('handler wrapper 正确传递参数给 exec', async () => {
      let registeredHandler: Function | undefined
      const mockIpcMain = {
        handle: vi.fn((_channel: string, handler: Function) => {
          registeredHandler = handler
        })
      } as unknown as Electron.IpcMain
      setupShellHandlers(mockIpcMain)
      const result = await registeredHandler!({}, 'echo test')
      expect(result.stdout.trim()).toBe('test')
      expect(result.exitCode).toBe(0)
    })
  })
})
```

**执行步骤**：

1. **（Red）** 编写 `src/main/ipc/shell.handler.test.ts`：覆盖正常执行、超时、危险命令拦截、环境变量过滤、`isDangerousCommand` 边界、`setupShellHandlers` 注册
2. 运行 `pnpm test`，确认全部失败
3. **（Green）** 创建 `src/main/ipc/shell.handler.ts`：
   - 实现并导出 `isDangerousCommand(command: string): boolean` 危险命令检测（使用词边界正则）
   - 实现并导出 `filterEnv(processEnv: NodeJS.ProcessEnv, extraEnv?: Record<string, string>): Record<string, string>` 环境变量过滤（过滤含 KEY/SECRET/TOKEN/PASSWORD/CREDENTIAL 的变量，合并 extraEnv）
   - 实现并导出 `exec(command: string, options?: ExecOptions): Promise<ExecResult>` 带超时的命令执行。**仅在前置校验失败（空命令、危险命令）时 throw Error**，命令执行失败（含超时）统一返回 `ExecResult`
   - 导出 `setupShellHandlers(ipcMain)` 注册函数：内部调用 `ipcMain.handle(IPC_CHANNELS.shell.exec, (_event, command, options) => exec(command, options))`
4. 更新 `src/main/ipc/register.ts`：将 shell 领域的 `ipcMain.handle(IPC_CHANNELS.shell.exec, notImplemented)` 空壳替换为 `import { setupShellHandlers } from './shell.handler'` + `setupShellHandlers(ipcMain)` 调用
5. 运行 `pnpm test`，确认测试通过
6. **（Refactor）** 整理危险命令正则列表，测试保持通过

**验收标准**：

- [x] `src/main/ipc/shell.handler.ts` 存在，导出 `setupShellHandlers`、`exec`、`isDangerousCommand`、`filterEnv` 函数
- [x] `exec(command, options?)` 执行命令返回 `ExecResult { stdout, stderr, exitCode, signal? }`；命令失败或超时**不 throw**，通过 `exitCode !== 0` 判断；仅前置校验失败（空命令、危险命令）时 throw
- [x] 超时机制生效：默认 30s（通过导出常量验证），可配置，超时后终止进程返回 `ExecResult`（含 `signal: 'SIGTERM'`）
- [x] 危险命令黑名单检测（词边界匹配）：`rm -rf /`、`dd`、`mkfs`、`sudo`、`shutdown`、`reboot` 被拦截；`rm -rf ./dir`、含黑名单子串的安全命令（如 `adding`）不被误拦
- [x] 环境变量过滤：继承 `process.env` 但过滤含 KEY/SECRET/TOKEN/PASSWORD/CREDENTIAL 的变量，`options.env` 合并覆盖
- [x] `setupShellHandlers(ipcMain)` 有独立测试验证：注册 `shell:exec` channel、handler wrapper 可调用
- [x] `register.ts` 中 shell 领域空壳已替换为 `setupShellHandlers(ipcMain)` 调用，`register.test.ts` 回归通过
- [x] Preload 层已就绪（`src/preload/index.ts` 中 `shell.exec` 已通过 `ipcRenderer.invoke` 桥接，**本任务无需修改**）
- [x] TDD 留痕完整：Red 阶段测试失败日志 + Green 阶段通过日志
- [x] `pnpm test` 回归通过
- [x] `pnpm lint` 回归通过
- [x] 提供可复核证据：测试输出

**交付物**：

- [x] `src/main/ipc/shell.handler.ts`（含 `setupShellHandlers`、`exec`、`isDangerousCommand`、`filterEnv`）
- [x] `src/main/ipc/shell.handler.test.ts`（含 `setupShellHandlers` 注册测试）
- [x] `src/main/ipc/register.ts` 更新（shell 空壳替换为 `setupShellHandlers(ipcMain)` 调用）

---

## 1.4 SQLite 数据存储

**目标**：实现本地数据持久化，包括数据库初始化、Drizzle Schema 定义和基础 CRUD 操作。

**输入/前置条件**：

- 依赖：Task 1.1 完成（共享类型定义可用）
- 需读取：`ARCHITECTURE.md` 第七节（数据存储设计 - Schema 定义 + 存储位置）
- 当前状态：`src/main/storage/index.ts` 为空占位

**验证策略**：A 类（严格 TDD）

**关键决策**：

| 决策项          | 方案                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 数据库引擎      | `better-sqlite3`（**同步 API**，性能好，Electron 兼容性好）。注意：better-sqlite3 和 drizzle-orm 的 better-sqlite3 driver 均为同步 API，CRUD 函数应定义为**同步函数**（不使用 async/await），测试断言也相应使用同步写法                                                                                                                                                                                                                                                                                            |
| ORM             | `drizzle-orm`（类型安全、轻量）+ `drizzle-kit`（migration 工具）                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 数据库文件位置  | `~/.workbox/data.db`（使用 `app.getPath('home')` 获取 home 目录）                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Migration 策略  | **本任务仅实现 schema 推导建表**：`Database.initialize()` 通过 `better-sqlite3` 原生 `exec()` 执行从 Drizzle schema 手动编写的 `CREATE TABLE IF NOT EXISTS` SQL 语句来建表（生产和测试使用同一条代码路径）。`drizzle-kit` 仅作为 devDependency 安装备用，**本任务不生成 migration 文件，不使用 `migrate()` 函数**。Migration 流程（`drizzle-kit generate` + `migrate()`）将在后续应用集成任务中引入，届时替换 `initialize()` 中的手动建表逻辑                                                                      |
| 测试数据库      | 测试中使用内存数据库（`:memory:`），通过 `createTestDatabase()` 工具函数创建，避免污染用户数据                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Schema 定义     | 4 张表：`conversations`、`messages`、`plugin_storage`、`settings`（与 `ARCHITECTURE.md` 7.1 一致）                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ID 生成策略     | 使用 UUID（`crypto.randomUUID()`）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 时间戳格式      | Unix 毫秒时间戳（`integer` 类型），存储 `Date.now()` 值                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 字段命名映射    | 数据库列名使用 `snake_case`（与 `ARCHITECTURE.md` SQL 一致：`conversation_id`、`created_at` 等），Drizzle schema 及 TypeScript 代码中使用 `camelCase`（`conversationId`、`createdAt` 等），通过 Drizzle 列定义函数参数指定 DB 列名实现映射（如 `conversationId: text('conversation_id')`）                                                                                                                                                                                                                         |
| 外键级联策略    | `messages` 表的 `conversation_id` 外键设置 `ON DELETE CASCADE`，删除对话时自动删除关联消息（需配合 `PRAGMA foreign_keys = ON`）。注意：这比 ARCHITECTURE.md 7.1 的 SQL 多了 CASCADE 约束，属于合理增强                                                                                                                                                                                                                                                                                                             |
| 值序列化约定    | `settings.value` 和 `plugin_storage.value` 存储 **原始字符串**，JSON 序列化/反序列化由**调用者负责**，CRUD 函数不做自动转换                                                                                                                                                                                                                                                                                                                                                                                        |
| Schema 双源职责 | 表结构存在**两处定义**，职责不同：① `database.ts` 中的手写 `CREATE TABLE IF NOT EXISTS` SQL 是**建表的唯一执行路径**（即 source of truth），包含 CHECK 约束、外键、CASCADE 等所有 DDL 细节；② `schema.ts` 中的 Drizzle schema **仅用于类型安全的查询构建**，不参与建表。两者的一致性通过以下方式保证：`schema.ts` 顶部添加注释 `// ⚠️ 表结构以 database.ts 中的 CREATE TABLE SQL 为准，修改字段时需同步两处`，并在 `database.test.ts` 中增加一条测试，验证实际数据库的列名集合与 Drizzle schema 导出的列名集合一致 |
| CHECK 约束      | `messages.role` 的 `CHECK(role IN ('user','assistant','system','tool'))` 约束**仅在 `database.ts` 的手写建表 SQL 中定义**。Drizzle schema 中 `role` 字段定义为普通 `text` 类型（Drizzle 不原生支持 CHECK），类型层面的约束通过 TypeScript 类型 `'user' \| 'assistant' \| 'system' \| 'tool'` 在应用层保证                                                                                                                                                                                                          |
| 未找到返回约定  | 所有"查询单条记录未找到"的场景统一返回 **`undefined`**（与 Drizzle `.get()` 原生返回值一致，无需额外转换）。包括：`getConversation`、`getSetting`、`getPluginData`                                                                                                                                                                                                                                                                                                                                                 |

**架构设计：Database 类与 CRUD 函数的关系**：

```
Database 类（database.ts）
  ├── 构造函数：仅保存路径参数，不打开连接。内部状态标记为「未初始化」
  ├── initialize()：打开 better-sqlite3 连接 → PRAGMA foreign_keys = ON → 执行建表 → 创建 Drizzle 实例 → 标记为「已初始化」
  ├── close()：关闭 better-sqlite3 连接，标记为「已关闭」
  ├── 暴露 drizzle 实例属性：db.drizzle（类型为 BetterSQLite3Database）— 未初始化时访问抛出 Error
  └── 暴露原生连接属性：db.raw（类型为 BetterSqlite3.Database）— 未初始化时访问抛出 Error

CRUD 函数（crud.ts）
  ├── createCrud(drizzle: BetterSQLite3Database) 工厂函数
  │   └── 返回对象包含所有 CRUD 方法，内部闭包引用传入的 drizzle 实例
  └── 这种依赖注入模式使测试可以传入 :memory: 数据库的 drizzle 实例

测试工具（test-utils.ts，仅测试使用）
  └── createTestDatabase()：创建 :memory: Database 实例 + 返回 { database, crud } 对象
```

**TDD 要求**：

- [x] Red：先写测试，确认失败。具体测试用例见下方。
- [x] Green：安装依赖，实现数据库初始化和 Schema，使测试通过
- [x] Refactor：提取通用 CRUD 工具函数，测试保持通过

**测试用例设计**（Red 阶段编写）：

```typescript
// === src/main/storage/test-utils.ts ===
// 测试专用工具函数，不计入生产代码
import { Database } from './database'
import { createCrud } from './crud'

/**
 * 创建用于测试的内存数据库和 CRUD 实例。
 * 自动初始化表结构和 PRAGMA foreign_keys = ON。
 */
export function createTestDatabase() {
  const database = new Database(':memory:')
  database.initialize()
  const crud = createCrud(database.drizzle)
  return { database, crud }
}

// === src/main/storage/database.test.ts ===
import { Database } from './database'

describe('Database', () => {
  let database: Database

  beforeEach(() => {
    database = new Database(':memory:')
    database.initialize()
  })

  afterEach(() => {
    database.close()
  })

  describe('初始化', () => {
    // 正常路径：数据库初始化成功，4 张表全部存在
    it('初始化后表结构存在', () => {
      const tables = database.raw
        .prepare("SELECT name FROM sqlite_master WHERE type='table'")
        .all() as Array<{ name: string }>
      const tableNames = tables.map((t) => t.name)
      expect(tableNames).toContain('conversations')
      expect(tableNames).toContain('messages')
      expect(tableNames).toContain('plugin_storage')
      expect(tableNames).toContain('settings')
    })

    // 正常路径：外键约束已启用
    it('PRAGMA foreign_keys 已开启', () => {
      const result = database.raw.pragma('foreign_keys') as Array<{ foreign_keys: number }>
      expect(result[0].foreign_keys).toBe(1)
    })

    // 边界条件：重复初始化不抛错
    it('重复初始化不报错', () => {
      expect(() => database.initialize()).not.toThrow()
    })
  })
})

// === src/main/storage/crud.test.ts ===
// 注意：better-sqlite3 + drizzle-orm 的 better-sqlite3 driver 均为同步 API，
// 所有 CRUD 函数为同步函数，测试中不使用 async/await。
import { createTestDatabase } from './test-utils'
import type { Database } from './database'

describe('Schema CRUD 操作', () => {
  let database: Database
  let crud: ReturnType<typeof import('./crud').createCrud>

  beforeEach(() => {
    const testDb = createTestDatabase()
    database = testDb.database
    crud = testDb.crud
  })

  afterEach(() => {
    database.close()
  })

  describe('conversations 表', () => {
    // 正常路径：创建对话
    it('创建对话并查询', () => {
      const id = 'conv-001'
      crud.insertConversation({
        id,
        title: 'Test Chat',
        createdAt: Date.now(),
        updatedAt: Date.now()
      })
      const conv = crud.getConversation(id)
      expect(conv).toBeDefined()
      expect(conv!.title).toBe('Test Chat')
    })

    // 正常路径：更新对话标题和 updatedAt
    it('更新对话标题和 updatedAt', () => {
      const id = 'conv-002'
      const now = Date.now()
      crud.insertConversation({ id, title: 'Old', createdAt: now, updatedAt: now })
      const later = now + 5000
      crud.updateConversation(id, { title: 'New Title', updatedAt: later })
      const conv = crud.getConversation(id)
      expect(conv!.title).toBe('New Title')
      expect(conv!.updatedAt).toBe(later)
    })

    // 正常路径：删除对话（无关联消息）
    it('删除对话', () => {
      const id = 'conv-003'
      crud.insertConversation({
        id,
        title: 'To Delete',
        createdAt: Date.now(),
        updatedAt: Date.now()
      })
      crud.deleteConversation(id)
      const conv = crud.getConversation(id)
      expect(conv).toBeUndefined()
    })

    // 正常路径：删除对话时级联删除关联消息（ON DELETE CASCADE）
    it('删除对话时级联删除关联消息', () => {
      crud.insertConversation({
        id: 'conv-cascade',
        title: 'Cascade Test',
        createdAt: Date.now(),
        updatedAt: Date.now()
      })
      crud.insertMessage({
        id: 'msg-cascade-1',
        conversationId: 'conv-cascade',
        role: 'user',
        content: 'Hello',
        createdAt: Date.now()
      })
      crud.insertMessage({
        id: 'msg-cascade-2',
        conversationId: 'conv-cascade',
        role: 'assistant',
        content: 'Hi',
        createdAt: Date.now()
      })
      crud.deleteConversation('conv-cascade')
      const messages = crud.getMessagesByConversation('conv-cascade')
      expect(messages).toHaveLength(0)
    })

    // 边界条件：查询不存在的对话
    it('查询不存在的对话返回 undefined', () => {
      const conv = crud.getConversation('nonexistent')
      expect(conv).toBeUndefined()
    })
  })

  describe('messages 表', () => {
    // 每个 messages 测试前先创建所需的 conversation
    beforeEach(() => {
      crud.insertConversation({
        id: 'conv-msg',
        title: 'Chat',
        createdAt: Date.now(),
        updatedAt: Date.now()
      })
    })

    // 正常路径：创建消息（仅必填字段）
    it('创建消息并查询', () => {
      crud.insertMessage({
        id: 'msg-001',
        conversationId: 'conv-msg',
        role: 'user',
        content: 'Hello',
        createdAt: Date.now()
      })
      const messages = crud.getMessagesByConversation('conv-msg')
      expect(messages).toHaveLength(1)
      expect(messages[0].content).toBe('Hello')
      // toolCalls 和 toolResult 为可选字段，未传入时应为 null
      expect(messages[0].toolCalls).toBeNull()
      expect(messages[0].toolResult).toBeNull()
    })

    // 正常路径：创建带 toolCalls 和 toolResult 的消息
    it('创建带 tool 字段的消息', () => {
      const toolCalls = JSON.stringify([{ id: 'call-1', name: 'readFile', args: { path: '/tmp' } }])
      const toolResult = JSON.stringify({ content: 'file content' })
      crud.insertMessage({
        id: 'msg-tool',
        conversationId: 'conv-msg',
        role: 'assistant',
        content: 'Let me read that file.',
        toolCalls,
        toolResult,
        createdAt: Date.now()
      })
      const messages = crud.getMessagesByConversation('conv-msg')
      expect(messages[0].toolCalls).toBe(toolCalls)
      expect(messages[0].toolResult).toBe(toolResult)
    })

    // 正常路径：role 枚举校验（system、tool 角色）
    it('支持所有 role 值：user, assistant, system, tool', () => {
      const roles = ['user', 'assistant', 'system', 'tool'] as const
      roles.forEach((role, i) => {
        crud.insertMessage({
          id: `msg-role-${i}`,
          conversationId: 'conv-msg',
          role,
          content: `${role} message`,
          createdAt: Date.now() + i
        })
      })
      const messages = crud.getMessagesByConversation('conv-msg')
      expect(messages).toHaveLength(4)
    })

    // 正常路径：按时间排序
    it('消息按创建时间排序', () => {
      const now = Date.now()
      crud.insertMessage({
        id: 'msg-1',
        conversationId: 'conv-msg',
        role: 'user',
        content: 'first',
        createdAt: now
      })
      crud.insertMessage({
        id: 'msg-2',
        conversationId: 'conv-msg',
        role: 'assistant',
        content: 'second',
        createdAt: now + 100
      })
      crud.insertMessage({
        id: 'msg-3',
        conversationId: 'conv-msg',
        role: 'user',
        content: 'third',
        createdAt: now + 200
      })
      const messages = crud.getMessagesByConversation('conv-msg')
      expect(messages.map((m) => m.content)).toEqual(['first', 'second', 'third'])
    })

    // 错误处理：外键约束（需要 PRAGMA foreign_keys = ON）
    it('引用不存在的 conversationId 抛错', () => {
      expect(() =>
        crud.insertMessage({
          id: 'msg-bad',
          conversationId: 'nonexistent',
          role: 'user',
          content: 'x',
          createdAt: Date.now()
        })
      ).toThrow()
    })
  })

  describe('settings 表', () => {
    // 正常路径：设置和获取
    it('保存和获取设置值', () => {
      crud.setSetting('theme', 'dark')
      const value = crud.getSetting('theme')
      expect(value).toBe('dark')
    })

    // 正常路径：更新已有设置（upsert 语义）
    it('更新已有设置值', () => {
      crud.setSetting('theme', 'light')
      crud.setSetting('theme', 'dark')
      const value = crud.getSetting('theme')
      expect(value).toBe('dark')
    })

    // 正常路径：删除设置（删除整行记录）
    it('删除设置', () => {
      crud.setSetting('theme', 'dark')
      crud.deleteSetting('theme')
      const value = crud.getSetting('theme')
      expect(value).toBeUndefined()
    })

    // 边界条件：获取不存在的设置
    it('获取不存在的设置返回 undefined', () => {
      const value = crud.getSetting('nonexistent')
      expect(value).toBeUndefined()
    })

    // 正常路径：JSON 序列化的复杂值（由调用者负责序列化）
    it('支持 JSON 序列化的复杂值', () => {
      const config = { provider: 'openai', model: 'gpt-4', temperature: 0.7 }
      crud.setSetting('ai', JSON.stringify(config))
      const value = JSON.parse(crud.getSetting('ai')!)
      expect(value.provider).toBe('openai')
    })

    // 边界条件：删除不存在的设置不抛错
    it('删除不存在的设置不抛错', () => {
      expect(() => crud.deleteSetting('nonexistent')).not.toThrow()
    })
  })

  describe('plugin_storage 表', () => {
    // 正常路径：按插件 ID + key 存取（value 为原始字符串，调用者负责 JSON 序列化）
    it('按 pluginId + key 保存和获取', () => {
      crud.setPluginData('git-helper', 'lastCommit', '"abc123"')
      const value = crud.getPluginData('git-helper', 'lastCommit')
      expect(value).toBe('"abc123"')
    })

    // 正常路径：更新已有 key 的值（upsert 语义）
    it('更新已有 key 的值', () => {
      crud.setPluginData('plugin-a', 'config', '"old"')
      crud.setPluginData('plugin-a', 'config', '"new"')
      expect(crud.getPluginData('plugin-a', 'config')).toBe('"new"')
    })

    // 边界条件：不同插件相同 key 不冲突
    it('不同插件的相同 key 互不干扰', () => {
      crud.setPluginData('plugin-a', 'config', '"a"')
      crud.setPluginData('plugin-b', 'config', '"b"')
      expect(crud.getPluginData('plugin-a', 'config')).toBe('"a"')
      expect(crud.getPluginData('plugin-b', 'config')).toBe('"b"')
    })

    // 正常路径：删除单条插件数据
    it('删除指定 pluginId + key 的数据', () => {
      crud.setPluginData('plugin-a', 'config', '"val"')
      crud.deletePluginData('plugin-a', 'config')
      expect(crud.getPluginData('plugin-a', 'config')).toBeUndefined()
    })

    // 正常路径：删除插件全部数据
    it('删除插件全部数据', () => {
      crud.setPluginData('plugin-a', 'k1', '"v1"')
      crud.setPluginData('plugin-a', 'k2', '"v2"')
      crud.setPluginData('plugin-b', 'k1', '"other"')
      crud.deleteAllPluginData('plugin-a')
      expect(crud.getPluginData('plugin-a', 'k1')).toBeUndefined()
      expect(crud.getPluginData('plugin-a', 'k2')).toBeUndefined()
      // 不影响其他插件
      expect(crud.getPluginData('plugin-b', 'k1')).toBe('"other"')
    })

    // 边界条件：删除不存在的插件数据不抛错
    it('删除不存在的插件数据不抛错', () => {
      expect(() => crud.deletePluginData('unknown', 'missing')).not.toThrow()
      expect(() => crud.deleteAllPluginData('unknown')).not.toThrow()
    })

    // 边界条件：获取不存在的 key 返回 undefined
    it('获取不存在的 key 返回 undefined', () => {
      const value = crud.getPluginData('unknown', 'missing')
      expect(value).toBeUndefined()
    })
  })
})
```

**执行步骤**：

1. **（Red）** 创建 `src/main/storage/test-utils.ts`：测试工具函数（`createTestDatabase`）
2. **（Red）** 编写 `src/main/storage/database.test.ts`：测试数据库初始化和 PRAGMA
3. **（Red）** 编写 `src/main/storage/crud.test.ts`：测试 4 张表的 CRUD（含级联删除、tool 字段、deleteSetting、deletePluginData、deleteAllPluginData、updateConversation 含 updatedAt）
4. 运行 `pnpm test`，确认全部失败
5. **（Green）** 安装依赖：`pnpm add better-sqlite3 drizzle-orm && pnpm add -D drizzle-kit @types/better-sqlite3`
6. **（Green）** 创建 `src/main/storage/schema.ts`：
   - 定义 `conversations`、`messages`、`plugin_storage`、`settings` 四张表（Drizzle 语法）
   - DB 列名 `snake_case`，TS 字段 `camelCase`，通过 Drizzle 列定义映射（如 `conversationId: text('conversation_id')`）
   - `messages.conversationId` 外键添加 `ON DELETE CASCADE`
   - `messages.toolCalls` 和 `messages.toolResult` 为可选 `text` 字段（可为 null）
   - `messages.role` 定义为普通 `text` 类型（CHECK 约束仅在 `database.ts` 的建表 SQL 中定义，Drizzle 不原生支持 CHECK）；TypeScript 层通过联合类型 `'user' | 'assistant' | 'system' | 'tool'` 约束
   - 文件顶部添加注释：`// ⚠️ 表结构以 database.ts 中的 CREATE TABLE SQL 为准，修改字段时需同步两处`
7. **（Green）** 创建 `src/main/storage/database.ts`：
   - 封装 `Database` 类，构造函数**仅保存路径参数**（`:memory:` 或文件路径），不打开连接
   - `initialize()` 方法：打开 `better-sqlite3` 连接 → 执行 `PRAGMA foreign_keys = ON` → 通过 `exec()` 执行 `CREATE TABLE IF NOT EXISTS` 建表（生产和测试使用同一路径，本任务不涉及 migration） → 创建 Drizzle ORM 实例 → 标记为已初始化
   - 暴露 `drizzle` 属性（`BetterSQLite3Database` 类型）— 未初始化时访问抛出 Error
   - 暴露 `raw` 属性（`BetterSqlite3.Database` 类型）— 未初始化时访问抛出 Error
   - `close()` 方法：关闭 `better-sqlite3` 连接
8. **（Green）** 创建 `src/main/storage/crud.ts`：
   - 导出 `createCrud(drizzle: BetterSQLite3Database)` 工厂函数（依赖注入模式）
   - 返回包含所有 CRUD 方法的对象，所有方法均为**同步函数**
   - `insertConversation / getConversation / updateConversation / deleteConversation`
     - `updateConversation(id, fields)` 的 `fields` 类型为 `Pick<Conversation, 'title' | 'updatedAt'>`（仅允许更新 `title` 和 `updatedAt`，`updatedAt` 由**调用者显式传入**，函数不自动填充）
   - `insertMessage / getMessagesByConversation`（`insertMessage` 的 `toolCalls` 和 `toolResult` 参数可选）
   - `getSetting / setSetting / deleteSetting`
   - `getPluginData / setPluginData / deletePluginData / deleteAllPluginData`（upsert 语义：key 存在则更新，不存在则插入；`deletePluginData(pluginId, key)` 删除单条，`deleteAllPluginData(pluginId)` 删除该插件全部数据）
9. 运行 `pnpm test`，确认测试通过
10. **（Refactor）** 统一错误处理和类型导出，再次运行 `pnpm test` 确认通过

**验收标准**：

- [x] 安装 `better-sqlite3` + `drizzle-orm` + `drizzle-kit`（版本锁定在 `pnpm-lock.yaml`）
- [x] `src/main/storage/database.ts` 存在：`Database` 类封装初始化 & 连接管理，构造函数仅存路径不打开连接，`drizzle`/`raw` 属性在未初始化时访问抛出 Error
- [x] `src/main/storage/schema.ts` 存在：Drizzle schema 定义 4 张表（`conversations`、`messages`、`plugin_storage`、`settings`）
- [x] Schema 与 `ARCHITECTURE.md` 第七节 SQL 定义一致（字段名、类型、约束完全匹配），额外增加 `messages` 的 `ON DELETE CASCADE`
- [x] DB 列名 `snake_case`，TS 代码 `camelCase`，通过 Drizzle 列映射转换
- [x] `messages` 表包含 `toolCalls`（可选）和 `toolResult`（可选）字段
- [x] 数据库文件默认存放在 `~/.workbox/data.db`（测试中使用 `:memory:`）
- [x] `Database.initialize()` 执行 `PRAGMA foreign_keys = ON` 并完成建表
- [x] `crud.ts` 导出 `createCrud()` 工厂函数，接收 Drizzle 实例（依赖注入），返回所有 CRUD 方法
- [x] `updateConversation(id, fields)` 的 `fields` 类型为 `Pick<Conversation, 'title' | 'updatedAt'>`，`updatedAt` 由调用者显式传入
- [x] `plugin_storage` CRUD 包含 `deletePluginData(pluginId, key)` 和 `deleteAllPluginData(pluginId)` 方法
- [x] 所有"查询单条未找到"场景统一返回 `undefined`（`getConversation`、`getSetting`、`getPluginData`）
- [x] `schema.ts` 顶部包含同步维护注释，`database.test.ts` 包含列名一致性验证测试
- [x] `messages.role` 的 CHECK 约束仅在 `database.ts` 建表 SQL 中定义，Drizzle schema 中为普通 `text` + TypeScript 联合类型
- [x] 4 张表的 CRUD 测试全部通过（含正常路径、边界条件、外键约束、级联删除、tool 字段、deleteSetting、deletePluginData、deleteAllPluginData）；CRUD 函数为同步 API（与 better-sqlite3 一致）
- [x] TDD 留痕完整：Red 阶段测试失败日志 + Green 阶段通过日志
- [x] `pnpm test` 回归通过
- [x] 提供可复核证据：测试输出 + `pnpm test` 全量结果

> **注意**：应用启动时的数据库初始化集成（在 `src/main/index.ts` 中调用 `Database` 类）不在本任务范围内，将在后续集成任务中处理。

**交付物**：

- [x] `src/main/storage/database.ts`
- [x] `src/main/storage/schema.ts`
- [x] `src/main/storage/crud.ts`（`createCrud` 工厂函数 + 全部 CRUD 方法）
- [x] `src/main/storage/test-utils.ts`（测试工具函数）
- [x] `src/main/storage/database.test.ts`
- [x] `src/main/storage/crud.test.ts`

---

## 1.5 App Shell 基础 UI

**目标**：构建应用主框架 UI，包括侧边栏导航、页面布局和全局状态管理。

**输入/前置条件**：

- 依赖：Phase 0（Tailwind + shadcn/ui）完成
- 推荐在 1.4 之后执行（便于集成数据层），但非强制
- 需读取：`ARCHITECTURE.md` 第三节（渲染进程）、第八节（renderer 目录结构）
- 需安装：`zustand`（状态管理）、`lucide-react`（图标）
- 测试依赖确认：`@testing-library/react`、`@testing-library/user-event` 已在 Phase 0 配置

**验证策略**：A 类（严格 TDD）

**关键决策**：

| 决策项             | 方案                                                                                                                 |
| ------------------ | -------------------------------------------------------------------------------------------------------------------- |
| 页面切换方案       | Zustand `currentPage` + 条件渲染（不引入 React Router，4 个固定页面无需 URL 路由）                                   |
| 页面列表           | Home（首页/欢迎页）、Chat（AI 对话占位）、Plugins（插件管理占位）、Settings（设置占位）                              |
| 状态管理           | Zustand v5+，`src/renderer/src/stores/app.store.ts`                                                                  |
| PageId 类型定义    | 在 store 文件中定义并导出 `type PageId = 'home' \| 'chat' \| 'plugins' \| 'settings'`，供组件引用                    |
| 布局结构           | 左侧 Sidebar（可折叠）+ 右侧内容区（根据 `currentPage` 条件渲染）                                                    |
| 图标库             | `lucide-react`（ARCHITECTURE.md 未限定，选择轻量且与 shadcn/ui 一致的方案）                                          |
| shadcn/ui 新增组件 | 可按需添加 `Tooltip`、`Separator` 等，通过 `npx shadcn@latest add` 安装                                              |
| 组件文件命名       | PascalCase：`AppLayout.tsx`、`Sidebar.tsx`（遵循 CLAUDE.md 命名约定）                                                |
| 测试方式           | Zustand store 用纯单元测试（node 环境即可）；React 组件用 `@testing-library/react` + jsdom                           |
| 主题默认值         | 默认 `'dark'`（Electron 桌面应用惯例）；此阶段仅在 store 中定义，不实际应用到 DOM；1.6 阶段接入持久化和 CSS 变量切换 |
| 侧边栏折叠实现     | 折叠时文字标签使用 `sr-only` 类隐藏（保留在 DOM 中供屏幕阅读器访问），**不使用条件渲染移除**                         |
| 导航项 DOM 约定    | 每个导航项容器必须带 `data-testid="nav-{pageId}"` 和 `data-active="true/false"` 属性                                 |

**TDD 要求**：

- [x] Red：先写测试，确认失败。具体测试用例见下方。
- [x] Green：实现 App Shell 组件和 Zustand store，使测试通过
- [x] Refactor：整理组件结构和样式，测试保持通过

**测试用例设计**（Red 阶段编写）：

```typescript
// === src/renderer/src/stores/app.store.test.ts ===
// 注意：Zustand v5 无内置 getInitialState()，需从 store 文件手动导出 initialState
import { useAppStore, initialAppState } from './app.store'

describe('useAppStore', () => {
  beforeEach(() => {
    // 用导出的初始状态重置 store
    useAppStore.setState(initialAppState, true)
  })

  describe('导航状态', () => {
    // 正常路径
    it('默认页面为 home', () => {
      expect(useAppStore.getState().currentPage).toBe('home')
    })

    it('setCurrentPage 切换当前页面', () => {
      useAppStore.getState().setCurrentPage('chat')
      expect(useAppStore.getState().currentPage).toBe('chat')
    })

    // 边界条件
    it('支持所有有效页面值', () => {
      const pages = ['home', 'chat', 'plugins', 'settings'] as const
      pages.forEach((page) => {
        useAppStore.getState().setCurrentPage(page)
        expect(useAppStore.getState().currentPage).toBe(page)
      })
    })
  })

  describe('侧边栏状态', () => {
    it('默认侧边栏展开', () => {
      expect(useAppStore.getState().sidebarCollapsed).toBe(false)
    })

    it('setSidebarCollapsed 切换折叠状态', () => {
      useAppStore.getState().setSidebarCollapsed(true)
      expect(useAppStore.getState().sidebarCollapsed).toBe(true)
    })
  })

  describe('主题状态', () => {
    it('默认主题为 dark', () => {
      expect(useAppStore.getState().theme).toBe('dark')
    })

    it('setTheme 切换主题', () => {
      useAppStore.getState().setTheme('light')
      expect(useAppStore.getState().theme).toBe('light')
    })
  })
})

// === src/renderer/src/components/Layout/AppLayout.test.tsx ===
import { useAppStore, initialAppState } from '../../stores/app.store'

describe('AppLayout', () => {
  beforeEach(() => {
    useAppStore.setState(initialAppState, true)
  })

  // 正常路径
  it('渲染侧边栏和内容区域', () => {
    render(<AppLayout />)
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
    expect(screen.getByTestId('content')).toBeInTheDocument()
  })

  // 页面切换：根据 currentPage 渲染对应组件
  it('默认渲染 Home 页面', () => {
    render(<AppLayout />)
    expect(screen.getByTestId('page-home')).toBeInTheDocument()
  })

  it('currentPage 为 chat 时渲染 ChatView', () => {
    useAppStore.setState({ currentPage: 'chat' })
    render(<AppLayout />)
    expect(screen.getByTestId('page-chat')).toBeInTheDocument()
  })
})

// === src/renderer/src/components/Sidebar/Sidebar.test.tsx ===
import { useAppStore, initialAppState } from '../../stores/app.store'

describe('Sidebar', () => {
  beforeEach(() => {
    useAppStore.setState(initialAppState, true)
  })

  // 正常路径：通过 data-testid 定位导航项，避免文本正则匹配的脆弱性
  it('渲染所有导航项', () => {
    render(<Sidebar />)
    expect(screen.getByTestId('nav-home')).toBeInTheDocument()
    expect(screen.getByTestId('nav-chat')).toBeInTheDocument()
    expect(screen.getByTestId('nav-plugins')).toBeInTheDocument()
    expect(screen.getByTestId('nav-settings')).toBeInTheDocument()
  })

  // 交互验证：点击导航项更新 store
  it('点击导航项切换当前页面', async () => {
    render(<Sidebar />)
    await userEvent.click(screen.getByTestId('nav-chat'))
    expect(useAppStore.getState().currentPage).toBe('chat')
  })

  // 高亮当前活跃项：直接通过 data-testid 获取导航项容器，检查 data-active
  it('当前页面的导航项具有 active 样式', () => {
    useAppStore.setState({ currentPage: 'settings' })
    render(<Sidebar />)
    expect(screen.getByTestId('nav-settings')).toHaveAttribute('data-active', 'true')
    expect(screen.getByTestId('nav-home')).toHaveAttribute('data-active', 'false')
  })

  // 边界条件：折叠状态下文字标签用 sr-only 隐藏（保留在 DOM 中），不可见但可被屏幕阅读器访问
  it('折叠状态下导航项文字标签不可见', () => {
    useAppStore.setState({ sidebarCollapsed: true })
    render(<Sidebar />)
    // 文字仍在 DOM 中（sr-only），但视觉不可见
    const label = screen.getByTestId('nav-home').querySelector('[class*="sr-only"]')
    expect(label).toBeInTheDocument()
  })
})
```

**执行步骤**：

1. **（准备）** 安装依赖：`pnpm add zustand lucide-react`
2. **（Red）** 编写 `src/renderer/src/stores/app.store.test.ts`：测试 Zustand store 的导航/侧边栏/主题状态
3. **（Red）** 编写 `src/renderer/src/components/Layout/AppLayout.test.tsx`：测试布局渲染和页面条件渲染
4. **（Red）** 编写 `src/renderer/src/components/Sidebar/Sidebar.test.tsx`：测试导航项渲染、点击切换和折叠状态
5. 运行 `pnpm test`，确认全部失败
6. **（Green）** 实现 `src/renderer/src/stores/app.store.ts`：
   - 导出 `type PageId = 'home' | 'chat' | 'plugins' | 'settings'`
   - 导出 `initialAppState` 对象（包含所有初始状态值，供测试 reset 使用）
   - 导出 `useAppStore`（Zustand store）
   - 状态：`currentPage: PageId`、`sidebarCollapsed: boolean`、`theme: 'light' | 'dark'`
   - Actions：`setCurrentPage`、`setSidebarCollapsed`、`setTheme`
7. **（Green）** 创建页面占位组件（每个组件渲染标题文字 + `data-testid="page-{name}"`）：
   - `src/renderer/src/features/home/HomeView.tsx`（首页/欢迎页）
   - `src/renderer/src/features/chat/ChatView.tsx`（AI 对话占位）
   - `src/renderer/src/features/plugins/PluginListView.tsx`（插件管理占位）
   - `src/renderer/src/features/settings/SettingsView.tsx`（设置占位）
8. **（Green）** 实现 `src/renderer/src/components/Layout/AppLayout.tsx`：
   - 左侧 Sidebar + 右侧内容区布局
   - 内容区根据 `useAppStore` 的 `currentPage` 条件渲染对应页面组件
   - 使用 Tailwind CSS 样式
9. **（Green）** 实现 `src/renderer/src/components/Sidebar/Sidebar.tsx`：
   - 4 个导航项：Home、Chat、Plugins、Settings
   - 每个导航项容器带 `data-testid="nav-{pageId}"` 和 `data-active="true"/"false"` 属性
   - 图标使用 `lucide-react`
   - 点击导航项调用 `setCurrentPage()` 切换页面
   - 支持折叠/展开：折叠时文字标签添加 `sr-only` 类（CSS 隐藏，保留 DOM 元素），展开时正常显示
   - 高亮当前活跃项（通过 `data-active` 属性标识）
10. **（Green）** 更新 `src/renderer/src/App.tsx`：渲染 `<AppLayout />`
11. 运行 `pnpm test`，确认测试通过
12. **（Refactor）** 整理组件结构和 CSS 类名，再次运行 `pnpm test` 确认通过

**验收标准**：

- [x] 安装 `zustand`、`lucide-react`（版本锁定在 `pnpm-lock.yaml`）
- [x] `src/renderer/src/stores/app.store.ts` 存在：Zustand store 含 `currentPage`/`sidebarCollapsed`/`theme` 状态
- [x] `src/renderer/src/components/Layout/AppLayout.tsx` 存在：左侧 Sidebar + 右侧内容区，内容区根据 `currentPage` 条件渲染
- [x] `src/renderer/src/components/Sidebar/Sidebar.tsx` 存在：可折叠侧边栏，图标导航，点击切换 `currentPage`
- [x] 4 个页面占位组件存在：`HomeView.tsx`、`ChatView.tsx`、`PluginListView.tsx`、`SettingsView.tsx`
- [x] `src/renderer/src/App.tsx` 渲染 `<AppLayout />`，点击侧边栏导航可切换页面
- [x] 使用 shadcn/ui 组件（如 `Button`、`Tooltip`、`Separator`，按需通过 `npx shadcn@latest add` 安装）
- [x] TDD 留痕完整：Red 阶段测试失败日志 + Green 阶段通过日志
- [x] Zustand store 单元测试通过
- [x] 组件渲染测试通过（含页面切换、导航点击、折叠状态断言）
- [x] `pnpm dev` 启动无报错，可看到侧边栏 + 内容区布局
- [x] `pnpm test` 回归通过
- [x] 提供可复核证据：测试输出 + 运行态截图（可选）

**交付物**：

- [x] `src/renderer/src/stores/app.store.ts` + 测试
- [x] `src/renderer/src/components/Layout/AppLayout.tsx` + 测试
- [x] `src/renderer/src/components/Sidebar/Sidebar.tsx` + 测试
- [x] 页面占位组件（HomeView、ChatView、PluginListView、SettingsView）
- [x] `src/renderer/src/App.tsx`（集成 AppLayout）

---

## 1.6 设置页面 & 配置持久化

**目标**：实现应用设置页面（主题、AI Provider、插件路径），配置可持久化存储到数据库。

**输入/前置条件**：

- 依赖：Task 1.4（数据存储，settings 表可读写）+ Task 1.5（App Shell UI，Settings 路由已就位）
- 需读取：`ARCHITECTURE.md` 第七节（数据存储 - settings 表）
- 当前状态：SettingsView 为占位组件，需实现完整功能

**验证策略**：A 类（严格 TDD）

**关键决策**：

| 决策项               | 方案                                                                                                             |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 设置分类             | 3 个 Tab：通用设置（主题/语言）、AI 设置（Provider/API Key/Model）、插件设置（插件目录）                         |
| 设置存储方式         | 使用 1.4 的 `settings` 表（key-value 结构，value 为 JSON 字符串）                                                |
| 设置 IPC 通道        | `settings:get`（获取所有设置）、`settings:update`（批量更新）、`settings:reset`（重置为默认值）                  |
| 暗色模式实现         | Tailwind CSS `dark:` class 变体，通过 `document.documentElement.classList.toggle('dark')` 切换                   |
| API Key 安全         | 设置页面中 API Key 输入框使用 `type="password"` 显示，存储时不加密（本地应用，安全性可接受）                     |
| 默认设置值           | 定义 `DEFAULT_SETTINGS` 常量：`theme: 'dark'`、`language: 'zh'`、`aiProvider: 'openai'`、`aiTemperature: 0.7` 等 |
| settings IPC handler | 创建 `src/main/ipc/settings.handler.ts`，在 1.1 的注册机制中注册                                                 |

**TDD 要求**：

- [ ] Red：先写测试，确认失败。具体测试用例见下方。
- [ ] Green：实现设置页面 UI + 配置读写 IPC + 暗色模式切换，使测试通过
- [ ] Refactor：统一设置数据结构和验证逻辑，测试保持通过

**测试用例设计**（Red 阶段编写）：

```typescript
// === src/main/ipc/settings.handler.test.ts ===
describe('settings.handler', () => {
  describe('getSettings', () => {
    // 正常路径
    it('返回所有设置（合并默认值）', async () => {
      const settings = await getSettings()
      expect(settings).toHaveProperty('theme')
      expect(settings).toHaveProperty('aiProvider')
    })

    // 边界条件：数据库为空时返回默认值
    it('无自定义设置时返回全部默认值', async () => {
      const settings = await getSettings()
      expect(settings.theme).toBe('dark')
    })
  })

  describe('updateSettings', () => {
    // 正常路径
    it('更新设置并持久化', async () => {
      await updateSettings({ theme: 'light' })
      const settings = await getSettings()
      expect(settings.theme).toBe('light')
    })

    // 正常路径：部分更新不影响其他设置
    it('部分更新不覆盖其他设置', async () => {
      await updateSettings({ theme: 'light' })
      await updateSettings({ aiProvider: 'claude' })
      const settings = await getSettings()
      expect(settings.theme).toBe('light')
      expect(settings.aiProvider).toBe('claude')
    })

    // 错误处理：无效设置值
    it('无效主题值抛出错误', async () => {
      await expect(updateSettings({ theme: 'invalid' as any })).rejects.toThrow()
    })
  })

  describe('resetSettings', () => {
    it('重置后恢复默认值', async () => {
      await updateSettings({ theme: 'light' })
      await resetSettings()
      const settings = await getSettings()
      expect(settings.theme).toBe('dark')
    })
  })
})

// === src/renderer/src/features/settings/SettingsView.test.tsx ===
describe('SettingsView', () => {
  // 正常路径
  it('渲染设置页面标题', () => {
    render(<SettingsView />)
    expect(screen.getByText(/设置|settings/i)).toBeInTheDocument()
  })

  // 正常路径：显示主题选择
  it('显示主题切换选项', () => {
    render(<SettingsView />)
    expect(screen.getByText(/主题|theme/i)).toBeInTheDocument()
  })

  // 正常路径：显示 AI 设置区域
  it('显示 AI Provider 设置', () => {
    render(<SettingsView />)
    expect(screen.getByText(/ai/i)).toBeInTheDocument()
  })

  // 交互验证：切换暗色模式
  it('切换主题时更新 store', async () => {
    render(<SettingsView />)
    // 模拟主题切换操作
  })
})
```

**执行步骤**：

1. **（Red）** 编写 `src/main/ipc/settings.handler.test.ts`：测试 getSettings/updateSettings/resetSettings
2. **（Red）** 编写 `src/renderer/src/features/settings/SettingsView.test.tsx`：测试 UI 渲染和交互
3. 运行 `pnpm test`，确认全部失败
4. **（Green）** 定义 `AppSettings` 接口和 `DEFAULT_SETTINGS` 常量（放在 `src/shared/types.ts` 或独立文件）
5. **（Green）** 创建 `src/main/ipc/settings.handler.ts`：
   - `getSettings()` → 从 settings 表读取 + 合并默认值
   - `updateSettings(partial)` → 校验 + 写入 settings 表
   - `resetSettings()` → 清除 settings 表
   - 导出 `setupSettingsHandlers(ipcMain)` 注册函数
6. 在 `src/main/ipc/register.ts` 中注册 settings handler
7. **（Green）** 实现 `src/renderer/src/features/settings/SettingsView.tsx`：
   - 3 个设置分区：通用、AI、插件
   - 通用：主题选择（light/dark）、语言选择（en/zh）
   - AI：Provider 下拉、API Key 密码框、Base URL 输入、模型选择、Temperature 滑块
   - 插件：插件目录路径显示
   - 保存按钮：调用 `window.workbox.settings.update()`
8. **（Green）** 实现暗色模式切换逻辑：
   - 在 App 根组件监听 `theme` 变化，切换 `document.documentElement.classList`
   - 使用 Tailwind `dark:` 变体
9. 运行 `pnpm test`，确认测试通过
10. **（Refactor）** 整理设置表单组件，提取通用表单项组件，再次运行 `pnpm test` 确认通过

**验收标准**：

- [ ] `src/main/ipc/settings.handler.ts` 存在，导出 `setupSettingsHandlers` 函数
- [ ] 实现 `getSettings()` → 返回合并默认值后的完整设置对象
- [ ] 实现 `updateSettings(partial)` → 部分更新设置并持久化
- [ ] 实现 `resetSettings()` → 重置为默认值
- [ ] `src/renderer/src/features/settings/SettingsView.tsx` 存在，包含：
  - [ ] 通用设置：主题切换（亮/暗）、语言选择
  - [ ] AI 设置：Provider 配置（API Key、Base URL、模型选择）
  - [ ] 插件设置：插件目录路径
- [ ] 暗色模式切换生效：`document.documentElement` 正确添加/移除 `dark` class
- [ ] 设置保存后重启应用仍保留（通过 IPC → settings 表持久化）
- [ ] TDD 留痕完整：Red 阶段测试失败日志 + Green 阶段通过日志
- [ ] `pnpm test` 回归通过
- [ ] 提供可复核证据：测试输出 + 运行态截图（可选）

**交付物**：

- [ ] `src/main/ipc/settings.handler.ts` + 测试
- [ ] `src/renderer/src/features/settings/SettingsView.tsx` + 测试
- [ ] `AppSettings` 接口 + `DEFAULT_SETTINGS` 常量
- [ ] 暗色模式切换逻辑
- [ ] `src/main/ipc/register.ts` 更新（注册 settings handler）
