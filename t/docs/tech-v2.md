# wondermall-mos 技术架构升级方案

> 编写日期：2026-03-04

---

## 目录

1. [升级背景与目标](#1-升级背景与目标)
2. [升级依赖链分析](#2-升级依赖链分析)
3. [项目现状](#3-项目现状)
4. [两套技术方案总览](#4-两套技术方案总览)
5. [方案一：全链路渐进式迁移（详细执行步骤）](#5-方案一全链路渐进式迁移详细执行步骤)
6. [方案二：@vue/compat 新旧共存（详细执行步骤）](#6-方案二vuecompat-新旧共存详细执行步骤)
7. [其他必须处理的迁移事项](#7-其他必须处理的迁移事项)
8. [工作量预估](#8-工作量预估)
9. [风险与应对策略](#9-风险与应对策略)

---

## 1. 升级背景与目标

### 1.1 升级原因

公司正在推进技术架构统一，前端技术栈标准为 **Vue 3 + 公司标准 UI 组件库**。wondermall-mos 作为京东商旅后台管理系统的核心项目，当前仍基于 Vue 2.7 + Element UI 2，与公司技术架构标准存在差距，需要进行架构升级以实现对齐。

### 1.2 升级目标

- **对齐公司技术架构标准**：将框架从 Vue 2 升级到 Vue 3，使项目融入公司统一技术生态
- **统一 UI 组件库**：从 Element UI 2 切换到公司标准 Vue 3 UI 组件库，实现跨项目 UI 一致性
- **升级构建工具链**：将 Webpack 3 + Babel 6 升级到 Webpack 5 + Babel 7，获得更好的构建性能和现代语法支持
- **提升开发体验**：使用 Vue 3 的 Composition API、`<script setup>` 等现代特性，提升开发效率和代码可维护性

### 1.3 为什么不选择 Vite 替代 Webpack

Vite 在新项目中是更优选择，但本项目暂不推荐：

- 当前 Webpack 配置深度定制（代理配置、多环境构建、SGM 监控集成等），迁移 Vite 需要全部重写
- 项目使用了部分 Webpack 专有插件和 loader（如 `extract-text-webpack-plugin`、自定义 loader），需要逐个找 Vite 替代方案
- Webpack 3 → 5 的升级路径更平滑，配置结构基本一致，风险更低
- 后续稳定后可以再评估 Webpack 5 → Vite 的二次迁移

---

## 2. 升级依赖链分析

### 2.1 核心依赖链

架构升级并非单一组件替换，而是一条环环相扣的依赖链：

```
统一 UI 组件库（公司标准）
    ↑ 公司标准 UI 库仅支持 Vue 3
Vue 2.7 → Vue 3
    ↑ Vue 3 要求 vue-loader 16+、@vue/compiler-sfc
Webpack 3 → Webpack 5
    ↑ vue-loader 16+ 最低要求 Webpack 4，推荐 Webpack 5
Babel 6 → Babel 7
    ↑ Babel 6 不支持 Vue 3 JSX 转换和可选链语法
Node.js 16 → 18+
    ↑ Webpack 5 推荐 Node 18 LTS 运行环境
```

**结论**：要统一 UI 库，必须先升级 Vue 3；而 Vue 3 的运行依赖 Webpack 5 + Babel 7 等构建工具链的支撑。因此整条链路必须从底层构建工具开始，逐层向上推进。

### 2.2 需要升级的全部依赖清单

#### 核心框架层

| 依赖项                | 当前版本    | 目标版本                   | 升级原因                                                      |
| --------------------- | ----------- | -------------------------- | ------------------------------------------------------------- |
| Node.js               | 16.20       | 18+ (LTS)                  | Webpack 5 推荐运行环境，移除 `--openssl-legacy-provider` hack |
| 包管理器              | pnpm 7.33.7 | pnpm 8+                    | 配合 Node 18+                                                 |
| Vue                   | 2.7.12      | 3.4+                       | 对齐公司技术标准，支持公司标准 UI 库                          |
| Vue Router            | 3.0.1       | 4.x                        | Vue 3 生态要求，@vue/compat 不兼容旧版 Router                 |
| Vuex                  | 3.1.2       | 4.x（或迁移至 Pinia）      | Vue 3 生态要求，@vue/compat 不兼容旧版 Vuex                   |
| Element UI            | 2.13.0      | 替换为公司标准 Vue 3 UI 库 | 对齐公司 UI 标准，Element UI 不支持 Vue 3                     |
| vue-template-compiler | 2.7.12      | 移除                       | Vue 3 内置 @vue/compiler-sfc，不再需要                        |

#### 构建工具层

| 依赖项             | 当前版本 | 目标版本                       | 升级原因                                                      |
| ------------------ | -------- | ------------------------------ | ------------------------------------------------------------- |
| Webpack            | 3.12.0   | 5.x                            | vue-loader 16+ 要求 Webpack 4+，推荐 5                        |
| webpack-cli        | —        | 5.x                            | Webpack 5 配套 CLI                                            |
| webpack-dev-server | 2.11.5   | 4.x+                           | 配合 Webpack 5                                                |
| webpack-merge      | 4.2.2    | 5.x+                           | 配合 Webpack 5                                                |
| Babel (babel-core) | 6.22.1   | 7.x (@babel/core)              | Vue 3 JSX 转换、可选链等现代语法                              |
| babel-loader       | 7.1.1    | 9.x+                           | 配合 Babel 7                                                  |
| vue-loader         | 13.3.0   | 15（Phase 1）→ 17.x（Phase 3） | Phase 1 升级到 15（Vue 2 最终版），Phase 3 升级到 17（Vue 3） |

#### Webpack 插件层（替换）

| 旧插件                                   | 新插件                               | 说明                           |
| ---------------------------------------- | ------------------------------------ | ------------------------------ |
| extract-text-webpack-plugin 3.0.0        | mini-css-extract-plugin              | Webpack 5 CSS 提取方案         |
| uglifyjs-webpack-plugin 1.1.1            | Webpack 5 内置 terser-webpack-plugin | JS 压缩（内置，无需额外安装）  |
| optimize-css-assets-webpack-plugin 3.2.0 | css-minimizer-webpack-plugin         | CSS 压缩                       |
| url-loader / file-loader                 | Webpack 5 内置 Asset Modules         | 资源处理（内置，无需额外安装） |
| html-webpack-plugin 2.30.1               | html-webpack-plugin 5.x              | 升级到 Webpack 5 兼容版本      |
| copy-webpack-plugin 4.0.1                | copy-webpack-plugin 11.x+            | 升级到 Webpack 5 兼容版本      |

#### Loader 层（升级）

| Loader       | 当前版本 | 目标版本 |
| ------------ | -------- | -------- |
| css-loader   | 0.28.0   | 6.x+     |
| less-loader  | 5.0.0    | 11.x+    |
| style-loader | —        | 3.x      |

#### 业务依赖层

| 依赖项   | 当前版本 | 目标版本 | 升级原因                         |
| -------- | -------- | -------- | -------------------------------- |
| vue-i18n | 8.14.1   | 9.x      | Vue 3 生态要求                   |
| Axios    | 0.18.0   | 1.x      | 当前版本过旧，存在安全和功能限制 |
| Less     | 3.9.0    | 4.x      | 配合新版 less-loader             |

#### 第三方 Vue 2 插件层

| 插件                 | 当前版本 | 目标                        | 说明                |
| -------------------- | -------- | --------------------------- | ------------------- |
| vue-baidu-map        | 0.21.22  | vue-baidu-map-3x 或替代方案 | 需评估 Vue 3 兼容性 |
| vue-quill-editor     | 3.0.6    | @vueup/vue-quill 或其他     | 原库不支持 Vue 3    |
| vue-json-viewer      | 2.2.20   | vue-json-viewer@3           | 需确认 Vue 3 版本   |
| vue-virtual-scroller | 1.0.10   | vue-virtual-scroller@2      | 官方已出 Vue 3 版本 |

---

## 3. 项目现状

### 3.1 代码规模统计

| 统计项                         | 数量   |
| ------------------------------ | ------ |
| Vue 文件总数                   | 996 个 |
| 页面组件（src/views/）         | 751 个 |
| 可复用组件（src/components/）  | 244 个 |
| Vuex Store 模块                | 124 个 |
| API 模块                       | 77 个  |
| Mixin 文件                     | 23 个  |
| Filter 文件                    | 15 个  |
| Element UI 自定义主题 CSS 文件 | 88 个  |
| 全局主题样式文件               | 27 个  |

### 3.2 Vue 2 废弃特性使用情况

| 需迁移的特性                 | 涉及文件数 | 迁移难度                       |
| ---------------------------- | ---------- | ------------------------------ |
| `.sync` 修饰符               | 348 个     | 中（批量替换为 v-model）       |
| `slot-scope` 旧语法          | 419 个     | 中（替换为 v-slot / #default） |
| `this.$message` (Element UI) | 480 个     | 中（替换为新 UI 库 API）       |
| EventBus 事件总线            | 173 个     | 高（需重新设计通信方案）       |
| `beforeDestroy` 生命周期     | 141 个     | 低（重命名为 beforeUnmount）   |
| `filters` 过滤器             | 78 个      | 中（改为方法或计算属性）       |

---

## 4. 两套技术方案总览

### 4.1 方案定义

- **方案一（全链路渐进式迁移）**：从构建工具到 UI 库全部升级到位，最终达到纯 Vue 3 + 公司标准 UI 库的终态
- **方案二（@vue/compat 新旧共存）**：升级构建工具和 Vue 生态库后，利用 @vue/compat 兼容层实现新旧代码共存，新页面用 Vue 3 + 新 UI 库，老页面保持不动

### 4.2 关键步骤对比

| 步骤                                      | 方案一（全链路迁移）                                                                 | 方案二（新旧共存）                                        |
| ----------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| **Step 1: Webpack 3 → 5 + Babel 7**       | 升级 Node 18、Babel 7、Webpack 5 及全部插件/Loader                                   | 同方案一，完全一致                                        |
| **Step 2: Vue Router 3 → 4 + Vuex 3 → 4** | 改造路由和状态管理的创建方式与 API                                                   | 同方案一，完全一致                                        |
| **Step 3: 切换 @vue/compat 兼容模式**     | 安装 @vue/compat，逐步消除 996 个文件中全部 Vue 2 废弃用法，最终所有 compat 开关关闭 | 仅安装配置 @vue/compat + 双 UI 库环境，不改造存量业务代码 |
| **Step 4: 移除 @vue/compat**              | 移除兼容层，切换到纯 Vue 3 运行时                                                    | **不执行**（长期保留 compat 层）                          |
| **Step 5: Element UI → 公司标准 UI 库**   | 全量替换所有 Element UI 组件为新 UI 库                                               | **不执行**（老页面保留 Element UI，新页面用新 UI 库）     |
| **vue-i18n / 第三方插件 / 监控 SDK**      | 全部升级适配                                                                         | vue-i18n 升级（legacy 模式），其他按需处理                |

### 4.3 核心差异对比

| 对比维度             | 方案一：全链路迁移            | 方案二：新旧共存              |
| -------------------- | ----------------------------- | ----------------------------- |
| 总工作量             | 60-89 人天                    | 13-20 人天                    |
| 老页面改动范围       | 全量改造 996 个文件           | 不动                          |
| 新页面开发能力       | Vue 3 + 公司标准 UI 库        | Vue 3 + 公司标准 UI 库        |
| Element UI 处置      | 最终完全移除                  | 老页面长期保留                |
| Vue 运行时           | 纯 Vue 3                      | @vue/compat（Vue 3 + 兼容层） |
| 打包体积             | 最优（纯 Vue 3 tree-shaking） | 较大（compat 层 + 双 UI 库）  |
| 运行时性能           | 最优                          | 略有开销（compat 模拟层）     |
| 技术债务             | 一次性清零                    | 保留，按需逐步消化            |
| 实施风险             | 高（改动面大，回归范围广）    | 低（老页面不动，回归风险小）  |
| 最终状态             | 已到终态，无历史包袱          | 可随时升级为方案一终态        |
| 对公司标准的满足程度 | 完全对齐                      | 新页面对齐，老页面待后续迁移  |

### 4.4 风险对比

| 风险项                                            | 方案一                             | 方案二                                      |
| ------------------------------------------------- | ---------------------------------- | ------------------------------------------- |
| Webpack 5 与现有 loader/plugin 不兼容导致构建失败 | 有（Phase 1 预留时间逐个排查）     | 有（同方案一）                              |
| 第三方 Vue 2 插件无 Vue 3 版本导致功能缺失        | 有（提前调研替代方案）             | 低（老页面可继续使用 Vue 2 插件）           |
| Element UI 在 @vue/compat 下部分组件异常          | 有（异常组件单独 polyfill）        | 有（提前对核心组件做兼容性测试）            |
| 自定义主题 CSS 在新 UI 库下大面积失效             | **高**（88 个主题文件需全量重写）  | 低（仅新页面受影响）                        |
| 业务代码隐式依赖 Vue 2 内部 API 导致运行时报错    | 有（@vue/compat 警告会暴露）       | 低（老页面不改动，compat 兜底）             |
| 迁移期间与业务并行开发产生代码冲突                | **高**（996 文件改动，冲突窗口大） | 低（仅改配置文件，冲突面小）                |
| SGM/Sentry 监控 SDK 不兼容 Vue 3                  | 有（提前联系 SGM 团队确认）        | 有（同方案一）                              |
| @vue/compat 停止维护被迫全量迁移                  | 不涉及（最终移除 compat）          | **有**（需关注 Vue 官方动态）               |
| 双 UI 库并存导致打包体积过大                      | 不涉及（单一 UI 库）               | **有**（按路由懒加载拆分优化）              |
| 新老页面 CSS 样式冲突（全局污染）                 | 不涉及                             | **有**（新 UI 库需 CSS Modules 或前缀隔离） |
| 团队需同时掌握 Vue 2 + Vue 3 两套写法             | 不涉及（全量迁移后统一 Vue 3）     | 有（制定明确开发规范降低影响）              |

---

## 5. 方案一：全链路渐进式迁移（详细执行步骤）

### 5.1 迁移路径

```
Phase 1: Webpack 3 → Webpack 5 + Babel 7
    ↓
Phase 2: Vue Router 3 → 4 + Vuex 3 → 4
    ↓
Phase 3: Vue 2.7 → @vue/compat（兼容模式，逐步消除全部 Vue 2 用法）
    ↓
Phase 4: @vue/compat → Vue 3（移除兼容层）
    ↓
Phase 5: Element UI → 公司标准 UI 组件库
```

### 5.2 设计依据

1. **项目规模决定不可能一步到位** — 996 个 Vue 文件、124 个 Store 模块、77 个 API 模块，一次性重写意味着所有业务线全部停摆，在商业上不可接受。渐进式迁移允许业务开发与技术升级并行推进。

2. **@vue/compat 提供安全网** — `@vue/compat` 是 Vue 官方提供的 Vue 3 兼容构建版本，能在 Vue 3 运行时中模拟 Vue 2 行为。开启后项目可以在"半 Vue 2 半 Vue 3"状态下正常运行，每修完一处就关闭一个兼容开关，控制台会逐条输出废弃警告提供明确的修改清单。

3. **构建工具必须先行升级** — Vue 3 要求 `vue-loader` 16+（最低要求 Webpack 4，推荐 5），模板编译器 `@vue/compiler-sfc` 依赖现代模块系统（Webpack 3 无法处理），Babel 6 不支持 Vue 3 的 JSX 转换和可选链语法。

4. **UI 库替换放在最后** — 如果在 Vue 2 阶段就换 UI 库，需要找一个同时兼容 Vue 2 和 Vue 3 的库，选择极少。在 @vue/compat 阶段 Element UI 2 仍可运行，等 Vue 3 正式切换后直接替换到目标 UI 库，只做一次替换。

5. **每个阶段可独立验证和回滚** — 每个 Phase 完成后项目都应能正常运行和通过测试，出现不可控问题可回退到上一个稳定状态。

---

### Phase 1: Webpack 3 → Webpack 5 + Babel 7

**目标**：升级构建工具链，保持 Vue 2.7 + Element UI 不变，项目正常运行。

#### 1.1 升级 Node.js

```bash
# .nvmrc
18.20
```

Node 18 LTS 是 Webpack 5 的推荐运行环境，同时移除 `--openssl-legacy-provider` hack。

#### 1.2 升级 Babel 6 → Babel 7

```bash
# 移除 Babel 6
pnpm remove babel-core babel-loader babel-preset-env babel-plugin-transform-runtime babel-preset-stage-2

# 安装 Babel 7
pnpm add -D @babel/core @babel/preset-env @babel/plugin-transform-runtime babel-loader@9
pnpm add @babel/runtime
```

配置变更（`babel.config.js` 替换 `.babelrc`）：

```js
// babel.config.js
module.exports = {
  presets: [
    [
      "@babel/preset-env",
      {
        modules: false,
        targets: { browsers: ["> 1%", "last 2 versions", "not dead"] }
      }
    ]
  ],
  plugins: [["@babel/plugin-transform-runtime", { corejs: false }]]
};
```

#### 1.3 升级 Webpack 3 → 5

```bash
pnpm add -D webpack@5 webpack-cli@5 webpack-dev-server@4 webpack-merge@5
```

**核心配置变更**（`build/webpack.base.conf.js`）：

```js
// Webpack 3（旧）
module.exports = {
  module: {
    rules: [
      { test: /\.vue$/, loader: "vue-loader" },
      { test: /\.js$/, loader: "babel-loader", include: [resolve("src")] }
    ]
  },
  resolve: {
    extensions: [".js", ".vue", ".json"],
    alias: { "@": resolve("src"), vue$: "vue/dist/vue.esm.js" }
  }
};

// Webpack 5（新）
const { VueLoaderPlugin } = require("vue-loader");

module.exports = {
  module: {
    rules: [
      { test: /\.vue$/, loader: "vue-loader" },
      { test: /\.js$/, loader: "babel-loader", include: [resolve("src")] },
      // Webpack 5 内置 asset modules，替代 url-loader/file-loader
      {
        test: /\.(png|jpe?g|gif|svg)$/,
        type: "asset",
        parser: { dataUrlCondition: { maxSize: 10 * 1024 } }
      },
      { test: /\.(woff2?|eot|ttf|otf)$/, type: "asset/resource" }
    ]
  },
  plugins: [
    new VueLoaderPlugin() // Webpack 4+ 必须显式添加
  ],
  resolve: {
    extensions: [".js", ".vue", ".json"],
    alias: { "@": resolve("src"), vue$: "vue/dist/vue.esm.js" }
  }
};
```

#### 1.4 替换已废弃的 Webpack 插件

| 旧插件                               | 新插件                                 | 说明     |
| ------------------------------------ | -------------------------------------- | -------- |
| `extract-text-webpack-plugin`        | `mini-css-extract-plugin`              | CSS 提取 |
| `uglifyjs-webpack-plugin`            | Webpack 5 内置 `terser-webpack-plugin` | JS 压缩  |
| `optimize-css-assets-webpack-plugin` | `css-minimizer-webpack-plugin`         | CSS 压缩 |
| `url-loader` / `file-loader`         | Webpack 5 内置 Asset Modules           | 资源处理 |

生产配置示例（`build/webpack.prod.conf.js`）：

```js
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");

module.exports = {
  // Webpack 5 使用 optimization 替代直接的插件调用
  optimization: {
    minimizer: [
      "...", // 保留默认的 terser 压缩
      new CssMinimizerPlugin()
    ],
    splitChunks: {
      chunks: "all",
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: "vendor",
          chunks: "all"
        }
      }
    }
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: "css/[name].[contenthash:8].css"
    })
  ]
};
```

#### 1.5 升级 Loader 版本

```bash
pnpm add -D vue-loader@15 css-loader@6 less-loader@11 style-loader@3
pnpm remove url-loader file-loader
```

> 注意：此阶段 `vue-loader` 升级到 15（Vue 2 的最终兼容版本），不是 16+。

#### 1.6 验收标准

- `npm run dev` 正常启动，页面功能无回归
- `npm run build` 正常产出，构建产物可部署
- 构建速度有明显改善（Webpack 5 持久化缓存）

---

### Phase 2: Vue Router 3 → 4，Vuex 3 → 4

**目标**：先升级 Vue 生态库，因为 @vue/compat 不兼容旧版 Router 和 Vuex。

#### 2.1 Vue Router 3 → 4

```bash
pnpm add vue-router@4
```

**核心变更**：

```js
// Vue Router 3（旧）src/router/index.js
import Vue from "vue";
import Router from "vue-router";
Vue.use(Router);

const router = new Router({
  mode: "history",
  routes: [...]
});

router.beforeEach((to, from, next) => {
  // 守卫逻辑
  next();
});

export default router;

// Vue Router 4（新）src/router/index.js
import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(),
  routes: [...]
});

router.beforeEach((to, from) => {
  // 守卫逻辑，不再需要 next()，返回 false 阻止导航
  // 或 return { name: "Login" } 重定向
});

export default router;
```

**Breaking Changes 清单**：

| 变更项                   | Vue Router 3             | Vue Router 4                      |
| ------------------------ | ------------------------ | --------------------------------- |
| 创建方式                 | `new Router({})`         | `createRouter({})`                |
| 模式配置                 | `mode: "history"`        | `history: createWebHistory()`     |
| 守卫函数                 | `next()` 回调            | 返回值控制（next 仍可用但不推荐） |
| 通配符路由               | `path: "*"`              | `path: "/:pathMatch(.*)*"`        |
| `router.onReady`         | `router.onReady(cb)`     | `router.isReady().then(cb)`       |
| `<router-link>` tag 属性 | `<router-link tag="li">` | 使用 `v-slot` API                 |

项目中 `router/output.js` 的动态路由权限过滤逻辑需要适配 `addRoute` API（Router 4 移除了 `addRoutes`，改为单条 `addRoute`）。

#### 2.2 Vuex 3 → 4

```bash
pnpm add vuex@4
```

**核心变更**：

```js
// Vuex 3（旧）src/store/index.js
import Vue from "vue";
import Vuex from "vuex";
Vue.use(Vuex);

export default new Vuex.Store({
  modules: { app, user, menu, tab, /* ... 124 个模块 */ }
});

// Vuex 4（新）src/store/index.js
import { createStore } from "vuex";

export default createStore({
  modules: { app, user, menu, tab, /* ... 模块定义不变 */ }
});
```

Vuex 4 的核心改变是创建方式，**模块内部代码（state/mutations/actions/getters）基本不需要修改**。这对本项目的 124 个模块来说是好消息。

**需要注意的变更**：

| 变更项     | Vuex 3               | Vuex 4                            |
| ---------- | -------------------- | --------------------------------- |
| 创建方式   | `new Vuex.Store({})` | `createStore({})`                 |
| 注册方式   | `Vue.use(Vuex)`      | `app.use(store)`                  |
| 组件访问   | `this.$store`        | `this.$store`（Options API 不变） |
| TypeScript | 需要额外声明         | 内置更好的类型支持                |

#### 2.3 验收标准

- 所有页面路由跳转正常
- 路由守卫（登录检查、权限过滤）正常工作
- Vuex Store 的数据读写、异步 action 正常
- 动态路由加载（`router/output.js` 权限过滤）正常

---

### Phase 3: Vue 2.7 → @vue/compat（兼容模式）

**目标**：在 Vue 3 运行时中以兼容模式运行项目，逐步消除 Vue 2 废弃用法。

#### 3.1 安装与配置

```bash
pnpm add vue@3 @vue/compat
pnpm remove vue-template-compiler
```

Webpack 别名配置：

```js
// build/webpack.base.conf.js
module.exports = {
  resolve: {
    alias: {
      vue: "@vue/compat" // 将 vue 指向兼容版本
    }
  }
};
```

升级 vue-loader 到 16+（支持 Vue 3）：

```bash
pnpm add -D vue-loader@17
```

```js
// build/webpack.base.conf.js
const { VueLoaderPlugin } = require("vue-loader");

module.exports = {
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: "vue-loader",
        options: {
          compilerOptions: {
            compatConfig: {
              MODE: 2 // 默认以 Vue 2 模式编译模板
            }
          }
        }
      }
    ]
  },
  plugins: [new VueLoaderPlugin()]
};
```

#### 3.2 入口文件改造

```js
// src/main.js（旧）
import Vue from "vue";
import ElementUI from "element-ui";
import App from "./App.vue";
import router from "./router";
import store from "./store";

Vue.use(ElementUI);
Vue.prototype.$api = api;
Vue.prototype.global = global;

new Vue({
  router,
  store,
  render: (h) => h(App)
}).$mount("#app");

// src/main.js（新 — @vue/compat 阶段）
import { createApp, configureCompat } from "vue";
import ElementUI from "element-ui";
import App from "./App.vue";
import router from "./router";
import store from "./store";

// 全局兼容配置：默认以 Vue 2 模式运行
configureCompat({
  MODE: 2
  // 后续逐步关闭：
  // COMPONENT_V_MODEL: false,
  // INSTANCE_EVENT_EMITTER: false,
  // FILTERS: false,
  // ...
});

const app = createApp(App);

app.use(ElementUI);
app.use(router);
app.use(store);

// Vue.prototype → app.config.globalProperties
app.config.globalProperties.$api = api;
app.config.globalProperties.global = global;
app.config.globalProperties.$sucMsg = (msg) => {
  /* ... */
};
app.config.globalProperties.$errMsg = (msg) => {
  /* ... */
};

app.mount("#app");
```

#### 3.3 逐步消除 Vue 2 废弃用法

启动项目后，控制台会输出类似以下警告：

```
[Vue warn]: (deprecation INSTANCE_EVENT_EMITTER) ...
[Vue warn]: (deprecation FILTERS) ...
[Vue warn]: (deprecation COMPONENT_V_MODEL) ...
```

按以下优先级逐个消除：

**优先级 1：全局 API 变更（影响入口文件）**

```js
// Vue.component → app.component
// 旧
Vue.component("BasicCitySelect", BasicCitySelect);
// 新
app.component("BasicCitySelect", BasicCitySelect);

// Vue.directive → app.directive
// 旧
Vue.directive("permission", permission);
// 新
app.directive("permission", permission);

// Vue.mixin → app.mixin
// 旧
Vue.mixin(mixinGlobal);
// 新
app.mixin(mixinGlobal);

// Vue.filter → 移除，改为全局方法或工具函数
// 旧（15 个 filter 文件）
Vue.filter("formatDate", (val) => {
  /* ... */
});
// 新 — 方案 A：全局属性
app.config.globalProperties.$filters = {
  formatDate(val) {
    /* ... */
  }
};
// 模板中: {{ $filters.formatDate(date) }}

// 新 — 方案 B：组合函数
// src/composables/useFilters.js
export function formatDate(val) {
  /* ... */
}
```

**优先级 2：`.sync` 修饰符（348 个文件）**

```html
<!-- 旧 -->
<el-dialog :visible.sync="dialogVisible">
  <child-component :value.sync="formData">
    <!-- 新 -->
    <el-dialog v-model:visible="dialogVisible">
      <child-component v-model:value="formData"></child-component></el-dialog></child-component
></el-dialog>
```

> 此项可通过正则批量替换：`:(\w+)\.sync="` → `v-model:$1="`

**优先级 3：`slot-scope` 旧语法（419 个文件）**

```html
<!-- 旧 -->
<el-table-column>
  <template slot-scope="scope"> {{ scope.row.name }} </template>
</el-table-column>

<!-- 新 -->
<el-table-column>
  <template #default="scope"> {{ scope.row.name }} </template>
</el-table-column>
```

> 此项可通过正则批量替换：`slot-scope=` → `#default=`（需要注意具名 slot 的情况）

**优先级 4：EventBus 事件总线（173 个文件）**

```js
// 旧 — 利用 Vue 实例作为事件总线
// src/EventBus.js
import Vue from "vue";
export default new Vue();

// 组件中
import EventBus from "@/EventBus.js";
EventBus.$on("show-dialog", this.handler);
EventBus.$emit("show-dialog", data);
EventBus.$off("show-dialog", this.handler);

// 新 — 使用 mitt 库
// src/EventBus.js
import mitt from "mitt";
const emitter = mitt();
export default emitter;

// 组件中
import EventBus from "@/EventBus.js";
EventBus.on("show-dialog", this.handler);   // $on → on
EventBus.emit("show-dialog", data);          // $emit → emit
EventBus.off("show-dialog", this.handler);   // $off → off
```

**优先级 5：`beforeDestroy` 生命周期（141 个文件）**

```js
// 旧
beforeDestroy() { /* cleanup */ }

// 新
beforeUnmount() { /* cleanup */ }
```

> 此项可全局搜索替换。

**优先级 6：`filters` 过滤器（78 个文件）**

```html
<!-- 旧 -->
<span>{{ price | currency }}</span>

<!-- 新 — 改为方法调用 -->
<span>{{ formatCurrency(price) }}</span>
```

```js
// 旧
filters: {
  currency(val) { return "¥" + val.toFixed(2); }
}

// 新 — 改为 methods
methods: {
  formatCurrency(val) { return "¥" + val.toFixed(2); }
}
```

#### 3.4 逐步关闭兼容开关

每修完一类废弃用法，在 `configureCompat` 中关闭对应的兼容开关：

```js
configureCompat({
  MODE: 2,
  // 已完成迁移的项，设为 false 关闭兼容
  INSTANCE_EVENT_EMITTER: false, // EventBus 改造完成
  FILTERS: false, // filters 迁移完成
  COMPONENT_V_MODEL: false, // .sync 迁移完成
  RENDER_FUNCTION: false, // render 函数迁移完成
  GLOBAL_MOUNT: false // 全局 API 迁移完成
  // ...
});
```

#### 3.5 验收标准

- 所有控制台 deprecation 警告清零
- 所有兼容开关关闭后项目正常运行
- 业务功能无回归

---

### Phase 4: @vue/compat → Vue 3（正式切换）

**目标**：移除兼容层，切换到纯 Vue 3 运行时。

#### 4.1 切换

```js
// Webpack 别名：移除 @vue/compat
resolve: {
  alias: {
    // 删除 vue: "@vue/compat"
    // Vue 3 默认入口即可
  }
}
```

```js
// main.js：移除 configureCompat
import { createApp } from "vue";
// 删除 import { configureCompat } from "vue"
// 删除 configureCompat({ ... })
```

```bash
# 移除兼容包
pnpm remove @vue/compat
```

#### 4.2 清理

- 移除所有 `@vue/compat` 相关注释和临时代码
- 移除 `vue-loader` 中的 `compatConfig` 配置
- 确认 `vue-template-compiler` 已移除

#### 4.3 验收标准

- `pnpm list vue` 确认只有 `vue@3.x`，无 `@vue/compat`
- 全量业务功能回归测试通过
- 构建产物体积较 Vue 2 有明显减小（Vue 3 tree-shaking）

---

### Phase 5: Element UI → 公司标准 UI 组件库

**目标**：将 Element UI 2 替换为公司标准 Vue 3 UI 组件库。

#### 5.1 安装与全局注册

```bash
pnpm remove element-ui
pnpm add <target-ui-library>
```

```js
// main.js
import TargetUI from "<target-ui-library>";
import "<target-ui-library>/dist/index.css";

app.use(TargetUI);
```

#### 5.2 组件映射与替换

需要建立 Element UI → 新库的组件映射表，逐个替换：

| Element UI 组件                | 功能      | 替换策略                          |
| ------------------------------ | --------- | --------------------------------- |
| `el-button`                    | 按钮      | 直接替换标签名和属性              |
| `el-input`                     | 输入框    | 替换标签名，检查属性差异          |
| `el-select` + `el-option`      | 下拉选择  | 部分库合并为单组件 + options prop |
| `el-table` + `el-table-column` | 表格      | API 差异较大，需逐个适配          |
| `el-form` + `el-form-item`     | 表单      | 验证 API 可能不同                 |
| `el-dialog`                    | 弹窗      | v-model 绑定方式可能不同          |
| `el-pagination`                | 分页      | 属性名、事件名可能不同            |
| `el-tabs` + `el-tab-pane`      | 标签页    | 替换标签名                        |
| `el-date-picker`               | 日期选择  | API 差异通常较大                  |
| `el-radio` / `el-checkbox`     | 单选/多选 | 替换标签名和属性                  |
| `el-upload`                    | 上传      | API 差异较大                      |
| `el-row` + `el-col`            | 栅格布局  | 部分库命名不同                    |
| `this.$message`                | 消息提示  | 替换为新库的 Message API          |
| `this.$confirm`                | 确认弹窗  | 替换为新库的 Modal/Dialog API     |
| `this.$loading`                | 加载状态  | 替换为新库的 Loading API          |

#### 5.3 样式迁移

需要处理的样式文件：

- `src/assets/ele-theme/`（88 个文件）→ 按新库的主题定制方式重写
- `src/assets/theme/compoents/elem/`（通用样式覆盖）→ 适配新库的 CSS 类名
- `@hose/eui-theme` 自定义主题包 → 评估是否仍需要，按新库方式重建
- 各组件内部直接引用 `.el-*` 类名的样式 → 替换为新库的类名

#### 5.4 全局基础组件适配

项目中封装了多个 Element UI 的 wrapper 组件，需要内部替换：

- `BasicCitySelect` — 内部使用 el-select
- `BasicUpload` — 内部使用 el-upload
- `BasicTable` / `BasicLogTable` — 内部使用 el-table
- `PageSplit` — 内部使用 el-pagination
- `BasicTransferDialog` — 内部使用 el-dialog + el-transfer

#### 5.5 验收标准

- 所有页面 UI 渲染正确
- 表单验证、表格排序/分页、弹窗交互正常
- 自定义主题样式一致
- 移除所有 `element-ui` 相关依赖和 CSS 引用

---

## 6. 方案二：@vue/compat 新旧共存（详细执行步骤）

### 6.1 迁移路径

```
Phase A: Webpack 3 → Webpack 5 + Babel 7（同方案一 Phase 1）
    ↓
Phase B: Vue Router 3 → 4 + Vuex 3 → 4（同方案一 Phase 2）
    ↓
Phase C: 切换 @vue/compat + 双 UI 库共存（仅改配置，不改业务代码）
    ↓
【稳态】新页面 Vue 3 + 新 UI 库，老页面 Vue 2 写法 + Element UI
```

### 6.2 核心思路

利用 @vue/compat 运行时就是 Vue 3 这一事实，新开发的页面直接使用 Vue 3 + 公司标准 UI 库，存量老页面保持 Vue 2 写法 + Element UI 不动，两套代码在同一应用中共存。

**与方案一的关系**：方案二是方案一的子集——执行 Phase 1 + Phase 2 + Phase 3 的安装配置部分，但跳过 Phase 3 的全量代码改造、Phase 4 和 Phase 5。后续可随时从方案二平滑过渡到方案一的完整迁移。

### Phase A: Webpack 3 → Webpack 5 + Babel 7

与方案一 [Phase 1](#phase-1-webpack-3--webpack-5--babel-7) 完全一致，不再赘述。

### Phase B: Vue Router 3 → 4，Vuex 3 → 4

与方案一 [Phase 2](#phase-2-vue-router-3--4vuex-3--4) 完全一致，不再赘述。

### Phase C: 切换 @vue/compat + 双 UI 库共存

**目标**：切换到 @vue/compat 运行时，配置双 UI 库共存环境。新页面使用 Vue 3 + 公司标准 UI 库，老页面保持原样不动。

#### C.1 安装依赖

```bash
pnpm add vue@3 @vue/compat
pnpm remove vue-template-compiler
pnpm add -D vue-loader@17
```

#### C.2 Webpack 配置

```js
// build/webpack.base.conf.js
const { VueLoaderPlugin } = require("vue-loader");

module.exports = {
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: "vue-loader",
        options: {
          compilerOptions: {
            compatConfig: {
              MODE: 2 // 默认 Vue 2 模式编译模板
            }
          }
        }
      }
    ]
  },
  plugins: [new VueLoaderPlugin()],
  resolve: {
    alias: {
      vue: "@vue/compat"
    }
  }
};
```

#### C.3 入口文件改造

```js
// src/main.js
import { createApp, configureCompat } from "vue";
import ElementUI from "element-ui";
import "element-ui/lib/theme-chalk/index.css";
// import TargetUI from "<target-ui-library>";     // 新 UI 库，选型确定后取消注释
// import "<target-ui-library>/dist/index.css";
import App from "./App.vue";
import router from "./router";
import store from "./store";

// 全局默认 Vue 2 模式，老页面无需任何修改
configureCompat({ MODE: 2 });

const app = createApp(App);
app.use(ElementUI); // 老页面
// app.use(TargetUI);      // 新页面
app.use(router);
app.use(store);

app.config.globalProperties.$api = api;
app.config.globalProperties.global = global;
app.config.globalProperties.$sucMsg = (msg) => {
  /* ... */
};
app.config.globalProperties.$errMsg = (msg) => {
  /* ... */
};

app.mount("#app");
```

#### C.4 vue-i18n 升级

```bash
pnpm add vue-i18n@9
```

```js
import { createI18n } from "vue-i18n";
const i18n = createI18n({ locale: "zh_cn", messages, legacy: true });
app.use(i18n);
```

`legacy: true` 保持 `$t()` 用法不变，老页面无需修改。

#### C.5 验收标准

- 所有老页面功能正常（compat 模式模拟 Vue 2 行为）
- 控制台的 deprecation 警告属正常现象（方案二不要求清零）
- 新建 Vue 3 测试页面，确认 Composition API 和新 UI 库可用

---

### 新页面开发规范

#### 使用 `<script setup>`（推荐）

`<script setup>` 天然以 Vue 3 模式运行，无需额外配置：

```vue
<template>
  <n-button type="primary" @click="handleSubmit">提交</n-button>
  <n-data-table :columns="columns" :data="tableData" :pagination="pagination" />
</template>

<script setup>
import { ref, reactive, onMounted, getCurrentInstance } from "vue";
import { NButton, NDataTable } from "naive-ui"; // 示例
import { useStore } from "vuex";

const store = useStore();
const tableData = ref([]);
const pagination = reactive({ page: 1, pageSize: 20 });

onMounted(async () => {
  const { proxy } = getCurrentInstance();
  const res = await proxy.$api.$post(["mall-admin-web", "/some/api"], {}, {});
  tableData.value = res.data;
});
</script>
```

#### 使用 Options API + compatConfig

如果更熟悉 Options API，声明组件级 Vue 3 模式：

```vue
<script>
export default {
  compatConfig: { MODE: 3 }, // 此组件按 Vue 3 模式运行
  setup() {
    // Composition API ...
  }
};
</script>
```

#### 新老页面共存规则

| 规则               | 说明                                                  |
| ------------------ | ----------------------------------------------------- |
| 新页面放独立目录   | 建议 `src/views/v3/` 或各模块下建 `v3/` 子目录        |
| 新页面用新 UI 库   | 禁止在新页面中使用 Element UI 组件                    |
| 老页面不引新 UI 库 | 避免在未声明 MODE: 3 的组件中使用新 UI 库             |
| 路由懒加载隔离     | 新老页面通过路由懒加载天然实现代码分割                |
| 公共组件复用       | 新页面可引用老的 wrapper 组件（compat 下兼容）        |
| 状态管理共享       | 新老页面共享 Vuex Store，新页面通过 `useStore()` 访问 |

---

### 后续渐进迁移路径

方案二完成后项目处于"新旧共存"稳态，后续可按需向方案一终态靠拢：

1. **按模块迁移老页面** — 业务迭代涉及老页面较大改动时，顺便迁移到 Vue 3 写法
2. **逐个消除 compat** — 在单个组件上设置 `compatConfig: { MODE: 3 }` 逐个切换
3. **替换 Element UI** — 某模块所有页面迁移完毕后，移除该模块对 Element UI 的依赖
4. **最终移除 @vue/compat** — 所有页面迁移完成后，回到方案一 Phase 4 的终态

---

## 7. 其他必须处理的迁移事项

> 方案一全量迁移需全部处理，方案二按需处理。

### 7.1 vue-i18n 8 → 9

```bash
pnpm add vue-i18n@9
```

```js
// 旧
import VueI18n from "vue-i18n";
Vue.use(VueI18n);
const i18n = new VueI18n({ locale: "zh_cn", messages });

// 新
import { createI18n } from "vue-i18n";
const i18n = createI18n({ locale: "zh_cn", messages, legacy: true });
app.use(i18n);
```

设置 `legacy: true` 可保持 Options API 的 `$t()` 用法不变，降低迁移成本。

### 7.2 第三方 Vue 2 插件升级

| 插件                 | 当前版本 | 目标                        | 说明                |
| -------------------- | -------- | --------------------------- | ------------------- |
| vue-baidu-map        | 0.21.22  | vue-baidu-map-3x 或替代方案 | 需评估 Vue 3 兼容性 |
| vue-quill-editor     | 3.0.6    | @vueup/vue-quill 或其他     | 原库不支持 Vue 3    |
| vue-json-viewer      | 2.2.20   | vue-json-viewer@3           | 需确认 Vue 3 版本   |
| vue-virtual-scroller | 1.0.10   | vue-virtual-scroller@2      | 官方已出 Vue 3 版本 |

### 7.3 全局 Mixin 治理

项目中有 23 个 mixin 文件，其中 `mixin-table` 和 `mixin-global` 通过 `Vue.mixin()` 全局注入。

- Vue 3 仍支持 `app.mixin()`，但官方建议逐步迁移到 Composition API 的 `composables`
- 建议：Phase 3/4 阶段保持 mixin 不变（`app.mixin()` 可用），后续作为独立优化项迁移到 composables

### 7.4 `this.$set` / `this.$delete` 移除

Vue 3 基于 Proxy 实现响应式，不再需要 `$set` / `$delete`：

```js
// 旧
this.$set(this.formData, "newField", value);
this.$delete(this.formData, "oldField");

// 新 — 直接赋值
this.formData.newField = value;
delete this.formData.oldField;
```

需全局搜索替换。

### 7.5 `this.$children` / `this.$listeners` 移除

- `this.$children`：Vue 3 移除，改用 `ref` 或 `provide/inject`
- `this.$listeners`：Vue 3 合并到 `$attrs` 中，不再单独存在

### 7.6 Axios 升级

```bash
pnpm add axios@1
```

Axios 0.18 → 1.x 的主要 breaking change：

- `transformRequest`/`transformResponse` 行为变化
- 部分错误处理逻辑调整
- 需要验证 `src/http/axios.js` 中拦截器的兼容性

### 7.7 监控 SDK 兼容性确认

- `@jd/sgm-web`：确认是否支持 Vue 3 的错误捕获方式（`app.config.errorHandler`）
- `@sentry/types`：需升级到 `@sentry/vue` 的 Vue 3 兼容版本
- `sa-sdk-javascript`（神策埋点）：确认 Vue 3 路由切换的自动埋点是否正常

---

## 8. 工作量预估

### 8.1 方案一各阶段工作量

| Phase    | 内容                    | 预估人天     | 人员   | 备注                           |
| -------- | ----------------------- | ------------ | ------ | ------------------------------ |
| Phase 1  | Webpack 3 → 5 + Babel 7 | 5-8 天       | 1-2 人 | 配置改动为主，需充分测试       |
| Phase 2  | Router 3→4 + Vuex 3→4   | 3-5 天       | 1 人   | Vuex 模块内部基本不动          |
| Phase 3  | @vue/compat 兼容迁移    | 20-30 天     | 2-3 人 | 996 个文件逐步改造，工作量最大 |
| Phase 4  | 切换纯 Vue 3            | 2-3 天       | 1 人   | 移除兼容层 + 回归测试          |
| Phase 5  | UI 库替换               | 25-35 天     | 2-4 人 | 取决于新库 API 差异大小        |
| 其他     | 第三方库 + 监控 + 测试  | 5-8 天       | 1-2 人 | i18n、插件、监控适配           |
| **合计** |                         | **60-89 天** |        |                                |

### 8.2 方案一 Phase 3 详细拆解（工作量最大的阶段）

| 改造项                  | 涉及文件       | 预估人天 | 可否批量替换                       |
| ----------------------- | -------------- | -------- | ---------------------------------- |
| `.sync` → `v-model:`    | 348 个         | 3-4 天   | 是（正则替换 + 人工审查）          |
| `slot-scope` → `v-slot` | 419 个         | 3-4 天   | 是（正则替换 + 人工审查）          |
| EventBus 改造           | 173 个         | 4-6 天   | 部分（API 改名可批量，逻辑需审查） |
| `beforeDestroy` 重命名  | 141 个         | 0.5 天   | 是（全局替换）                     |
| `filters` 移除          | 78 个          | 3-4 天   | 否（每处需改模板 + script）        |
| 全局 API 改造           | main.js 等入口 | 2-3 天   | 否                                 |
| `$set/$delete` 移除     | 需统计         | 1-2 天   | 是（全局替换）                     |
| `$children/$listeners`  | 需统计         | 2-3 天   | 否（需逐个改逻辑）                 |
| 回归测试                | 全量           | 3-5 天   | —                                  |

### 8.3 方案二工作量预估

| Phase    | 内容                       | 预估人天     | 人员   | 备注                             |
| -------- | -------------------------- | ------------ | ------ | -------------------------------- |
| Phase A  | Webpack 3 → 5 + Babel 7    | 5-8 天       | 1-2 人 | 同方案一 Phase 1                 |
| Phase B  | Router 3→4 + Vuex 3→4      | 3-5 天       | 1 人   | 同方案一 Phase 2                 |
| Phase C  | @vue/compat + 双 UI 库配置 | 3-4 天       | 1 人   | 只改入口和构建配置，不改业务代码 |
| 其他     | vue-i18n + 监控 SDK 适配   | 2-3 天       | 1 人   | i18n legacy 模式降低成本         |
| **合计** |                            | **13-20 天** |        | **约方案一的 1/4**               |

> 方案二完成后，后续每迁移一个老页面模块约需 1-3 天（取决于模块复杂度），可结合业务迭代逐步推进。

---

## 9. 风险与应对策略

### 9.1 方案一风险

| 风险                                     | 影响       | 概率 | 应对策略                               |
| ---------------------------------------- | ---------- | ---- | -------------------------------------- |
| 第三方 Vue 2 插件无 Vue 3 版本           | 功能缺失   | 中   | 提前调研替代方案，必要时自行封装       |
| Element UI 在 @vue/compat 下部分组件异常 | 页面不可用 | 中   | 对异常组件单独 polyfill 或提前局部替换 |
| 自定义主题 CSS 在新 UI 库下大面积失效    | UI 走样    | 高   | 专人负责样式迁移，建立组件视觉对照表   |
| Webpack 5 与现有 loader/plugin 不兼容    | 构建失败   | 中   | Phase 1 预留充足时间，逐个排查         |
| 业务代码隐式依赖 Vue 2 内部 API          | 运行时报错 | 低   | @vue/compat 警告会暴露这些问题         |
| SGM/Sentry 监控 SDK 不兼容 Vue 3         | 线上无监控 | 中   | 提前联系京东 SGM 团队确认兼容性        |
| 迁移期间业务需求并行开发导致冲突         | 合并困难   | 高   | 约定迁移分支策略，减少并行冲突窗口     |

### 9.2 方案二额外风险

| 风险                                  | 影响           | 概率 | 应对策略                                          |
| ------------------------------------- | -------------- | ---- | ------------------------------------------------- |
| @vue/compat 停止维护                  | 被迫全量迁移   | 中   | 关注 Vue 官方动态，预留迁移到方案一的时间窗口     |
| 双 UI 库并存导致打包体积过大          | 首屏加载变慢   | 中   | 按路由懒加载拆分，新旧 UI 库 CSS/JS 分别按需加载  |
| Element UI 2 在 compat 下个别组件异常 | 部分页面不可用 | 中   | 提前对核心组件做兼容性测试，异常组件单独 polyfill |
| 新老页面样式冲突（CSS 全局污染）      | UI 错乱        | 中   | 新 UI 库使用 CSS Modules 或添加统一前缀隔离       |
| 团队需同时掌握 Vue 2 + Vue 3 两套写法 | 开发效率降低   | 低   | 制定明确的开发规范，新页面统一 Vue 3 模板         |
