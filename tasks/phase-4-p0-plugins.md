# Phase 4：内置插件（P0）

> **目标**：实现第一批核心插件，验证插件系统可用性。

> **里程碑**：M4 - Alpha（Terminal + AI Chatbox 功能完整，可日常使用）

---

## 4.1 Terminal 插件

**目标**：实现内嵌终端插件，支持多 Tab、AI 集成。

**输入/前置条件**：

- 依赖：Phase 2（插件系统）+ Phase 3（AI 能力）完成
- 需读取：`ARCHITECTURE.md` 第四节（插件规范）、第九节（9.1 内置插件 - Terminal）

**验收标准**：

- [ ] 创建 `plugins/terminal/` 目录结构 + `package.json` 清单
- [ ] 主进程端：
  - [ ] 使用 `node-pty` 创建伪终端实例
  - [ ] 支持多终端 session 管理
  - [ ] 实现 IPC 数据流转发（stdin/stdout）
- [ ] 渲染端 UI：
  - [ ] 集成 `xterm.js` 终端组件
  - [ ] 支持多 Tab（多终端 session）
  - [ ] 支持自定义字体、字号、主题
  - [ ] 支持终端 resize
- [ ] 注册命令：`open-terminal`（快捷键 `` Ctrl+` ``）
- [ ] 注册 AI Tool：`run_command`（AI 可在对话中执行终端命令）
- [ ] **TDD**：编写终端 session 管理、命令注册、AI Tool 注册的单元测试
- [ ] 可打开终端执行命令，支持多 Tab，AI 对话中可调用终端

**参考**：`ARCHITECTURE.md` 第四节（插件规范）、第九节（9.1 内置插件）

---

## 4.2 AI Chatbox 增强

**目标**：增强 AI 对话功能，完善用户体验。

**输入/前置条件**：

- 依赖：Phase 3 Task 3.5（AI Chatbox UI）完成
- 需读取：`ARCHITECTURE.md` 第九节（9.2 AI Chatbox 功能细节）

**验收标准**：

- [ ] 对话导出功能（Markdown / JSON 格式）
- [ ] 上下文附件：对话中拖拽/选择文件，内容作为上下文传给 AI
- [ ] 系统 Prompt 自定义（per conversation）
- [ ] 对话搜索（关键词搜索历史对话）
- [ ] 消息操作：复制、重新生成、编辑后重发
- [ ] **TDD**：编写导出逻辑、搜索功能、消息操作的单元测试
- [ ] 以上功能均可正常使用

**参考**：`ARCHITECTURE.md` 第九节（9.2 AI Chatbox 功能细节）
