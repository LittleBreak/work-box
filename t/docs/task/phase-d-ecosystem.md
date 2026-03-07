# Phase D: 生态库升级（vue-i18n、Axios、第三方插件、监控 SDK）

> 预估工期：2-3 人天 | 建议人员：1 人
>
> 前置条件：Phase C 基本完成（@vue/compat 环境运行正常）
>
> 目标：升级 Vue 生态相关的第三方库，确保在 @vue/compat 环境下完整可用
>
> 说明：Phase D 可与 Phase C 并行推进，但建议 Phase C 核心配置先完成

---

## 目录

1. [Step 1: vue-i18n 8 → 9](#step-1-vue-i18n-8--9)
2. [Step 2: Axios 0.18 → 1.x](#step-2-axios-018--1x)
3. [Step 3: 第三方 Vue 2 插件升级](#step-3-第三方-vue-2-插件升级)
4. [Step 4: 监控 SDK 兼容性确认](#step-4-监控-sdk-兼容性确认)
5. [Step 5: 其他工具库升级](#step-5-其他工具库升级)
6. [验收标准](#验收标准)
7. [回滚方案](#回滚方案)
8. [已知风险与应对](#已知风险与应对)

---

## Step 1: vue-i18n 8 → 9

### 1.1 安装

```bash
pnpm add vue-i18n@9
```

### 1.2 改造 src/i18n/index.js

```js
// 旧 — vue-i18n 8
import Vue from "vue";
import VueI18n from "vue-i18n";
Vue.use(VueI18n);

const i18n = new VueI18n({
  locale: "zh_cn",
  messages: {
    zh_cn: require("@/assets/languages/zh_cn.json"),
    en_us: require("@/assets/languages/en_us.json")
  }
});
export default i18n;

// 新 — vue-i18n 9
import { createI18n } from "vue-i18n";

const i18n = createI18n({
  locale: "zh_cn",
  legacy: true,  // 关键：保持 Options API 的 $t() 用法不变
  messages: {
    zh_cn: require("@/assets/languages/zh_cn.json"),
    en_us: require("@/assets/languages/en_us.json")
  }
});
export default i18n;
```

### 1.3 main.js 注册方式

```js
// 旧 — 传入 Vue 构造器选项
new Vue({ i18n, router, store, render: (h) => h(App) }).$mount("#app");

// 新 — 通过 app.use()
import i18n from "./i18n";
app.use(i18n);
```

### 1.4 `legacy: true` 的作用

- 保持 Options API 中 `this.$t("key")` 用法不变
- 保持模板中 `{{ $t("key") }}` 用法不变
- 老页面完全不需要修改
- 新页面如果使用 Composition API，可以通过 `useI18n()` 获取 `t` 函数

### 1.5 验证要点

- [ ] 切换语言功能正常（如果项目中有语言切换入口）
- [ ] 中文页面渲染正确
- [ ] 英文页面渲染正确
- [ ] `this.$t("key")` 在组件中正常工作
- [ ] 带参数的翻译 `this.$t("key", { name: "xxx" })` 正常

### 1.6 Webpack DefinePlugin 配置

vue-i18n 9 需要添加 feature flags 以避免控制台警告：

```js
// build/webpack.base.conf.js 或 webpack.prod.conf.js
new webpack.DefinePlugin({
  __VUE_I18N_FULL_INSTALL__: true,
  __VUE_I18N_LEGACY_API__: true, // 使用 legacy 模式
  __INTLIFY_PROD_DEVTOOLS__: false
});
```

---

## Step 2: Axios 0.18 → 1.x

### 2.1 安装

```bash
pnpm add axios@1
```

### 2.2 Breaking Changes 检查

Axios 0.18 → 1.x 的主要变更：

| 变更项             | 旧行为                              | 新行为                               | 影响                                          |
| ------------------ | ----------------------------------- | ------------------------------------ | --------------------------------------------- |
| `transformRequest` | 自动设置 Content-Type               | 需手动处理                           | 检查 `src/http/axios.js`                      |
| 错误对象结构       | `error.response`                    | `error.response` + `AxiosError` 类型 | 检查拦截器错误处理                            |
| `cancelToken`      | `axios.CancelToken`                 | 推荐使用 `AbortController`           | 搜索 `CancelToken` 使用                       |
| FormData 处理      | 手动序列化                          | 自动检测 FormData                    | 检查文件上传逻辑                              |
| 默认 Content-Type  | `application/x-www-form-urlencoded` | `application/json`                   | 项目已手动设置为 `application/json`，不受影响 |

### 2.3 需重点检查的文件

#### src/http/axios.js

```js
// 检查项 1：请求拦截器
// 确认 access_token 注入方式在 Axios 1.x 下正常
config.params = config.params || {};
config.params.access_token = token;

// 检查项 2：响应拦截器
// 确认 Blob/ArrayBuffer 判断逻辑在 Axios 1.x 下正常
if (res.data instanceof Blob) { /* ... */ }
if (res.data instanceof ArrayBuffer) { /* ... */ }

// 检查项 3：错误处理
// Axios 1.x 的错误对象可能包含更多属性
.catch(error => {
  if (error.response) {
    const status = error.response.status;
    // 401/403/504 处理逻辑
  }
})

// 检查项 4：超时配置
// 确认 timeout: 60000 在 Axios 1.x 下行为一致
```

#### src/http/config.js

```js
// 检查 withCredentials 默认行为
// Axios 1.x 中 withCredentials 默认仍为 false，需确认显式设置为 true
```

### 2.4 全局搜索

```bash
grep -rn "CancelToken" src/
grep -rn "axios\.create" src/
grep -rn "transformRequest" src/
grep -rn "transformResponse" src/
```

### 2.5 渐进式验证

建议先升级 Axios 版本，再逐一测试以下场景：

- [ ] 普通 GET 请求
- [ ] POST 请求（JSON body）
- [ ] 文件上传（FormData）
- [ ] 文件下载（Blob 响应）
- [ ] Token 自动注入
- [ ] 401/403 跳转登录
- [ ] 请求超时处理

---

## Step 3: 第三方 Vue 2 插件升级

### 3.1 插件兼容性评估

| 插件                      | 当前版本 | Vue 3 方案                   | 优先级 | 说明                  |
| ------------------------- | -------- | ---------------------------- | ------ | --------------------- |
| `vue-virtual-scroller`    | 1.0.10   | `vue-virtual-scroller@2`     | P1     | 官方已出 Vue 3 版本   |
| `vue-quill-editor`        | 3.0.6    | `@vueup/vue-quill`           | P1     | 原库不支持 Vue 3      |
| `@riophae/vue-treeselect` | ^0.4.0   | `vue3-treeselect` 或替代方案 | P1     | 原库不维护            |
| `vue-baidu-map`           | 0.21.22  | `vue-baidu-map-3x`           | P2     | 需评估 Vue 3 兼容性   |
| `vue-json-viewer`         | 2.2.20   | `vue-json-viewer@3`          | P2     | 需确认 Vue 3 版本     |
| `sortablejs`              | ^1.12.0  | 保持不变                     | -      | 非 Vue 组件，无需迁移 |

### 3.2 方案二处理策略

**核心原则**：在 @vue/compat MODE: 2 下，大部分 Vue 2 插件仍可工作。只有在实际出现兼容性问题时才升级。

#### 3.2.1 vue-virtual-scroller

全局注册了 `RecycleScroller` 组件。在 compat 下先测试是否正常：

```bash
# 如不正常，升级到 v2
pnpm add vue-virtual-scroller@2
```

v2 的 API 基本兼容 v1，但需要确认 `RecycleScroller` 的 slot 语法。

#### 3.2.2 vue-quill-editor

如果在 compat 下正常工作，暂不替换。如不正常：

```bash
pnpm remove vue-quill-editor
pnpm add @vueup/vue-quill
```

API 变更较大，需要修改使用到富文本编辑器的页面组件。

#### 3.2.3 @riophae/vue-treeselect

在 compat 下先测试。如不正常，替换为 `vue3-treeselect`：

```bash
pnpm remove @riophae/vue-treeselect
pnpm add vue3-treeselect
```

### 3.3 测试清单

- [ ] RecycleScroller 虚拟滚动列表正常渲染
- [ ] 富文本编辑器（quill）正常使用（输入、格式化、图片上传）
- [ ] TreeSelect 组件正常工作（搜索、选择、多选）
- [ ] 百度地图组件正常渲染（如有使用页面）
- [ ] JSON Viewer 组件正常渲染（如有使用页面）

---

## Step 4: 监控 SDK 兼容性确认

### 4.1 @jd/sgm-web（京东监控）

#### 当前使用方式

```js
// Webpack 插件
const SgmWebWebpackPlugin = require("@jd/sgm-web-webpack-plugin");
new SgmWebWebpackPlugin({
  sid: "53079af5e484432b82f2e46dafdf498e",
  pid: "9HwAEg@qTJ71eYsw8RkbIR.",
  uploadSourceMap: true
});

// 错误捕获（main.js）
Vue.config.errorHandler = (err) => {
  window.__sgm__.error(err);
};
```

#### @vue/compat 适配

```js
// Vue 3 错误处理
app.config.errorHandler = (err, vm, info) => {
  console.error("[Vue Error]:", err, info);
  if (window.__sgm__) {
    window.__sgm__.error(err);
  }
};
```

#### 确认事项

- [ ] `@jd/sgm-web-webpack-plugin` 是否支持 Webpack 5（Phase A 应已确认）
- [ ] `window.__sgm__` 全局对象在 Vue 3 运行时下正常初始化
- [ ] `app.config.errorHandler` 能正确捕获并上报错误
- [ ] Source map 上传功能正常

### 4.2 @sentry/types（Sentry 错误追踪）

#### 当前使用

项目中引入了 `@sentry/types@^10.27.0`，需确认：

```bash
grep -rn "@sentry" src/
```

如果只使用了类型定义，无需改动。如果使用了 Sentry SDK：

```bash
pnpm add @sentry/vue
```

`@sentry/vue` 的 Vue 3 版本需要通过 `app` 实例初始化：

```js
import * as Sentry from "@sentry/vue";
Sentry.init({
  app, // Vue 3 需要传入 app 实例
  dsn: "...",
  integrations: [Sentry.browserTracingIntegration({ router })]
});
```

### 4.3 sa-sdk-javascript（神策埋点）

#### 当前使用

```bash
grep -rn "sa-sdk" src/
grep -rn "sensors" src/
```

#### 确认事项

- [ ] 神策 SDK 不依赖 Vue 版本（纯 JS SDK）
- [ ] 路由切换的自动埋点是否依赖 Vue Router hook？如是，需确认 Router 4 下正常
- [ ] 页面 PV 统计是否正常

---

## Step 5: 其他工具库升级

### 5.1 不需要升级的库（Vue 版本无关）

以下库是纯 JS 工具库，不依赖 Vue API，无需改动：

| 库                           | 版本                    | 说明        |
| ---------------------------- | ----------------------- | ----------- |
| `lodash`                     | ^4.17.14                | 纯工具函数  |
| `moment` / `moment-timezone` | ^2.25.1                 | 日期处理    |
| `axios`                      | 升级到 1.x（见 Step 2） | HTTP 客户端 |
| `big.js`                     | ^5.2.2                  | 精确计算    |
| `crypto-js`                  | 4.1.1                   | 加密        |
| `sm-crypto`                  | ^0.3.13                 | 国密算法    |
| `xlsx`                       | ^0.18.5                 | Excel 处理  |
| `aws-sdk`                    | ^2.669.0                | AWS S3      |
| `sortablejs`                 | ^1.12.0                 | 拖拽排序    |

### 5.2 可能需要关注的库

| 库                   | 风险 | 说明                                                |
| -------------------- | ---- | --------------------------------------------------- |
| `umi-request`        | 低   | 纯 HTTP 工具，但与 Axios 功能重叠，评估是否需要保留 |
| `typedi`             | 低   | 依赖注入框架，与 Vue 无关                           |
| `@hose-mall/utils`   | 中   | 京东内部包，确认在 Vue 3 环境下正常                 |
| `@hose/eui-theme`    | 中   | Element UI 自定义主题，compat 下应正常              |
| `@operational-slots` | 中   | React 组件库，确认在新 Webpack 配置下正常           |

### 5.3 Less 升级确认

Phase A 中已升级 `less@4` + `less-loader@11`。确认以下文件编译正常：

- `src/assets/ele-theme/`（88 个自定义主题文件）
- `src/assets/theme/` 下的全局样式
- 各组件内的 `<style lang="less">` 块

---

## 验收标准

### vue-i18n 验收

- [ ] 中文界面所有文案正确显示
- [ ] 英文界面（如有）所有文案正确显示
- [ ] `this.$t()` 在 Options API 组件中正常工作
- [ ] 带参数/复数形式的翻译正常
- [ ] 语言切换功能正常（如有）

### Axios 验收

- [ ] 登录接口请求正常（Token 获取）
- [ ] 列表接口请求正常（分页查询）
- [ ] 表单提交正常（POST 请求）
- [ ] 文件上传正常
- [ ] 文件/Excel 下载正常（Blob 响应）
- [ ] Token 过期自动跳转登录页
- [ ] 请求超时处理正常
- [ ] 错误消息提示正常显示

### 第三方插件验收

- [ ] 虚拟滚动列表正常
- [ ] 富文本编辑器正常
- [ ] 树形选择组件正常
- [ ] 地图组件正常（如有使用）

### 监控验收

- [ ] SGM 监控 JS 错误上报正常
- [ ] 页面加载性能数据正常采集
- [ ] 神策埋点数据正常上报
- [ ] Source map 上传后错误堆栈可还原

---

## 回滚方案

各库可独立回滚：

```bash
# vue-i18n 回退
pnpm add vue-i18n@8

# Axios 回退
pnpm add axios@0.18

# 第三方插件回退
pnpm add vue-virtual-scroller@1
pnpm add vue-quill-editor@3
```

---

## 已知风险与应对

| 风险                                                 | 应对                                              |
| ---------------------------------------------------- | ------------------------------------------------- |
| vue-i18n 9 的 `legacy: true` 模式存在边界 case       | 查阅 vue-i18n 9 文档的 Migration Guide 章节       |
| Axios 1.x 拦截器行为差异导致部分接口异常             | 逐一测试核心业务接口，优先验证登录和列表查询      |
| `@jd/sgm-web-webpack-plugin` 不兼容 Webpack 5        | 联系京东 SGM 团队，或临时使用手动 source map 上传 |
| 第三方 Vue 2 插件在 compat 下个别功能异常            | 先在 compat 下测试，有问题再升级到 Vue 3 版本     |
| `@hose-mall/utils` 等内部包不兼容                    | 联系内部包维护者确认 Vue 3 兼容性                 |
| `@operational-slots` (React) 在新 Webpack 配置下异常 | 确认 React JSX 编译和 chunk 分割不受影响          |

---

## 修改文件清单

| 文件                         | 操作                                        |
| ---------------------------- | ------------------------------------------- |
| `package.json`               | 修改（vue-i18n@9, axios@1, 可能的插件升级） |
| `src/i18n/index.js`          | 修改（createI18n, legacy: true）            |
| `src/http/axios.js`          | 检查并可能微调拦截器逻辑                    |
| `src/http/config.js`         | 检查                                        |
| `src/main.js`                | 修改（app.use(i18n), errorHandler）         |
| `build/webpack.base.conf.js` | 添加 vue-i18n feature flags                 |
| 使用第三方 Vue 2 插件的组件  | 如插件升级则需适配 API 变更                 |
