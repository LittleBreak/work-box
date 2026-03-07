## Why

开发者在日常工作中频繁与 URL 打交道（调试 API、分析链接参数、分享链接等），但浏览器自带工具不够便捷，需要在多个在线工具间切换。Work-Box 作为开发者提效工具，缺少一个专注于 URL 处理的插件。提供一站式 URL 工具可以显著提升研发效率。

## What Changes

- 新增 `url-toolkit` 内置插件，位于 `plugins/url-toolkit/`
- 提供 URL 编码/解码功能（支持 `encodeURIComponent` / `decodeURIComponent` 及完整 URL 编解码）
- 自动解析并展示 URL 中的 query 参数（支持编辑、复制）
- 生成 URL 对应的二维码（支持下载为 PNG）
- 注册 AI tools，让 AI 助手可以调用 URL 编解码和参数解析能力

## Capabilities

### New Capabilities

- `url-codec`: URL 编码与解码功能，支持整体 URL 和单独组件的编解码
- `url-query-parser`: 自动解析 URL 中的 query string，结构化展示所有参数键值对
- `url-qrcode`: 根据输入的 URL 生成对应的二维码图片

### Modified Capabilities

（无需修改现有 capability）

## Impact

- **新增依赖**: `qrcode` (二维码生成库)
- **新增文件**: `plugins/url-toolkit/` 目录及其源码、测试
- **Plugin API**: 无需变更，使用现有 PluginContext API
- **IPC 通道**: 新增 `url-toolkit:*` 系列通道
- **UI**: 新增 `UrlToolkitPanel.tsx` 面板组件，通过现有 plugin-panels 自动发现机制注册
