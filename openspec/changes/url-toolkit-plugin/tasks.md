## 1. 插件脚手架搭建

- [ ] 1.1 创建 `plugins/url-toolkit/` 目录结构和 `package.json`（含 `workbox` 配置、声明 `qrcode` 依赖）
- [ ] 1.2 创建主进程入口 `src/index.ts` 骨架，导出 `PluginDefinition`（`activate`/`deactivate` 留空）
- [ ] 1.3 创建 UI 入口 `src/ui/UrlToolkitPanel.tsx` 骨架组件，含 Tabs 布局（编解码 / 参数解析 / 二维码）
- [ ] 1.4 安装依赖（`pnpm install`），确认 TypeScript 编译无类型错误

## 2. URL 编解码功能（TDD）

- [ ] 2.1 **RED**: 编写 `url-codec.test.ts` 单元测试 —— 覆盖：完整 URL 编码/解码、组件编码/解码、中文及特殊字符、无效编码序列错误处理、空输入边界。运行测试确认全部 FAIL
- [ ] 2.2 **GREEN**: 实现 `url-codec.ts` 核心工具函数（`encodeFullUrl`/`decodeFullUrl`/`encodeComponent`/`decodeComponent`），使 2.1 所有测试通过
- [ ] 2.3 **REFACTOR**: 审查编解码函数，优化代码结构，运行测试确认仍全部 PASS
- [ ] 2.4 **RED**: 编写编解码 UI 组件测试 `UrlCodecTab.test.tsx` —— 覆盖：输入框渲染、模式切换（完整 URL / URL 组件）、编码/解码按钮点击后结果展示、复制按钮功能、错误提示展示。运行测试确认全部 FAIL
- [ ] 2.5 **GREEN**: 实现 `UrlCodecTab.tsx` 组件，使 2.4 所有测试通过
- [ ] 2.6 **REFACTOR**: 优化 UI 组件代码，运行测试确认全部 PASS

## 3. URL Query 参数解析功能（TDD）

- [ ] 3.1 **RED**: 编写 `url-parser.test.ts` 单元测试 —— 覆盖：标准 URL 解析（protocol/host/pathname/search/hash）、query 参数提取、重复参数名处理、编码参数自动解码、无参数 URL、无效 URL 错误处理。运行测试确认全部 FAIL
- [ ] 3.2 **GREEN**: 实现 `url-parser.ts` 核心函数（使用原生 `URL` + `URLSearchParams` API），使 3.1 所有测试通过
- [ ] 3.3 **REFACTOR**: 审查解析函数，优化代码结构，运行测试确认仍全部 PASS
- [ ] 3.4 **RED**: 编写参数解析 UI 组件测试 `UrlParserTab.test.tsx` —— 覆盖：URL 结构分解展示、参数表格渲染、重复参数展示、单个参数复制、无效 URL 错误提示、空参数提示。运行测试确认全部 FAIL
- [ ] 3.5 **GREEN**: 实现 `UrlParserTab.tsx` 组件，使 3.4 所有测试通过
- [ ] 3.6 **REFACTOR**: 优化 UI 组件代码，运行测试确认全部 PASS

## 4. 二维码生成功能（TDD）

- [ ] 4.1 **RED**: 编写 `qrcode-generator.test.ts` 单元测试 —— 覆盖：正常 URL 生成 Data URL、空输入返回 null、超长 URL（>2000 字符）标记警告、不同尺寸参数（128/256/512px）。运行测试确认全部 FAIL
- [ ] 4.2 **GREEN**: 实现 `qrcode-generator.ts`（封装 `qrcode` 库，返回 `{ dataUrl, warning? }` 结构），使 4.1 所有测试通过
- [ ] 4.3 **REFACTOR**: 审查二维码生成函数，运行测试确认仍全部 PASS
- [ ] 4.4 **RED**: 编写二维码 UI 组件测试 `UrlQrcodeTab.test.tsx` —— 覆盖：二维码图片渲染、空输入引导提示、超长 URL 警告展示、尺寸选项切换、下载按钮触发（mock `<a>` download）。运行测试确认全部 FAIL
- [ ] 4.5 **GREEN**: 实现 `UrlQrcodeTab.tsx` 组件，使 4.4 所有测试通过
- [ ] 4.6 **REFACTOR**: 优化 UI 组件代码，运行测试确认全部 PASS

## 5. AI Tools 注册（TDD）

- [ ] 5.1 **RED**: 编写 `ai-tools.test.ts` 单元测试 —— 覆盖：`url_encode` tool handler（编码/解码、完整 URL/组件模式）、`url_parse` tool handler（返回结构化参数信息、错误输入处理）。Mock `PluginContext`。运行测试确认全部 FAIL
- [ ] 5.2 **GREEN**: 在 `src/index.ts` 的 `activate` 中实现 AI tools 注册（`ctx.ai.registerTool`），提取 handler 为可测试的独立函数，使 5.1 所有测试通过
- [ ] 5.3 **REFACTOR**: 审查 AI tools 代码，运行测试确认全部 PASS

## 6. 集成验证与质量关卡

- [ ] 6.1 运行 `pnpm test` 确认所有测试通过（零失败）
- [ ] 6.2 运行 `pnpm lint` 确认无 lint 错误
- [ ] 6.3 确认 TypeScript 编译无类型错误（`tsc --noEmit`）
- [ ] 6.4 确认插件可被 PluginManager 正常加载和激活
- [ ] 6.5 确认 UI 面板通过 `plugin-panels.ts` 自动发现机制正确注册
