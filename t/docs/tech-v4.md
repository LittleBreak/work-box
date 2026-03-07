# wondermall-mos 技术架构升级方案

> 编写日期：2026-03-06

---

## 目录

1. [升级背景与目标](#1-升级背景与目标)
2. [升级依赖链分析](#2-升级依赖链分析)
3. [项目现状](#3-项目现状)
4. [升级路线与详细步骤](#4-升级路线与详细步骤)
5. [其他必须处理的迁移事项](#5-其他必须处理的迁移事项)
6. [风险与应对策略](#6-风险与应对策略)
7. [项目排期](#7-项目排期)

---

## 1. 升级背景与目标

### 1.1 对齐公司技术架构标准

公司正在推进技术架构统一，前端技术栈标准为 **Vue 3 + 公司标准 UI 组件库**。wondermall-mos 作为京东商旅后台管理系统的核心项目，当前仍基于 Vue 2.7 + Element UI 2，与公司技术架构标准存在差距，需要进行架构升级以实现对齐。

### 1.2 降低技术风险

| 风险维度         | 现状                                                                              | 升级后                                                | 收益                              |
| ---------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------- | --------------------------------- |
| **框架生命周期** | Vue 2 已于 2023-12-31 停止维护，不再接收安全补丁和 bug 修复                       | Vue 3 为当前活跃维护版本，持续获得安全更新和性能优化  | 消除因框架 EOL 导致的安全漏洞风险 |
| **构建工具安全** | ~~Webpack 3（已完成升级到 5）~~、Babel 6 依赖链中存在已知 CVE                     | Webpack 5 + Babel 7 依赖链全部为活跃维护版本          | 消除已知供应链安全漏洞            |
| **依赖可升级性** | Axios 0.18 存在已知安全问题；Element UI 2 不再维护；vue-quill-editor 等插件停更   | 全部升级到活跃维护版本，后续依赖升级不再被 Vue 2 阻断 | 依赖升级不再受框架版本制约        |
| **人才招聘风险** | Vue 2 + Webpack 3 技术栈对新入职开发者学习成本高，市场上 Vue 2 经验开发者逐年减少 | Vue 3 + Composition API 是行业主流，新人上手快        | 降低团队换血时的知识断层风险      |

### 1.3 提升研发效率

| 效率维度            | 现状（量化）                                                              | 升级后（预期）                                              | 提升幅度                                |
| ------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------- |
| **冷启动构建速度**  | ~~Webpack 3 首次构建约 45-60s~~（已升级到 Webpack 5，约 25-35s）          | Webpack 5 持久化缓存二次构建 5-10s                          | 二次构建提速 **3-5x**                   |
| **HMR 热更新速度**  | ~~Webpack 3 HMR 3-5s~~（Webpack 5 已优化至 1-2s）                         | 与当前一致，后续可迁移 Vite 实现 <200ms                     | 已获得收益，后续可进一步优化            |
| **打包产物体积**    | Vue 2 全量引入约 33KB gzip；Element UI 全量引入约 200KB gzip              | Vue 3 tree-shaking 后约 15KB gzip；新 UI 库按需引入         | 框架层体积减少 **50%+**                 |
| **代码可维护性**    | Options API + Mixin（23 个 mixin 文件，跨组件逻辑复用困难，命名冲突风险） | Composition API + Composables，逻辑内聚、类型友好、可测试   | 消除 mixin 命名冲突，逻辑复用效率提升   |
| **TypeScript 支持** | Vue 2 对 TS 支持有限，类型推断不完整                                      | Vue 3 原生 TS 支持，`<script setup lang="ts">` 完整类型推断 | 类型安全覆盖率可从 0% 提升至新代码 100% |
| **新页面开发模式**  | 只能使用 Vue 2 Options API + Element UI 2                                 | 新页面直接使用 Vue 3 `<script setup>` + 公司标准 UI 库      | 新页面开发即对齐公司标准                |

### 1.4 核心收益总结

1. **对齐公司技术标准**：新页面立即使用 Vue 3 + 公司标准 UI 库，实现增量对齐
2. **消除安全风险**：Vue 2 EOL、Axios 0.18 CVE、Element UI 停维等安全隐患一次性解决
3. **研发效率量化提升**：构建二次编译提速 3-5x，框架体积减少 50%+，新页面开发即对齐现代最佳实践
4. **渐进式投入、持续产出**：阶段一（基础设施 + 新旧共存）以约 13-20 人天的投入即可获得上述全部收益，老页面零改动零风险

---

## 2. 升级依赖链分析

### 2.1 核心依赖链

架构升级并非单一组件替换，而是一条环环相扣的依赖链：

```
统一 UI 组件库（公司标准）
    ↑ 公司标准 UI 库仅支持 Vue 3
Vue 2.7 → Vue 3
    ↑ Vue 3 要求 vue-loader 16+、@vue/compiler-sfc
Webpack 3 → Webpack 5          ← 已完成 ✅
    ↑ vue-loader 16+ 最低要求 Webpack 4，推荐 Webpack 5
Babel 6 → Babel 7              ← 已完成 ✅
    ↑ Babel 6 不支持 Vue 3 JSX 转换和可选链语法
Node.js 16 → 18+               ← 已完成 ✅
    ↑ Webpack 5 推荐 Node 18 LTS 运行环境
```

**结论**：要统一 UI 库，必须先升级 Vue 3；而 Vue 3 的运行依赖 Webpack 5 + Babel 7 等构建工具链的支撑。构建工具层已完成升级，接下来需要从 Vue 生态库开始，逐层向上推进。

### 2.2 需要升级的全部依赖清单

#### 核心框架层

| 依赖项                | 当前版本           | 目标版本                                | 状态   |
| --------------------- | ------------------ | --------------------------------------- | ------ |
| Node.js               | 18.20              | 18+ (LTS)                               | 待升级 |
| 包管理器              | pnpm 8.15.0        | pnpm 8+                                 | 待升级 |
| Webpack               | 5.90.0             | 5.x                                     | 待升级 |
| Babel                 | @babel/core 7.24.0 | 7.x                                     | 待升级 |
| Vue                   | 2.7.12             | 3.4+（@vue/compat 阶段）                | 待升级 |
| Vue Router            | 3.0.1              | 4.x                                     | 待升级 |
| Vuex                  | 3.1.2              | 4.x                                     | 待升级 |
| Element UI            | 2.13.0             | 保留（@vue/compat 兼容） + 新 UI 库并存 | 待处理 |
| vue-template-compiler | 2.7.12             | 移除（Vue 3 内置 @vue/compiler-sfc）    | 待移除 |

#### 构建工具层

| 依赖项                  | 当前版本 | 状态                                 |
| ----------------------- | -------- | ------------------------------------ |
| webpack-cli             | 5.1.4    | 待升级                               |
| webpack-dev-server      | 4.15.0   | 待升级                               |
| webpack-merge           | 5.10.0   | 待升级                               |
| babel-loader            | 9.1.3    | 待升级                               |
| vue-loader              | 15.11.1  | 待升级（Phase 1），Phase 3 升级到 17 |
| css-loader              | 6.10.0   | 待升级                               |
| less-loader             | 11.1.0   | 待升级                               |
| mini-css-extract-plugin | 2.8.0    | 待升级                               |
| html-webpack-plugin     | 5.6.0    | 待升级                               |
| copy-webpack-plugin     | 11.0.0   | 待升级                               |

#### 业务依赖层（待升级）

| 依赖项   | 当前版本 | 目标版本 | 升级原因                         |
| -------- | -------- | -------- | -------------------------------- |
| vue-i18n | 8.14.1   | 9.x      | Vue 3 生态要求                   |
| Axios    | 0.18.0   | 1.x      | 当前版本过旧，存在安全和功能限制 |
| Less     | 4.2.0    | 4.x      | 待升级                           |

#### 第三方 Vue 2 插件层（待处理）

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
| 路由模块（一级业务模块）       | 37 个  |

### 3.2 Vue 2 废弃特性使用情况

| 需迁移的特性                 | 涉及文件数 | 迁移难度                       |
| ---------------------------- | ---------- | ------------------------------ |
| `.sync` 修饰符               | 348 个     | 中（批量替换为 v-model）       |
| `slot-scope` 旧语法          | 419 个     | 中（替换为 v-slot / #default） |
| `this.$message` (Element UI) | 480 个     | 中（替换为新 UI 库 API）       |
| EventBus 事件总线            | 173 个     | 高（需重新设计通信方案）       |
| `beforeDestroy` 生命周期     | 141 个     | 低（重命名为 beforeUnmount）   |
| `filters` 过滤器             | 78 个      | 中（改为方法或计算属性）       |

### 3.3 业务模块概览

项目包含 37 个业务模块，按 Vue 文件数量排序：

| 业务模块                              | Vue 文件数 | 功能说明                                         |
| ------------------------------------- | ---------- | ------------------------------------------------ |
| ClientMng（企业管理）                 | 118        | 企业列表、申请单、订单拦截、华住账号、企业详情等 |
| BasicData（基础数据）                 | 93         | 城市/机场/航司/舱位/火车站点管理、退改签维护等   |
| supply-chain-management（供应链管理） | 74         | 酒店/火车/机票供应链配置、黑名单、集采商品等     |
| HCar（用车 2.0）                      | 59         | 用车订单、渠道、策略、评价、加价策略等           |
| invoice（开票管理）                   | 41         | 发票列表、开票信息、快递费配置等                 |
| CommonOrder（通用订单）               | 34         | 产品配置、订单管理、商旅定制                     |
| Customer（客服管理）                  | 28         | 工单管理、代客下单、客服技能组                   |
| Car（用车 1.0）                       | 28         | 用车订单、规则、授权、地址维护                   |
| account-management（账户管理）        | 26         | 账户列表、账单管理、下载管理                     |
| Insurance（保险）                     | 23         | 订单列表、产品管理、售价策略                     |
| Finance（财务中心）                   | 23         | 对账单、差异订单、发票扫描等                     |
| Air（机票）                           | 22         | 机票订单、改签退票、手工出票等                   |
| Hotel（酒店）                         | 19         | 酒店订单、退订、手工单、代客下单等               |
| train-ticket（火车票）                | 17         | 火车票订单、身份校验、退改规则等                 |
| MarketingManagement（营销管理）       | 17         | 活动管理、优惠券、用户反馈等                     |
| Invoices2（在线开票 2025）            | 12         | 开票批次、电子发票、企业账单总览等               |
| 其他模块（20 个）                     | 共 ~100    | 红包、短信、消息、商城资源位、系统管理等         |

---

## 4. 升级路线与详细步骤

### 4.1 整体升级路线

采用 **渐进式升级策略**，分为两个大阶段：

```
阶段一：@vue/compat 新旧共存（立即获得收益，老页面零改动）
    Phase 1: Webpack 3 → Webpack 5 + Babel 7
        ↓
    Phase 2: Vue Router 3 → 4 + Vuex 3 → 4
        ↓
    Phase 3: 切换 @vue/compat + 双 UI 库共存环境
        ↓
    【稳态】新页面 Vue 3 + 新 UI 库，老页面 Vue 2 写法 + Element UI
    ─────────────────────────────────────────────────────
阶段二：全量迁移（按模块逐步推进，结合业务迭代）
    Phase 4: 逐模块消除 Vue 2 废弃用法
        ↓
    Phase 5: 逐模块替换 Element UI → 公司标准 UI 库
        ↓
    Phase 6: 移除 @vue/compat，切换纯 Vue 3 运行时
```

### 4.2 设计依据

1. **项目规模决定不可能一步到位** — 996 个 Vue 文件、124 个 Store 模块、77 个 API 模块，一次性重写意味着所有业务线全部停摆。渐进式迁移允许业务开发与技术升级并行推进。

2. **@vue/compat 提供安全网** — `@vue/compat` 是 Vue 官方提供的 Vue 3 兼容构建版本，能在 Vue 3 运行时中模拟 Vue 2 行为。开启后项目可以在"半 Vue 2 半 Vue 3"状态下正常运行。

3. **阶段一投入小、收益大** — 仅用约 13-20 人天即可完成新旧共存环境搭建，之后新页面立即按 Vue 3 + 公司标准 UI 库开发，老页面零改动零风险。

4. **UI 库替换放在最后** — 在 @vue/compat 阶段 Element UI 2 仍可运行，等全量代码改造完毕后直接替换到目标 UI 库，只做一次替换。

5. **每个阶段可独立验证和回滚** — 每个 Phase 完成后项目都应能正常运行，出现不可控问题可回退到上一个稳定状态。

---

### 阶段一：@vue/compat 新旧共存

> 目标：以最小改动量搭建 Vue 3 开发环境，新页面立即使用 Vue 3 + 公司标准 UI 库，老页面保持不动。

---

#### Phase 1: Webpack 3 → Webpack 5 + Babel 7

**状态**：已在 `feature-upgrade-0303` 分支完成。

已完成的工作：

- Node.js 升级到 18.20（`.nvmrc`）
- Babel 6 → Babel 7（`@babel/core`、`@babel/preset-env`、`babel-loader@9`）
- Webpack 3 → Webpack 5（`webpack@5`、`webpack-cli@5`、`webpack-dev-server@4`）
- 替换废弃插件（`extract-text-webpack-plugin` → `mini-css-extract-plugin`、Asset Modules 替代 `url-loader/file-loader`）
- vue-loader 升级到 15（Vue 2 最终兼容版本）
- css-loader、less-loader、style-loader 升级到最新版

---

#### Phase 2: Vue Router 3 → 4，Vuex 3 → 4

**目标**：先升级 Vue 生态库，因为 @vue/compat 不兼容旧版 Router 和 Vuex。

##### 2.1 Vue Router 3 → 4

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

| 变更项                   | Vue Router 3               | Vue Router 4                            |
| ------------------------ | -------------------------- | --------------------------------------- |
| 创建方式                 | `new Router({})`           | `createRouter({})`                      |
| 模式配置                 | `mode: "history"`          | `history: createWebHistory()`           |
| 守卫函数                 | `next()` 回调              | 返回值控制（next 仍可用但不推荐）       |
| 通配符路由               | `path: "*"`                | `path: "/:pathMatch(.*)*"`              |
| `router.onReady`         | `router.onReady(cb)`       | `router.isReady().then(cb)`             |
| `<router-link>` tag 属性 | `<router-link tag="li">`   | 使用 `v-slot` API                       |
| `addRoutes`              | `router.addRoutes(routes)` | 移除，改为单条 `router.addRoute(route)` |

> 重点关注：项目中 `router/output.js` 的动态路由权限过滤逻辑使用了 `addRoutes` API，需要适配为循环调用 `addRoute`。

##### 2.2 Vuex 3 → 4

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

| 变更项   | Vuex 3               | Vuex 4                            |
| -------- | -------------------- | --------------------------------- |
| 创建方式 | `new Vuex.Store({})` | `createStore({})`                 |
| 注册方式 | `Vue.use(Vuex)`      | `app.use(store)`                  |
| 组件访问 | `this.$store`        | `this.$store`（Options API 不变） |

##### 2.3 验收标准

- 所有页面路由跳转正常
- 路由守卫（登录检查、权限过滤）正常工作
- Vuex Store 的数据读写、异步 action 正常
- 动态路由加载（`router/output.js` 权限过滤）正常

---

#### Phase 3: 切换 @vue/compat + 双 UI 库共存

**目标**：切换到 @vue/compat 运行时，配置双 UI 库共存环境。新页面使用 Vue 3 + 公司标准 UI 库，老页面保持原样不动。

##### 3.1 安装依赖

```bash
pnpm add vue@3 @vue/compat
pnpm remove vue-template-compiler
pnpm add -D vue-loader@17
```

##### 3.2 Webpack 配置

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
      vue: "@vue/compat" // 将 vue 指向兼容版本
    }
  }
};
```

##### 3.3 入口文件改造

```js
// src/main.js（新 — @vue/compat 阶段）
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

// Vue.prototype → app.config.globalProperties
app.config.globalProperties.$api = api;
app.config.globalProperties.global = global;
app.config.globalProperties.$sucMsg = (msg) => {
  /* ... */
};
app.config.globalProperties.$errMsg = (msg) => {
  /* ... */
};

// Vue.component → app.component
app.component("BasicCitySelect", BasicCitySelect);
app.component("BasicUpload", BasicUpload);
app.component("PageSplit", PageSplit);
// ... 其余全局组件注册

// Vue.directive → app.directive
app.directive("permission", permission);

// Vue.use → app.use
app.use(pagePlugin);
app.use(momentPlugin);

// SGM 错误处理
app.config.errorHandler = function (err) {
  if (err) {
    try {
      window.__sgm__.error(err);
    } catch (e) {
      console.error(e);
    }
  }
};

app.mount("#app");
```

##### 3.4 vue-i18n 升级

```bash
pnpm add vue-i18n@9
```

```js
import { createI18n } from "vue-i18n";
const i18n = createI18n({ locale: "zh_cn", messages, legacy: true });
app.use(i18n);
```

`legacy: true` 保持 `$t()` 用法不变，老页面无需修改。

##### 3.5 验收标准

- 所有老页面功能正常（compat 模式模拟 Vue 2 行为）
- 控制台的 deprecation 警告属正常现象（阶段一不要求清零）
- 新建 Vue 3 测试页面，确认 Composition API 和新 UI 库可用

---

### 新页面开发规范

阶段一完成后，新开发的页面按以下规范执行：

#### 使用 `<script setup>`（推荐）

`<script setup>` 天然以 Vue 3 模式运行，无需额外配置：

```vue
<template>
  <n-button type="primary" @click="handleSubmit">提交</n-button>
  <n-data-table :columns="columns" :data="tableData" :pagination="pagination" />
</template>

<script setup>
import { ref, reactive, onMounted, getCurrentInstance } from "vue";
import { NButton, NDataTable } from "naive-ui"; // 示例，实际使用公司标准 UI 库
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

### 阶段二：全量迁移

> 目标：逐模块将老页面从 Vue 2 写法 + Element UI 迁移到 Vue 3 + 公司标准 UI 库，最终移除 @vue/compat。

---

#### Phase 4: 逐模块消除 Vue 2 废弃用法

每个模块迁移时，按以下优先级逐项处理：

**优先级 1：全局 API 变更（影响入口文件，Phase 3 已处理）**

```js
// Vue.component → app.component（已在 Phase 3 完成）
// Vue.directive → app.directive（已在 Phase 3 完成）
// Vue.filter → 移除，改为全局方法或工具函数
app.config.globalProperties.$filters = {
  formatDate(val) {
    /* ... */
  }
};
// 模板中: {{ $filters.formatDate(date) }}
```

**优先级 2：`.sync` 修饰符（348 个文件）**

```html
<!-- 旧 -->
<el-dialog :visible.sync="dialogVisible">
  <!-- 新 -->
  <el-dialog v-model:visible="dialogVisible"></el-dialog
></el-dialog>
```

> 可通过正则批量替换：`:(\w+)\.sync="` → `v-model:$1="`

**优先级 3：`slot-scope` 旧语法（419 个文件）**

```html
<!-- 旧 -->
<template slot-scope="scope">
  <!-- 新 -->
  <template #default="scope"></template
></template>
```

> 可通过正则批量替换（需注意具名 slot 的情况）

**优先级 4：EventBus 事件总线（173 个文件）**

```js
// 旧 — 利用 Vue 实例作为事件总线
import Vue from "vue";
export default new Vue();
// EventBus.$on / $emit / $off

// 新 — 使用 mitt 库
import mitt from "mitt";
const emitter = mitt();
export default emitter;
// EventBus.on / emit / off（去掉 $ 前缀）
```

**优先级 5：`beforeDestroy` 生命周期（141 个文件）**

```js
// 旧
beforeDestroy() { /* cleanup */ }
// 新
beforeUnmount() { /* cleanup */ }
```

> 可全局搜索替换。

**优先级 6：`filters` 过滤器（78 个文件）**

```html
<!-- 旧 -->
<span>{{ price | currency }}</span>
<!-- 新 — 改为方法调用 -->
<span>{{ formatCurrency(price) }}</span>
```

**优先级 7：`this.$set` / `this.$delete` 移除**

```js
// 旧
this.$set(this.formData, "newField", value);
// 新 — 直接赋值（Vue 3 基于 Proxy，无需 $set）
this.formData.newField = value;
```

**优先级 8：`this.$children` / `this.$listeners` 移除**

- `this.$children`：Vue 3 移除，改用 `ref` 或 `provide/inject`
- `this.$listeners`：Vue 3 合并到 `$attrs` 中

##### 逐步关闭兼容开关

每修完一个模块，在该模块的组件中声明 `compatConfig: { MODE: 3 }`，或在全局 `configureCompat` 中逐个关闭兼容开关：

```js
configureCompat({
  MODE: 2,
  // 已完成迁移的项，设为 false 关闭兼容
  INSTANCE_EVENT_EMITTER: false, // EventBus 改造完成
  FILTERS: false, // filters 迁移完成
  COMPONENT_V_MODEL: false // .sync 迁移完成
  // ...
});
```

---

#### Phase 5: 逐模块替换 Element UI → 公司标准 UI 库

在单个模块的 Vue 2 废弃用法消除后，同步替换该模块的 Element UI 组件：

##### 组件映射与替换

| Element UI 组件                | 功能     | 替换策略                          |
| ------------------------------ | -------- | --------------------------------- |
| `el-button`                    | 按钮     | 直接替换标签名和属性              |
| `el-input`                     | 输入框   | 替换标签名，检查属性差异          |
| `el-select` + `el-option`      | 下拉选择 | 部分库合并为单组件 + options prop |
| `el-table` + `el-table-column` | 表格     | API 差异较大，需逐个适配          |
| `el-form` + `el-form-item`     | 表单     | 验证 API 可能不同                 |
| `el-dialog`                    | 弹窗     | v-model 绑定方式可能不同          |
| `el-pagination`                | 分页     | 属性名、事件名可能不同            |
| `el-date-picker`               | 日期选择 | API 差异通常较大                  |
| `el-upload`                    | 上传     | API 差异较大                      |
| `this.$message`                | 消息提示 | 替换为新库的 Message API          |
| `this.$confirm`                | 确认弹窗 | 替换为新库的 Modal/Dialog API     |

##### 样式迁移

- `src/assets/ele-theme/`（88 个文件）→ 按新库的主题定制方式重写
- `src/assets/theme/compoents/elem/`（通用样式覆盖）→ 适配新库的 CSS 类名
- `@hose/eui-theme` 自定义主题包 → 评估是否仍需要
- 各组件内部直接引用 `.el-*` 类名的样式 → 替换为新库的类名

##### 全局基础组件适配

项目中封装了多个 Element UI 的 wrapper 组件，需要内部替换：

- `BasicCitySelect` — 内部使用 el-select
- `BasicUpload` — 内部使用 el-upload
- `BasicTable` / `BasicLogTable` — 内部使用 el-table
- `PageSplit` — 内部使用 el-pagination
- `BasicTransferDialog` — 内部使用 el-dialog + el-transfer

---

#### Phase 6: 移除 @vue/compat（终态）

所有模块迁移完成后：

```js
// Webpack 别名：移除 @vue/compat
resolve: {
  alias: {
    // 删除 vue: "@vue/compat"
  }
}

// main.js：移除 configureCompat
import { createApp } from "vue";
// 删除 configureCompat({ ... })
```

```bash
pnpm remove @vue/compat element-ui
```

**验收标准**：

- `pnpm list vue` 确认只有 `vue@3.x`，无 `@vue/compat`
- 全量业务功能回归测试通过
- 构建产物体积较 compat 阶段有明显减小

---

## 5. 其他必须处理的迁移事项

> 阶段一需处理 vue-i18n 和监控 SDK，其余在阶段二按模块迁移时处理。

### 5.1 Axios 升级

```bash
pnpm add axios@1
```

Axios 0.18 → 1.x 的主要 breaking change：

- `transformRequest`/`transformResponse` 行为变化
- 部分错误处理逻辑调整
- 需要验证 `src/http/axios.js` 中拦截器的兼容性

### 5.2 第三方 Vue 2 插件升级

| 插件                 | 当前版本 | 目标                        | 说明                |
| -------------------- | -------- | --------------------------- | ------------------- |
| vue-baidu-map        | 0.21.22  | vue-baidu-map-3x 或替代方案 | 需评估 Vue 3 兼容性 |
| vue-quill-editor     | 3.0.6    | @vueup/vue-quill 或其他     | 原库不支持 Vue 3    |
| vue-json-viewer      | 2.2.20   | vue-json-viewer@3           | 需确认 Vue 3 版本   |
| vue-virtual-scroller | 1.0.10   | vue-virtual-scroller@2      | 官方已出 Vue 3 版本 |

> 阶段一（@vue/compat 阶段），老页面可继续使用 Vue 2 版本的第三方插件。当对应模块进入阶段二迁移时，同步替换。

### 5.3 全局 Mixin 治理

项目中有 23 个 mixin 文件，其中 `mixin-table` 和 `mixin-global` 通过 `Vue.mixin()` 全局注入。

- Vue 3 仍支持 `app.mixin()`，阶段一可直接使用
- 建议：阶段二迁移时逐步改为 Composition API 的 `composables`

### 5.4 监控 SDK 兼容性确认

| SDK                 | 说明         | 处理方式                                        |
| ------------------- | ------------ | ----------------------------------------------- |
| `@jd/sgm-web`       | 京东内部监控 | 确认是否支持 Vue 3 的 `app.config.errorHandler` |
| `@sentry/types`     | 错误追踪     | 需升级到 `@sentry/vue` 的 Vue 3 兼容版本        |
| `sa-sdk-javascript` | 神策埋点     | 确认 Vue 3 路由切换的自动埋点是否正常           |

---

## 6. 风险与应对策略

### 6.1 阶段一风险

| 风险                                     | 影响             | 概率 | 应对策略                                                                          |
| ---------------------------------------- | ---------------- | ---- | --------------------------------------------------------------------------------- |
| Vue Router 4 API 差异导致路由异常        | 页面无法跳转     | 中   | Phase 2 预留充足时间，逐个验证路由守卫和动态路由                                  |
| Element UI 在 @vue/compat 下部分组件异常 | 部分老页面不可用 | 中   | 提前对核心组件（el-table、el-dialog、el-form）做兼容性测试，异常组件单独 polyfill |
| SGM/Sentry 监控 SDK 不兼容 Vue 3         | 线上无监控       | 中   | 提前联系京东 SGM 团队确认兼容性，准备降级方案                                     |
| vue-i18n 9 与 legacy 模式不完全兼容      | 国际化文本缺失   | 低   | `legacy: true` 模式官方已充分测试，出问题概率小                                   |
| `addRoutes` → `addRoute` 改造遗漏        | 权限路由加载失败 | 中   | 全面排查 `router/output.js` 中的动态路由逻辑                                      |

### 6.2 阶段二风险

| 风险                                  | 影响             | 概率 | 应对策略                                         |
| ------------------------------------- | ---------------- | ---- | ------------------------------------------------ |
| @vue/compat 停止维护                  | 被迫加速全量迁移 | 中   | 关注 Vue 官方动态，预留迁移到纯 Vue 3 的时间窗口 |
| 双 UI 库并存导致打包体积过大          | 首屏加载变慢     | 中   | 按路由懒加载拆分，新旧 UI 库 CSS/JS 分别按需加载 |
| 新老页面样式冲突（CSS 全局污染）      | UI 错乱          | 中   | 新 UI 库使用 CSS Modules 或添加统一前缀隔离      |
| 自定义主题 CSS 在新 UI 库下大面积失效 | UI 走样          | 高   | 专人负责样式迁移，建立组件视觉对照表             |
| 业务代码隐式依赖 Vue 2 内部 API       | 运行时报错       | 低   | @vue/compat 警告会暴露这些问题                   |
| 迁移期间业务需求并行开发产生代码冲突  | 合并困难         | 中   | 按模块迁移，每个模块在独立分支完成后合并         |
| 团队需同时掌握 Vue 2 + Vue 3 两套写法 | 开发效率降低     | 低   | 制定明确的开发规范，新页面统一 Vue 3 模板        |
| 第三方 Vue 2 插件无 Vue 3 版本        | 功能缺失         | 中   | 提前调研替代方案，必要时自行封装                 |

---

## 7. 项目排期

### 7.1 阶段一排期：@vue/compat 新旧共存

| Phase    | 内容                          | 预估人天     | 人员   | 备注                                             |
| -------- | ----------------------------- | ------------ | ------ | ------------------------------------------------ |
| Phase 1  | Webpack 3 → 5 + Babel 7       | —            | —      | 待升级                                           |
| Phase 2  | Vue Router 3→4 + Vuex 3→4     | 3-5 天       | 1 人   | Vuex 模块内部基本不动，Router 需重点关注动态路由 |
| Phase 3  | @vue/compat + 双 UI 库配置    | 3-4 天       | 1 人   | 只改入口和构建配置，不改业务代码                 |
| 其他     | vue-i18n 升级 + 监控 SDK 适配 | 2-3 天       | 1 人   | i18n legacy 模式降低成本                         |
| 回归测试 | 核心业务流程验证              | 3-5 天       | 1-2 人 | 重点测试路由跳转、表单交互、弹窗等核心场景       |
| **合计** |                               | **11-17 天** |        |                                                  |

**阶段一里程碑**：完成后新页面即可使用 Vue 3 + 公司标准 UI 库开发，老页面零改动零回归。

---

### 7.2 阶段二排期：全量迁移

#### 7.2.1 模块迁移优先级

基于 Git 提交活跃度分析（统计周期：2025-06 至 2026-03），将 37 个业务模块分为四个迁移批次：

**迁移原则**：

- **稳定模块优先迁移**：近 9 个月无提交或极少提交的模块，迁移期间不会与业务开发冲突
- **高频迭代模块最后迁移**：避免迁移与业务开发并行导致的合并冲突
- **高频迭代模块结合业务迭代渐进迁移**：当业务需求涉及某个老页面较大改动时，顺便将该页面迁移到 Vue 3 写法

#### 7.2.2 第一批：稳定模块（近 9 个月 0 提交）

| 模块                             | Vue 文件数 | 近 9 月提交数 | 预估人天   | 说明                                 |
| -------------------------------- | ---------- | ------------- | ---------- | ------------------------------------ |
| Car（用车 1.0）                  | 28         | 0             | 3-4        | 已被 HCar 2.0 替代，可能仅需保留兼容 |
| RedPacketManagement（红包管理）  | 10         | 0             | 1-2        | 页面少，改动量小                     |
| Message（消息通知）              | 8          | 0             | 1          | 页面少                               |
| MallAuthority（业务权限管理）    | 5          | 0             | 0.5-1      | 页面少                               |
| MallResource（商城资源位）       | 6          | 0             | 0.5-1      | 页面少                               |
| Banner（Banner 配置）            | 2          | 0             | 0.5        | 极少页面                             |
| Index（首页）                    | 2          | 0             | 0.5        | 极少页面                             |
| channel-control（渠道管控）      | 3          | 0             | 0.5        | 极少页面                             |
| opLog（操作日志）                | 1          | 0             | 0.5        | 单页面                               |
| Value-addedServices（增值服务）  | 1          | 0             | 0.5        | 单页面                               |
| JD（京东集采）                   | 1          | 0             | 0.5        | 单页面                               |
| System（系统管理）               | 2          | 0             | 0.5        | 极少页面                             |
| food-user-sync（员工同步）       | 1          | 0             | 0.5        | 单页面                               |
| shopping（集采订单）             | 7          | 0             | 1          | 页面少                               |
| admin（组织结构）                | 8          | 0             | 1          | 页面少                               |
| Compay（企业开通）               | 11         | 0             | 1-2        | 中等页面量                           |
| operating-activities（运营活动） | 8          | 0             | 1          | 页面少                               |
| downloadManagement（下载管理）   | 3          | 0             | 0.5        | 页面少                               |
| **小计**                         | **~107**   |               | **~14-17** |                                      |

#### 7.2.3 第二批：低活跃模块（近 9 个月 1-5 提交）

| 模块                            | Vue 文件数 | 近 9 月提交数 | 预估人天   | 说明                                   |
| ------------------------------- | ---------- | ------------- | ---------- | -------------------------------------- |
| Insurance（保险）               | 23         | 1             | 2-3        | 基本稳定                               |
| MarketingManagement（营销管理） | 17         | 1             | 2-3        | 基本稳定                               |
| Food（餐饮）                    | 4          | 1             | 0.5-1      | 页面少                                 |
| SmsManagement（短信平台）       | 8          | 2             | 1          | 低活跃                                 |
| account-management（账户管理）  | 26         | 3             | 3-4        | 低活跃，页面较多                       |
| point-management（积分管理）    | 3          | 3             | 0.5-1      | 页面少                                 |
| HCar（用车 2.0）                | 59         | 4             | 5-7        | 历史大量代码但近期低活跃，页面多需分批 |
| invoice（开票管理）             | 41         | 4             | 4-5        | 低活跃，页面较多                       |
| Customer（客服管理）            | 28         | 5             | 3-4        | 低活跃                                 |
| supplierManage（佣金管理）      | 8          | 0             | 1          | 页面少                                 |
| **小计**                        | **~217**   |               | **~22-30** |                                        |

#### 7.2.4 第三批：中活跃模块（近 9 个月 19-46 提交）

| 模块                                  | Vue 文件数 | 近 9 月提交数 | 预估人天   | 说明                   |
| ------------------------------------- | ---------- | ------------- | ---------- | ---------------------- |
| CommonOrder（通用订单）               | 34         | 19            | 3-5        | 中活跃                 |
| Finance（财务中心）                   | 23         | 21            | 3-4        | 中活跃                 |
| BasicData（基础数据）                 | 93         | 39            | 8-12       | 页面多，需分子模块迁移 |
| supply-chain-management（供应链管理） | 74         | 41            | 7-10       | 页面多，需分子模块迁移 |
| Air（机票）                           | 22         | 43            | 3-4        | 中活跃                 |
| train-ticket（火车票）                | 17         | 46            | 2-3        | 中活跃                 |
| **小计**                              | **~263**   |               | **~26-38** |                        |

#### 7.2.5 第四批：高活跃模块（近 9 个月 70+ 提交，结合业务迭代渐进迁移）

| 模块                       | Vue 文件数 | 近 9 月提交数 | 预估人天   | 说明                                                  |
| -------------------------- | ---------- | ------------- | ---------- | ----------------------------------------------------- |
| Hotel（酒店）              | 19         | 70            | 2-3        | 高活跃，需与业务团队协调迁移窗口                      |
| ClientMng（企业管理）      | 118        | 101           | 10-15      | 最大模块，建议按子功能分批迁移                        |
| Invoices2（在线开票 2025） | 12         | 135           | 2-3        | 最活跃模块（48% 提交在近 9 月），建议等功能稳定后迁移 |
| **小计**                   | **~149**   |               | **~14-21** |                                                       |

#### 7.2.6 公共层迁移（贯穿全程）

| 迁移项                                  | 预估人天   | 说明                                        |
| --------------------------------------- | ---------- | ------------------------------------------- |
| 全局基础组件适配（15+ 个 wrapper 组件） | 3-5        | BasicCitySelect、BasicUpload、PageSplit 等  |
| 全局 Mixin → Composables                | 3-5        | mixin-table、mixin-global 等 23 个 mixin    |
| 全局 Filters → 方法/工具函数            | 2-3        | 15 个 filter 文件                           |
| EventBus → mitt                         | 3-5        | 173 个文件涉及 EventBus                     |
| Element UI 主题 CSS 迁移                | 3-5        | 88 个主题文件 + 27 个全局样式文件           |
| 第三方插件替换                          | 2-3        | vue-baidu-map、vue-quill-editor 等 4 个插件 |
| Axios 升级                              | 1-2        | 验证拦截器兼容性                            |
| 最终移除 @vue/compat                    | 2-3        | 移除兼容层 + 全量回归测试                   |
| **小计**                                | **~19-31** |                                             |

#### 7.2.7 阶段二工作量汇总

| 批次                 | 模块数 | Vue 文件数 | 预估人天   |
| -------------------- | ------ | ---------- | ---------- |
| 第一批（稳定模块）   | 18     | ~107       | 14-17      |
| 第二批（低活跃模块） | 10     | ~217       | 22-30      |
| 第三批（中活跃模块） | 6      | ~263       | 26-38      |
| 第四批（高活跃模块） | 3      | ~149       | 14-21      |
| 公共层迁移           | —      | —          | 19-31      |
| **合计**             | **37** | **~736**   | **95-137** |

> 阶段二可结合业务迭代节奏灵活安排，不要求一次性集中投入。建议每个迭代周期（2 周）安排 1-2 个模块的迁移工作。

### 7.3 总体时间线

```
2026-03 ─── 阶段一开始
  Phase 1: Webpack 5 + Babel 7              待升级
  Phase 2: Vue Router 4 + Vuex 4            预计 1 周
  Phase 3: @vue/compat + 双 UI 库           预计 1 周
  验收 & 回归测试                            预计 1 周
2026-04 ─── 阶段一完成，新页面即可使用 Vue 3 开发
           ───────────────────────────────────
2026-04 ─── 阶段二开始（与业务迭代并行）
  第一批：稳定模块迁移                       预计 3-4 周
2026-05 ───
  第二批：低活跃模块迁移                     预计 4-6 周
2026-06 ───
  第三批：中活跃模块迁移                     预计 5-8 周
2026-08 ───
  第四批：高活跃模块迁移                     预计 3-4 周
  公共层迁移 & 最终移除 @vue/compat          预计 3-5 周
2026-09 ─── 阶段二完成，纯 Vue 3 + 公司标准 UI 库终态
```

> 以上时间线按 1-2 人持续投入估算。如增加投入人力，可适当压缩周期。第四批高活跃模块的具体时间取决于业务迭代节奏，需与业务团队协调。

## 附录 A：各模块路由清单

### 酒店 (Hotel) — 8 条路由

| 路由路径                         | 页面名称           |
| -------------------------------- | ------------------ |
| /hotel/order-mng                 | 酒店预订管理       |
| /hotel/order-wait-confirm        | 待确认订单管理     |
| /hotel/refund-order-mng          | 酒店退订管理       |
| /hotel/hotel-order-by-hand       | 酒店手工单录入     |
| /hotel/hotel-inter-order-by-hand | 国际酒店手工单录入 |
| /hotel/hotel-order-for-customer  | 酒店代客下单       |
| /hotel/hotel-invoicing           | 酒店开票           |
| /hotel/detail (common)           | 酒店订单详情       |

### 机票 (Air) — 10 条路由 + 7 条操作页

| 路由路径                            | 页面名称     |
| ----------------------------------- | ------------ |
| /air/air-ticket                     | 机票订单列表 |
| /air/air-change-ticket              | 改签管理     |
| /air/air-refund-ticket              | 退票管理     |
| /air/air-order-by-hand              | 机票手工单   |
| /air/air-order-for-customer         | 代客下单     |
| /air/changeSupplier                 | 换供应商     |
| /air/airProtect                     | 航班保护     |
| /air/historyPrice                   | 历史价格     |
| /air/policyVerify                   | 政策验证     |
| /air-ticket-detail (common)         | 机票订单详情 |
| /ticket-by-hand-page (common)       | 手工出票     |
| /change-check-page (common)         | 改签审核     |
| /change-confirm-page (common)       | 确认改签     |
| /refund-check-page (common)         | 退票审核     |
| /refund-confirm-page (common)       | 确认退票     |
| /refund-ticket-page (common)        | 退票完成     |
| /refund-money-confirm-page (common) | 确认退款     |

### 火车票 (Train) — 8 条路由

| 路由路径                      | 页面名称       |
| ----------------------------- | -------------- |
| /train/train-ticket           | 火车票订单列表 |
| /train/identity-check         | 身份验证       |
| /train/train-ticket-by-hand   | 火车票手工单   |
| /train/rc-rules               | 退改签规则     |
| /train/passenger-check        | 旅客核验       |
| /train/abnormal-list          | 异常列表       |
| /train/balance-query          | 余额查询       |
| /train-ticket-detail (common) | 火车票订单详情 |

### 用车 (Car/HCar) — 5 + 16 条路由

| 路由路径                | 页面名称      |
| ----------------------- | ------------- |
| /car/car-list           | 用车订单(1.0) |
| /car/car-rules          | 用车规则      |
| /car/dd-auth            | 滴滴授权      |
| /car/car-address        | 用车地址      |
| /hcar/list              | 用车订单(2.0) |
| /hcar/inter-list        | 国际用车      |
| /hcar/supplier-priority | 供应商优先级  |
| /hcar/channel           | 渠道管理      |
| /hcar/address           | 地址管理      |
| /hcar/policy            | 开放策略      |
| /hcar/log               | 日志          |
| /hcar/businessConfigure | 业务配置      |
| /hcar/getCarPoint       | 取车点        |
| /hcar/orderStrategy     | 订单策略      |
| /hcar/evaluation        | 评价管理      |
| /hcar/price-raising     | 加价策略      |
| /hcar/addressPolyline   | 地址围栏      |
| /hcar/addressStation    | 站点地址      |

### 餐饮 (Food) — 3 条路由

| 路由路径              | 页面名称 |
| --------------------- | -------- |
| /food/food-list       | 餐饮订单 |
| /food/waimai-list     | 外卖订单 |
| /food-detail (common) | 餐饮详情 |

### 保险 (Insurance) — 6 条路由

| 路由路径                     | 页面名称 |
| ---------------------------- | -------- |
| /insurance/list              | 保险订单 |
| /insurance/product           | 产品管理 |
| /insurance/product-agreement | 产品协议 |
| /insurance/sale              | 销售管理 |
| /insurance/decode-tool       | 解密工具 |
| /insurance/detail (common)   | 保险详情 |

### 客户管理 (ClientMng) — 9 条路由

| 路由路径                     | 页面名称 |
| ---------------------------- | -------- |
| /ClientMng/client-info       | 企业信息 |
| /ClientMng/application-form  | 申请单   |
| /ClientMng/intercept-order   | 拦截订单 |
| /ClientMng/account-hz        | 华住账号 |
| /ClientMng/account-city-trip | 城市出行 |
| /ClientMng/predefault        | 预默认   |
| /ClientMng/insertMsgWarn     | 消息预警 |
| /ClientMng/questionnaire     | 问卷     |
| /client-info (common)        | 企业详情 |

### 发票 (Invoice) — 6 + 8 条路由

| 路由路径                           | 页面名称     |
| ---------------------------------- | ------------ |
| /invoice/index                     | 发票列表(旧) |
| /invoice/apply-supplier            | 供应商发票   |
| /invoice/express                   | 快递管理     |
| /invoice/info                      | 开票信息     |
| /invoice/address-manager           | 地址管理     |
| /invoice2025/invoice-list          | 发票列表(新) |
| /invoice2025/invoice-train-list    | 火车票发票   |
| /invoice2025/fee-atom-rerun        | 费用重跑     |
| /invoice2025/invoice-overview      | 发票总览     |
| /invoice2025/invoice-apply         | 开票申请     |
| /invoice2025/all-invoice-list      | 全量发票     |
| /invoice2025/batch-red-destruction | 批量红冲     |

### 基础数据 (BasicData) — 24 + 12 条路由

| 路由路径                                            | 页面名称                             |
| --------------------------------------------------- | ------------------------------------ |
| /BasicDataManagement/cityManagement                 | 城市管理                             |
| /BasicDataManagement/airportManagement              | 机场管理                             |
| /BasicDataManagement/flightManagement               | 航班管理                             |
| /BasicDataManagement/trainManagement                | 火车站管理                           |
| /BasicDataManagement/holidayManagement              | 节假日管理                           |
| /BasicDataManagement/airlineCompanyPage             | 航空公司                             |
| /BasicDataManagement/airTicketForecastPage          | 机票预测                             |
| /BasicDataManagement/shippingSpacePage              | 舱位管理                             |
| /BasicDataManagement/airMileagePage                 | 里程管理                             |
| /BasicDataManagement/airChannelPage                 | 机票渠道                             |
| /BasicDataManagement/airEnroute                     | 航线管理                             |
| /BasicDataManagement/trainChannelPage               | 火车票渠道                           |
| /BasicDataManagement/airFuelPage                    | 燃油附加费                           |
| /BasicDataManagement/airTranslate                   | 机场翻译                             |
| /BasicDataManagement/airCancelReason                | 取消原因                             |
| /BasicDataManagement/TicketChangesList              | 退改签列表                           |
| /BasicDataManagement/companyGroupManagementPage     | 集团管理                             |
| /BasicDataManagement/companyGroupManagementTypePage | 集团类型                             |
| /BasicDataManagement/setReason                      | 原因设置                             |
| /BasicDataManagement/airlineUserAgreement           | 航司协议                             |
| /BasicDataManagement/airPayChannel                  | 支付渠道                             |
| /BasicDataManagement/airQuNaConfig                  | 去哪儿配置                           |
| /BasicDataManagement/ibeTrafficPool                 | IBE 流量池                           |
| /hotelBasicDataManagement/\* (12 条)                | 酒店基础数据（品牌/静态数据/合并等） |

### 供应链 (SupplyChain) — 37 + 5 条路由

| 路由路径                                               | 页面名称       |
| ------------------------------------------------------ | -------------- |
| /supplyChainManagement/supplyChannelPage               | 供应渠道       |
| /supplyChainManagement/trainInvoiceSet                 | 火车票发票设置 |
| /supplyChainManagement/trainSupplyChain                | 火车票供应链   |
| /supplyChainManagement/flightSupplyChain               | 机票供应链     |
| /supplyChainManagement/flightBlackList                 | 机票黑名单     |
| /supplyChainManagement/flightBlack                     | 机票黑名单管理 |
| /supplyChainManagement/flightBlackError                | 黑名单异常     |
| /supplyChainManagement/collectGoods                    | 采购商品       |
| /supplyChainManagement/goodsManag                      | 商品管理       |
| /supplyChainManagement/adjustPrice                     | 调价策略       |
| /supplyChainManagement/flight/strategy                 | 机票策略       |
| /supplyChainManagement/account                         | 账户           |
| /supplyChainManagement/supplyShop                      | 供应商店铺     |
| /supplyChainManagement/cardCouponShop                  | 卡券店铺       |
| /supplyChainManagement/airLimitRule                    | 限制规则       |
| /supplyChainManagement/airLimitPerson                  | 限制人         |
| /supplyChainManagement/flight/uatp                     | UATP           |
| /supplyChainManagement/flight/mainProtocol             | 主协议         |
| /supplyChainManagement/hotelBlackPrice                 | 酒店黑价格     |
| /supplyChainManagement/flightSelfDefine                | 自定义         |
| /supplyChainManagement/flightPolicyQuery               | 政策查询       |
| /supplyChainManagement/hotelCancelFailList             | 酒店取消失败   |
| /supplyChainManagement/hotelLocalErrorManagement       | 酒店本地异常   |
| /supplyChainManagement/hotelSpecialDelist              | 酒店特殊下架   |
| /supplyChainManagement/hotelChannelErrorMap            | 渠道异常映射   |
| /supplyChainManagement/flightTicketNumberVendingRecord | 机票出票记录   |
| /supplyChainManagement/companions                      | 买贵赔         |
| /supplyChainManagement/companionsBlack                 | 买贵赔黑名单   |
| /supplyChainManagement/hotelGroupAccount               | 酒店集团账号   |
| /supplyChainManagement/hotelSupplyHotel                | 酒店供应酒店   |
| /supplyChainManagement/hotelSupplyChain                | 酒店供应链     |
| /supplyChainManagement/hotelSupplyChainNew             | 酒店供应链(新) |
| /supplyChainManagement/hotelDynamicPrice               | 酒店动态价     |
| /supplyChainManagement/hotelDynamicPriceSwitch         | 动态价开关     |
| /policy/airPolicy                                      | 机票政策       |
| /policy/mealPolicy                                     | 餐食政策       |
| /policy/airBSP                                         | BSP 政策       |
| /policy/airB2B                                         | B2B 政策       |

### 其他模块路由汇总

| 模块       | 路由数 | 典型路径                                                                   |
| ---------- | ------ | -------------------------------------------------------------------------- |
| 财务结算   | 14     | /finance/bill, /finance/company-reconcile, /finance/supplier-bill 等       |
| 账户管理   | 8      | /accountManagementNew/accountList, /accountManagementNew/billManagement 等 |
| 通用订单   | 4      | /commonOrder/config, /commonOrder/management, /commonOrder/mice            |
| 客服工单   | 9      | /customer/orderList, /customer/acceptList, /warning-management/\*          |
| 营销管理   | 8      | /marketingManagementNew/promoteList, /marketingManagementNew/couponPage 等 |
| 企业购     | 3      | /shopping/shopping-list, /shopping/shopping-balance                        |
| 红包管理   | 7      | /redPacketManagement/RedTemplatePage, /redPacketManagement/RedSendPage 等  |
| 短信平台   | 6      | /smsManagement/setup, /smsManagement/templateManagement 等                 |
| 供应商管理 | 4      | /supplierManage/supplierConfig, /supplierManage/supplierStatement 等       |
| 权限管理   | 3      | /mallAuthority/authorityList, /mallAuthority/businessTypeList              |
| 系统管理   | 6      | /admin/user-manage, /admin/user-role 等                                    |
| 消息管理   | 4      | /Message/notice, /Message/banner, /Message/approval                        |
| 商城资源   | 4      | /MallResource/shopping-product-config, /MallResource/home-page-category 等 |
| 下载管理   | 4      | /downloadManagement/list, /downloadManagement/uploadManage                 |
| 积分管理   | 4      | /point-management/rules, /point-management/flow, /point-management/user    |
| 票据核查   | 5      | /ticketCheck/check, /ticketCheck/ticketCheckManage 等                      |
| 运营活动   | 3      | /operating-activities/list, /operating-activities/new                      |
| 日志       | 2      | /log/opLog                                                                 |
| 系统配置   | 2      | /SystemAdministration/MenuList                                             |

---
