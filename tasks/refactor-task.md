# Phase 6：打包分发 & 完善 — 重构任务清单

> **源文档**：`tasks/phase-6-production.md`
>
> **目标**：完成产品化准备——多平台打包、自动更新、安全加固、错误处理与日志、性能优化
>
> **里程碑**：M6 - Release（三平台打包可安装运行，自动更新可用，安全审查通过，全局错误兜底，启动 < 2s）

---

## 执行前置（必须确认）

- [ ] Phase 4 所有任务已完成且 `pnpm test` 全部通过
- [ ] `electron-builder` v26+ 已在 `devDependencies`
- [ ] `electron-builder.yml` 已存在
- [ ] `build/entitlements.mac.plist` 已存在
- [ ] `src/main/index.ts` 中 BrowserWindow 配置已设置 `contextIsolation: true` + `nodeIntegration: false`
- [ ] `src/preload/index.ts` 已通过 `contextBridge.exposeInMainWorld` 暴露 `window.workbox.*`
- [ ] `src/shared/ipc-channels.ts` 已定义所有 IPC 通道
- [ ] 内置插件已就绪
- [ ] Native 模块确认：`better-sqlite3`（主进程）、`node-pty`（Terminal 插件）
- [ ] 路径别名 `@main`、`@renderer`、`@shared` 可用

---

## 任务依赖关系 & 推荐执行顺序

```
[6.5] ∥ [6.3] → [6.1 → 6.2] → [6.4]
```

- 6.5 和 6.3 可并行，最先启动
- 6.1 在 6.5 和 6.3 之后执行
- 6.2 严格依赖 6.1
- 6.4 放在最后

---

## 待完成

### Task 6.5：错误处理 & 日志

**TDD 策略**：A 类（严格 Red-Green-Refactor）

**详细需求**：见 `phase-6-production.md` § 6.5

**执行步骤**：

1. 编写测试（Red）
   - [ ] `src/main/logger.test.ts` — createLogger、各级别输出、全局错误捕获、目录自动创建
   - [ ] `src/renderer/src/components/ErrorBoundary.test.tsx` — 正常渲染、错误 fallback、onError 回调
   - [ ] `src/main/plugin/manager.test.ts` — 新增插件错误隔离用例
   - [ ] 运行 `pnpm test` 确认全部 FAIL

2. 编写实现（Green）
   - [ ] 安装 `electron-log`
   - [ ] 实现 `src/main/logger.ts`（createLogger + initLogger + installGlobalErrorHandlers）
   - [ ] 实现 `src/renderer/src/components/ErrorBoundary.tsx`
   - [ ] 在 `src/shared/ipc-channels.ts` 添加 `log:write` 通道
   - [ ] 在 `src/preload/index.ts` 暴露 `window.workbox.log.write()`
   - [ ] 在 `src/main/plugin/manager.ts` 添加 try-catch 隔离
   - [ ] 集成到 `src/main/index.ts` 和 `src/renderer/src/App.tsx`
   - [ ] 运行 `pnpm test` 确认全部 PASS

3. 重构（Refactor）
   - [ ] 替换散落的 `console.error` 为 logger 调用
   - [ ] 运行 `pnpm test` 最终确认全部 PASS

**验收标准**：

- [ ] `electron-log` 已安装并配置（日志写入 `~/.workbox/logs/`，格式含时间戳/级别/作用域）
- [ ] `src/main/logger.ts` 实现完整（createLogger / initLogger / installGlobalErrorHandlers）
- [ ] `ErrorBoundary.tsx` 可捕获子组件错误，显示友好 UI + 重新加载按钮
- [ ] 插件错误隔离：单个插件崩溃不影响其他插件和主应用
- [ ] 渲染进程日志通过 IPC `log:write` 通道传输到主进程
- [ ] 测试全部通过

---

### Task 6.3：安全加固

**TDD 策略**：A 类（严格 Red-Green-Refactor）

**详细需求**：见 `phase-6-production.md` § 6.3

**执行步骤**：

1. 编写测试（Red）
   - [ ] `src/main/ipc/validator.test.ts` — createValidatedHandler 合法/非法参数、标准错误格式
   - [ ] `src/main/security/csp.test.ts` — production CSP 格式、dev CSP 含 unsafe-eval
   - [ ] `src/main/plugin/trust.test.ts` — 内置插件信任、用户插件授权
   - [ ] 运行 `pnpm test` 确认全部 FAIL

2. 编写实现（Green）
   - [ ] 实现 `src/main/ipc/validator.ts`（createValidatedHandler + IPCError）
   - [ ] 实现 `src/main/security/csp.ts`（CSP 策略 + 注入函数）
   - [ ] 实现 `src/main/plugin/trust.ts`（插件信任判断 + 授权流程）
   - [ ] 在 `src/main/index.ts` 中注入 CSP
   - [ ] 为关键 IPC handler 添加 zod schema 校验
   - [ ] 运行 `pnpm test` 确认全部 PASS

3. 重构（Refactor）
   - [ ] 统一所有 handler 的错误返回格式
   - [ ] 运行 `pnpm test` 最终确认全部 PASS

**验收标准**：

- [ ] CSP 策略已实现（production 严格、dev 允许 unsafe-eval）
- [ ] IPC 输入校验框架 `createValidatedHandler` 可用
- [ ] 关键 handler（fs / shell / ai / settings）已添加 zod 校验
- [ ] 插件信任机制（内置自动信任、用户插件需授权）
- [ ] 测试全部通过

---

### Task 6.1：应用打包

**TDD 策略**：B 类（验证式测试）

**详细需求**：见 `phase-6-production.md` § 6.1

**依赖**：Task 6.5 + Task 6.3 完成

**执行步骤**：

- [ ] 编写 `tests/build-config.test.ts` — 校验三平台配置、npmRebuild、publish provider
- [ ] 完善 `electron-builder.yml`（mac/win/linux 配置、npmRebuild: true、publish: github）
- [ ] 确保 `build/icon.png` 存在（512x512）
- [ ] 更新 `package.json` 添加 `build:win` / `build:linux` 脚本
- [ ] 创建 `.github/workflows/build.yml`（tag 触发、三平台 matrix）
- [ ] 运行 `pnpm test` 确认通过
- [ ] 本地 `pnpm build:mac` 验证构建

**验收标准**：

- [ ] `electron-builder.yml` 三平台配置完整
- [ ] Native 模块 rebuild 配置正确
- [ ] CI workflow 存在且配置正确
- [ ] `build:mac` / `build:win` / `build:linux` 脚本可用
- [ ] 配置校验测试通过

---

### Task 6.2：自动更新

**TDD 策略**：A 类（严格 Red-Green-Refactor）

**详细需求**：见 `phase-6-production.md` § 6.2

**依赖**：Task 6.1 完成

**执行步骤**：

1. 编写测试（Red）
   - [ ] `src/main/updater.test.ts` — checkForUpdates、downloadUpdate、状态转换、错误处理
   - [ ] 运行 `pnpm test` 确认全部 FAIL

2. 编写实现（Green）
   - [ ] 安装 `electron-updater`
   - [ ] 实现 `src/main/updater.ts`（createUpdaterService）
   - [ ] 创建 `dev-app-update.yml`
   - [ ] 添加 update IPC 通道和 handler
   - [ ] 暴露 `window.workbox.update.*`
   - [ ] 实现 `UpdateNotifier.tsx` 更新提示 UI
   - [ ] 集成到 `src/main/index.ts`
   - [ ] 运行 `pnpm test` 确认全部 PASS

3. 重构（Refactor）
   - [ ] 优化状态管理
   - [ ] 运行 `pnpm test` 最终确认全部 PASS

**验收标准**：

- [ ] `electron-updater` 已安装并封装
- [ ] 更新检查 + 下载 + 安装流程完整
- [ ] 更新 IPC 通道和 preload API 就绪
- [ ] 更新提示 UI 可用（状态显示、下载进度、安装按钮）
- [ ] 测试全部通过

---

### Task 6.4：性能优化

**TDD 策略**：B 类（验证式测试）

**详细需求**：见 `phase-6-production.md` § 6.4

**依赖**：Phase 5 完成 + Task 6.1-6.3, 6.5 完成

**执行步骤**：

- [ ] 编写 `tests/performance.test.ts` — 验证懒加载、并行加载、索引、分页
- [ ] 各 feature 组件添加 `React.lazy` + `Suspense`
- [ ] `PluginManager.loadAll` 改为 `Promise.allSettled` 并行加载
- [ ] 数据库 schema 添加索引（conversations.updatedAt、messages.conversationId、settings.key）
- [ ] 对话列表 API 添加分页支持（offset + limit）
- [ ] 添加启动耗时 `performance.mark` 标记
- [ ] 运行 `pnpm test` 确认全部通过

**验收标准**：

- [ ] Feature 组件懒加载，首屏仅加载 App Shell
- [ ] 插件并行加载，单个失败不阻塞其他
- [ ] SQLite 索引已添加
- [ ] 对话列表分页可用
- [ ] 启动耗时标记和日志输出
- [ ] 应用启动到显示 UI < 2s
- [ ] 测试全部通过

---

## 进行中

（当前无）

---

## 已完成

（当前无）
