# Phase C: 切换 @vue/compat + 双 UI 库共存

> 预估工期：3-4 人天 | 建议人员：1 人
>
> 前置条件：Phase A（Webpack 5）+ Phase B（Router 4 + Vuex 4）完成
>
> 目标：切换到 @vue/compat 运行时，配置双 UI 库共存环境。新页面可使用 Vue 3 + 新 UI 库，老页面保持原样不动。

---

## 目录

1. [Step 1: 安装 @vue/compat 及相关依赖](#step-1-安装-vuecompat-及相关依赖)
2. [Step 2: Webpack 配置改造](#step-2-webpack-配置改造)
3. [Step 3: 入口文件 main.js 改造](#step-3-入口文件-mainjs-改造)
4. [Step 4: EventBus 改造](#step-4-eventbus-改造)
5. [Step 5: 全局 API 迁移](#step-5-全局-api-迁移)
6. [Step 6: Filters 兼容处理](#step-6-filters-兼容处理)
7. [Step 7: Plugins 迁移](#step-7-plugins-迁移)
8. [Step 8: HTTP 层适配](#step-8-http-层适配)
9. [Step 9: 新 UI 库集成（双 UI 库共存）](#step-9-新-ui-库集成双-ui-库共存)
10. [Step 10: 验证 Element UI 在 compat 下的兼容性](#step-10-验证-element-ui-在-compat-下的兼容性)
11. [验收标准](#验收标准)
12. [回滚方案](#回滚方案)
13. [已知风险与应对](#已知风险与应对)

---

## Step 1: 安装 @vue/compat 及相关依赖

### 1.1 切换 Vue 版本

```bash
pnpm add vue@3 @vue/compat
pnpm remove vue-template-compiler
```

> `vue-template-compiler` 是 Vue 2 专用，Vue 3 使用内置的 `@vue/compiler-sfc`，通过 `vue-loader@17` 自动调用。

### 1.2 升级 vue-loader 到 v17

```bash
pnpm add -D vue-loader@17
```

> Phase A 中安装的 `vue-loader@15` 是 Vue 2 最终版，现在需要升级到 Vue 3 兼容的 v17。

### 1.3 确认依赖状态

```bash
pnpm list vue vue-router vuex @vue/compat vue-loader
```

预期输出：

```
vue@3.4.x
@vue/compat@3.4.x          # 版本必须与 vue 一致
vue-router@4.x.x
vuex@4.x.x
vue-loader@17.x.x (dev)
```

---

## Step 2: Webpack 配置改造

### 2.1 修改 build/webpack.base.conf.js

#### 2.1.1 resolve.alias 指向 @vue/compat

```js
resolve: {
  extensions: [".js", ".vue", ".json"],
  alias: {
    "@": resolve("src"),
    vue: "@vue/compat"  // 关键：将所有 import vue 指向兼容版本
  }
}
```

#### 2.1.2 vue-loader 配置添加 compatConfig

```js
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
              MODE: 2 // 默认以 Vue 2 模式编译所有 .vue 模板
            }
          }
        }
      }
      // ... 其他 rules
    ]
  },
  plugins: [new VueLoaderPlugin()]
};
```

#### 2.1.3 移除旧的 vue$ 别名

```js
// 删除
alias: { "vue$": "vue/dist/vue.esm.js" }

// 替换为
alias: { vue: "@vue/compat" }
```

### 2.2 移除 build/vue-loader.conf.js

`vue-loader@17` 不再使用独立的配置文件，样式由 Webpack rules 统一处理。如果 `webpack.base.conf.js` 中引用了 `vue-loader.conf.js`，需删除该引用。

### 2.3 DefinePlugin 添加 Vue 特性标志

Vue 3 需要通过 feature flags 控制选项 API 等特性：

```js
const webpack = require("webpack");

plugins: [
  new webpack.DefinePlugin({
    __VUE_OPTIONS_API__: true, // 启用 Options API（老代码需要）
    __VUE_PROD_DEVTOOLS__: false, // 生产环境关闭 DevTools
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false
  })
];
```

> 如不定义这些标志，控制台会输出警告。

---

## Step 3: 入口文件 main.js 改造

这是 Phase C 最核心的改造文件。

### 3.1 改造后的完整 main.js 结构

```js
// === 1. CSS 导入（保持不变） ===
import "vue-virtual-scroller/dist/vue-virtual-scroller.css";
import "element-ui/lib/theme-chalk/index.css";
// 自定义主题、字体等 CSS 导入保持不变
import "@hose/eui-theme/dist/eui-style.css";

// === 2. Vue 3 createApp 方式 ===
import { createApp, configureCompat } from "vue";
import ElementUI from "element-ui";
import App from "./App.vue";
import router from "./router";
import store from "./store";
import i18n from "./i18n"; // vue-i18n 需同步升级（见 Phase D）

// === 3. 全局兼容配置 ===
configureCompat({
  MODE: 2 // 全局默认 Vue 2 模式，老页面无需任何修改
});

// === 4. 创建应用实例 ===
const app = createApp(App);

// === 5. 注册插件 ===
app.use(ElementUI); // Element UI 在 compat 模式下继续工作
app.use(router);
app.use(store);
app.use(i18n);

// === 6. 全局组件注册 ===
// Vue.component() → app.component()
import BasicCitySelect from "@/components/base/BasicCitySelect";
import BasicUpload from "@/components/base/BasicUpload";
import BasicLogTable from "@/components/base/BasicLogTable";
import BasicTransferDialog from "@/components/base/BasicTransferDialog";
import PageSplit from "@/components/base/PageSplit";
// ... 其他全局组件
import { RecycleScroller } from "vue-virtual-scroller";

app.component("BasicCitySelect", BasicCitySelect);
app.component("BasicUpload", BasicUpload);
app.component("BasicLogTable", BasicLogTable);
app.component("BasicTransferDialog", BasicTransferDialog);
app.component("PageSplit", PageSplit);
app.component("RecycleScroller", RecycleScroller);
// ... 注册所有全局组件（逐个从 Vue.component 改为 app.component）

// === 7. 全局指令注册 ===
// Vue.use(permission) → app.directive()
import { permission } from "@/utils/permission";
app.directive("permission", permission);

// === 8. 全局属性（替代 Vue.prototype） ===
import api from "@/http/api";
import global from "@/utils/global";
import moment from "moment";
import selfMoment from "@/plugins/momentPlugin";
import { formatCostCenterDetails } from "@hose-mall/utils";

app.config.globalProperties.$api = api;
app.config.globalProperties.global = global;
app.config.globalProperties.$moment = moment;
app.config.globalProperties.$selfMoment = selfMoment;
app.config.globalProperties.formatCostCenterDetails = formatCostCenterDetails;

// 消息提示（原来通过 pagePlugin 注册到 Vue.prototype）
import { Message } from "element-ui";
app.config.globalProperties.$sucMsg = (message) => {
  Message({ message, type: "success", offset: 100, duration: 1000 });
};
app.config.globalProperties.$errMsg = (message) => {
  Message({ message, type: "error", offset: 100, duration: 1000 });
};
app.config.globalProperties.$closePage = (time = 1000) => {
  setTimeout(() => {
    window.close();
  }, time);
};

// === 9. 全局 Mixin ===
// Vue.mixin() → app.mixin()
import mixinTable from "@/mixins/mixin-table";
import mixinGlobal from "@/mixins/mixin-global";
app.mixin(mixinTable);
app.mixin(mixinGlobal);

// === 10. Filters 兼容处理 ===
// Vue 3 移除了 filters，但 @vue/compat MODE: 2 下仍可使用
// 此处暂不改动，让 compat 兼容层处理
// 后续迁移时再改为 globalProperties.$filters

// 注册所有 filter 文件
import "./filters/filter-hotel";
import "./filters/filter-air-ticket";
import "./filters/filter-train-ticket";
// ... 其他 filter 文件

// === 11. 全局错误处理 ===
app.config.errorHandler = (err, vm, info) => {
  console.error("[Vue Error]:", err, info);
  if (window.__sgm__) {
    window.__sgm__.error(err);
  }
};

// === 12. 全局变量 ===
import _ from "lodash";
window._ = _;

// === 13. 挂载应用 ===
app.mount("#app");
```

### 3.2 关键变更对照

| Vue 2 写法                                                       | Vue 3 / @vue/compat 写法                           |
| ---------------------------------------------------------------- | -------------------------------------------------- |
| `import Vue from "vue"`                                          | `import { createApp, configureCompat } from "vue"` |
| `Vue.use(ElementUI)`                                             | `app.use(ElementUI)`                               |
| `Vue.use(Router)` / `Vue.use(Vuex)`                              | `app.use(router)` / `app.use(store)`               |
| `Vue.component("Name", Comp)`                                    | `app.component("Name", Comp)`                      |
| `Vue.directive("name", def)`                                     | `app.directive("name", def)`                       |
| `Vue.mixin(mixin)`                                               | `app.mixin(mixin)`                                 |
| `Vue.prototype.$xxx = val`                                       | `app.config.globalProperties.$xxx = val`           |
| `Vue.config.errorHandler`                                        | `app.config.errorHandler`                          |
| `new Vue({ router, store, render: h => h(App) }).$mount("#app")` | `app.mount("#app")`                                |

### 3.3 Filters 在 @vue/compat 下的处理

在 `configureCompat({ MODE: 2 })` 下，`Vue.filter()` 仍然可用。但由于 `Vue` 全局对象在 Vue 3 中不再存在，需要通过 `app` 来注册。

**方案 A**：改造 filter 文件的注册方式（推荐）

每个 filter 文件改为导出 filter 对象，由 main.js 统一注册到 `app.config.globalProperties.$filters`：

```js
// 暂不改造，等后续按需迁移时再处理
// @vue/compat MODE: 2 下 filters 语法仍然工作
```

**方案 B**：保持现状，依赖 compat 兼容

由于 compat MODE: 2 会模拟 `Vue.filter()` 行为，filter 文件中的 `import Vue from "vue"; Vue.filter(...)` 在 compat 下仍可工作。控制台会输出 deprecation 警告，但功能不受影响。

> **方案二选择方案 B**：保持老代码不动，接受 deprecation 警告。

---

## Step 4: EventBus 改造

### 当前实现

```js
// src/EventBus.js
import Vue from "vue";
export default new Vue();
```

### 问题

Vue 3 移除了实例上的 `$on`、`$off`、`$emit` 方法（用于非父子组件通信）。在 @vue/compat MODE: 2 下，这些方法仍可用，但会输出 `INSTANCE_EVENT_EMITTER` deprecation 警告。

### 方案二处理

**选项 1：保持不动（最小改动）**

在 compat MODE: 2 下 EventBus 仍可工作，接受 deprecation 警告。后续按需迁移时再改造。

**选项 2：替换为 mitt（推荐，改动小）**

```bash
pnpm add mitt
```

```js
// src/EventBus.js（新）
import mitt from "mitt";
const emitter = mitt();
export default emitter;
```

使用方式变更：

```js
// 旧
EventBus.$on("event", handler);
EventBus.$emit("event", data);
EventBus.$off("event", handler);

// 新
EventBus.on("event", handler);
EventBus.emit("event", data);
EventBus.off("event", handler);
```

需全局搜索 `EventBus.$on`、`EventBus.$emit`、`EventBus.$off` 并替换为 `EventBus.on`、`EventBus.emit`、`EventBus.off`。

涉及文件数：约 173 个（根据 tech.md 统计）。

> **建议**：如果 173 个文件的改动量可接受（主要是删除 `$` 前缀），推荐执行选项 2，一次性消除最大的 deprecation 警告源。如果时间紧张，选择选项 1。

---

## Step 5: 全局 API 迁移

### 已在 Step 3 中处理的项目

- `Vue.component` → `app.component`
- `Vue.directive` → `app.directive`
- `Vue.mixin` → `app.mixin`
- `Vue.prototype` → `app.config.globalProperties`
- `Vue.config.errorHandler` → `app.config.errorHandler`

### 需要额外检查的全局 API 使用

全局搜索以下模式，确认除 main.js 外是否有其他文件使用：

```bash
grep -rn "import Vue from" src/ --include="*.js" --include="*.vue" | grep -v node_modules
grep -rn "Vue\.component\b" src/ --include="*.js" --include="*.vue"
grep -rn "Vue\.directive\b" src/ --include="*.js" --include="*.vue"
grep -rn "Vue\.mixin\b" src/ --include="*.js" --include="*.vue"
grep -rn "Vue\.prototype\b" src/ --include="*.js" --include="*.vue"
grep -rn "Vue\.set\b" src/ --include="*.js" --include="*.vue"
grep -rn "Vue\.delete\b" src/ --include="*.js" --include="*.vue"
grep -rn "Vue\.nextTick\b" src/ --include="*.js" --include="*.vue"
grep -rn "Vue\.observable\b" src/ --include="*.js" --include="*.vue"
grep -rn "Vue\.extend\b" src/ --include="*.js" --include="*.vue"
```

#### Vue.set / Vue.delete

在 compat MODE: 2 下仍可用。不需要立即改造。

#### Vue.nextTick

Vue 3 中改为从 vue 导入：`import { nextTick } from "vue"`。在 compat MODE: 2 下 `Vue.nextTick` 仍可用。

#### Vue.extend

compat MODE: 2 下仍可用，但已被标记为废弃。

> **方案二处理**：以上全局 API 调用全部依赖 compat 兼容层，暂不改动。

---

## Step 6: Filters 兼容处理

### 当前 Filter 文件列表

| 文件名                   | 说明       |
| ------------------------ | ---------- |
| `filter-hotel.js`        | 酒店业务   |
| `filter-air-ticket.js`   | 机票业务   |
| `filter-train-ticket.js` | 火车票业务 |
| `filter-company-pay.js`  | 企业支付   |
| `filter-coupon.js`       | 优惠券     |
| `filter-area.js`         | 地区       |
| `filter-company.js`      | 企业       |
| `filter-supply-chain.js` | 供应链     |
| `filter-car.js`          | 用车       |
| `filter-food.js`         | 餐饮       |
| `filter-gaode.js`        | 高德       |
| `filter-shopping.js`     | 商城       |
| `filter-red-packet.js`   | 红包       |
| `filter-utils.js`        | 通用工具   |

### 方案二处理

所有 filter 文件内部使用 `Vue.filter("name", fn)` 注册。在 @vue/compat MODE: 2 下：

- `Vue.filter()` 被 compat 兼容层模拟
- 模板中的 `{{ value | filterName }}` 管道语法在 MODE: 2 编译模式下仍可用
- 控制台会输出 `FILTERS` deprecation 警告

**暂不改动**，等后续按需迁移时再统一改为方法调用或 `$filters` 全局属性。

---

## Step 7: Plugins 迁移

### 7.1 pagePlugin.js

原来通过 `Vue.prototype` 注册 `$closePage`、`$sucMsg`、`$errMsg`。

已在 Step 3 中通过 `app.config.globalProperties` 方式替代，不再需要独立的 plugin 文件。

或者，将 `pagePlugin.js` 改造为 Vue 3 插件格式：

```js
// src/plugins/pagePlugin.js（新格式）
import { Message } from "element-ui";

export default {
  install(app) {
    app.config.globalProperties.$closePage = (time = 1000) => {
      setTimeout(() => {
        window.close();
      }, time);
    };
    app.config.globalProperties.$sucMsg = (message) => {
      Message({ message, type: "success", offset: 100, duration: 1000 });
    };
    app.config.globalProperties.$errMsg = (message) => {
      Message({ message, type: "error", offset: 100, duration: 1000 });
    };
  }
};
```

使用方式：

```js
// main.js
import pagePlugin from "./plugins/pagePlugin";
app.use(pagePlugin);
```

### 7.2 momentPlugin.js

同理，改造为 Vue 3 插件格式或直接在 main.js 中注册到 `app.config.globalProperties`。

### 7.3 ElVirtualTransfer

确认 `ElVirtualTransfer` 组件（`Vue.use(ElVirtualTransfer)`）在 compat 下的兼容性。如果它是一个标准的 Vue 2 插件（提供 `install` 方法），compat 应该能兼容。

---

## Step 8: HTTP 层适配

### 8.1 src/http/axios.js

检查 axios 拦截器中是否有 Vue 2 特有的依赖：

```js
// 检查项
// 1. 是否直接引用 Vue 实例？
import Vue from "vue"; // 如有，需替换

// 2. 是否使用 Element UI 的 Message？
import { Message } from "element-ui"; // compat 下仍可用

// 3. 是否通过 router 实例跳转？
import router from "@/router";
router.push("/login"); // Vue Router 4 下语法一致，不需要改
```

### 8.2 src/http/config.js

确认 `serviceMap` 引用不受 Vue 版本影响（纯 JS 工具函数）。

### 8.3 src/http/request.js

纯 JS 函数封装，不依赖 Vue API，无需改动。

---

## Step 9: 新 UI 库集成（双 UI 库共存）

> 此步骤在 UI 库选型确定后执行。以下以假设的目标库为示例。

### 9.1 安装新 UI 库

```bash
# 以 Naive UI 为例（实际以选型结果为准）
pnpm add naive-ui
```

### 9.2 在 main.js 中注册

```js
// 方式一：全量导入（简单但体积大）
import naive from "naive-ui";
app.use(naive);

// 方式二：按需导入（推荐）
// 不在 main.js 中全局注册，在新页面中按需 import 组件
```

### 9.3 样式隔离

双 UI 库共存最大的风险是 CSS 冲突。处理方案：

#### 方案 A：CSS Modules（推荐）

新页面统一使用 `<style module>` 或 `<style scoped>`：

```vue
<style scoped>
/* 新 UI 库样式不会泄漏到老页面 */
</style>
```

#### 方案 B：命名空间前缀

在新 UI 库的根容器添加统一 class：

```html
<div class="v3-page">
  <!-- 新 UI 库组件 -->
</div>
```

#### 方案 C：加载隔离

通过路由懒加载天然实现——新老页面的 CSS 在不同 chunk 中，不会同时加载。

### 9.4 暂不安装新 UI 库的情况

如果 UI 库选型尚未确定，Phase C 可先完成 @vue/compat 切换和 Element UI 兼容验证，新 UI 库集成作为后续独立步骤。

---

## Step 10: 验证 Element UI 在 compat 下的兼容性

这是 Phase C 最重要的验证环节。Element UI 2 是为 Vue 2 设计的，在 @vue/compat 下可能存在个别组件异常。

### 10.1 核心组件验证清单

| 组件                           | 测试重点                           | 优先级 |
| ------------------------------ | ---------------------------------- | ------ |
| `el-table` + `el-table-column` | 数据渲染、排序、分页、选择、展开行 | P0     |
| `el-form` + `el-form-item`     | 表单验证、重置、动态表单           | P0     |
| `el-dialog`                    | 打开/关闭、`.sync` 绑定、嵌套弹窗  | P0     |
| `el-select` + `el-option`      | 单选、多选、远程搜索、分组         | P0     |
| `el-input`                     | 各类型输入、前后缀、自动补全       | P0     |
| `el-date-picker`               | 日期选择、范围选择、禁用日期       | P0     |
| `el-pagination`                | 翻页、页数切换、总数显示           | P0     |
| `el-tabs` + `el-tab-pane`      | 标签切换、动态标签                 | P1     |
| `el-tree`                      | 树渲染、勾选、拖拽                 | P1     |
| `el-upload`                    | 文件上传、图片上传、拖拽上传       | P1     |
| `el-cascader`                  | 级联选择                           | P1     |
| `el-transfer`                  | 穿梭框                             | P1     |
| `el-message`                   | 消息提示弹出                       | P0     |
| `el-message-box`               | 确认弹窗                           | P0     |
| `el-loading`                   | 加载状态                           | P1     |
| `el-tooltip` / `el-popover`    | 悬浮提示                           | P1     |

### 10.2 已知兼容性问题及应对

| 问题                                               | 影响             | 应对                                                         |
| -------------------------------------------------- | ---------------- | ------------------------------------------------------------ |
| `el-dialog` 的 `visible.sync` 在 compat 下可能异常 | 弹窗无法关闭     | 改为 `v-model:visible` 或检查 compat 是否正确处理 `.sync`    |
| `el-table` 虚拟滚动可能异常                        | 大数据量表格卡顿 | 针对性测试，必要时降级                                       |
| `$message` 等命令式 API                            | 调用报错         | 确认 `import { Message } from "element-ui"` 在 compat 下正常 |
| Element UI 内部使用 `Vue.extend` 创建组件          | 运行时报错       | compat MODE: 2 默认兼容 `Vue.extend`                         |

### 10.3 Polyfill 策略

如果发现某个 Element UI 组件在 compat 下异常：

1. 先检查是否是 compat 配置问题（特定的 compat flag 需要开启）
2. 如果是 Element UI 内部代码问题，尝试 patch-package 修复
3. 如果无法修复，对该组件使用自定义 wrapper 替代

---

## 验收标准

### 核心功能验收

- [ ] 项目启动无构建错误
- [ ] 所有老页面功能正常（compat 模式模拟 Vue 2 行为）
- [ ] Element UI 核心组件正常工作（参见 Step 10 验证清单）
- [ ] 控制台的 deprecation 警告属正常现象（方案二不要求清零）
- [ ] 无 JavaScript 运行时错误（排除 deprecation 警告）

### 新页面验证

- [ ] 创建 Vue 3 测试页面，确认以下功能正常：
  - `<script setup>` 语法
  - Composition API（`ref`、`reactive`、`computed`、`watch`、`onMounted`）
  - `useStore()` 访问 Vuex Store
  - `useRouter()` / `useRoute()` 访问路由
  - `getCurrentInstance().proxy.$api` 访问全局属性
- [ ] 如已集成新 UI 库：新 UI 库组件渲染正确
- [ ] 新老页面之间的路由跳转正常

### 构建验收

- [ ] `npm run build` 正常产出
- [ ] 构建产物可部署并正常运行
- [ ] 双 UI 库不产生 CSS 冲突

---

## 回滚方案

1. 恢复 vue@2.7.12，重新安装 `vue-template-compiler@2.7.12`
2. 降级 `vue-loader@15`
3. 恢复 Webpack alias `vue$: "vue/dist/vue.esm.js"`
4. 恢复 `src/main.js` 的 `new Vue()` 写法
5. 移除 `@vue/compat`、`mitt`

---

## 已知风险与应对

| 风险                                                         | 应对                                                      |
| ------------------------------------------------------------ | --------------------------------------------------------- |
| Element UI 在 compat 下个别组件异常                          | 提前对 P0 组件做兼容性测试，异常组件用 patch-package 修复 |
| Filter 文件中 `import Vue from "vue"` 在 compat 下行为异常   | compat 将 `vue` 映射为兼容版本，`Vue.filter()` 仍可用     |
| `vue-virtual-scroller` 在 compat 下不兼容                    | 确认 v1 是否需要升级到 v2（Vue 3 版本）                   |
| `@riophae/vue-treeselect` 不兼容 Vue 3 / compat              | 寻找 Vue 3 替代方案或 fork 修复                           |
| 全局 Mixin 中使用了 Vue 2 特有生命周期（如 `beforeDestroy`） | compat MODE: 2 下仍兼容，暂不需要改                       |
| `react/react-dom` (operational-slots) 在新构建环境下冲突     | 确认 React 相关包的 Webpack 配置不受影响                  |

---

## 修改文件清单

| 文件                          | 操作                                                                  |
| ----------------------------- | --------------------------------------------------------------------- |
| `package.json`                | 修改（vue@3, @vue/compat, vue-loader@17, 移除 vue-template-compiler） |
| `build/webpack.base.conf.js`  | 修改（alias, vue-loader options, DefinePlugin feature flags）         |
| `build/vue-loader.conf.js`    | 废弃或删除                                                            |
| `src/main.js`                 | 大幅改造（createApp, configureCompat, 全局注册方式变更）              |
| `src/EventBus.js`             | 修改（如选择 mitt 方案）                                              |
| `src/plugins/pagePlugin.js`   | 修改（Vue 3 插件格式）或内联到 main.js                                |
| `src/plugins/momentPlugin.js` | 修改（Vue 3 插件格式）或内联到 main.js                                |
| `src/i18n/index.js`           | 修改（见 Phase D）                                                    |
| 使用 EventBus 的 173 个文件   | 修改（如选择 mitt 方案，删除 `$` 前缀）                               |

---

## 附录：@vue/compat 兼容开关参考

在方案二中，以下 compat 开关保持开启（MODE: 2）。后续按需迁移时逐个关闭：

| 开关名                   | 说明                              | 涉及文件数 |
| ------------------------ | --------------------------------- | ---------- |
| `GLOBAL_MOUNT`           | `new Vue()` → `createApp()`       | main.js    |
| `INSTANCE_EVENT_EMITTER` | `$on/$off/$emit` 事件总线         | ~173       |
| `FILTERS`                | `{{ val \| filter }}` 管道语法    | ~78        |
| `COMPONENT_V_MODEL`      | `.sync` 修饰符 → `v-model:`       | ~348       |
| `RENDER_FUNCTION`        | render 函数 h() 签名变更          | 需统计     |
| `INSTANCE_DESTROY`       | `beforeDestroy` → `beforeUnmount` | ~141       |
| `INSTANCE_SET`           | `this.$set` → 直接赋值            | 需统计     |
| `INSTANCE_DELETE`        | `this.$delete` → `delete`         | 需统计     |
| `INSTANCE_LISTENERS`     | `this.$listeners` → `$attrs`      | 需统计     |
| `INSTANCE_CHILDREN`      | `this.$children` → `ref`          | 需统计     |
