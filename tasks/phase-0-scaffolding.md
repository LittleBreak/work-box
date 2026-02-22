# Phase 0：项目脚手架 & 基建

> **目标**：从零搭建项目骨架，确保开发环境跑通，交付可运行的 Electron 空壳 + 完整工具链。
>
> **里程碑**：M0 - 骨架就绪

---

## 任务编号说明

ROADMAP.md 中 Phase 0 原有 6 个任务（0.1–0.6），其中 **0.5（Vitest 测试框架）已合并至 0.1**。
合并原因：Vitest 与脚手架初始化强相关，需在同一步骤中完成以确保后续任务可立即执行 TDD。
因此本文档包含 5 个任务：0.1、0.2、0.3、0.4、0.6（保留原编号以与 ROADMAP 对照）。

---

## Phase 0 执行前置（必须确认）

在开始任何 Task 前，先记录并确认以下信息（写入 PR 描述或任务日志）：

- [ ] Node.js 版本（要求 v20 LTS，满足 Electron v33 和 electron-vite 依赖）
- [ ] pnpm 版本（`pnpm v9+`）
- [ ] 操作系统与架构（macOS / Windows / Linux，x64/arm64）
- [ ] 包管理策略（仅使用 pnpm，禁止混用 npm/yarn lockfile）
- [ ] 本阶段只引入 `ARCHITECTURE.md` 与 `ROADMAP.md` 已声明依赖

---

## 任务依赖关系 & 推荐执行顺序

### 依赖关系图

```
0.1（脚手架 + Vitest）  ← 项目起点，包含测试框架初始化（含原 0.5）
  ├── 0.2（pnpm workspace）
  │     ├── 0.3（代码规范）  ← 依赖 0.2 提供完整代码目标
  │     └── 0.6（目录结构）  ← 依赖 0.2 提供 workspace + path alias
  └── 0.4（Tailwind + shadcn/ui）← 仅依赖 0.1（Vitest + 基础项目结构）
```

### 推荐执行顺序

```
0.1 → 0.2 → 0.6 → 0.3 → 0.4
```

- 0.1 包含 Vitest 配置，确保后续任务均可执行 TDD
- 0.2 和 0.6 建立项目结构，为 0.3 的 lint 提供完整代码目标
- 0.4 最后执行，因为 UI 集成依赖完整的项目结构
- 注意：0.4 仅依赖 0.1，如果资源允许可以和 0.2 并行执行，但推荐在 0.6 之后以避免目录冲突

---

## TDD 分层策略

> **与 CLAUDE.md 的关系**：CLAUDE.md 规定"任何代码实现都必须先有测试"。
> Phase 0 中存在纯配置/脚手架任务（无业务逻辑可测），为此引入 B 类验证策略作为 TDD 的合理豁免。
> 此豁免仅适用于本阶段的配置类任务，一旦 Vitest 就绪，后续所有含业务逻辑的代码必须严格 TDD。

Phase 0 的任务性质分为两类，应用不同的验证策略：

### A 类：有可测试行为的任务 → 严格 TDD（Red-Green-Refactor）

适用于：0.2（占位函数导入验证）、0.4（组件渲染）、0.6（目录结构与导入）

1. **Red**：先编写测试（正常路径 + 边界条件 + 错误处理），运行并确认失败
2. **Green**：实现最小代码使测试通过
3. **Refactor**：重构并再次运行测试确保通过

### B 类：纯配置/脚手架任务 → 验证脚本（Setup-Verify）

适用于：0.1（脚手架初始化，Vitest 尚不可用）、0.3（规范工具链，无业务逻辑）

1. **Setup**：完成配置和安装
2. **Verify**：运行验证脚本/命令确认配置生效
3. **Evidence**：记录验证结果作为留痕

### 统一留痕要求

- [ ] A 类任务：记录 Red 阶段失败测试名称、Green 阶段通过结果、最终回归结果
- [ ] B 类任务：记录验证命令和输出结果
- [ ] 所有任务：`pnpm test` 通过（从 0.1 完成后起）
- [ ] 测试文件与源文件同目录：`*.test.ts` / `*.test.tsx`

---

## 0.1 初始化 electron-vite 项目 + Vitest 测试框架 ✅ DONE

**目标**：使用 electron-vite 创建 React + TypeScript 项目模板，同时配置 Vitest 测试框架，为后续任务建立 TDD 基础。

> 本任务合并了 ROADMAP.md 中的 0.5（Vitest 测试框架），原因见"任务编号说明"。

**输入/前置条件**：

- 无前置依赖（项目起点）
- 需读取：`ARCHITECTURE.md` 第二节（技术选型）、第三节（进程模型）、第八节（目录结构）
- 当前仓库已有 `ARCHITECTURE.md`、`ROADMAP.md`、`CLAUDE.md`、`tasks/` 等文件，需保留

**验证策略**：B 类（Setup-Verify）

> 本任务是脚手架初始化，在测试框架就绪之前无法执行 TDD。
> Vitest 配置完成后，后续任务均可执行严格 TDD。

**关键决策**：

| 决策项 | 方案 |
|--------|------|
| 初始化方式 | 在临时目录执行 `pnpm create electron-vite`（选择 `react-ts` 模板），然后将生成文件合并到当前仓库根目录，保留已有的 `*.md` 和 `tasks/` |
| electron-vite 版本 | 使用当前 latest（安装后锁定到 `pnpm-lock.yaml`） |
| Electron 版本 | v33+（模板默认，确认 `package.json` 中版本满足） |
| Vitest 环境 | 主进程测试用 `node` 环境；渲染进程测试用 `jsdom` 环境 |
| Vitest 配置方式 | 使用 vitest workspace（`vitest.workspace.ts`），分别配置 main 和 renderer 两个项目 |
| Electron mock | 测试中通过 `vi.mock('electron', ...)` mock electron 模块 |
| 路径别名 | 在 `electron.vite.config.ts` 和 `tsconfig.json` 中配置 `@renderer`、`@main`、`@shared` 别名（供后续任务使用） |

**执行步骤**：

1. 在临时目录执行 `pnpm create electron-vite work-box-temp --template react-ts`
2. 将生成的文件合并到当前仓库根目录，合并规则：
   - **保留不动**：`ARCHITECTURE.md`、`ROADMAP.md`、`CLAUDE.md`、`tasks/`
   - **直接复制**：`src/`、`electron.vite.config.ts`、`electron-builder.yml`、`tsconfig*.json`、`resources/`
   - **合并内容**：`.gitignore`（将模板内容追加到已有文件中，去重）
   - **以模板为准**：`package.json`（模板生成的新项目，无需合并）
   - **跳过**：模板的 `README.md`（保留仓库已有的文档）
3. 清理模板默认的演示代码：
   - **保留**：`src/main/index.ts`（主进程入口）、`src/preload/index.ts`（preload 入口）、`src/renderer/main.tsx`（React 入口）、`src/renderer/App.tsx`（根组件，清空演示内容保留空壳）、`src/renderer/index.html`
   - **删除**：模板中的演示组件、示例图片/SVG、示例 CSS（保留基础 `globals.css` 或 `main.css`）
4. 配置路径别名：在 `electron.vite.config.ts` 的 renderer 配置中添加 `resolve.alias`（`@renderer` → `src/renderer/src`），在 `tsconfig.json` 中添加对应的 `paths`，同时为 `@main`、`@shared` 预留别名配置
5. 安装 `vitest`、`@vitest/coverage-v8`、`jsdom` 为 devDependencies
6. 创建 `vitest.workspace.ts`，配置 main（node 环境）和 renderer（jsdom 环境）两个项目
7. 编写 main 和 renderer 各 1 个 hello-world 级示例测试
8. 在 `package.json` 中添加 `"test": "vitest run"` 和 `"test:watch": "vitest"` 脚本
9. 验证 `pnpm dev` 和 `pnpm test` 均可正常执行

**验收标准**：

- [x] 仓库根目录结构正确：`package.json`、`electron.vite.config.ts`、`src/main/`、`src/preload/`、`src/renderer/` 入口文件均存在
- [x] 已有文件（`ARCHITECTURE.md`、`ROADMAP.md`、`CLAUDE.md`、`tasks/`）未被覆盖
- [x] `pnpm dev` 启动无报错，Electron 窗口中可看到 React 页面（仅限本地有 GUI 环境验证，CI 中跳过此项）
- [x] `electron.vite.config.ts` 中已配置 `@renderer`、`@main`、`@shared` 路径别名
- [x] `tsconfig.json` 中 `paths` 配置与 `electron.vite.config.ts` 别名一致
- [x] `vitest.workspace.ts` 存在，区分 main（node）和 renderer（jsdom）环境
- [x] `pnpm test` 能执行并通过（至少 2 个示例测试：main 1 个 + renderer 1 个）
- [x] 示例测试覆盖：正常路径、边界条件、错误处理各 1 个样例
- [x] 提供可复核证据：执行命令日志、`pnpm test` 输出、`pnpm dev` 启动日志（无报错）

**交付物**：

- [x] 初始化后的项目基础文件（`package.json`、`electron.vite.config.ts`、`tsconfig*.json`、`src/main/`、`src/preload/`、`src/renderer/` 入口）
- [x] `vitest.workspace.ts` + main/renderer 示例测试文件
- [x] `package.json` 中的 `test` / `test:watch` 脚本
- [x] 路径别名配置（`@renderer`、`@main`、`@shared`）

---

## 0.2 配置 pnpm workspace (monorepo)

**目标**：配置 monorepo 结构，支持多包管理。

**输入/前置条件**：

- 依赖：Task 0.1 完成（需要 Vitest 可用）
- 需读取：`ARCHITECTURE.md` 第八节（项目目录结构）

**验证策略**：A 类（严格 TDD）

> 本任务虽然以配置为主，但包含可测试的业务行为：`definePlugin` 占位函数的导入和调用、`PluginManifest` 接口的类型导出。
> 这些行为应通过 Vitest 测试验证，符合 TDD 要求。

**关键决策**：

| 决策项 | 方案 |
|--------|------|
| `plugin-api` 包名 | `@workbox/plugin-api` |
| `plugin-api` 入口 | `"main": "./src/index.ts"`，`"types": "./src/index.ts"`（开发阶段直接引用源码，不需预编译） |
| TypeScript 配置 | `packages/plugin-api/` 需有自己的 `tsconfig.json`，主项目 `tsconfig.json` 通过 `references` 或 `paths` 配置引用 |
| 引用验证标准 | TypeScript 编译通过（`tsc --noEmit`）+ Vitest 测试中可 `import` 并调用导出函数 |

**TDD 要求**：

- [ ] Red：先编写测试文件（在 `src/main/` 下），测试 `import { definePlugin } from '@workbox/plugin-api'` 能正常导入、`definePlugin` 可调用并返回预期结构、`PluginManifest` 类型可正确使用。运行 `pnpm test`，确认全部失败。
- [ ] Green：创建 workspace 配置、`packages/plugin-api/` 包骨架和占位实现，使测试通过。
- [ ] Refactor：统一导出风格，测试保持通过。

**执行步骤**：

1. **（Red）** 编写验证测试：在 `src/main/` 下创建测试文件
   - 测试 1（正常路径）：`import { definePlugin } from '@workbox/plugin-api'`，断言 `definePlugin` 是函数，调用后返回包含 `name` 属性的对象
   - 测试 2（边界条件）：`definePlugin` 传入空对象时不抛错
   - 测试 3（类型验证）：`PluginManifest` 接口可被正确实例化
   - 运行 `pnpm test`，确认失败（模块不存在）
2. **（Green）** 创建 `pnpm-workspace.yaml`，包含 `packages/*` 和 `plugins/*`
3. 创建 `packages/plugin-api/package.json`：
   ```json
   {
     "name": "@workbox/plugin-api",
     "version": "0.0.1",
     "private": true,
     "main": "./src/index.ts",
     "types": "./src/index.ts",
     "scripts": {}
   }
   ```
4. 创建 `packages/plugin-api/tsconfig.json`，继承根 `tsconfig` 配置
5. 创建 `packages/plugin-api/src/index.ts`：导出 `definePlugin` 占位函数
6. 创建 `packages/plugin-api/src/types.ts`：导出 `PluginManifest` 占位接口
7. 在主项目 `package.json` 添加依赖：`"@workbox/plugin-api": "workspace:*"`
8. 执行 `pnpm install`
9. 运行 `pnpm test`，确认测试通过
10. **（Refactor）** 统一占位导出风格，再次运行 `pnpm test` 确认通过

**验收标准**：

- [ ] `pnpm-workspace.yaml` 存在，包含 `packages/*` 和 `plugins/*`
- [ ] `packages/plugin-api/` 包骨架完整（`package.json` + `tsconfig.json` + `src/index.ts` + `src/types.ts`）
- [ ] `pnpm install` 成功，无报错
- [ ] TDD 留痕完整：Red 阶段测试失败日志 + Green 阶段通过日志
- [ ] 验证测试通过：主项目中 `import { definePlugin } from '@workbox/plugin-api'` 可正常执行
- [ ] `tsc --noEmit` 无类型错误（验证类型引用正确）
- [ ] 提供可复核证据：`pnpm install` 日志 + `pnpm test` 输出 + `tsc --noEmit` 输出

**交付物**：

- [ ] `pnpm-workspace.yaml`
- [ ] `packages/plugin-api/*` 初始骨架（含 `tsconfig.json` 和占位导出）
- [ ] workspace 引用验证测试（含正常路径、边界条件、类型验证）

---

## 0.3 代码规范工具链

**目标**：配置代码规范和 Git 提交规范工具链。

**输入/前置条件**：

- 依赖：Task 0.1、0.2 完成
- 需读取：`ARCHITECTURE.md` 第十一节（开发规范）

**验证策略**：B 类（Setup-Verify）

> 工具链配置的核心验证是"规则能否正确拦截违规"。
> 使用验证脚本模拟违规场景，确认拦截生效后删除违规样例文件。
> 此任务无业务逻辑代码，属于 B 类豁免范围。

**关键决策**：

| 决策项 | 方案 |
|--------|------|
| ESLint 版本 | v9+（flat config 格式：`eslint.config.mjs`） |
| ESLint 配置基础 | `@electron-toolkit/eslint-config-ts` + `eslint-plugin-react` + `eslint-plugin-react-hooks` |
| Prettier 集成 | 使用 `eslint-config-prettier` 禁用冲突规则（不用 `eslint-plugin-prettier`，避免性能问题） |
| Husky 版本 | v9+（使用 `husky init` 初始化） |
| lint-staged 配置位置 | `package.json` 中的 `"lint-staged"` 字段 |
| Commitlint preset | `@commitlint/config-conventional` |

**执行步骤**：

1. 安装依赖：`eslint`、`@electron-toolkit/eslint-config-ts`、`eslint-plugin-react`、`eslint-plugin-react-hooks`、`prettier`、`eslint-config-prettier`
2. 创建 `eslint.config.mjs`（ESLint v9 flat config 格式）
3. 创建 `.prettierrc.json`（配置基础规则：`semi`、`singleQuote`、`tabWidth` 等）
4. 安装并初始化 Husky：`pnpm add -D husky && npx husky init`
5. 安装 lint-staged：`pnpm add -D lint-staged`
6. 在 `package.json` 中配置 `lint-staged` 规则
7. 安装 Commitlint：`pnpm add -D @commitlint/cli @commitlint/config-conventional`
8. 创建 `commitlint.config.ts`
9. 添加 Husky hooks：`pre-commit`（lint-staged）、`commit-msg`（commitlint）
10. 在 `package.json` 中添加 `"lint": "eslint ."` 和 `"format": "prettier --write ."` 脚本

**验证方案**（替代 TDD）：

```bash
# 验证 1：ESLint 能检测违规（在项目内创建临时文件，避免 ESLint 忽略项目外路径）
echo 'var x = 1; console.log(x)' > src/__lint-test-temp.ts
pnpm lint src/__lint-test-temp.ts  # 期望：报告 var 违规
rm src/__lint-test-temp.ts

# 验证 2：Prettier 能格式化（同样使用项目内路径）
echo 'const   x=1' > src/__fmt-test-temp.ts
pnpm format src/__fmt-test-temp.ts  # 期望：格式化为 const x = 1
rm src/__fmt-test-temp.ts

# 验证 3：Commitlint 能拦截非法消息
echo 'bad message' | npx commitlint  # 期望：报错

# 验证 4：Commitlint 放行合法消息
echo 'feat: add new feature' | npx commitlint  # 期望：通过
```

**验收标准**：

- [ ] `eslint.config.mjs` 存在，规则生效
- [ ] `.prettierrc.json` 存在，格式化规则生效
- [ ] `.husky/pre-commit` 和 `.husky/commit-msg` hook 文件存在
- [ ] `lint-staged` 配置存在
- [ ] `commitlint.config.ts` 存在
- [ ] `pnpm lint` 可执行且当前代码无 lint 错误
- [ ] 验证脚本全部通过（违规被拦截、合法通过）
- [ ] `pnpm test` 回归通过（未破坏已有测试）
- [ ] 提供可复核证据：`pnpm lint` 输出、commitlint 拦截/通过示例、hook 文件内容

**交付物**：

- [ ] `eslint.config.mjs`
- [ ] `.prettierrc.json`
- [ ] `.husky/pre-commit`、`.husky/commit-msg`
- [ ] `lint-staged` 配置（在 `package.json` 中）
- [ ] `commitlint.config.ts`

---

## 0.4 Tailwind CSS + shadcn/ui 集成

**目标**：集成 UI 样式方案和组件库。

**输入/前置条件**：

- 依赖：Task 0.1 完成（需要 Vitest 可用 + 路径别名已配置）
- 推荐在 0.6 之后执行（目录结构完整后更不易冲突），但非强制
- 需读取：`ARCHITECTURE.md` 第二节（技术选型 - UI 组件库 / 样式方案）

**验证策略**：A 类（严格 TDD）

**关键决策**：

| 决策项 | 方案 |
|--------|------|
| Tailwind 版本 | v4（使用 CSS `@import "tailwindcss"` 方式，不需要 `tailwind.config.js`） |
| shadcn/ui 初始化 | 使用 `npx shadcn@latest init`，framework 选择 `Vite`（最接近 electron-vite renderer 环境） |
| shadcn/ui init 选项 | style: `default`；base color: `neutral`；CSS variables: `yes`（其余保持默认） |
| `components.json` 路径别名 | `aliases.components` 设为 `@renderer/components`（匹配 electron-vite 的 renderer 路径别名） |
| 测试方式 | 使用 `@testing-library/react` 在 jsdom 环境中渲染组件并断言 |

**Electron 适配注意事项**：

- shadcn/ui 的 `init` 不直接支持 Electron，选择 `Vite` 框架后需要手动调整路径别名
- `components.json` 中的 `aliases` 需与 `electron.vite.config.ts` 中 renderer 的 `resolve.alias` 保持一致
- Tailwind v4 使用 CSS-first 配置，确认 `globals.css` 中正确引入 `@import "tailwindcss"`

**兼容性风险**：

> shadcn/ui 对 Tailwind v4 的支持需在执行前确认（查阅 shadcn/ui 官方文档或 changelog）。
> 若不兼容，备选方案：降级到 Tailwind v3 + `tailwind.config.ts`，或手动适配 shadcn/ui 组件的 CSS。

**TDD 要求**：

- [ ] Red：先写组件渲染测试，确认失败。具体测试用例见下方。
- [ ] Green：完成 Tailwind + shadcn/ui 集成，添加 Button 和 Card 组件，使测试通过
- [ ] Refactor：整理样式入口和组件导出结构，测试保持通过

**测试用例设计**（Red 阶段编写）：

```typescript
// Button 组件测试
describe('Button', () => {
  // 正常路径
  it('renders with default text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  // 交互验证
  it('calls onClick handler when clicked', async () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledOnce()
  })

  // 边界条件：variant 属性
  it('applies variant class correctly', () => {
    render(<Button variant="destructive">Delete</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  // 边界条件：disabled 状态
  it('is disabled when disabled prop is set', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})

// Card 组件测试
describe('Card', () => {
  // 正常路径
  it('renders Card with title and content', () => {
    render(
      <Card>
        <CardHeader><CardTitle>Title</CardTitle></CardHeader>
        <CardContent>Content</CardContent>
      </Card>
    )
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  // 边界条件：空内容
  it('renders empty Card without crashing', () => {
    render(<Card />)
    expect(document.querySelector('[class]')).toBeInTheDocument()
  })
})
```

**执行步骤**：

1. **（Red）** 安装测试依赖：`pnpm add -D @testing-library/react @testing-library/jest-dom @testing-library/user-event`
2. 编写 Button 和 Card 组件的渲染测试（如上述测试用例），运行 `pnpm test`，确认全部失败
3. **（Green）** 安装 Tailwind CSS v4：`pnpm add -D tailwindcss @tailwindcss/vite`
4. 配置 `globals.css`（引入 `@import "tailwindcss"`）
5. 初始化 shadcn/ui：`npx shadcn@latest init`（按关键决策中的选项配置）
6. 手动调整 `components.json` 中的路径别名以匹配 electron-vite 配置
7. 添加 Button 组件：`npx shadcn@latest add button`
8. 添加 Card 组件：`npx shadcn@latest add card`
9. 运行 `pnpm test`，确认测试通过
10. **（Refactor）** 整理样式入口和组件导出结构，运行 `pnpm test` 确认通过

**验收标准**：

- [ ] `globals.css` 中正确引入 Tailwind CSS v4（`@import "tailwindcss"`）
- [ ] `components.json` 存在，路径别名与 `electron.vite.config.ts` 一致
- [ ] Button 和 Card 组件文件存在于 `src/renderer/components/ui/`
- [ ] TDD 留痕完整：Red 阶段测试失败日志 + Green 阶段通过日志
- [ ] 组件渲染测试通过（使用 `@testing-library/react`），覆盖正常路径、交互、边界条件
- [ ] `pnpm dev` 启动后渲染进程中 shadcn Button 组件正常显示（可选截图，仅限本地有 GUI 环境）
- [ ] `pnpm test` 回归通过
- [ ] 提供可复核证据：组件测试输出 + 运行态截图（可选）

**交付物**：

- [ ] `components.json`
- [ ] `src/renderer/styles/globals.css`（含 Tailwind 引入）
- [ ] `src/renderer/components/ui/button.tsx`、`src/renderer/components/ui/card.tsx`
- [ ] 组件渲染测试文件（含上述测试用例）

---

## 0.6 目录结构搭建

**目标**：按架构文档**扩展**业务子目录骨架（0.1 已创建 `src/main/`、`src/preload/`、`src/renderer/` 基础目录）。

**输入/前置条件**：

- 依赖：Task 0.1、0.2 完成（需要 Vitest + 路径别名 + workspace）
- 需读取：`ARCHITECTURE.md` 第八节（项目目录结构）
- 路径别名 `@shared` 需已在 0.1 中配置完毕

**验证策略**：A 类（严格 TDD）

**与 0.1 的边界划分**：

| 范围 | 0.1 负责 | 0.6 负责 |
|------|----------|----------|
| `src/main/` | 入口文件 `index.ts` | 子目录：`ipc/`、`plugin/`、`ai/`、`storage/` + 占位导出 |
| `src/preload/` | 入口文件 `index.ts` | 无额外操作 |
| `src/renderer/` | 入口文件 `main.tsx`、`App.tsx` | 子目录：`components/`、`features/`、`stores/` + 占位导出 |
| `src/shared/` | 不创建 | 目录 + `ipc-channels.ts`、`types.ts` 占位 |
| `plugins/` | 不创建 | 目录骨架（空） |
| 路径别名 | `@renderer`、`@main`、`@shared` 别名配置 | 不修改别名配置（使用 0.1 已配置的） |

**TDD 要求**：

- [ ] Red：先写测试，确认失败。具体测试用例见下方。
- [ ] Green：创建目录和占位导出文件使测试通过
- [ ] Refactor：统一占位文件的导出风格，测试保持通过

**测试用例设计**（Red 阶段编写）：

```typescript
import { existsSync } from 'fs'
import { resolve } from 'path'

const ROOT = resolve(__dirname, '../../..') // 根据测试文件位置调整

describe('目录结构', () => {
  // 正常路径：子目录存在
  const requiredDirs = [
    'src/main/ipc',
    'src/main/plugin',
    'src/main/ai',
    'src/main/storage',
    'src/renderer/components',
    'src/renderer/features',
    'src/renderer/stores',
    'src/shared',
    'plugins',
  ]

  it.each(requiredDirs)('目录 %s 存在', (dir) => {
    expect(existsSync(resolve(ROOT, dir))).toBe(true)
  })

  // 正常路径：占位文件存在且可导入
  it('src/shared/ipc-channels.ts 导出 IPC_CHANNELS', async () => {
    const mod = await import('@shared/ipc-channels')
    expect(mod.IPC_CHANNELS).toBeDefined()
  })

  it('src/shared/types.ts 可正常导入', async () => {
    const mod = await import('@shared/types')
    expect(mod).toBeDefined()
  })

  // 正常路径：子目录占位 index.ts 可导入
  it('src/main/ipc/index.ts 可导入', async () => {
    const mod = await import('@main/ipc')
    expect(mod).toBeDefined()
  })

  // 边界条件：plugins 目录存在但为空（含 .gitkeep）
  it('plugins 目录存在且包含 .gitkeep', () => {
    expect(existsSync(resolve(ROOT, 'plugins/.gitkeep'))).toBe(true)
  })
})
```

**验收标准**：

- [ ] 以下子目录已创建且包含占位 `index.ts`（导出空对象或空函数）：
  - `src/main/ipc/`
  - `src/main/plugin/`
  - `src/main/ai/`
  - `src/main/storage/`
  - `src/renderer/components/`
  - `src/renderer/features/`
  - `src/renderer/stores/`
- [ ] `src/shared/` 目录已创建，包含 `ipc-channels.ts`（导出 `IPC_CHANNELS` 占位常量）和 `types.ts` 占位文件
- [ ] `plugins/` 目录已创建（含 `.gitkeep`）
- [ ] 目录结构与 `ARCHITECTURE.md` 第八节一致
- [ ] TDD 留痕完整：Red 阶段测试失败日志 + Green 阶段通过日志
- [ ] 目录结构测试通过（采用显式断言检查文件/目录存在 + 导入可用）
- [ ] `pnpm test` 回归通过
- [ ] 提供可复核证据：`tree` 命令输出 + 测试结果

**交付物**：

- [ ] 与架构文档一致的业务子目录骨架（含占位导出）
- [ ] 目录结构校验测试（含正常路径、边界条件测试用例）
