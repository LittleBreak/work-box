# Phase 6：打包分发 & 完善

> **目标**：完成产品化准备，可分发给用户使用。

> **里程碑**：M6 - Release（多平台打包，自动更新，安全审查通过）

---

## 6.1 应用打包

**目标**：配置多平台构建和 CI 自动发布流程。

**输入/前置条件**：

- 依赖：Phase 4 完成（基础功能可用）
- 需读取：`ARCHITECTURE.md` 第十节（构建与分发 - 10.2 应用打包）

**验收标准**：

- [ ] 配置 `electron-builder`：
  - [ ] macOS：`.dmg` + `.zip`，Universal Binary（Intel + Apple Silicon）
  - [ ] Windows：NSIS 安装包 `.exe`
  - [ ] Linux：`.AppImage` + `.deb`
- [ ] 配置应用图标、名称、版本号
- [ ] 配置 native 模块（`better-sqlite3`、`node-pty`）的 rebuild
- [ ] CI 构建脚本（GitHub Actions）：多平台自动构建 + Release
- [ ] **TDD**：编写构建配置校验测试
- [ ] 三平台均可成功构建安装包并安装运行

**参考**：`ARCHITECTURE.md` 第十节（构建与分发 - 10.2 应用打包）

---

## 6.2 自动更新

**目标**：实现应用自动更新机制，用户可无感升级。

**输入/前置条件**：

- 依赖：Task 6.1 完成
- 需读取：`ARCHITECTURE.md` 第十节（10.3 自动更新）

**验收标准**：

- [ ] 集成 `electron-updater`
- [ ] 配置更新源（GitHub Releases）
- [ ] 实现更新检查 + 下载 + 安装流程
- [ ] 实现更新提示 UI（有新版本时提醒用户）
- [ ] **TDD**：编写更新检查逻辑的单元测试（mock 更新源）
- [ ] 发布新版本后，旧版本可检测到更新并完成升级

**参考**：`ARCHITECTURE.md` 第十节（10.3 自动更新）

---

## 6.3 安全加固

**目标**：全面审查和加固应用安全性。

**输入/前置条件**：

- 依赖：Phase 4 完成
- 需读取：`ARCHITECTURE.md` 第十一节（安全规范）、第四节（4.5 权限模型）

**验收标准**：

- [ ] 确认所有 `BrowserWindow` 配置：
  - [ ] `contextIsolation: true`
  - [ ] `nodeIntegration: false`
  - [ ] `sandbox: true`（可选）
- [ ] CSP 策略配置（Content Security Policy）
- [ ] 审查所有 IPC handler 的输入校验
- [ ] 插件签名验证机制（或手动授权流程）
- [ ] **TDD**：编写安全配置校验和输入校验的测试
- [ ] 安全审查通过，无明显漏洞

**参考**：`ARCHITECTURE.md` 第十一节（安全规范）

---

## 6.4 性能优化

**目标**：优化应用启动速度和运行时性能。

**输入/前置条件**：

- 依赖：Phase 5 完成（全部功能就绪后做整体优化）
- 需读取：`ARCHITECTURE.md` 第三节（进程模型）

**验收标准**：

- [ ] 渲染进程：React 组件懒加载（`React.lazy` + `Suspense`）
- [ ] 主进程：插件并行加载（无依赖关系的并行 activate）
- [ ] SQLite 查询优化：添加索引，大列表分页
- [ ] 应用启动耗时分析 & 优化（目标 < 2s 显示 UI）
- [ ] **TDD**：编写性能基准测试（启动时间、查询耗时）
- [ ] 启动速度 < 2s，大数据量下操作流畅

**参考**：`ARCHITECTURE.md` 第三节（进程模型）

---

## 6.5 错误处理 & 日志

**目标**：实现全局错误处理和日志系统，保障应用稳定性。

**输入/前置条件**：

- 依赖：Phase 1 完成（可提前实施）
- 需读取：`ARCHITECTURE.md` 第七节（7.2 存储位置 - logs/）

**验收标准**：

- [ ] 实现全局错误边界（React ErrorBoundary）
- [ ] 主进程 uncaughtException / unhandledRejection 捕获
- [ ] 日志系统（`electron-log`）：写入 `~/.workbox/logs/`
- [ ] 插件错误隔离（单个插件崩溃不影响其他插件和主应用）
- [ ] **TDD**：编写错误捕获和隔离机制的单元测试
- [ ] 任何崩溃都有日志可追溯，插件错误被隔离

**参考**：`ARCHITECTURE.md` 第七节（7.2 存储位置）
