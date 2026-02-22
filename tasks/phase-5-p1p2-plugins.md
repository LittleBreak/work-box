# Phase 5：内置插件（P1-P2）

> **目标**：丰富工具箱能力，提升日常开发体验。

> **里程碑**：M5 - Beta（全部内置插件完成，基本可分发）

---

## 5.1 File Explorer 插件（P1）

**目标**：实现文件浏览器插件，支持文件浏览、预览、搜索和 AI 集成。

**输入/前置条件**：

- 依赖：Phase 4 完成
- 需读取：`ARCHITECTURE.md` 第九节（9.1 内置插件 - File Explorer）、第四节（插件规范）

**验收标准**：

- [ ] 创建 `plugins/file-explorer/` 目录结构
- [ ] 功能实现：
  - [ ] 树形文件目录浏览
  - [ ] 文件内容预览（文本/图片/JSON）
  - [ ] 文件搜索（文件名 / 内容搜索）
  - [ ] 文件操作：新建、重命名、删除、复制路径
  - [ ] 文件拖拽到 AI 对话作为上下文
- [ ] 注册 AI Tool：`read_file`、`list_directory`、`search_files`
- [ ] **TDD**：编写文件操作逻辑、搜索功能、AI Tool 注册的单元测试
- [ ] 可浏览本地文件系统，操作文件，AI 可读取文件内容

**参考**：`ARCHITECTURE.md` 第九节（9.1 内置插件）、第四节（插件规范）

---

## 5.2 Git Helper 插件（P1）

**目标**：实现 Git 操作助手插件，支持常用 Git 操作和 AI 集成。

**输入/前置条件**：

- 依赖：Phase 4 完成
- 需读取：`ARCHITECTURE.md` 第九节（9.1 内置插件 - Git Helper）、第四节（4.2 插件 API 示例）

**验收标准**：

- [ ] 创建 `plugins/git-helper/` 目录结构
- [ ] 功能实现：
  - [ ] Git 状态面板（modified / staged / untracked 文件列表）
  - [ ] 一键 stage / unstage / commit
  - [ ] 分支列表 + 切换
  - [ ] Diff 查看器
  - [ ] Commit 历史时间线
- [ ] 注册 AI Tool：`git_status`、`git_commit`、`git_diff`、`git_log`
- [ ] 注册命令：`quick-commit`（快捷键 `CmdOrCtrl+Shift+C`）
- [ ] **TDD**：编写 Git 操作封装、命令注册、AI Tool 注册的单元测试
- [ ] 可在应用内完成常用 Git 操作，AI 可调用 Git 工具

**参考**：`ARCHITECTURE.md` 第九节（9.1 内置插件）、第四节（4.2 插件 API）

---

## 5.3 Snippet Manager 插件（P2）

**目标**：实现代码片段管理插件，支持收藏、搜索和快速复制。

**输入/前置条件**：

- 依赖：Phase 4 完成
- 需读取：`ARCHITECTURE.md` 第九节（9.1 内置插件 - Snippet Manager）

**验收标准**：

- [ ] 创建 `plugins/snippet-manager/` 目录结构
- [ ] 功能实现：
  - [ ] 代码片段 CRUD
  - [ ] 分类/标签管理
  - [ ] 搜索（标题 + 内容）
  - [ ] 一键复制到剪贴板
  - [ ] 支持 30+ 语言语法高亮
- [ ] 数据存储：使用 plugin storage API
- [ ] **TDD**：编写 CRUD 操作、搜索功能、分类管理的单元测试
- [ ] 可创建/搜索/复制代码片段

**参考**：`ARCHITECTURE.md` 第九节（9.1 内置插件）

---

## 5.4 JSON Formatter 插件（P2）

**目标**：实现 JSON 工具插件，支持格式化、校验、转换。

**输入/前置条件**：

- 依赖：Phase 4 完成
- 需读取：`ARCHITECTURE.md` 第九节（9.1 内置插件 - JSON Formatter）

**验收标准**：

- [ ] 创建 `plugins/json-formatter/` 目录结构
- [ ] 功能实现：
  - [ ] JSON 格式化 / 压缩
  - [ ] JSON 校验 + 错误定位
  - [ ] JSON ↔ TypeScript 类型互转
  - [ ] JSON Diff 对比
  - [ ] 树形可视化浏览
- [ ] **TDD**：编写格式化、校验、类型转换、Diff 的单元测试
- [ ] 可粘贴 JSON 并执行格式化/校验/转换

**参考**：`ARCHITECTURE.md` 第九节（9.1 内置插件）

---

## 5.5 Regex Tester 插件（P2）

**目标**：实现正则表达式测试插件，支持实时匹配和模板。

**输入/前置条件**：

- 依赖：Phase 4 完成
- 需读取：`ARCHITECTURE.md` 第九节（9.1 内置插件 - Regex Tester）

**验收标准**：

- [ ] 创建 `plugins/regex-tester/` 目录结构
- [ ] 功能实现：
  - [ ] 正则输入 + 测试文本输入
  - [ ] 实时匹配高亮
  - [ ] 匹配组提取
  - [ ] 常用正则模板（邮箱、手机号、URL 等）
  - [ ] Flag 切换（g / i / m）
- [ ] **TDD**：编写正则匹配逻辑、模板管理的单元测试
- [ ] 输入正则和文本后实时显示匹配结果

**参考**：`ARCHITECTURE.md` 第九节（9.1 内置插件）
