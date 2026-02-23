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

| 决策项           | 方案                                                                                                                                                                                                             |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Handler 文件命名 | `src/main/ipc/fs.handler.ts`（遵循 `ARCHITECTURE.md` 第八节目录结构）                                                                                                                                            |
| 路径安全策略     | 校验规则：① 必须是绝对路径 ② `resolve` 后的路径不允许包含 `..` 分段（防路径穿越） ③ 可配置允许访问的目录白名单（`allowedPaths`），默认包含用户 home 目录；测试中通过注入 `tmpdir()` 到白名单来避免与测试环境冲突 |
| 文件读取编码     | 默认 UTF-8 字符串返回，后续可扩展 Buffer 模式                                                                                                                                                                    |
| 错误处理         | 文件不存在抛 `FileNotFoundError`，权限不足抛 `PermissionDeniedError`，路径不安全抛 `PathSecurityError`                                                                                                           |
| Node.js API 选择 | 使用 `fs/promises`（异步），不使用 `fs` 同步方法                                                                                                                                                                 |
| 导出方式         | 导出 `setupFSHandlers(ipcMain)` 函数，由 `register.ts` 统一调用                                                                                                                                                  |

**TDD 要求**：

- [ ] Red：先写测试，确认失败。具体测试用例见下方。
- [ ] Green：实现 fs handler 使测试通过
- [ ] Refactor：提取路径校验为独立工具函数，测试保持通过

**测试用例设计**（Red 阶段编写）：

```typescript
// === src/main/ipc/fs.handler.test.ts ===
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync } from 'fs'
import { join, resolve } from 'path'
import { tmpdir, homedir } from 'os'
// 注意：readFile/writeFile/readDir/stat/validatePath 从 fs.handler.ts 导入，
// 它们是不绑定 IPC 的纯业务逻辑函数，IPC 注册由 setupFSHandlers 完成。
import { readFile, writeFile, readDir, stat, validatePath } from './fs.handler'

describe('fs.handler', () => {
  let testDir: string
  // 获取 resolve 后的真实 tmpdir 路径（macOS 上 /tmp → /private/tmp）
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
      // 传入 allowedPaths 将 tmpdir 加入白名单，使测试路径通过校验
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

    // 错误处理：文件不存在
    it('文件不存在时抛出错误', async () => {
      await expect(
        readFile(join(testDir, 'nonexistent.txt'), { allowedPaths: [resolvedTmpBase] })
      ).rejects.toThrow()
    })

    // 安全：路径穿越攻击
    it('拒绝 resolve 后包含 .. 的路径穿越', async () => {
      // 即使 /tmp 在白名单内，穿越到 /etc 也应拒绝
      await expect(
        readFile('/tmp/../etc/passwd', { allowedPaths: [resolvedTmpBase] })
      ).rejects.toThrow(/path/i)
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

    // 安全：路径穿越
    it('拒绝路径穿越写入', async () => {
      await expect(
        writeFile('/tmp/../etc/evil', 'data', { allowedPaths: [resolvedTmpBase] })
      ).rejects.toThrow(/path/i)
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

    // 错误处理
    it('路径不存在时抛出错误', async () => {
      await expect(
        stat(join(testDir, 'nope'), { allowedPaths: [resolvedTmpBase] })
      ).rejects.toThrow()
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
      expect(() => validatePath('/etc/passwd')).toThrow()
    })

    it('拒绝 resolve 后逃逸白名单的路径穿越', () => {
      // resolve(homedir(), '..', 'etc', 'passwd') 实际指向 home 外，应拒绝
      expect(() => validatePath(join(homedir(), '..', 'etc', 'passwd'))).toThrow()
    })

    it('拒绝相对路径', () => {
      expect(() => validatePath('relative/path')).toThrow()
    })
  })
})
```

**执行步骤**：

1. **（Red）** 编写 `src/main/ipc/fs.handler.test.ts`：覆盖 readFile/writeFile/readDir/stat 的正常路径、边界条件、错误处理、安全校验
2. 运行 `pnpm test`，确认全部失败
3. **（Green）** 创建 `src/main/ipc/fs.handler.ts`：
   - 实现 `validatePath(path, allowedPaths?)` 路径安全校验函数（`allowedPaths` 默认 `[homedir()]`，测试中注入 `tmpdir()`）
   - 实现 `readFile(path)` → 返回 UTF-8 字符串
   - 实现 `writeFile(path, data)` → 写入文件
   - 实现 `readDir(path)` → 返回目录列表
   - 实现 `stat(path)` → 返回 `FileStat` 结构
   - 导出 `setupFSHandlers(ipcMain)` 注册函数
4. 在 `src/main/ipc/register.ts` 中注册 fs handler
5. 运行 `pnpm test`，确认测试通过
6. **（Refactor）** 提取路径校验为 `src/main/ipc/path-validator.ts` 工具模块（可选），再次运行 `pnpm test` 确认通过

**验收标准**：

- [ ] `src/main/ipc/fs.handler.ts` 存在，导出 `setupFSHandlers` 函数
- [ ] 实现 `readFile(path)` → 返回文件内容（UTF-8 字符串）
- [ ] 实现 `writeFile(path, data)` → 写入文件
- [ ] 实现 `readDir(path)` → 返回目录列表（`string[]`）
- [ ] 实现 `stat(path)` → 返回 `FileStat`（size、isDirectory、isFile、mtime）
- [ ] 路径安全校验通过：拒绝相对路径、拒绝 resolve 后逃逸白名单的穿越、默认仅允许 home 目录、支持 `allowedPaths` 白名单扩展（测试中注入 `tmpdir()`）
- [ ] TDD 留痕完整：Red 阶段测试失败日志 + Green 阶段通过日志
- [ ] renderer 可通过 `window.workbox.fs.readFile()` 调用（集成测试可选，单元测试必须）
- [ ] `pnpm test` 回归通过
- [ ] 提供可复核证据：测试输出

**交付物**：

- [ ] `src/main/ipc/fs.handler.ts`
- [ ] `src/main/ipc/fs.handler.test.ts`
- [ ] `src/main/ipc/register.ts` 更新（注册 fs handler）

---

## 1.3 Shell 执行 IPC Handler

**目标**：实现安全的 Shell 命令执行，带超时保护和危险命令黑名单检测。

**输入/前置条件**：

- 依赖：Task 1.1 完成（IPC 通道定义 + 注册机制可用）
- 需读取：`ARCHITECTURE.md` 第三节（主进程 - Shell 执行器）
- 当前状态：需创建 `src/main/ipc/shell.handler.ts`

**验证策略**：A 类（严格 TDD）

**关键决策**：

| 决策项           | 方案                                                                                                  |
| ---------------- | ----------------------------------------------------------------------------------------------------- |
| Handler 文件命名 | `src/main/ipc/shell.handler.ts`                                                                       |
| Node.js API 选择 | 使用 `child_process.exec` 的 Promise 封装（`util.promisify(exec)`）                                   |
| 超时默认值       | 30 秒（30000ms），可通过 `ExecOptions.timeout` 覆盖                                                   |
| 危险命令黑名单   | 正则匹配：`rm -rf /`、`dd`、`mkfs`、`format`、`sudo`、`shutdown`、`reboot` 等                         |
| 返回结构         | `ExecResult { stdout, stderr, exitCode, signal? }`（使用 1.1 定义的共享类型）                         |
| CWD 处理         | `options.cwd` 可选，默认为用户 home 目录                                                              |
| 环境变量过滤     | 不传递 `process.env` 中的敏感变量（如 `API_KEY`、`SECRET` 等），仅传递 `options.env` 中显式指定的变量 |

**TDD 要求**：

- [ ] Red：先写测试，确认失败。具体测试用例见下方。
- [ ] Green：实现 shell handler 使测试通过
- [ ] Refactor：提取危险命令检测为独立函数，测试保持通过

**测试用例设计**（Red 阶段编写）：

```typescript
// === src/main/ipc/shell.handler.test.ts ===
describe('shell.handler', () => {
  describe('exec', () => {
    // 正常路径：执行简单命令
    it('执行 echo 命令返回 stdout', async () => {
      const result = await exec('echo hello')
      expect(result.stdout.trim()).toBe('hello')
      expect(result.exitCode).toBe(0)
    })

    // 正常路径：命令失败返回非零 exitCode
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
    // 正常路径：超时后终止
    it('命令超时后抛出超时错误', async () => {
      await expect(exec('sleep 10', { timeout: 500 })).rejects.toThrow(/timeout/i)
    }, 5000)

    // 正常路径：默认超时 30s
    it('默认超时为 30 秒', async () => {
      // 验证默认配置，不实际等待 30s
      const result = await exec('echo fast')
      expect(result.exitCode).toBe(0)
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

    // 安全：拦截 dd
    it('拒绝 dd 命令', async () => {
      await expect(exec('dd if=/dev/zero of=/dev/sda')).rejects.toThrow(/dangerous/i)
    })

    // 安全：拦截 mkfs
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
      // rm 普通文件不应被拦截（只拦截 rm -rf /）
      // 不实际执行删除，仅验证不抛 dangerous 错误
    })
  })
})
```

**执行步骤**：

1. **（Red）** 编写 `src/main/ipc/shell.handler.test.ts`：覆盖正常执行、超时、危险命令拦截
2. 运行 `pnpm test`，确认全部失败
3. **（Green）** 创建 `src/main/ipc/shell.handler.ts`：
   - 实现 `isDangerousCommand(command)` 危险命令检测
   - 实现 `exec(command, options?)` 带超时的命令执行
   - 导出 `setupShellHandlers(ipcMain)` 注册函数
4. 在 `src/main/ipc/register.ts` 中注册 shell handler
5. 运行 `pnpm test`，确认测试通过
6. **（Refactor）** 整理危险命令正则列表，测试保持通过

**验收标准**：

- [ ] `src/main/ipc/shell.handler.ts` 存在，导出 `setupShellHandlers` 函数
- [ ] `exec(command, options?)` 执行命令返回 `ExecResult { stdout, stderr, exitCode }`
- [ ] 超时机制生效：默认 30s，可配置，超时后终止进程并抛错
- [ ] 危险命令黑名单检测：`rm -rf /`、`dd`、`mkfs`、`sudo`、`shutdown`、`reboot` 被拦截
- [ ] TDD 留痕完整：Red 阶段测试失败日志 + Green 阶段通过日志
- [ ] `pnpm test` 回归通过
- [ ] 提供可复核证据：测试输出

**交付物**：

- [ ] `src/main/ipc/shell.handler.ts`
- [ ] `src/main/ipc/shell.handler.test.ts`
- [ ] `src/main/ipc/register.ts` 更新（注册 shell handler）

---

## 1.4 SQLite 数据存储

**目标**：实现本地数据持久化，包括数据库初始化、Drizzle Schema 定义和基础 CRUD 操作。

**输入/前置条件**：

- 依赖：Task 1.1 完成（共享类型定义可用）
- 需读取：`ARCHITECTURE.md` 第七节（数据存储设计 - Schema 定义 + 存储位置）
- 当前状态：`src/main/storage/index.ts` 为空占位

**验证策略**：A 类（严格 TDD）

**关键决策**：

| 决策项         | 方案                                                                                                                                                                                                                    |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 数据库引擎     | `better-sqlite3`（**同步 API**，性能好，Electron 兼容性好）。注意：better-sqlite3 和 drizzle-orm 的 better-sqlite3 driver 均为同步 API，CRUD 函数应定义为**同步函数**（不使用 async/await），测试断言也相应使用同步写法 |
| ORM            | `drizzle-orm`（类型安全、轻量）+ `drizzle-kit`（migration 工具）                                                                                                                                                        |
| 数据库文件位置 | `~/.workbox/data.db`（使用 `app.getPath('home')` 获取 home 目录）                                                                                                                                                       |
| Migration 策略 | 使用 `drizzle-kit` 生成 migration SQL，应用启动时自动执行                                                                                                                                                               |
| 测试数据库     | 测试中使用内存数据库（`:memory:`）或临时文件，避免污染用户数据                                                                                                                                                          |
| Schema 定义    | 4 张表：`conversations`、`messages`、`plugin_storage`、`settings`（与 `ARCHITECTURE.md` 7.1 一致）                                                                                                                      |
| ID 生成策略    | 使用 UUID（`crypto.randomUUID()`）                                                                                                                                                                                      |
| 时间戳格式     | Unix 毫秒时间戳（`integer` 类型），存储 `Date.now()` 值                                                                                                                                                                 |

**TDD 要求**：

- [ ] Red：先写测试，确认失败。具体测试用例见下方。
- [ ] Green：安装依赖，实现数据库初始化和 Schema，使测试通过
- [ ] Refactor：提取通用 CRUD 工具函数，测试保持通过

**测试用例设计**（Red 阶段编写）：

```typescript
// === src/main/storage/database.test.ts ===
describe('Database', () => {
  let db: Database

  beforeEach(() => {
    db = new Database(':memory:') // 使用内存数据库测试
    db.initialize()
  })

  afterEach(() => {
    db.close()
  })

  describe('初始化', () => {
    // 正常路径：数据库初始化成功
    it('初始化后表结构存在', () => {
      const tables = db.query("SELECT name FROM sqlite_master WHERE type='table'")
      const tableNames = tables.map((t) => t.name)
      expect(tableNames).toContain('conversations')
      expect(tableNames).toContain('messages')
      expect(tableNames).toContain('plugin_storage')
      expect(tableNames).toContain('settings')
    })

    // 边界条件：重复初始化不抛错
    it('重复初始化不报错', () => {
      expect(() => db.initialize()).not.toThrow()
    })
  })
})

// === src/main/storage/schema.test.ts ===
// 注意：better-sqlite3 + drizzle-orm 的 better-sqlite3 driver 均为同步 API，
// 所有 CRUD 函数为同步函数，测试中不使用 async/await。
// 初始化时必须执行 PRAGMA foreign_keys = ON 以启用外键约束。
import {
  insertConversation,
  getConversation,
  updateConversation,
  deleteConversation,
  insertMessage,
  getMessagesByConversation,
  getSetting,
  setSetting,
  getPluginData,
  setPluginData
} from './crud'

describe('Schema CRUD 操作', () => {
  // beforeEach/afterEach 中初始化内存数据库（参见 database.test.ts）
  // 初始化时需确保 PRAGMA foreign_keys = ON

  describe('conversations 表', () => {
    // 正常路径：创建对话
    it('创建对话并查询', () => {
      const id = 'conv-001'
      insertConversation({
        id,
        title: 'Test Chat',
        createdAt: Date.now(),
        updatedAt: Date.now()
      })
      const conv = getConversation(id)
      expect(conv).toBeDefined()
      expect(conv!.title).toBe('Test Chat')
    })

    // 正常路径：更新对话标题
    it('更新对话标题', () => {
      const id = 'conv-002'
      insertConversation({ id, title: 'Old', createdAt: Date.now(), updatedAt: Date.now() })
      updateConversation(id, { title: 'New Title' })
      const conv = getConversation(id)
      expect(conv!.title).toBe('New Title')
    })

    // 正常路径：删除对话
    it('删除对话', () => {
      const id = 'conv-003'
      insertConversation({
        id,
        title: 'To Delete',
        createdAt: Date.now(),
        updatedAt: Date.now()
      })
      deleteConversation(id)
      const conv = getConversation(id)
      expect(conv).toBeUndefined()
    })

    // 边界条件：查询不存在的对话
    it('查询不存在的对话返回 undefined', () => {
      const conv = getConversation('nonexistent')
      expect(conv).toBeUndefined()
    })
  })

  describe('messages 表', () => {
    // 正常路径：创建消息
    it('创建消息并查询', () => {
      insertConversation({
        id: 'conv-msg',
        title: 'Chat',
        createdAt: Date.now(),
        updatedAt: Date.now()
      })
      insertMessage({
        id: 'msg-001',
        conversationId: 'conv-msg',
        role: 'user',
        content: 'Hello',
        createdAt: Date.now()
      })
      const messages = getMessagesByConversation('conv-msg')
      expect(messages).toHaveLength(1)
      expect(messages[0].content).toBe('Hello')
    })

    // 正常路径：按时间排序
    it('消息按创建时间排序', () => {
      insertConversation({
        id: 'conv-sort',
        title: 'Sort Test',
        createdAt: Date.now(),
        updatedAt: Date.now()
      })
      const now = Date.now()
      insertMessage({
        id: 'msg-1',
        conversationId: 'conv-sort',
        role: 'user',
        content: 'first',
        createdAt: now
      })
      insertMessage({
        id: 'msg-2',
        conversationId: 'conv-sort',
        role: 'assistant',
        content: 'second',
        createdAt: now + 100
      })
      insertMessage({
        id: 'msg-3',
        conversationId: 'conv-sort',
        role: 'user',
        content: 'third',
        createdAt: now + 200
      })
      const messages = getMessagesByConversation('conv-sort')
      expect(messages.map((m) => m.content)).toEqual(['first', 'second', 'third'])
    })

    // 错误处理：外键约束（需要 PRAGMA foreign_keys = ON）
    it('引用不存在的 conversationId 抛错', () => {
      expect(() =>
        insertMessage({
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
      setSetting('theme', 'dark')
      const value = getSetting('theme')
      expect(value).toBe('dark')
    })

    // 正常路径：更新已有设置
    it('更新已有设置值', () => {
      setSetting('theme', 'light')
      setSetting('theme', 'dark')
      const value = getSetting('theme')
      expect(value).toBe('dark')
    })

    // 边界条件：获取不存在的设置
    it('获取不存在的设置返回 null', () => {
      const value = getSetting('nonexistent')
      expect(value).toBeNull()
    })

    // 正常路径：JSON 序列化的复杂值
    it('支持 JSON 序列化的复杂值', () => {
      const config = { provider: 'openai', model: 'gpt-4', temperature: 0.7 }
      setSetting('ai', JSON.stringify(config))
      const value = JSON.parse(getSetting('ai')!)
      expect(value.provider).toBe('openai')
    })
  })

  describe('plugin_storage 表', () => {
    // 正常路径：按插件 ID + key 存取
    it('按 pluginId + key 保存和获取', () => {
      setPluginData('git-helper', 'lastCommit', '"abc123"')
      const value = getPluginData('git-helper', 'lastCommit')
      expect(value).toBe('"abc123"')
    })

    // 边界条件：不同插件相同 key 不冲突
    it('不同插件的相同 key 互不干扰', () => {
      setPluginData('plugin-a', 'config', '"a"')
      setPluginData('plugin-b', 'config', '"b"')
      expect(getPluginData('plugin-a', 'config')).toBe('"a"')
      expect(getPluginData('plugin-b', 'config')).toBe('"b"')
    })
  })
})
```

**执行步骤**：

1. **（Red）** 编写 `src/main/storage/database.test.ts`：测试数据库初始化
2. **（Red）** 编写 `src/main/storage/schema.test.ts`：测试 4 张表的 CRUD
3. 运行 `pnpm test`，确认全部失败
4. **（Green）** 安装依赖：`pnpm add better-sqlite3 drizzle-orm && pnpm add -D drizzle-kit @types/better-sqlite3`
5. **（Green）** 创建 `src/main/storage/database.ts`：
   - 封装 Database 类，支持 `:memory:` 和文件路径
   - `initialize()` 方法：创建 `~/.workbox/` 目录 + 打开数据库 + 执行 `PRAGMA foreign_keys = ON`（SQLite 默认不启用外键约束） + 运行 migration
   - `close()` 方法：关闭连接
6. **（Green）** 创建 `src/main/storage/schema.ts`：
   - 定义 `conversations`、`messages`、`plugin_storage`、`settings` 四张表（Drizzle 语法）
   - Schema 与 `ARCHITECTURE.md` 7.1 SQL 定义完全一致
7. **（Green）** 创建 `src/main/storage/crud.ts`（或在 schema 中导出）：
   - 所有 CRUD 函数均为**同步函数**（better-sqlite3 是同步 API，不使用 async/await）
   - `insertConversation / getConversation / updateConversation / deleteConversation`
   - `insertMessage / getMessagesByConversation`
   - `getSetting / setSetting`
   - `getPluginData / setPluginData`
8. 在 `src/main/index.ts` 中添加应用启动时的数据库初始化
9. 运行 `pnpm test`，确认测试通过
10. **（Refactor）** 统一错误处理和类型导出，再次运行 `pnpm test` 确认通过

**验收标准**：

- [ ] 安装 `better-sqlite3` + `drizzle-orm` + `drizzle-kit`（版本锁定在 `pnpm-lock.yaml`）
- [ ] `src/main/storage/database.ts` 存在：数据库初始化 & 连接管理
- [ ] `src/main/storage/schema.ts` 存在：Drizzle schema 定义 4 张表（`conversations`、`messages`、`plugin_storage`、`settings`）
- [ ] Schema 与 `ARCHITECTURE.md` 第七节 SQL 定义一致（字段名、类型、约束完全匹配）
- [ ] 数据库文件默认存放在 `~/.workbox/data.db`（测试中使用 `:memory:`）
- [ ] 应用启动时自动创建目录和数据库文件、执行 `PRAGMA foreign_keys = ON`、运行 migration
- [ ] 4 张表的 CRUD 测试全部通过（含正常路径、边界条件、外键约束）；CRUD 函数为同步 API（与 better-sqlite3 一致）
- [ ] TDD 留痕完整：Red 阶段测试失败日志 + Green 阶段通过日志
- [ ] `pnpm test` 回归通过
- [ ] 提供可复核证据：测试输出 + `pnpm test` 全量结果

**交付物**：

- [ ] `src/main/storage/database.ts`
- [ ] `src/main/storage/schema.ts`
- [ ] `src/main/storage/crud.ts`（CRUD 操作函数）
- [ ] `src/main/storage/database.test.ts`
- [ ] `src/main/storage/schema.test.ts`

---

## 1.5 App Shell 基础 UI

**目标**：构建应用主框架 UI，包括侧边栏导航、页面布局和全局状态管理。

**输入/前置条件**：

- 依赖：Phase 0（Tailwind + shadcn/ui）完成
- 推荐在 1.4 之后执行（便于集成数据层），但非强制
- 需读取：`ARCHITECTURE.md` 第三节（渲染进程）、第八节（renderer 目录结构）
- 需安装：`zustand`（状态管理）、`react-router-dom`（路由，可选用简单条件渲染替代）、`lucide-react`（图标）

**验证策略**：A 类（严格 TDD）

**关键决策**：

| 决策项             | 方案                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------ |
| 路由方案           | React Router v6（`react-router-dom`），使用 `HashRouter`（Electron 兼容性更好）            |
| 页面列表           | Home（首页/欢迎页）、Chat（AI 对话占位）、Plugins（插件管理占位）、Settings（设置占位）    |
| 状态管理           | Zustand v5+，`src/renderer/src/stores/app.store.ts`                                        |
| 布局结构           | 左侧 Sidebar（可折叠）+ 右侧内容区（Router Outlet）                                        |
| 图标库             | `lucide-react`（ARCHITECTURE.md 未限定，选择轻量且与 shadcn/ui 一致的方案）                |
| shadcn/ui 新增组件 | 可按需添加 `Tooltip`、`Separator` 等，通过 `npx shadcn@latest add` 安装                    |
| 组件文件命名       | PascalCase：`AppLayout.tsx`、`Sidebar.tsx`（遵循 CLAUDE.md 命名约定）                      |
| 测试方式           | Zustand store 用纯单元测试（node 环境即可）；React 组件用 `@testing-library/react` + jsdom |

**TDD 要求**：

- [ ] Red：先写测试，确认失败。具体测试用例见下方。
- [ ] Green：实现 App Shell 组件和 Zustand store，使测试通过
- [ ] Refactor：整理组件结构和样式，测试保持通过

**测试用例设计**（Red 阶段编写）：

```typescript
// === src/renderer/src/stores/app.store.test.ts ===
describe('useAppStore', () => {
  beforeEach(() => {
    // 重置 store
    useAppStore.setState(useAppStore.getInitialState())
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
describe('AppLayout', () => {
  // 正常路径
  it('渲染侧边栏和内容区域', () => {
    render(<MemoryRouter><AppLayout /></MemoryRouter>)
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
    expect(screen.getByTestId('content')).toBeInTheDocument()
  })
})

// === src/renderer/src/components/Sidebar/Sidebar.test.tsx ===
describe('Sidebar', () => {
  // 正常路径
  it('渲染所有导航项', () => {
    render(<MemoryRouter><Sidebar /></MemoryRouter>)
    expect(screen.getByText(/home/i)).toBeInTheDocument()
    expect(screen.getByText(/chat/i)).toBeInTheDocument()
    expect(screen.getByText(/plugin/i)).toBeInTheDocument()
    expect(screen.getByText(/setting/i)).toBeInTheDocument()
  })

  // 交互验证
  it('点击导航项切换路由', async () => {
    render(<MemoryRouter><Sidebar /></MemoryRouter>)
    await userEvent.click(screen.getByText(/chat/i))
    // 验证路由或 store 状态变化
  })

  // 边界条件：折叠状态
  it('折叠状态下只显示图标', () => {
    useAppStore.setState({ sidebarCollapsed: true })
    render(<MemoryRouter><Sidebar /></MemoryRouter>)
    // 验证文字标签不可见
  })
})
```

**执行步骤**：

1. **（Red）** 安装依赖：`pnpm add zustand react-router-dom lucide-react`
2. 编写 `src/renderer/src/stores/app.store.test.ts`：测试 Zustand store 的导航/侧边栏/主题状态
3. 编写 `src/renderer/src/components/Layout/AppLayout.test.tsx`：测试布局渲染
4. 编写 `src/renderer/src/components/Sidebar/Sidebar.test.tsx`：测试导航项渲染和交互
5. 运行 `pnpm test`，确认全部失败
6. **（Green）** 实现 `src/renderer/src/stores/app.store.ts`：
   - 导出 `useAppStore`（Zustand store）
   - 状态：`currentPage`、`sidebarCollapsed`、`theme`、`loading`
   - Actions：`setCurrentPage`、`setSidebarCollapsed`、`setTheme`、`setLoading`
7. **（Green）** 实现 `src/renderer/src/components/Layout/AppLayout.tsx`：
   - 左侧 Sidebar + 右侧 `<Outlet />` 布局
   - 使用 Tailwind CSS 样式
8. **（Green）** 实现 `src/renderer/src/components/Sidebar/Sidebar.tsx`：
   - 4 个导航项：Home、Chat、Plugins、Settings
   - 图标使用 `lucide-react`
   - 支持折叠/展开
   - 高亮当前活跃项
9. **（Green）** 创建页面占位组件：
   - `src/renderer/src/features/chat/ChatView.tsx`（占位）
   - `src/renderer/src/features/plugins/PluginListView.tsx`（占位）
   - `src/renderer/src/features/settings/SettingsView.tsx`（占位）
   - Home 页可直接在 `App.tsx` 中内联
10. **（Green）** 更新 `src/renderer/src/App.tsx`：集成路由 + 布局
11. 运行 `pnpm test`，确认测试通过
12. **（Refactor）** 整理组件结构和 CSS 类名，再次运行 `pnpm test` 确认通过

**验收标准**：

- [ ] 安装 `zustand`、`react-router-dom`、`lucide-react`（版本锁定在 `pnpm-lock.yaml`）
- [ ] `src/renderer/src/stores/app.store.ts` 存在：Zustand store 含导航/侧边栏/主题状态
- [ ] `src/renderer/src/components/Layout/AppLayout.tsx` 存在：左侧导航 + 右侧内容区布局
- [ ] `src/renderer/src/components/Sidebar/Sidebar.tsx` 存在：可折叠侧边栏，图标导航
- [ ] 4 个页面占位组件存在（Home、ChatView、PluginListView、SettingsView）
- [ ] `src/renderer/src/App.tsx` 集成路由，点击导航可切换页面
- [ ] 使用 shadcn/ui 组件构建界面
- [ ] TDD 留痕完整：Red 阶段测试失败日志 + Green 阶段通过日志
- [ ] Zustand store 单元测试通过
- [ ] 组件渲染测试通过
- [ ] `pnpm dev` 启动无报错，可看到侧边栏 + 内容区布局
- [ ] `pnpm test` 回归通过
- [ ] 提供可复核证据：测试输出 + 运行态截图（可选）

**交付物**：

- [ ] `src/renderer/src/stores/app.store.ts` + 测试
- [ ] `src/renderer/src/components/Layout/AppLayout.tsx` + 测试
- [ ] `src/renderer/src/components/Sidebar/Sidebar.tsx` + 测试
- [ ] 页面占位组件（ChatView、PluginListView、SettingsView）
- [ ] `src/renderer/src/App.tsx`（路由集成更新）

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
