# Phase 6：打包分发 & 完善

> **目标**：完成产品化准备——多平台打包、自动更新、安全加固、错误处理与日志、性能优化，使应用可分发给用户使用。
>
> **里程碑**：M6 - Release（三平台打包可安装运行，自动更新可用，安全审查通过，全局错误兜底，启动 < 2s）

---

## 任务编号说明

Phase 6 共 5 个任务（6.1–6.5），按职责分为五条线：

- **应用打包**（6.1）：多平台构建配置 + CI 自动发布
- **自动更新**（6.2）：集成 electron-updater + 更新 UI
- **安全加固**（6.3）：CSP、IPC 校验、插件授权
- **错误处理 & 日志**（6.5）：全局错误兜底 + electron-log
- **性能优化**（6.4）：懒加载 + 并行初始化 + 数据库索引

---

## Phase 6 执行前置（必须确认）

在开始任何 Task 前，先记录并确认以下信息：

- [ ] Phase 4 所有任务已完成且 `pnpm test` 全部通过
- [ ] `electron-builder` v26+ 已在 `devDependencies`（当前 `^26.0.12` ✅）
- [ ] `electron-builder.yml` 已存在（当前为基础配置，待完善）
- [ ] `build/entitlements.mac.plist` 已存在（当前含 JIT + unsigned-memory + dyld 权限）
- [ ] `src/main/index.ts` 中 BrowserWindow 配置已设置 `contextIsolation: true` + `nodeIntegration: false`
- [ ] `src/preload/index.ts` 已通过 `contextBridge.exposeInMainWorld` 暴露 `window.workbox.*`
- [ ] `src/shared/ipc-channels.ts` 已定义 47 个 IPC 通道（8 个域）
- [ ] 5 个内置插件已就绪：`terminal`、`git-helper`、`file-explorer`、`json-formatter`、`regex-tester`
- [ ] Native 模块确认：`better-sqlite3`（主进程）、`node-pty`（Terminal 插件）
- [ ] 路径别名 `@main`、`@renderer`、`@shared` 可用
- [ ] `.github/workflows/` 目录不存在，需新建
- [ ] 本阶段不引入 `ARCHITECTURE.md` 与 `ROADMAP.md` 未声明的外部依赖（`electron-updater`、`electron-log` 已在架构文档中声明）
- [ ] 执行任务后必须更新任务状态：将对应的验收标准和交付物清单项标记为 `[x]`

---

## 任务依赖关系 & 推荐执行顺序

### 依赖关系图

```
6.5（错误处理 & 日志）← Phase 1 完成（可独立启动）
6.3（安全加固）← Phase 4 完成（可独立启动）
6.1（应用打包）← Phase 4 完成
  └── 6.2（自动更新）← 依赖 6.1 的打包产物和发布流程
6.4（性能优化）← Phase 5 完成（全部功能就绪后做整体优化）
```

### 推荐执行顺序

```
[6.5] ∥ [6.3] → [6.1 → 6.2] → [6.4]
```

- **6.5（错误处理 & 日志）** 和 **6.3（安全加固）** 可并行执行，且可最先启动
- **6.1（应用打包）** 在 6.5 和 6.3 之后执行（更稳健，打包产物含错误处理和安全加固）
- **6.2（自动更新）** 严格依赖 6.1 完成
- **6.4（性能优化）** 需 Phase 5 全部完成后再执行，放在最后

---

## TDD 分层策略

### A 类：有可测试行为的任务 → 严格 TDD（Red-Green-Refactor）

适用于：6.2、6.3、6.5

1. **Red**：先编写测试（正常路径 + 边界条件 + 错误处理），运行测试，确认失败
2. **Green**：编写最小代码使测试通过
3. **Refactor**：重构并再次运行测试确保通过

### B 类：纯配置/验证 → 验证式测试

适用于：6.1、6.4

1. 编写验证式测试（配置完整性校验、性能基准断言）
2. 实现功能
3. 运行测试确认通过

> **注意**：B 类不豁免测试，仅豁免严格的 Red-Green-Refactor 流程顺序。仍需编写测试保证可回归。

### 统一留痕要求

- [ ] A 类任务：记录 Red 阶段失败测试名称、Green 阶段通过结果、最终回归结果
- [ ] B 类任务：记录验证式测试通过结果
- [ ] 所有任务：`pnpm test` 通过
- [ ] 测试文件与源文件同目录：`*.test.ts` / `*.test.tsx`

---

## 6.5 错误处理 & 日志

**目标**：实现全局错误兜底（主进程 + 渲染进程）和结构化日志系统，保障应用稳定性和问题可追溯性。

**输入/前置条件**：

- 依赖：Phase 1 完成（可提前启动）
- 需读取：`ARCHITECTURE.md` 第七节（7.2 存储位置 - `logs/`）
- 当前状态：
  - 主进程仅有 `console.error` 打印，无 uncaughtException / unhandledRejection 捕获
  - 渲染进程无 ErrorBoundary
  - 插件错误仅 `console.error`，无隔离机制
  - 日志目录 `~/.workbox/logs/` 尚未使用

**验证策略**：A 类（严格 TDD）

**关键决策**：

| 决策项                 | 方案                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| 日志库                 | `electron-log` v5+，ARCHITECTURE.md 指定                                                   |
| 日志路径               | `~/.workbox/logs/`，遵循 7.2 存储位置规范                                                  |
| 日志格式               | `[{date}] [{level}] [{scope}] {message}`，scope 区分 `main`/`renderer`/`plugin:{id}`       |
| 日志轮转               | 单文件最大 10MB，保留最近 5 个文件                                                         |
| 渲染进程 ErrorBoundary | React class component，展示友好错误 UI + "重新加载"按钮                                    |
| 主进程错误捕获         | `process.on('uncaughtException')` + `process.on('unhandledRejection')`，记录日志后优雅退出 |
| 插件错误隔离           | `PluginManager` 中 `activate()` / `deactivate()` 用 try-catch 包裹，错误不传播到主应用     |
| 渲染进程日志传输       | 通过 IPC 通道 `log:write` 将渲染进程日志发送到主进程写入文件                               |

**类型定义**（`src/shared/types.ts` 扩展）：

```typescript
interface LogEntry {
  level: "error" | "warn" | "info" | "debug";
  scope: string;
  message: string;
  timestamp: string;
  meta?: Record<string, unknown>;
}
```

**Logger API 设计**（`src/main/logger.ts`）：

```typescript
interface Logger {
  error(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}

/** 创建带 scope 的 logger 实例 */
function createLogger(scope: string): Logger;

/** 初始化日志系统，配置 electron-log */
function initLogger(): void;

/** 安装全局错误捕获（uncaughtException + unhandledRejection） */
function installGlobalErrorHandlers(): void;
```

**ErrorBoundary 设计**（`src/renderer/src/components/ErrorBoundary.tsx`）：

```typescript
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}
```

**测试用例设计**：

| 类别     | 测试用例                                                          | 预期结果                                |
| -------- | ----------------------------------------------------------------- | --------------------------------------- |
| 正常路径 | `createLogger('main')` 创建 logger 并调用 `info/warn/error/debug` | 日志写入文件，格式正确                  |
| 正常路径 | `installGlobalErrorHandlers()` 注册后抛出未捕获异常               | 异常被捕获，写入日志                    |
| 正常路径 | ErrorBoundary 包裹的子组件抛出错误                                | 显示 fallback UI，错误日志通过 IPC 发送 |
| 正常路径 | 插件 `activate()` 抛出异常                                        | 该插件标记为错误状态，其他插件不受影响  |
| 边界条件 | 日志文件达到 10MB                                                 | 自动轮转，创建新文件                    |
| 边界条件 | 日志 message 包含特殊字符（换行、unicode）                        | 正确写入，不破坏日志格式                |
| 错误处理 | 日志目录不存在                                                    | 自动创建目录                            |
| 错误处理 | 日志写入权限被拒绝                                                | 降级到 console 输出，不抛异常           |

**执行步骤**（Red-Green-Refactor）：

```
Red 阶段：
1. 编写 src/main/logger.test.ts：
   - 测试 createLogger 创建 scope logger
   - 测试各级别日志输出格式
   - 测试 installGlobalErrorHandlers 捕获 uncaughtException
   - 测试日志目录自动创建
2. 编写 src/renderer/src/components/ErrorBoundary.test.tsx：
   - 测试正常渲染子组件
   - 测试子组件抛错后显示 fallback
   - 测试 onError 回调被调用
3. 编写 src/main/plugin/manager.test.ts（新增用例）：
   - 测试单个插件 activate 失败不影响其他插件
4. 运行 pnpm test → 确认全部 FAIL

Green 阶段：
5. 安装 electron-log：pnpm add electron-log
6. 实现 src/main/logger.ts（createLogger + initLogger + installGlobalErrorHandlers）
7. 在 src/main/index.ts 启动时调用 initLogger() 和 installGlobalErrorHandlers()
8. 实现 src/renderer/src/components/ErrorBoundary.tsx
9. 在 src/renderer/src/App.tsx 中用 ErrorBoundary 包裹 AppLayout
10. 在 src/main/plugin/manager.ts 中为 activate()/deactivate() 添加 try-catch 隔离
11. 在 src/shared/ipc-channels.ts 添加 log:write 通道
12. 在 src/preload/index.ts 暴露 window.workbox.log.write()
13. 运行 pnpm test → 确认全部 PASS

Refactor 阶段：
14. 将主进程中散落的 console.error 替换为 logger 调用
15. 运行 pnpm test → 最终确认全部 PASS
```

**验收标准**：

- [ ] 安装 `electron-log` 并配置日志系统：
  - [ ] 日志写入 `~/.workbox/logs/`
  - [ ] 日志格式包含时间戳、级别、作用域
  - [ ] 日志轮转正常工作（最大 10MB / 5 文件）
- [ ] 实现 `src/main/logger.ts`：
  - [ ] `createLogger(scope)` 创建带作用域的 logger
  - [ ] `initLogger()` 初始化 electron-log 配置
  - [ ] `installGlobalErrorHandlers()` 安装 uncaughtException / unhandledRejection 捕获
- [ ] 实现 `src/renderer/src/components/ErrorBoundary.tsx`：
  - [ ] 子组件错误被捕获，显示友好 UI
  - [ ] 提供"重新加载"按钮
  - [ ] 错误信息通过 IPC 发送到主进程记录
- [ ] 插件错误隔离：
  - [ ] `PluginManager.activate()` / `deactivate()` 用 try-catch 包裹
  - [ ] 单个插件崩溃不影响其他插件和主应用
- [ ] 渲染进程日志通道：
  - [ ] `src/shared/ipc-channels.ts` 添加 `log:write` 通道
  - [ ] `src/preload/index.ts` 暴露 `window.workbox.log.write()`
- [ ] 编写测试覆盖：
  - [ ] logger 创建、各级别输出、格式校验
  - [ ] 全局错误捕获
  - [ ] ErrorBoundary 正常 / 错误渲染
  - [ ] 插件错误隔离
- [ ] `pnpm test` 全部通过

**交付物清单**：

- [ ] `src/main/logger.ts` — 日志系统核心
- [ ] `src/main/logger.test.ts` — 日志系统测试
- [ ] `src/renderer/src/components/ErrorBoundary.tsx` — React 错误边界
- [ ] `src/renderer/src/components/ErrorBoundary.test.tsx` — 错误边界测试
- [ ] `src/main/index.ts` — 集成 initLogger + installGlobalErrorHandlers
- [ ] `src/renderer/src/App.tsx` — 集成 ErrorBoundary
- [ ] `src/main/plugin/manager.ts` — 增强错误隔离
- [ ] `src/main/plugin/manager.test.ts` — 新增错误隔离测试用例
- [ ] `src/shared/ipc-channels.ts` — 新增 `log` 通道
- [ ] `src/preload/index.ts` — 新增 `window.workbox.log.*`

**参考文档**：

- `ARCHITECTURE.md` 第七节（7.2 存储位置 - `logs/`）
- `ARCHITECTURE.md` 第三节（进程模型 - 主进程职责）

**反模式警告**：

- ❌ 不要在 `installGlobalErrorHandlers` 中 `process.exit()` 前不写日志，确保日志先落盘
- ❌ 不要在 ErrorBoundary 内使用函数组件，React 的 `componentDidCatch` / `getDerivedStateFromError` 仅 class 组件支持
- ❌ 不要把日志写入应用安装目录（无写权限），必须写入用户数据目录
- ❌ 不要在渲染进程直接 `require('electron-log')`，必须通过 IPC 传输

---

## 6.3 安全加固

**目标**：全面审查和加固应用安全性，包括 CSP 策略、IPC 输入校验、插件授权机制。

**输入/前置条件**：

- 依赖：Phase 4 完成
- 需读取：`ARCHITECTURE.md` 第十一节（11.2 安全规范）、第四节（4.5 权限模型）
- 当前状态：
  - ✅ BrowserWindow 已配置 `contextIsolation: true` + `nodeIntegration: false`
  - ✅ 插件权限声明 + 运行时校验基础设施已就绪（`src/main/plugin/permission.ts`）
  - ⚠️ CSP 策略未配置
  - ⚠️ IPC handler 输入校验不完整（需审计 `src/main/ipc/` 目录下所有 handler）
  - ⚠️ 插件签名验证 / 手动授权流程未实现

**验证策略**：A 类（严格 TDD）

**关键决策**：

| 决策项         | 方案                                                                                                                                |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| CSP 策略       | 通过 `session.defaultSession.webRequest.onHeadersReceived` 注入，dev 模式允许 `'unsafe-eval'`（Vite HMR 需要），production 模式严格 |
| IPC 输入校验库 | 使用项目已有的 `zod`（v4+），对所有 IPC handler 参数做 schema 校验                                                                  |
| 校验位置       | 在每个 IPC handler 函数入口处校验，校验失败抛出标准错误                                                                             |
| 插件授权方式   | 首次安装用户插件时弹出权限确认对话框（Electron `dialog.showMessageBox`），内置插件自动信任                                          |
| 插件信任标识   | 内置插件判断依据：插件目录位于应用安装包内（`app.getAppPath()` 下）                                                                 |
| sandbox 配置   | 保持 `sandbox: false`（当前状态），因 preload 中使用了 Node.js API                                                                  |

**IPC 校验方案设计**（`src/main/ipc/validator.ts`）：

```typescript
import { z } from "zod";

/** 创建带 schema 校验的 IPC handler 包装器 */
function createValidatedHandler<T extends z.ZodType>(
  schema: T,
  handler: (params: z.infer<T>) => Promise<unknown>
): (event: Electron.IpcMainInvokeEvent, ...args: unknown[]) => Promise<unknown>;

/** 标准 IPC 错误响应 */
interface IPCError {
  code: string;
  message: string;
}
```

**CSP 策略设计**：

```typescript
// Production CSP
const PRODUCTION_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'", // Tailwind 需要 inline style
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self' https:", // AI API 请求
  "object-src 'none'",
  "base-uri 'self'"
].join("; ");

// Dev CSP（允许 Vite HMR）
const DEV_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval'", // Vite HMR
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "connect-src 'self' ws: http: https:", // Vite dev server
  "object-src 'none'"
].join("; ");
```

**测试用例设计**：

| 类别     | 测试用例                                       | 预期结果                     |
| -------- | ---------------------------------------------- | ---------------------------- |
| 正常路径 | `createValidatedHandler` 接收合法参数          | handler 正常执行并返回结果   |
| 正常路径 | CSP 策略注入（production 模式）                | response header 包含正确 CSP |
| 正常路径 | 内置插件（路径在 app 目录下）自动信任          | 不弹出授权对话框             |
| 边界条件 | IPC handler 接收空参数 / undefined             | 返回标准错误，不崩溃         |
| 边界条件 | IPC handler 接收超长字符串（>1MB）             | 截断或拒绝，不导致 OOM       |
| 错误处理 | `fs:readFile` 传入路径穿越路径                 | 校验拦截，返回错误           |
| 错误处理 | `shell:exec` 传入危险命令（rm -rf /）          | 校验拦截，返回错误           |
| 错误处理 | IPC handler 参数类型错误（number 传成 string） | zod 校验失败，返回标准错误   |

**执行步骤**（Red-Green-Refactor）：

```
Red 阶段：
1. 编写 src/main/ipc/validator.test.ts：
   - 测试 createValidatedHandler 合法/非法参数
   - 测试标准错误格式
   - 测试超长输入截断
2. 编写 src/main/security/csp.test.ts：
   - 测试 production CSP 字符串格式
   - 测试 dev CSP 包含 unsafe-eval
   - 测试 CSP 注入函数
3. 编写 src/main/plugin/trust.test.ts：
   - 测试内置插件信任判断
   - 测试用户插件需要授权
4. 运行 pnpm test → 确认全部 FAIL

Green 阶段：
5. 实现 src/main/ipc/validator.ts（createValidatedHandler + IPCError）
6. 实现 src/main/security/csp.ts（CSP 策略 + 注入函数）
7. 实现 src/main/plugin/trust.ts（插件信任判断 + 授权流程）
8. 在 src/main/index.ts 中注入 CSP
9. 审计并为 src/main/ipc/*.handler.ts 中的关键 handler 添加 zod schema 校验
10. 运行 pnpm test → 确认全部 PASS

Refactor 阶段：
11. 统一所有 handler 的错误返回格式
12. 运行 pnpm test → 最终确认全部 PASS
```

**验收标准**：

- [ ] 确认所有 `BrowserWindow` 配置：
  - [ ] `contextIsolation: true` ✅（已有）
  - [ ] `nodeIntegration: false` ✅（已有）
- [ ] 实现 CSP 策略：
  - [ ] Production 模式：严格 CSP（禁止 `unsafe-eval`）
  - [ ] Dev 模式：允许 `unsafe-eval`（Vite HMR）
  - [ ] CSP 通过 `session.webRequest.onHeadersReceived` 注入
- [ ] 实现 IPC 输入校验框架：
  - [ ] `src/main/ipc/validator.ts` 提供 `createValidatedHandler`
  - [ ] 使用 zod schema 校验参数
  - [ ] 校验失败返回标准 `IPCError`
- [ ] 审计关键 IPC handler：
  - [ ] `fs:readFile` / `fs:writeFile` — 路径类型校验 + 路径穿越检查
  - [ ] `shell:exec` — 命令字符串校验 + 危险命令检测
  - [ ] `ai:chat` — conversationId + content 类型校验
  - [ ] `settings:update` — settings 对象结构校验
- [ ] 实现插件信任机制：
  - [ ] 内置插件自动信任（路径判断）
  - [ ] 用户插件首次加载弹出权限确认对话框
- [ ] 编写测试覆盖：
  - [ ] validator 合法/非法/边界输入
  - [ ] CSP 策略内容校验
  - [ ] 插件信任判断逻辑
- [ ] `pnpm test` 全部通过

**交付物清单**：

- [ ] `src/main/ipc/validator.ts` — IPC 校验框架
- [ ] `src/main/ipc/validator.test.ts` — 校验框架测试
- [ ] `src/main/security/csp.ts` — CSP 策略
- [ ] `src/main/security/csp.test.ts` — CSP 测试
- [ ] `src/main/plugin/trust.ts` — 插件信任判断
- [ ] `src/main/plugin/trust.test.ts` — 插件信任测试
- [ ] `src/main/index.ts` — 集成 CSP 注入
- [ ] `src/main/ipc/*.handler.ts` — 关键 handler 添加 zod 校验

**参考文档**：

- `ARCHITECTURE.md` 第十一节（11.2 安全规范）
- `ARCHITECTURE.md` 第四节（4.5 权限模型）
- `src/main/ipc/fs.handler.ts` — 现有路径校验逻辑参考
- `src/main/plugin/permission.ts` — 现有权限校验参考

**反模式警告**：

- ❌ 不要在 production 模式允许 `unsafe-eval`，会导致 XSS 攻击面
- ❌ 不要只校验参数类型而不校验值范围（如路径穿越、命令注入）
- ❌ 不要把校验逻辑分散到每个 handler 内部复制粘贴，使用 `createValidatedHandler` 统一包裹
- ❌ 不要信任所有来自 `plugins/` 目录的插件，用户安装的三方插件需要授权

---

## 6.1 应用打包

**目标**：完善 `electron-builder` 多平台构建配置，配置 native 模块 rebuild，创建 GitHub Actions CI 实现自动构建和发布。

**输入/前置条件**：

- 依赖：Phase 4 完成；建议在 6.5 和 6.3 之后执行（打包产物含错误处理和安全加固）
- 需读取：`ARCHITECTURE.md` 第十节（10.1 构建工具链、10.2 应用打包）
- 当前状态：
  - `electron-builder.yml` 已有基础配置（appId、productName、mac entitlements）
  - `npmRebuild: false` 需改为 `true`（native 模块需要 rebuild）
  - `publish.provider: generic` 需改为 `github`（配合 6.2 自动更新）
  - 缺少 Windows（NSIS）和 Linux（AppImage/deb）配置
  - 缺少 macOS Universal Binary 配置
  - 无 GitHub Actions workflow
  - `package.json` 仅有 `build:mac` 脚本，缺少 `build:win` 和 `build:linux`

**验证策略**：B 类（验证式测试）

**关键决策**：

| 决策项              | 方案                                                                                    |
| ------------------- | --------------------------------------------------------------------------------------- |
| 打包工具            | `electron-builder` v26+（已安装）                                                       |
| macOS 格式          | `.dmg` + `.zip`，Universal Binary（`x64 + arm64`）                                      |
| Windows 格式        | NSIS 安装包 `.exe`，`oneClick: false`（允许自定义安装路径）                             |
| Linux 格式          | `.AppImage` + `.deb`                                                                    |
| native 模块 rebuild | `npmRebuild: true`，`buildDependenciesFromSource: true`（`better-sqlite3`、`node-pty`） |
| 应用图标            | `build/icon.png`（512x512），electron-builder 自动生成各平台格式                        |
| CI 平台             | GitHub Actions，使用 `macos-latest`、`windows-latest`、`ubuntu-latest`                  |
| 发布方式            | 推 tag（`v*`）触发 CI → 构建 → 上传到 GitHub Releases（draft）                          |
| asar 排除           | `resources/**` 保持 unpack（含应用图标等资源）                                          |
| 版本号管理          | 从 `package.json#version` 读取，tag 推送时校验一致性                                    |

**测试用例设计**：

| 类别     | 测试用例                                                                  | 预期结果                |
| -------- | ------------------------------------------------------------------------- | ----------------------- |
| 配置校验 | `electron-builder.yml` 包含 mac/win/linux 配置                            | 三平台配置完整          |
| 配置校验 | mac 配置包含 `target: [{target: dmg}, {target: zip}]` + `arch: universal` | Universal Binary        |
| 配置校验 | `npmRebuild: true` 且 native 模块列表包含 `better-sqlite3`                | native 模块会被 rebuild |
| 配置校验 | `publish.provider: github`                                                | 发布到 GitHub Releases  |
| CI 校验  | `.github/workflows/build.yml` 存在且包含三平台 job                        | CI 配置完整             |
| 脚本校验 | `package.json` 包含 `build:mac`、`build:win`、`build:linux`               | 构建脚本完整            |

**执行步骤**：

```
1. 编写 tests/build-config.test.ts：
   - 读取 electron-builder.yml 校验配置完整性
   - 校验三平台配置存在
   - 校验 npmRebuild = true
   - 校验 publish.provider = github
2. 完善 electron-builder.yml：
   - 添加 mac.target: [{target: dmg, arch: universal}, {target: zip, arch: universal}]
   - 添加 win 配置（NSIS）
   - 添加 linux 配置（AppImage + deb）
   - 修改 npmRebuild: true
   - 修改 publish.provider: github
   - 配置 native 模块 rebuild
3. 确保 build/ 目录包含应用图标（icon.png 512x512）
4. 更新 package.json 添加 build:win / build:linux 脚本
5. 创建 .github/workflows/build.yml：
   - trigger: push tag v*
   - matrix: [macos-latest, windows-latest, ubuntu-latest]
   - steps: checkout → setup node → pnpm install → build → publish release
6. 运行 pnpm test → 确认配置校验测试通过
7. 本地执行 pnpm build:mac 验证 macOS 构建（其他平台在 CI 验证）
```

**验收标准**：

- [ ] 完善 `electron-builder.yml`：
  - [ ] macOS：`.dmg` + `.zip`，Universal Binary（x64 + arm64）
  - [ ] Windows：NSIS 安装包 `.exe`
  - [ ] Linux：`.AppImage` + `.deb`
  - [ ] `npmRebuild: true`
  - [ ] `publish.provider: github`
- [ ] 配置应用图标、名称、版本号：
  - [ ] `build/icon.png` 存在（512x512）
  - [ ] `productName` 和 `appId` 正确
  - [ ] 版本号从 `package.json#version` 读取
- [ ] Native 模块 rebuild 配置：
  - [ ] `better-sqlite3` 可在打包后正常加载
  - [ ] `node-pty` 可在打包后正常加载
- [ ] CI 构建脚本：
  - [ ] `.github/workflows/build.yml` 存在
  - [ ] 推 tag `v*` 触发三平台构建
  - [ ] 构建产物上传到 GitHub Releases（draft）
- [ ] `package.json` 构建脚本完整：
  - [ ] `build:mac`、`build:win`、`build:linux` 均可用
- [ ] 编写配置校验测试：
  - [ ] `tests/build-config.test.ts` 校验配置完整性
- [ ] `pnpm test` 全部通过
- [ ] 本地 macOS 构建成功（`pnpm build:mac` 产出 `.dmg`）

**交付物清单**：

- [ ] `electron-builder.yml` — 完善三平台配置
- [ ] `.github/workflows/build.yml` — CI 自动构建 + 发布
- [ ] `package.json` — 新增 `build:win` / `build:linux` 脚本
- [ ] `build/icon.png` — 应用图标（512x512，如尚无则创建占位图标）
- [ ] `tests/build-config.test.ts` — 构建配置校验测试

**参考文档**：

- `ARCHITECTURE.md` 第十节（10.1 构建工具链、10.2 应用打包）
- electron-builder 官方文档：多平台构建配置
- GitHub Actions 官方文档：多平台 matrix 构建

**反模式警告**：

- ❌ 不要保持 `npmRebuild: false`，native 模块（`better-sqlite3`、`node-pty`）在打包后无法使用
- ❌ 不要在 CI 中使用 `self-hosted` runner，坚持使用 GitHub 提供的标准 runner
- ❌ 不要硬编码版本号到 CI 脚本中，从 `package.json` 或 git tag 读取
- ❌ 不要忘记在 macOS CI job 中设置代码签名环境变量（虽然当前 `notarize: false`，但要预留位置）

---

## 6.2 自动更新

**目标**：集成 `electron-updater` 实现应用自动更新，用户可在应用内检查更新、下载、安装。

**输入/前置条件**：

- 依赖：Task 6.1 完成（打包配置就绪，`publish.provider: github`）
- 需读取：`ARCHITECTURE.md` 第十节（10.3 自动更新）
- 当前状态：
  - `electron-updater` 未安装
  - `dev-app-update.yml` 不存在
  - 更新相关 IPC 通道未定义
  - 渲染进程无更新 UI

**验证策略**：A 类（严格 TDD）

**关键决策**：

| 决策项   | 方案                                                                                              |
| -------- | ------------------------------------------------------------------------------------------------- |
| 更新库   | `electron-updater`（`electron-builder` 配套方案）                                                 |
| 更新源   | GitHub Releases（与 6.1 CI 发布配合）                                                             |
| 更新策略 | 启动时自动检查 + 手动检查入口（Settings 页面）                                                    |
| 下载行为 | 后台下载，不阻塞用户操作                                                                          |
| 安装时机 | 下载完成后提示用户，用户确认后退出并安装                                                          |
| dev 模式 | 使用 `dev-app-update.yml` 模拟更新（不实际下载）                                                  |
| IPC 通道 | `update:check`、`update:download`、`update:install`、`update:status`（push）                      |
| 更新状态 | `idle` → `checking` → `available` / `not-available` → `downloading` → `downloaded` → `installing` |

**类型定义**（`src/shared/types.ts` 扩展）：

```typescript
type UpdateStatus =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "available"; version: string; releaseNotes?: string }
  | { state: "not-available" }
  | { state: "downloading"; percent: number }
  | { state: "downloaded"; version: string }
  | { state: "error"; message: string };
```

**Updater 服务设计**（`src/main/updater.ts`）：

```typescript
interface UpdaterService {
  /** 检查更新 */
  checkForUpdates(): Promise<void>;
  /** 下载更新 */
  downloadUpdate(): Promise<void>;
  /** 退出并安装 */
  quitAndInstall(): void;
  /** 获取当前状态 */
  getStatus(): UpdateStatus;
}

function createUpdaterService(mainWindow: BrowserWindow): UpdaterService;
```

**测试用例设计**：

| 类别     | 测试用例                                    | 预期结果                                       |
| -------- | ------------------------------------------- | ---------------------------------------------- |
| 正常路径 | 调用 `checkForUpdates()`，mock 返回有新版本 | 状态变为 `available`，包含版本号               |
| 正常路径 | 调用 `checkForUpdates()`，mock 返回无新版本 | 状态变为 `not-available`                       |
| 正常路径 | 调用 `downloadUpdate()`，mock 下载进度      | 状态经历 `downloading(0%→100%)` → `downloaded` |
| 正常路径 | IPC `update:check` handler 调用             | 正确触发 checkForUpdates                       |
| 边界条件 | 网络断开时检查更新                          | 状态变为 `error`，包含错误信息                 |
| 边界条件 | 下载中途断网                                | 状态变为 `error`，可重试                       |
| 错误处理 | `checkForUpdates` 抛出异常                  | 捕获异常，状态变为 `error`                     |
| 错误处理 | 更新文件校验失败                            | 状态变为 `error`，提示用户                     |

**执行步骤**（Red-Green-Refactor）：

```
Red 阶段：
1. 编写 src/main/updater.test.ts：
   - mock electron-updater 的 autoUpdater
   - 测试 checkForUpdates 正常/无更新/错误
   - 测试 downloadUpdate 进度回调
   - 测试 quitAndInstall 调用
   - 测试状态转换正确性
2. 运行 pnpm test → 确认全部 FAIL

Green 阶段：
3. 安装 electron-updater：pnpm add electron-updater
4. 实现 src/main/updater.ts（createUpdaterService）
5. 创建 dev-app-update.yml（dev 模式配置）
6. 在 src/shared/ipc-channels.ts 添加 update 通道
7. 在 src/main/ipc/ 注册 update handler
8. 在 src/preload/index.ts 暴露 window.workbox.update.*
9. 实现渲染进程更新提示 UI（src/renderer/src/components/UpdateNotifier.tsx）
10. 在 src/main/index.ts 集成 updater 初始化
11. 运行 pnpm test → 确认全部 PASS

Refactor 阶段：
12. 优化状态管理，确保状态转换原子性
13. 运行 pnpm test → 最终确认全部 PASS
```

**验收标准**：

- [ ] 安装并集成 `electron-updater`：
  - [ ] `pnpm add electron-updater` 成功
  - [ ] `src/main/updater.ts` 封装 autoUpdater
- [ ] 配置更新源：
  - [ ] `electron-builder.yml` 中 `publish.provider: github`（6.1 已完成）
  - [ ] `dev-app-update.yml` 存在（dev 模式调试）
- [ ] 实现更新检查 + 下载 + 安装流程：
  - [ ] 启动时自动检查更新
  - [ ] 后台下载不阻塞用户
  - [ ] 下载完成后提示安装
- [ ] 实现更新 IPC 通道：
  - [ ] `src/shared/ipc-channels.ts` 添加 `update:check`、`update:download`、`update:install`、`update:status`
  - [ ] `src/preload/index.ts` 暴露 `window.workbox.update.*`
- [ ] 实现更新提示 UI：
  - [ ] `UpdateNotifier.tsx` 显示更新状态
  - [ ] 有新版本时显示提醒（版本号 + 下载按钮）
  - [ ] 下载进度显示
  - [ ] 下载完成后显示"安装并重启"按钮
- [ ] 编写测试覆盖：
  - [ ] updater 服务各状态转换
  - [ ] IPC handler 调用
  - [ ] 网络错误处理
- [ ] `pnpm test` 全部通过

**交付物清单**：

- [ ] `src/main/updater.ts` — 更新服务
- [ ] `src/main/updater.test.ts` — 更新服务测试
- [ ] `dev-app-update.yml` — dev 模式更新配置
- [ ] `src/shared/ipc-channels.ts` — 新增 `update` 通道
- [ ] `src/preload/index.ts` — 新增 `window.workbox.update.*`
- [ ] `src/main/ipc/update.handler.ts` — 更新 IPC handler
- [ ] `src/renderer/src/components/UpdateNotifier.tsx` — 更新提示 UI
- [ ] `src/renderer/src/components/UpdateNotifier.test.tsx` — 更新 UI 测试
- [ ] `src/main/index.ts` — 集成 updater 初始化

**参考文档**：

- `ARCHITECTURE.md` 第十节（10.3 自动更新）
- electron-updater 官方文档

**反模式警告**：

- ❌ 不要在 dev 模式下实际执行更新下载，使用 `dev-app-update.yml` mock
- ❌ 不要在更新下载过程中阻塞 UI 线程
- ❌ 不要在用户未确认的情况下自动安装更新并重启
- ❌ 不要忽略更新文件的签名校验（`electron-updater` 默认会校验）

---

## 6.4 性能优化

**目标**：优化应用启动速度和运行时性能，确保启动 < 2s 显示 UI，大数据量下操作流畅。

**输入/前置条件**：

- 依赖：Phase 5 完成（全部功能就绪后做整体优化）
- 需读取：`ARCHITECTURE.md` 第三节（进程模型）
- 当前状态：
  - 渲染进程所有组件同步加载，无懒加载
  - 插件串行加载（`loadAll` 遍历目录逐个 activate）
  - SQLite 无显式索引（仅 Drizzle ORM 默认主键索引）
  - 无启动耗时分析

**验证策略**：B 类（验证式测试）

**关键决策**：

| 决策项       | 方案                                                                                                        |
| ------------ | ----------------------------------------------------------------------------------------------------------- |
| React 懒加载 | `React.lazy()` + `Suspense`，按 feature 模块懒加载（`chat`、`plugins`、`settings`、`git`、`file-explorer`） |
| 插件并行加载 | `Promise.allSettled()` 替代串行 `for...of`，无依赖关系的插件并行 activate                                   |
| SQLite 索引  | 为高频查询字段添加索引：`conversations.updatedAt`、`messages.conversationId`、`settings.key`                |
| 大列表分页   | 对话历史列表分页加载（每页 20 条），消息列表虚拟滚动                                                        |
| 启动耗时分析 | `console.time` / `performance.mark` 标记关键阶段，输出到日志                                                |
| 预加载策略   | 首屏仅加载 App Shell + 当前激活的 feature，其余 feature 延迟加载                                            |

**测试用例设计**：

| 类别     | 测试用例                                          | 预期结果                            |
| -------- | ------------------------------------------------- | ----------------------------------- |
| 懒加载   | feature 组件使用 `React.lazy` 包裹                | 各 feature 模块为独立 chunk         |
| 并行加载 | `PluginManager.loadAll` 使用 `Promise.allSettled` | 插件并行激活，单个失败不影响其他    |
| 索引     | schema 定义包含必要索引                           | Drizzle migration 生成 CREATE INDEX |
| 分页     | 对话列表 API 支持 `offset` + `limit`              | 返回分页结果                        |
| 基准     | 应用启动到 `ready-to-show` 耗时                   | < 2000ms（CI 环境可适当放宽）       |

**执行步骤**：

```
1. 编写性能基准测试 tests/performance.test.ts：
   - 验证 feature 组件使用了 React.lazy
   - 验证 PluginManager.loadAll 使用 Promise.allSettled
   - 验证数据库 schema 包含必要索引
   - 验证对话列表 API 支持分页参数
2. 渲染进程：用 React.lazy + Suspense 包裹各 feature 组件
   - src/renderer/src/features/chat/ → lazy
   - src/renderer/src/features/plugins/ → lazy
   - src/renderer/src/features/settings/ → lazy
   - src/renderer/src/features/git/ → lazy
   - src/renderer/src/features/file-explorer/ → lazy
3. 主进程：修改 PluginManager.loadAll 为并行加载
   - 使用 Promise.allSettled 替代 for...of
   - 单个插件失败记录日志，不中断其他插件
4. 数据库：添加索引
   - 在 src/main/storage/schema.ts 添加索引定义
   - 执行 migration
5. 数据层：为对话列表添加分页支持
   - 修改 crud.ts 中的查询函数，支持 offset/limit
6. 添加启动耗时标记：
   - src/main/index.ts 中标记 app-start → db-init → plugin-load → window-create → ready-to-show
7. 运行 pnpm test → 确认全部通过
```

**验收标准**：

- [ ] 渲染进程懒加载：
  - [ ] 各 feature 组件使用 `React.lazy` + `Suspense`
  - [ ] 首屏仅加载 App Shell + 当前激活模块
- [ ] 主进程插件并行加载：
  - [ ] `PluginManager.loadAll` 使用 `Promise.allSettled`
  - [ ] 单个插件失败不阻塞其他插件
- [ ] SQLite 索引优化：
  - [ ] `conversations.updatedAt` 索引
  - [ ] `messages.conversationId` 索引
  - [ ] `settings.key` 索引
- [ ] 大列表分页：
  - [ ] 对话列表分页（默认 20 条/页）
- [ ] 启动耗时分析：
  - [ ] 关键阶段有 `performance.mark` 标记
  - [ ] 日志输出各阶段耗时
- [ ] 编写性能测试：
  - [ ] `tests/performance.test.ts` 验证优化措施到位
- [ ] `pnpm test` 全部通过
- [ ] 应用启动到显示 UI < 2s

**交付物清单**：

- [ ] `src/renderer/src/features/*/index.ts` — 各 feature 模块增加懒加载导出
- [ ] `src/renderer/src/components/Layout/AppLayout.tsx` — 使用 Suspense 包裹
- [ ] `src/main/plugin/manager.ts` — `loadAll` 改为并行加载
- [ ] `src/main/storage/schema.ts` — 添加索引定义
- [ ] `src/main/storage/crud.ts` — 添加分页查询
- [ ] `src/main/index.ts` — 添加启动耗时标记
- [ ] `tests/performance.test.ts` — 性能验证测试

**参考文档**：

- `ARCHITECTURE.md` 第三节（进程模型）
- React 官方文档：`React.lazy` + `Suspense`
- Drizzle ORM 文档：索引定义

**反模式警告**：

- ❌ 不要在 `Suspense fallback` 中渲染复杂组件，使用轻量 loading spinner
- ❌ 不要在 `Promise.allSettled` 后忽略 rejected 的结果，记录日志
- ❌ 不要过早优化——本任务仅优化已识别的性能瓶颈，不做投机性优化
- ❌ 不要删除启动耗时标记，它们用于持续监控性能回归

---

## 自审 Review 报告

### 高优先级问题（必须修复）

- [x] **[H1]** `electron-builder.yml` 当前 `npmRebuild: false` 会导致 native 模块在打包后无法使用 → 在 6.1 任务中明确要求改为 `true`，并在验收标准中检查 ✅ 已在 6.1 关键决策和验收标准中明确
- [x] **[H2]** `publish.provider: generic` + placeholder URL 无法实现自动更新 → 在 6.1 中改为 `github`，6.2 依赖此配置 ✅ 已在 6.1 和 6.2 中明确
- [x] **[H3]** 渲染进程不能直接 `require('electron-log')`，需通过 IPC → 在 6.5 中设计了 `log:write` IPC 通道 ✅ 已明确设计

### 中优先级问题（必须修复）

- [x] **[M1]** 6.1 缺少 macOS 代码签名说明（虽然当前 `notarize: false`） → 添加反模式警告中预留签名位置说明 ✅ 已在反模式警告中说明
- [x] **[M2]** 6.3 CSP 中需要考虑 AI API 外部请求 → 在 CSP 中添加 `connect-src 'self' https:` ✅ 已在 CSP 策略设计中包含
- [x] **[M3]** 6.4 渲染进程懒加载需要确认各 feature 的导出方式 → 交付物中明确修改 `features/*/index.ts` ✅ 已明确
- [x] **[M4]** 6.5 插件错误隔离需要在 `PluginManager` 中同时修改 `loadAll` 方法 → 与 6.4 的并行加载改造有交叉，需注意执行顺序 ✅ 依赖关系图中 6.5 在 6.4 之前执行，6.4 会在 6.5 基础上进一步优化 `loadAll`

### 低优先级问题（记录参考）

- [ ] **[L1]** 6.1 CI workflow 可以考虑添加 cache（pnpm store cache）加速构建
- [ ] **[L2]** 6.2 更新 UI 可以考虑在 Settings 页面添加"检查更新"按钮的具体位置
- [ ] **[L3]** 6.4 可以考虑使用 `@loadable/component` 替代 `React.lazy` 以获取更好的 SSR 支持（但 Electron 不需要 SSR，故优先级低）
- [ ] **[L4]** 6.3 可以考虑对 `better-sqlite3` 查询结果也做输出校验（但属于防御性编程，非必须）
