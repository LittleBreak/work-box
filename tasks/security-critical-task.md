# 安全修复阶段：严重安全漏洞修复

> **目标**：修复插件系统审查报告中 4 个严重安全问题 + 2 个高优先级安全问题，消除已知攻击面
>
> **里程碑**：安全加固完成（6 个安全问题全部修复，对应测试通过，`pnpm test` 零失败）

---

## 执行前置（必须确认）

- [ ] 已阅读 `docs/report.md` 第二部分安全分析章节
- [ ] 已阅读 `ARCHITECTURE.md` 安全相关章节
- [ ] `pnpm test` 全部通过

---

## 任务依赖关系 & 推荐执行顺序

```
[Task S.1 符号链接防护] ∥ [Task S.2 命令注入修复] ∥ [Task S.3 API密钥加密] → [Task S.4 IPC校验]
                                                                                      ↓
                                                              [Task S.5 deactivate资源泄漏] ∥ [Task S.6 环境变量过滤]
```

- S.1、S.2、S.3 无相互依赖，可并行
- S.4 依赖 S.1 完成（IPC handler 中调用路径校验函数）
- S.5、S.6 无相互依赖，可并行

---

## 待完成

### Task S.1：符号链接路径穿越防护

**TDD 策略**：A 类（严格 Red-Green-Refactor）

**详细需求**：

当前 `fs.handler.ts:40-56` 的 `validatePath()` 使用 `path.resolve()` 校验路径，但 `path.resolve()` 不会解析符号链接。攻击者可在插件数据目录内创建指向系统敏感文件的符号链接，绕过白名单校验。

**攻击场景**：

```bash
# 在允许目录内创建符号链接指向 /etc/passwd
ln -s /etc/passwd ~/.workbox/plugins/my-plugin/.data/passwd
# path.resolve() 结果仍在白名单内，但实际读取 /etc/passwd
await ctx.fs.readFile("/home/user/.workbox/plugins/my-plugin/.data/passwd");
```

**修复方案**：将 `validatePath()` 改为异步的 `validatePathSecurely()`，使用 `fs.realpath()` 解析符号链接后再做白名单校验。对文件不存在的情况，向上遍历到最高存在目录做校验。

**依赖**：无

**执行步骤**：

1. 编写测试（Red）
   - [ ] `src/main/ipc/fs.handler.test.ts` — 新增符号链接安全测试组：
     - 测试 1：`validatePath` 对含符号链接的路径应拒绝（符号链接指向白名单外）
     - 测试 2：符号链接指向白名单内的路径应允许
     - 测试 3：文件不存在时向上遍历校验父目录
     - 测试 4：非绝对路径仍应拒绝
   - [ ] 运行 `pnpm test` 确认新增测试 FAIL

2. 编写实现（Green）
   - [ ] 将 `validatePath()` 重命名为 `validatePathSecurely()`，改为 `async`
   - [ ] 内部使用 `fs.realpath()` 解析真实路径，文件不存在时向上遍历
   - [ ] 更新所有调用点（`readFile`、`writeFile`、`readDir`、`stat`）为 `await validatePathSecurely()`
   - [ ] 运行 `pnpm test` 确认全部 PASS

3. 重构（Refactor）
   - [ ] 确保导出的旧函数名已清理，无残留引用
   - [ ] 运行 `pnpm test` 最终确认全部 PASS

**验收标准**：

- [ ] `validatePathSecurely()` 使用 `fs.realpath()` 解析符号链接
- [ ] 符号链接指向白名单外路径时抛出 `PathSecurityError`
- [ ] 所有 4 个 fs handler 函数调用异步路径校验
- [ ] 现有 fs.handler 测试全部通过
- [ ] 新增符号链接安全测试全部通过

---

### Task S.2：Shell 命令注入修复

**TDD 策略**：A 类（严格 Red-Green-Refactor）

**详细需求**：

`plugins/file-explorer/src/file-service.ts:127,133` 使用字符串拼接构造 shell 命令：

```typescript
await this.ctx.shell.exec(`rm -f "${oldPath}"`); // 可注入
await this.ctx.shell.exec(`rm -rf "${targetPath}"`); // 可注入
```

当文件名包含 `"` 或 `;` 等特殊字符时，可注入任意命令。

**攻击场景**：

```
文件名: my-file"; touch /tmp/pwned; echo "
最终命令: rm -f "my-file"; touch /tmp/pwned; echo ""
```

**修复方案**：

1. 在 `file-service.ts` 中使用 `ctx.fs` API 替代 shell 命令执行删除操作
2. 若 `ctx.fs` 不支持删除，在 `PluginContext.fs` 中新增 `delete` 方法，底层使用 `fs.rm()` 而非 shell
3. 同时在 `shell.handler.ts` 中增加参数转义工具函数作为兜底防御

**依赖**：无

**执行步骤**：

1. 编写测试（Red）
   - [ ] `plugins/file-explorer/src/file-service.test.ts` — 新增命令注入防护测试：
     - 测试 1：`rename()` 使用含特殊字符的路径不会执行注入命令
     - 测试 2：`deleteItem()` 使用含特殊字符的路径不会执行注入命令
     - 测试 3：正常路径的 `rename()` 和 `deleteItem()` 功能不受影响
   - [ ] `src/main/ipc/fs.handler.test.ts` — 新增 `deleteFile`/`deleteDir` handler 测试（若新增 fs.delete API）
   - [ ] 运行 `pnpm test` 确认新增测试 FAIL

2. 编写实现（Green）
   - [ ] 方案 A（推荐）：在 `PluginContext.fs` 中新增 `delete(path: string): Promise<void>` 方法
     - `packages/plugin-api/src/types.ts` 中 `PluginContext.fs` 接口添加 `delete` 方法
     - `src/main/plugin/context.ts` 中实现，调用 `services.fsHandler.delete()`
     - `src/main/ipc/fs.handler.ts` 中添加 `deleteItem()` 函数，使用 `fs.rm(path, { recursive: true, force: true })`
     - 添加权限检查：需要 `fs:write` 权限
   - [ ] 修改 `file-service.ts` 的 `rename()` 和 `deleteItem()` 使用 `ctx.fs.delete()` 替代 `ctx.shell.exec()`
   - [ ] 运行 `pnpm test` 确认全部 PASS

3. 重构（Refactor）
   - [ ] 检查是否还有其他插件使用字符串拼接 shell 命令
   - [ ] 运行 `pnpm test` 最终确认全部 PASS

**验收标准**：

- [ ] `file-service.ts` 中不再使用字符串拼接构造 shell 命令
- [ ] `rename()` 和 `deleteItem()` 使用安全的 fs API 执行文件操作
- [ ] 特殊字符路径测试通过
- [ ] 测试全部通过

---

### Task S.3：API 密钥加密存储

**TDD 策略**：B 类（验证式测试）

**详细需求**：

`src/shared/types.ts:75-89` 中 `AppSettings.aiApiKey` 明文存储在 SQLite 数据库。机器被入侵时密钥易被窃取。

**修复方案**：使用 Electron `safeStorage` API 对 API 密钥加密后再存储到 SQLite，读取时解密。

**依赖**：无

**执行步骤**：

1. 编写测试（Red）
   - [ ] `src/main/storage/secure-storage.test.ts` — 新增安全存储测试：
     - 测试 1：加密后的值与原始值不同
     - 测试 2：解密后的值与原始值相同
     - 测试 3：空字符串正确处理
     - 测试 4：`safeStorage` 不可用时的优雅降级（使用警告日志）
   - [ ] `src/main/ipc/settings.handler.test.ts` — 更新设置读写测试验证 `aiApiKey` 字段加解密
   - [ ] 运行 `pnpm test` 确认新增测试 FAIL

2. 编写实现（Green）
   - [ ] 创建 `src/main/storage/secure-storage.ts`：
     - `encryptSensitive(value: string): string` — 使用 `safeStorage.encryptString()` 加密，返回 base64
     - `decryptSensitive(encrypted: string): string` — 使用 `safeStorage.decryptString()` 解密
     - `isSafeStorageAvailable(): boolean` — 检查 `safeStorage.isEncryptionAvailable()`
   - [ ] 修改设置读写流程：
     - 写入设置时，若包含 `aiApiKey`，先加密再存储
     - 读取设置时，将 `aiApiKey` 解密后返回
   - [ ] 运行 `pnpm test` 确认全部 PASS

3. 重构（Refactor）
   - [ ] 抽取敏感字段列表为常量 `SENSITIVE_FIELDS = ['aiApiKey']`，便于后续扩展
   - [ ] 运行 `pnpm test` 最终确认全部 PASS

**验收标准**：

- [ ] `aiApiKey` 在 SQLite 中以加密形式存储
- [ ] 读取时自动解密，对上层 API 透明
- [ ] `safeStorage` 不可用时有日志警告
- [ ] 测试全部通过

---

### Task S.4：IPC 调用者身份校验

**TDD 策略**：A 类（严格 Red-Green-Refactor）

**详细需求**：

`src/main/ipc/register.ts:120-129` 中 IPC handler 未校验调用者身份。若应用包含 iframe 加载第三方内容，可能导致信息泄露或未授权操作。

**修复方案**：添加窗口身份校验中间件，在每个 IPC handler 中验证 `event.sender` 来源是否为受信任窗口。

**依赖**：Task S.1（路径校验异步化后，IPC handler 需同步更新）

**执行步骤**：

1. 编写测试（Red）
   - [ ] `src/main/ipc/ipc-security.test.ts` — 新增 IPC 安全测试：
     - 测试 1：来自主窗口的 IPC 调用正常处理
     - 测试 2：来自未知窗口的 IPC 调用抛出 "Untrusted IPC caller" 错误
     - 测试 3：`event.sender` 为 null 时拒绝
   - [ ] 运行 `pnpm test` 确认新增测试 FAIL

2. 编写实现（Green）
   - [ ] 创建 `src/main/ipc/verify-sender.ts`：
     - `verifyTrustedSender(event: Electron.IpcMainInvokeEvent, trustedWindowId: number): void`
     - 使用 `BrowserWindow.fromWebContents(event.sender)` 获取来源窗口
     - 对比窗口 ID 与主窗口 ID
   - [ ] 在 `registerIPCHandlers()` 中传入 `mainWindowId` 参数
   - [ ] 在所有敏感 IPC handler（plugin、settings、shell、fs）中添加 `verifyTrustedSender()` 调用
   - [ ] 运行 `pnpm test` 确认全部 PASS

3. 重构（Refactor）
   - [ ] 考虑使用高阶函数包装 handler，减少重复校验代码
   - [ ] 运行 `pnpm test` 最终确认全部 PASS

**验收标准**：

- [ ] 所有敏感 IPC handler 在处理前校验调用者身份
- [ ] 非受信任来源的调用被拒绝并抛出明确错误
- [ ] `RegisterIPCOptions` 接口包含 `mainWindowId` 参数
- [ ] 测试全部通过

---

### Task S.5：deactivate 异常处理与资源泄漏修复

**TDD 策略**：A 类（严格 Red-Green-Refactor）

**详细需求**：

`manager.ts:124-131` 中 `disablePlugin()` 的 deactivate 异常被静默忽略，导致：

- IPC handler 仍在监听
- 文件监听器仍在运行
- 数据库连接仍打开

**修复方案**：

1. 使用 `try/finally` 块强制清理已注册的 Disposable 资源
2. 为 deactivate 添加 5 秒超时保护防止死锁
3. 在 `PluginInstance` 中跟踪 Disposable 列表

**依赖**：无

**执行步骤**：

1. 编写测试（Red）
   - [ ] `src/main/plugin/manager.test.ts` — 新增 deactivate 异常处理测试：
     - 测试 1：deactivate 抛异常时，插件状态仍变为 "disabled"
     - 测试 2：deactivate 抛异常时，已注册的 disposable 仍被清理（dispose 被调用）
     - 测试 3：deactivate 超过 5 秒时超时，插件状态变为 "disabled"
     - 测试 4：shutdown 时单个插件 deactivate 失败不影响其他插件
   - [ ] 运行 `pnpm test` 确认新增测试 FAIL

2. 编写实现（Green）
   - [ ] 在 `PluginInstance` 接口中添加 `disposables: Disposable[]` 字段
   - [ ] 修改 `createPluginContext()` 返回时收集所有注册的 Disposable
   - [ ] 修改 `disablePlugin()` 实现：
     ```typescript
     async disablePlugin(id: string): Promise<void> {
       const instance = this.plugins.get(id);
       if (!instance) throw new Error(`Plugin "${id}" not found`);
       instance.status = "disabled";
       try {
         if (instance.definition?.deactivate) {
           await Promise.race([
             instance.definition.deactivate(),
             new Promise((_, reject) =>
               setTimeout(() => reject(new Error("Plugin deactivate timeout")), 5000)
             )
           ]);
         }
       } catch (err) {
         console.error(`Plugin ${id} deactivate failed:`, err);
       } finally {
         instance.disposables?.forEach(d => { try { d.dispose(); } catch {} });
         instance.disposables = [];
       }
     }
     ```
   - [ ] 同样修改 `shutdown()` 中的异常处理
   - [ ] 运行 `pnpm test` 确认全部 PASS

3. 重构（Refactor）
   - [ ] 提取超时逻辑为可复用的 `withTimeout()` 工具函数
   - [ ] 运行 `pnpm test` 最终确认全部 PASS

**验收标准**：

- [ ] deactivate 异常不会导致资源泄漏
- [ ] deactivate 超时 5 秒后强制清理
- [ ] 所有注册的 Disposable 在 disable/shutdown 时被清理
- [ ] 测试全部通过

---

### Task S.6：环境变量敏感关键词过滤补充

**TDD 策略**：A 类（严格 Red-Green-Refactor）

**详细需求**：

`src/main/ipc/shell.handler.ts:13` 中 `SENSITIVE_ENV_KEYWORDS` 仅包含 5 个关键词（KEY、SECRET、TOKEN、PASSWORD、CREDENTIAL），遗漏了多种常见敏感变量：

| 遗漏关键词 | 示例变量                     |
| ---------- | ---------------------------- |
| PRIVATE    | PRIVATE_KEY, RSA_PRIVATE_KEY |
| JWT        | JWT_SECRET                   |
| GITHUB/GH  | GH_TOKEN, GITHUB_TOKEN       |
| NPM        | NPM_TOKEN, NPM_AUTHTOKEN     |
| AUTH       | AUTH_TOKEN, AUTHORIZATION    |

**依赖**：无

**执行步骤**：

1. 编写测试（Red）
   - [ ] `src/main/ipc/shell.handler.test.ts` — 新增敏感变量过滤测试：
     - 测试 1：`PRIVATE_KEY` 被过滤
     - 测试 2：`JWT_SECRET` 被过滤
     - 测试 3：`GH_TOKEN`、`GITHUB_TOKEN` 被过滤
     - 测试 4：`NPM_TOKEN`、`NPM_AUTHTOKEN` 被过滤
     - 测试 5：`AUTH_TOKEN`、`AUTHORIZATION` 被过滤
     - 测试 6：`OPENAI_API_KEY`、`ANTHROPIC_API_KEY` 被过滤
     - 测试 7：非敏感变量（如 `HOME`、`PATH`、`LANG`）不被过滤
   - [ ] 运行 `pnpm test` 确认新增测试 FAIL

2. 编写实现（Green）
   - [ ] 更新 `SENSITIVE_ENV_KEYWORDS` 数组：
     ```typescript
     const SENSITIVE_ENV_KEYWORDS = [
       "KEY",
       "SECRET",
       "TOKEN",
       "PASSWORD",
       "CREDENTIAL",
       "PRIVATE",
       "JWT",
       "AUTH",
       "CERT",
       "GITHUB",
       "GITLAB",
       "NPM",
       "DOCKER",
       "API",
       "OPENAI",
       "ANTHROPIC",
       "WEBHOOK",
       "ENDPOINT"
     ];
     ```
   - [ ] 注意：新增 `API` 关键词可能过度过滤，需评估是否影响正常变量（如 `API_VERSION`）。若影响过大，改为仅匹配 `*_API_KEY` 模式
   - [ ] 运行 `pnpm test` 确认全部 PASS

3. 重构（Refactor）
   - [ ] 检查是否需要支持精确匹配和模式匹配两种过滤方式
   - [ ] 运行 `pnpm test` 最终确认全部 PASS

**验收标准**：

- [ ] 所有常见敏感环境变量被过滤
- [ ] 非敏感变量不受影响
- [ ] `filterEnv()` 的 JSDoc 注释更新反映新增关键词
- [ ] 测试全部通过

---

## 进行中

（当前无）

---

## 已完成

（当前无）
