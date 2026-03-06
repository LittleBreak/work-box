## Context

Work-Box 已有成熟的插件系统，包括 PluginContext API、IPC 通信机制、UI 自动发现等基础设施。现有内置插件（json-formatter、regex-tester 等）提供了良好的参考模式。本次需要新增一个 `url-toolkit` 插件，提供 URL 编解码、query 参数解析和二维码生成功能。

插件系统约束：

- 插件通过 `package.json` 的 `workbox` 字段声明元数据和权限
- 主进程入口导出 `PluginDefinition`，通过 `activate(ctx)` 初始化
- UI 组件命名为 `*Panel.tsx`，由 `plugin-panels.ts` 自动发现
- IPC 通道格式为 `domain:action`

## Goals / Non-Goals

**Goals:**

- 提供快速的 URL 编码/解码能力（支持整体 URL 和组件级别）
- 自动解析 URL query string 为结构化键值对展示
- 根据 URL 生成二维码图片，支持下载
- 注册 AI tools 使 AI 助手可调用 URL 工具能力
- 遵循现有插件开发模式，保持架构一致性

**Non-Goals:**

- 不提供 URL 缩短服务（需要外部网络请求）
- 不提供 URL 可达性检测或 HTTP 请求发送功能
- 不提供复杂的 URL 路由匹配/测试功能
- 不支持批量 URL 处理

## Decisions

### 1. 二维码生成方案：使用 `qrcode` 库

**选择**: 使用 npm `qrcode` 包在渲染进程直接生成二维码

**原因**:

- `qrcode` 是最流行的纯 JS 二维码库，零原生依赖，适合 Electron 环境
- 支持生成 Canvas、SVG、Data URL 多种格式
- 渲染进程直接生成避免了不必要的 IPC 通信开销

**备选方案**:

- `qrcode-generator`: 更轻量但 API 不够友好
- 主进程生成 + IPC 传输: 增加复杂度，无实际收益

### 2. URL 解析方案：使用原生 `URL` API

**选择**: 使用浏览器/Node.js 原生 `URL` 和 `URLSearchParams` API

**原因**:

- 原生 API 性能好、标准兼容、零依赖
- Electron 环境同时支持 Node.js 和浏览器的 URL API
- 能正确处理各种边界情况（特殊字符、多值参数等）

**备选方案**:

- `qs` / `query-string` 库: 增加依赖但无显著优势

### 3. 插件架构：纯渲染进程实现

**选择**: URL 编解码和 query 解析在渲染进程完成，不经过 IPC

**原因**:

- URL 编解码和解析是纯计算操作，无需系统权限
- 渲染进程的 `URL` API 完全够用
- 减少 IPC 开销，响应更快

**例外**: AI tools 注册需要在主进程完成（通过 `ctx.ai.registerTool`）

### 4. UI 布局：标签页式多功能面板

**选择**: 单个面板组件内通过 Tabs 切换三个功能区

**原因**:

- 与现有插件（如 git-helper）的 UI 模式保持一致
- 三个功能关联度高，共享 URL 输入框减少重复操作
- 用户输入 URL 后可快速切换查看不同维度的结果

## Risks / Trade-offs

- **[Risk] 超长 URL 的二维码可读性差** → 在 UI 中提示 URL 长度限制（建议 2000 字符以内），超长时显示警告
- **[Risk] 非标准 URL 格式解析失败** → 使用 try-catch 包裹 `new URL()` 调用，解析失败时显示友好错误提示
- **[Trade-off] 渲染进程直接处理 vs IPC** → 牺牲了一致性（其他插件多走 IPC），但获得了更好的性能和更简单的实现
- **[Risk] `qrcode` 包体积** → 该库约 100KB（gzipped ~30KB），对桌面应用影响可忽略
