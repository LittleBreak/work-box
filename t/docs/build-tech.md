# wondermall-mos 构建工具选型：Webpack 5 vs Vite vs Rspack

> 基于项目现状（Vue 2.7 + Webpack 5 + Babel 7），评估下一阶段构建工具的技术方向。
>
> 编写日期：2026-03-06

---

## 目录

1. [背景与现状](#1-背景与现状)
2. [候选方案概览](#2-候选方案概览)
3. [核心维度对比](#3-核心维度对比)
4. [针对本项目的迁移成本分析](#4-针对本项目的迁移成本分析)
5. [性能基准数据](#5-性能基准数据)
6. [技术方向与生态趋势](#6-技术方向与生态趋势)
7. [综合评估矩阵](#7-综合评估矩阵)
8. [最终结论与推荐方案](#8-最终结论与推荐方案)
9. [参考资料](#9-参考资料)

---

## 1. 背景与现状

### 1.1 当前构建工具链

| 项目               | 版本                       |
| ------------------ | -------------------------- |
| Webpack            | 5.x（已从 3.x 升级完成）   |
| Babel              | 7.x（已从 6.x 升级完成）   |
| vue-loader         | 15.x（Vue 2 最终兼容版本） |
| webpack-dev-server | 4.x                        |
| Node.js            | 16.20（目标升级至 18+）    |

### 1.2 已有的定制化配置

通过对 `build/` 目录下配置文件的分析，当前 Webpack 配置的定制点包括：

| 定制项        | 说明                                             | 迁移难度 |
| ------------- | ------------------------------------------------ | -------- |
| 多环境构建    | `NODE_ENV_PREPARE` 切换 dev/prepare/production   | 低       |
| 代理配置      | `proxyTable` 代理到京东预发/生产环境             | 低       |
| SGM 监控集成  | `@jd/sgm-web/webpack` 插件，上传 SourceMap       | 高       |
| CDN 路径      | `JDB_RELEASER_CDN_BASE_PATH` 动态注入 publicPath | 低       |
| Gzip 压缩     | `compression-webpack-plugin` 条件启用            | 低       |
| Bundle 分析   | `webpack-bundle-analyzer` 条件启用               | 低       |
| 样式处理      | LESS + PostCSS + MiniCssExtract 的自定义 utils   | 中       |
| 静态资源拷贝  | `copy-webpack-plugin` 拷贝 static 目录           | 低       |
| Asset Modules | 图片/字体/媒体的内联阈值配置                     | 低       |

### 1.3 核心约束

- 项目正处于 Vue 2.7 → Vue 3 迁移过程中（Phase 2 进行中）
- 代码规模：996 个 Vue 文件、124 个 Store 模块、77 个 API 模块
- 大量 CommonJS 依赖（aws-sdk、lodash、moment 等）
- 京东内部 SGM 监控 SDK 以 Webpack 插件形式集成，Vite 适配情况未知

---

## 2. 候选方案概览

### 2.1 Webpack 5（维持现状 + 持续优化）

保持当前 Webpack 5 构建，利用其 2026 Roadmap 新特性持续优化。

- **当前版本**：5.x（项目已升级完成）
- **2026 Roadmap 重点**：
  - Lazy Barrel Optimization（借鉴 Rspack 的按需构建优化）
  - 原生 TypeScript 配置支持（无需 ts-loader 即可解析 TS 配置）
  - Multithreading API（多核并行构建）
  - 统一 Minimizer 插件（合并 terser/css/html/json minimizer）
  - 实验性原生 CSS 支持（`experiments.css`）

### 2.2 Vite 7（现代化构建工具）

迁移到 Vite，享受原生 ESM 开发体验和 Rolldown 构建引擎。

- **当前版本**：7.3.x（2026 年 1 月发布 7.0）
- **核心特性**：
  - 基于原生 ESM 的开发服务器，无需打包即可启动
  - Rolldown（Rust 编写）作为新一代构建引擎
  - 内置 HMR，Vue 组件热更新极快
  - `@vitejs/plugin-vue2` 支持 Vue 2.7
  - Vite+ 预览版即将发布，进一步增强能力
  - 默认浏览器目标升级为 `baseline-widely-available`
  - 要求 Node.js 20.19+ 或 22.12+

### 2.3 Rspack（Webpack 兼容的 Rust 替代）

使用 Rspack 作为 Webpack 的高性能替代，保留现有配置的同时获得数量级性能提升。

- **当前版本**：1.x（2024 年发布 1.0，2026 年持续迭代）
- **核心特性**：
  - Rust 编写，号称比 Webpack 快 5-10 倍
  - 高度兼容 Webpack 生态（兼容 Top 50 Webpack 插件）
  - 支持 Module Federation（微前端场景）
  - 迁移成本极低：大部分配置可直接复用
  - 字节跳动内部大规模验证

---

## 3. 核心维度对比

### 3.1 开发体验

| 维度       | Webpack 5                            | Vite 7                         | Rspack                            |
| ---------- | ------------------------------------ | ------------------------------ | --------------------------------- |
| 冷启动速度 | 10-30s（大型项目）                   | 0.1-0.9s                       | 0.4-2s                            |
| HMR 速度   | 1-5s                                 | 30-50ms                        | 100-300ms                         |
| 配置复杂度 | 高（需手动配置大量 loader/plugin）   | 低（约定大于配置，开箱即用）   | 中（兼容 Webpack 配置，略有差异） |
| 开发服务器 | webpack-dev-server（打包后提供服务） | 原生 ESM（按需编译，无需打包） | rspack-dev-server（类 Webpack）   |
| 错误提示   | 一般                                 | 优秀（友好的错误覆盖层）       | 较好                              |
| 调试体验   | Source Map 配置复杂                  | 开箱即用的 Source Map          | 类 Webpack                        |

**分析**：Vite 的开发体验优势显著——冷启动快 100 倍、HMR 快 100 倍。对于本项目 996 个 Vue 文件的规模，Webpack 每次冷启动需等待 15-30 秒，而 Vite 可在 1 秒内启动。Rspack 介于两者之间，启动速度约为 Webpack 的 5-10 倍。

### 3.2 生产构建性能

| 维度           | Webpack 5                      | Vite 7                                        | Rspack                   |
| -------------- | ------------------------------ | --------------------------------------------- | ------------------------ |
| 构建速度       | 基准 (1x)                      | 2-5x（Rolldown 引擎）                         | 5-10x                    |
| Tree Shaking   | 成熟，支持深度 tree shaking    | 基于 Rolldown，持续优化中                     | 优秀，支持 lazy barrel   |
| Code Splitting | 成熟（splitChunks 高度可配置） | 良好（Rollup manualChunks）                   | 兼容 Webpack splitChunks |
| 持久化缓存     | 内置（filesystem cache）       | 构建层暂无（开发层有依赖预构建缓存）          | 内置                     |
| 产物兼容性     | 高度可配置，支持低版本浏览器   | 默认现代浏览器，需 @vitejs/plugin-legacy 降级 | 高度可配置               |
| 产物体积       | 优秀                           | 优秀（Rolldown + treeshake）                  | 优秀                     |

**分析**：Rspack 在构建速度上领先，适合 CI/CD 管线对构建时间敏感的场景。Vite 7 引入 Rolldown 后构建性能大幅提升，但持久化缓存能力尚不如 Webpack 5。Webpack 5 的持久化缓存使得增量构建性能依然有竞争力。

### 3.3 生态与插件

| 维度              | Webpack 5                      | Vite 7                                  | Rspack                           |
| ----------------- | ------------------------------ | --------------------------------------- | -------------------------------- |
| 插件生态          | 最庞大（10 年积累）            | 快速增长（Rollup + Vite 插件）          | 兼容大部分 Webpack 插件          |
| Vue 支持          | vue-loader（官方维护）         | @vitejs/plugin-vue（Vue 团队维护）      | vue-loader（兼容）               |
| Vue 2.7 支持      | vue-loader@15（成熟稳定）      | @vitejs/plugin-vue2（官方，需 Vite 5+） | vue-loader@15（兼容）            |
| CSS 预处理        | 需配置 less-loader 等          | 内置支持 LESS/SASS/Stylus               | 兼容 less-loader                 |
| TypeScript        | 需 ts-loader 或 babel 转译     | 内置支持（esbuild 转译）                | 内置支持（SWC 转译）             |
| SGM 监控 SDK      | `@jd/sgm-web/webpack` 直接可用 | 需要确认是否有 Vite 插件版本            | 大概率兼容（Webpack 插件兼容层） |
| Module Federation | 内置支持                       | 需第三方插件                            | 内置支持                         |

**分析**：`@jd/sgm-web/webpack` 是本项目的关键依赖，它以 Webpack 插件形式集成 SourceMap 上传和监控注入。迁移到 Vite 需要确认 SGM SDK 是否提供 Vite 适配版本，否则需要自行实现。Rspack 对 Webpack 插件的兼容性使得 SGM 集成风险最低。

### 3.4 核心设计思路

| 维度            | Webpack 5              | Vite 7                                    | Rspack                       |
| --------------- | ---------------------- | ----------------------------------------- | ---------------------------- |
| 核心理念        | 万物皆模块，打包一切   | 利用浏览器原生 ESM，按需编译              | Webpack 兼容 + Rust 性能     |
| 模块系统        | CommonJS + ESM 混合    | ESM 优先（CJS 通过预构建转换）            | CommonJS + ESM 混合          |
| 开发/生产一致性 | 高（同一套打包逻辑）   | 中（开发用 esbuild/ESM，生产用 Rolldown） | 高（同一套打包逻辑）         |
| 架构语言        | JavaScript             | JavaScript + Rust（Rolldown）             | Rust                         |
| 扩展性          | Loader + Plugin 体系   | Plugin（Rollup 兼容）+ 中间件             | 兼容 Webpack Loader + Plugin |
| 学习曲线        | 高（概念多、配置复杂） | 低（约定优先、文档友好）                  | 低（会 Webpack 即会 Rspack） |

### 3.5 CommonJS 兼容性

本项目使用了大量 CommonJS 依赖，这是迁移评估的关键因素：

| 依赖       | 模块格式 | Vite 兼容方案                          |
| ---------- | -------- | -------------------------------------- |
| aws-sdk    | CJS      | 预构建自动转换（体积巨大，预构建耗时） |
| lodash     | CJS      | 可替换为 lodash-es，或预构建转换       |
| moment     | CJS      | 可替换为 dayjs（ESM），或预构建转换    |
| element-ui | CJS      | 预构建转换（@vue/compat 阶段）         |
| crypto-js  | CJS      | 预构建转换                             |
| quill      | CJS      | 预构建转换                             |
| axios 0.18 | CJS      | 升级到 1.x（ESM 支持更好）             |

**Vite** 通过 `esbuild` 预构建将 CJS 依赖转换为 ESM，但对于 `aws-sdk` 这类巨型 CJS 包，预构建可能耗时较长且存在边界兼容问题。**Webpack 5 和 Rspack** 原生支持 CJS/ESM 混合模块，无需任何转换。

---

## 4. 针对本项目的迁移成本分析

### 4.1 Webpack 5（维持现状）

| 工作项   | 预估人天   | 说明                             |
| -------- | ---------- | -------------------------------- |
| 无需迁移 | 0          | 已完成升级                       |
| 持续优化 | 1-2 天     | 开启持久化缓存、优化 splitChunks |
| **合计** | **1-2 天** |                                  |

### 4.2 Vite 7 迁移

| 工作项                  | 预估人天     | 说明                                             |
| ----------------------- | ------------ | ------------------------------------------------ |
| vite.config.js 基础配置 | 1-2 天       | 环境变量、路径别名、代理、LESS 配置              |
| 样式处理迁移            | 2-3 天       | styleLoaders 逻辑重写、PostCSS 适配              |
| SGM 监控集成            | 3-5 天       | 确认 Vite 版本可用性 / 自行实现 SourceMap 上传   |
| CJS 依赖兼容处理        | 2-3 天       | optimizeDeps 配置、aws-sdk 等大包处理            |
| 构建产物验证            | 2-3 天       | 对比 Webpack 产物，确保 CDN 路径、chunk 策略一致 |
| 开发/生产双通道联调     | 2-3 天       | 确保开发体验和生产构建均正常                     |
| Node.js 升级            | 1 天         | 从 16.20 升级到 20.19+（Vite 7 最低要求）        |
| 回归测试                | 3-5 天       | 全量功能验证                                     |
| **合计**                | **16-24 天** |                                                  |

### 4.3 Rspack 迁移

| 工作项           | 预估人天    | 说明                                              |
| ---------------- | ----------- | ------------------------------------------------- |
| 依赖替换         | 0.5 天      | webpack → @rspack/core，webpack-cli → @rspack/cli |
| 配置文件适配     | 1-2 天      | rspack.config.js，大部分配置直接复用              |
| SGM 插件兼容验证 | 1-2 天      | 验证 @jd/sgm-web/webpack 在 Rspack 下是否正常     |
| Loader 兼容验证  | 1-2 天      | vue-loader、babel-loader、less-loader 验证        |
| 构建产物验证     | 1-2 天      | 对比 Webpack 产物一致性                           |
| 回归测试         | 2-3 天      | 全量功能验证                                      |
| **合计**         | **6-11 天** |                                                   |

---

## 5. 性能基准数据

以下数据综合自社区基准测试（farm-fe/performance-compare）和行业报告，项目规模约 1000 个组件：

### 5.1 开发环境

| 指标              | Webpack 5   | Vite 7         | Rspack         |
| ----------------- | ----------- | -------------- | -------------- |
| 冷启动            | ~20s        | ~0.5s          | ~2s            |
| 热启动（有缓存）  | ~8s         | ~0.3s          | ~1s            |
| HMR（单文件修改） | ~2s         | ~30ms          | ~200ms         |
| 内存占用          | 高 (800MB+) | 中 (400-600MB) | 中 (400-600MB) |

### 5.2 生产构建

| 指标               | Webpack 5 | Vite 7 (Rolldown) | Rspack    |
| ------------------ | --------- | ----------------- | --------- |
| 首次构建           | ~60s      | ~25s              | ~8s       |
| 增量构建（有缓存） | ~15s      | ~20s              | ~5s       |
| 产物体积           | 基准      | 基准 +-5%         | 基准 +-3% |

> 注：以上为估算值，实际数据需在本项目中实测。Webpack 5 开启持久化缓存后增量构建优势明显。

---

## 6. 技术方向与生态趋势

### 6.1 行业趋势

| 趋势                        | 影响                                                            |
| --------------------------- | --------------------------------------------------------------- |
| **Rust 化构建工具成为主流** | Vite（Rolldown）、Rspack、Turbopack 均基于 Rust，性能数量级提升 |
| **ESM 成为标准模块格式**    | 浏览器原生支持 ESM，CJS 逐步退出历史舞台                        |
| **Vite 成为 Vue 官方推荐**  | Vue 3 官方脚手架 create-vue 默认使用 Vite                       |
| **Webpack 进入维护期**      | 仍在迭代但创新力度减弱，Rspack 承接其生态                       |
| **Vite+ 即将发布**          | VoidZero 团队打造的 Vite 增强版，2026 年初公开预览              |
| **Rspack 字节背书**         | 字节跳动大规模生产验证，社区活跃度快速上升                      |

### 6.2 Vue 生态构建工具推荐

| 场景                      | Vue 官方/社区推荐                       |
| ------------------------- | --------------------------------------- |
| Vue 3 新项目              | Vite（create-vue 默认）                 |
| Vue 2.7 项目              | Webpack 5 或 Vite + @vitejs/plugin-vue2 |
| Vue 2 → 3 迁移中          | Webpack 5（稳定性优先）                 |
| 大型 Webpack 项目性能优化 | Rspack（低成本替换）                    |
| 微前端场景                | Webpack 5 / Rspack（Module Federation） |

### 6.3 各工具 2026 年发展方向

**Webpack 5**

- 2026 Roadmap 重点在性能优化和开发体验改善
- Lazy Barrel Optimization、Multithreading API 等新特性
- 不再追求成为"最快"的构建工具，而是聚焦稳定性和生态维护
- 与 Rspack 形成互补关系而非竞争

**Vite 7+**

- Rolldown 引擎逐步成为默认，统一开发/生产构建链路
- Vite+ 增强版即将发布，提供更多企业级功能
- Environment API 提升框架集成灵活性
- Vite DevTools 提供深度调试分析能力
- 社区生态持续扩大，插件数量快速增长

**Rspack**

- 持续提升 Webpack 插件兼容性覆盖率
- Module Federation 2.0 支持
- 性能持续优化
- 目标成为 Webpack 的"零成本"替代方案

---

## 7. 综合评估矩阵

> 评分标准：5 = 最优，1 = 最差。权重基于本项目实际需求分配。

| 评估维度             | 权重     | Webpack 5 | Vite 7   | Rspack   |
| -------------------- | -------- | --------- | -------- | -------- |
| 开发体验（启动/HMR） | 20%      | 2         | 5        | 4        |
| 生产构建性能         | 15%      | 3         | 4        | 5        |
| 迁移成本与风险       | 25%      | 5         | 2        | 4        |
| 生态与插件兼容       | 15%      | 5         | 3        | 4        |
| 技术前瞻性           | 10%      | 2         | 5        | 4        |
| 团队学习成本         | 10%      | 5         | 3        | 5        |
| 社区活跃度           | 5%       | 3         | 5        | 4        |
| **加权总分**         | **100%** | **3.70**  | **3.45** | **4.20** |

### 评分说明

- **迁移成本（权重最高 25%）**：项目正处于 Vue 2 → 3 迁移关键期，构建工具的稳定性至关重要。Webpack 5 零成本（已就位），Rspack 低成本（配置复用），Vite 高成本（全面重写 + SGM 适配）。
- **开发体验（权重 20%）**：Vite 的 ESM 按需编译在大型项目中优势碾压，但需权衡迁移风险。
- **生态兼容（权重 15%）**：SGM 监控插件是硬约束，Webpack/Rspack 生态兼容性远优于 Vite。

---

## 8. 最终结论与推荐方案

### 推荐方案：分阶段策略 —— 近期 Rspack，远期评估 Vite

#### 阶段一（近期）：Webpack 5 → Rspack

**时机**：Vue 3 迁移（Phase 2）完成并稳定后

**理由**：

1. **迁移成本最低**：Rspack 高度兼容 Webpack 配置，现有 `build/` 目录下的配置文件可几乎原样复用，预估 6-11 人天完成。
2. **性能提升显著**：冷启动速度提升 5-10 倍，生产构建速度提升 5-10 倍，开发体验明显改善。
3. **SGM 监控兼容风险低**：Rspack 对 Webpack 插件的兼容层使得 `@jd/sgm-web/webpack` 大概率可直接使用。
4. **CommonJS 无痛支持**：无需处理 CJS → ESM 转换问题，aws-sdk、lodash、moment 等依赖零适配成本。
5. **与当前升级路线不冲突**：Vue 2 → 3 迁移期间保持 Webpack 5 不动，迁移完成后再切换 Rspack，风险隔离。
6. **团队零学习成本**：配置语法与 Webpack 一致，团队无需学习新的构建工具体系。

#### 阶段二（远期）：评估 Vite 迁移

**时机**：以下条件满足时重新评估

- Vue 3 迁移完成，@vue/compat 移除
- TypeScript 引入完成，代码库 ESM 化程度较高
- 京东 SGM SDK 提供 Vite 适配版本
- CJS 依赖（如 aws-sdk）完成替换或项目不再依赖
- Vite+ 正式发布，企业级功能成熟

**如果以上条件满足**，Vite 的开发体验优势（亚秒级启动、极速 HMR）将成为值得投入的方向。

### 不推荐的方案

**不推荐现在迁移 Vite，原因如下**：

1. **时机不对**：项目正处于 Vue 2 → 3 迁移关键期，同时更换构建工具会引入双重风险。
2. **SGM 集成不确定**：`@jd/sgm-web/webpack` 是否有 Vite 版本未经验证，自行实现成本高。
3. **CJS 依赖过多**：大量 CommonJS 依赖在 Vite 预构建中可能产生兼容问题。
4. **Node.js 版本跨度大**：Vite 7 要求 Node.js 20.19+，而项目当前为 16.20，跨两个大版本。
5. **投入产出比低**：迁移成本约 16-24 人天，是 Rspack 方案的 2-3 倍，但同样能达到的性能提升效果有限。

### 推荐的升级路线图

```
当前状态              近期目标              远期目标
Webpack 5    ──→    Rspack 1.x    ──→    评估 Vite / 继续 Rspack
(已完成)         (Vue 3 稳定后)        (代码库 ESM 化后)
                    6-11 人天             视条件决定
```

### 风险提示

| 风险                                  | 概率 | 应对                                                                          |
| ------------------------------------- | ---- | ----------------------------------------------------------------------------- |
| SGM 插件在 Rspack 下不兼容            | 低   | 提前在独立分支验证；若不兼容，考虑 Rspack 提供的 Webpack 插件适配层或社区方案 |
| 部分 Webpack 插件不在 Rspack 兼容列表 | 低   | compression-webpack-plugin 等常用插件均已兼容，提前查阅 Rspack 兼容列表       |
| Rspack 社区不如 Webpack/Vite 成熟     | 中   | Rspack 有字节跳动持续投入，且问题可随时回退 Webpack 5（配置几乎一致）         |

---

## 9. 参考资料

- [Webpack 2026 Roadmap](https://webpack.js.org/blog/2026-04-02-roadmap-2026/)
- [Vite 7.0 发布公告](https://vite.dev/blog/announcing-vite7)
- [Vite 6.0 发布公告 — Environment API](https://vite.dev/blog/announcing-vite6)
- [Announcing Vite+ | VoidZero](https://voidzero.dev/posts/announcing-vite-plus)
- [Rspack 1.0 Released — 23x Faster than Webpack](https://www.infoq.com/news/2024/10/rspack-released/)
- [Rspack Roadmap](https://rspack.rs/misc/planning/roadmap)
- [Vite vs Webpack 2026 Migration Guide — DEV Community](https://dev.to/pockit_tools/vite-vs-webpack-in-2026-a-complete-migration-guide-and-deep-performance-analysis-5ej5)
- [Vite vs Webpack for React Apps 2025 — LogRocket](https://blog.logrocket.com/vite-vs-webpack-react-apps-2025-senior-engineer/)
- [Why Vite Is Better for Vue.js — Epicmax](https://epicmax.co/post/vite-vs-webpack)
- [Vite vs Turbopack vs Rspack — DEV Community](https://dev.to/mrakdon/vite-vs-turbopack-vs-rspack-which-build-tool-wins-the-modern-frontend-race-2jpg)
- [Performance Compare — Farm-FE Benchmark](https://github.com/farm-fe/performance-compare)
- [Frontend Build Tools Showdown 2025 — Meerako](https://www.meerako.com/blogs/frontend-build-tools-vite-vs-webpack-turbopack-comparison)
- [Vue 2.7 Vite Plugin — @vitejs/plugin-vue2](https://github.com/vitejs/vite-plugin-vue2)
- [State of Vue.js 2026 Survey](https://www.monterail.com/blog/vue-development-challenges-state-of-vue)
