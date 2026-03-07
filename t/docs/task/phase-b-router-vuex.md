# Phase B: Vue Router 3 → 4 + Vuex 3 → 4

> 预估工期：3-5 人天 | 建议人员：1 人
>
> 前置条件：Phase A 完成（Webpack 5 + Babel 7 构建正常运行）
>
> 目标：升级 Vue Router 和 Vuex 到 v4，为 @vue/compat 做准备（compat 不兼容旧版 Router 和 Vuex）

---

## 目录

1. [Step 1: Vue Router 3 → 4](#step-1-vue-router-3--4)
2. [Step 2: Vuex 3 → 4](#step-2-vuex-3--4)
3. [Step 3: 应用挂载方式适配](#step-3-应用挂载方式适配)
4. [验收标准](#验收标准)
5. [回滚方案](#回滚方案)
6. [已知风险与应对](#已知风险与应对)

---

## Step 1: Vue Router 3 → 4

### 1.1 安装

```bash
pnpm add vue-router@4
```

### 1.2 改造 src/router/index.js

#### 1.2.1 创建方式变更

```js
// 旧 — Vue Router 3
import Vue from "vue";
import Router from "vue-router";
Vue.use(Router);

// 修补 push 方法避免 NavigationDuplicated 错误
const originalPush = Router.prototype.push;
Router.prototype.push = function push(location) {
  return originalPush.call(this, location).catch((err) => err);
};

const router = new Router({
  mode: "history",
  scrollBehavior: () => ({ y: 0 }),
  routes: routes
});

// 新 — Vue Router 4
import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }), // y → top
  routes: routes
});
```

#### 1.2.2 NavigationDuplicated 处理

Vue Router 4 不再需要 patch `Router.prototype.push`。重复导航默认不报错（返回 `undefined`）。删除以下代码：

```js
// 删除
const originalPush = Router.prototype.push;
Router.prototype.push = function push(location) {
  return originalPush.call(this, location).catch((err) => err);
};
```

#### 1.2.3 beforeEach 守卫改造

```js
// 旧 — 使用 next()
router.beforeEach((to, from, next) => {
  document.title = to.meta.title || "运营端-合思商城";
  const token = session.getItem("user", "token");
  if (to.path === "/login") {
    next();
  } else {
    if (token) {
      getFiltereMenuByOriginRoutes();
      next();
    } else {
      next("/login");
    }
  }
});

// 新 — 返回值控制（推荐），next() 仍可用但不推荐
router.beforeEach((to, from) => {
  document.title = to.meta.title || "运营端-合思商城";
  const token = session.getItem("user", "token");
  if (to.path === "/login") {
    return true;
  }
  if (token) {
    getFiltereMenuByOriginRoutes();
    return true;
  }
  return "/login";
});
```

> **兼容性说明**：Vue Router 4 仍支持 `next()` 回调写法（为向后兼容），但如果同时使用返回值和 `next()`，行为可能不一致。建议统一改为返回值写法。

### 1.3 改造 src/router/output.js

#### 1.3.1 通配符路由

如果使用了通配符路由 `path: "*"`，需要替换：

```js
// 旧
{ path: "*", redirect: "/404" }

// 新
{ path: "/:pathMatch(.*)*", redirect: "/404" }
```

#### 1.3.2 addRoutes → addRoute

Vue Router 4 移除了 `addRoutes()`（批量添加），改为单条 `addRoute()`：

```js
// 旧
router.addRoutes(dynamicRoutes);

// 新
dynamicRoutes.forEach((route) => {
  router.addRoute(route);
});
```

搜索项目中所有 `addRoutes` 调用并替换。涉及文件重点关注：

- `src/router/output.js` — 动态路由权限过滤逻辑
- `src/router/index.js` — 路由初始化

#### 1.3.3 router.onReady → router.isReady

```js
// 旧
router.onReady(callback);

// 新
router.isReady().then(callback);
```

搜索项目中所有 `onReady` 调用并替换。

### 1.4 全局搜索需适配的 Router API

以下是 Vue Router 3 → 4 的 Breaking Changes，需全局搜索确认项目中是否使用：

| 搜索关键词                    | 变更说明     | 替换方案                            |
| ----------------------------- | ------------ | ----------------------------------- |
| `new Router(`                 | 创建方式     | `createRouter()`                    |
| `mode: "history"`             | 路由模式     | `history: createWebHistory()`       |
| `mode: "hash"`                | 路由模式     | `history: createWebHashHistory()`   |
| `Router.prototype`            | 原型修补     | 删除                                |
| `addRoutes`                   | 批量添加路由 | `addRoute` 逐条添加                 |
| `onReady`                     | 路由就绪     | `isReady().then()`                  |
| `path: "*"`                   | 通配符路由   | `path: "/:pathMatch(.*)*"`          |
| `scrollBehavior.*y:`          | 滚动行为     | `y` → `top`，`x` → `left`           |
| `<router-link.*tag=`          | 自定义标签   | 使用 `v-slot` API                   |
| `router.match(`               | 路由匹配     | `router.resolve()`                  |
| `router.getMatchedComponents` | 获取匹配组件 | `router.currentRoute.value.matched` |
| `this.$route.matched`         | 路由匹配记录 | 仍可用，但 `components` 属性已移除  |
| `router.app`                  | 根实例       | 已移除                              |

### 1.5 `<router-link>` 变更

#### tag 属性已移除

```html
<!-- 旧 -->
<router-link to="/home" tag="li">Home</router-link>

<!-- 新 — 使用 v-slot -->
<router-link to="/home" custom v-slot="{ navigate, isActive }">
  <li :class="{ active: isActive }" @click="navigate">Home</li>
</router-link>
```

#### event 属性已移除

```html
<!-- 旧 -->
<router-link to="/home" event="dblclick">Home</router-link>

<!-- 新 — 使用 v-slot -->
<router-link to="/home" custom v-slot="{ navigate }">
  <span @dblclick="navigate">Home</span>
</router-link>
```

> 全局搜索 `<router-link` 中使用 `tag=` 和 `event=` 的地方。

### 1.6 Vue Router 4 与 Vue 2.7 兼容性

**重要说明**：Vue Router 4 是为 Vue 3 设计的。在 Vue 2.7 环境下直接使用 Vue Router 4 可能存在兼容问题。

**推荐做法**：

- 如果 Phase B 先于 Phase C 执行（即仍在 Vue 2.7 下），需要确认 Vue Router 4 在 Vue 2.7 下是否能正常工作
- **更稳妥的方案**：将 Vue Router 4 和 Vuex 4 的升级推迟到 Phase C 一起进行，即先安装 `@vue/compat`，再升级 Router 和 Vuex
- 如果选择推迟，Phase B 的内容合并到 Phase C 中，Phase B 仅做代码准备（修改路由配置文件但不切换依赖版本）

---

## Step 2: Vuex 3 → 4

### 2.1 安装

```bash
pnpm add vuex@4
```

### 2.2 改造 src/store/index.js

```js
// 旧 — Vuex 3
import Vue from "vue";
import Vuex from "vuex";
Vue.use(Vuex);

export default new Vuex.Store({
  state: { positionList: [] },
  getters,
  actions,
  mutations,
  modules: {
    app, tab, user, menu,
    hotel, food, basicData, airTicket, trainTicket,
    // ... 35+ 模块
  }
});

// 新 — Vuex 4
import { createStore } from "vuex";

export default createStore({
  state: { positionList: [] },
  getters,
  actions,
  mutations,
  modules: {
    app, tab, user, menu,
    hotel, food, basicData, airTicket, trainTicket,
    // ... 模块定义完全不变
  }
});
```

### 2.3 模块内部代码无需修改

Vuex 4 的核心改变仅是创建方式（`new Vuex.Store` → `createStore`）。**模块内部的 `state`、`mutations`、`actions`、`getters` 代码完全不需要修改**，这对本项目 35+ 个模块来说是个好消息。

### 2.4 全局搜索需适配的 Vuex API

| 搜索关键词                | 变更说明   | 替换方案                                            |
| ------------------------- | ---------- | --------------------------------------------------- |
| `new Vuex.Store(`         | 创建方式   | `createStore()`                                     |
| `Vue.use(Vuex)`           | 注册方式   | `app.use(store)`（Phase C 处理）                    |
| `import Vuex from "vuex"` | 导入方式   | `import { createStore } from "vuex"`                |
| `this.$store`             | 组件内访问 | Options API 下不变，Composition API 用 `useStore()` |

### 2.5 Vuex 4 与 Vue 2.7 兼容性

同 Router 的说明：Vuex 4 是为 Vue 3 设计的。参见 Step 1.6 的兼容性说明。

---

## Step 3: 应用挂载方式适配

> 此步骤与 Phase C 有交叉。在 Vue 2.7 阶段，`main.js` 保持 `new Vue()` 写法不变。Phase C 切换 @vue/compat 时再改为 `createApp()`。

### 3.1 如果 Phase B 在 Vue 2.7 下执行

保持 `main.js` 的 `new Vue()` 写法：

```js
import Vue from "vue";
import router from "./router";
import store from "./store";

// Vue Router 4 在 Vue 2.7 下需要通过 Vue.use() 注册
// 但 Vue Router 4 不再支持 Vue.use()
// 因此建议将 Router/Vuex 升级推迟到 Phase C
```

### 3.2 如果 Phase B 与 Phase C 合并执行（推荐）

直接在 `@vue/compat` 环境下切换：

```js
import { createApp } from "vue";
import router from "./router";
import store from "./store";

const app = createApp(App);
app.use(router);
app.use(store);
app.mount("#app");
```

---

## 验收标准

### 路由验收

- [ ] 所有页面路由跳转正常（点击左侧菜单、面包屑、页面内链接）
- [ ] 路由懒加载正常（检查 Network 面板 chunk 请求）
- [ ] 路由守卫正常工作：
  - 未登录状态访问任意页面 → 重定向到 `/login`
  - 登录状态访问 `/login` → 正常进入登录页
  - Token 过期后 → 重定向到 `/login`
- [ ] 动态路由加载正常（`router/output.js` 权限过滤）：
  - 不同权限账号登录后看到不同的菜单
  - 直接访问无权限路由被正确拦截
- [ ] 浏览器前进/后退按钮正常
- [ ] `document.title` 根据路由 `meta.title` 正确设置
- [ ] 通配符路由（404）正常工作

### 页面导航抽查清单

至少验证以下路径的跳转：

- [ ] `/login` → 登录
- [ ] `/hotel/order-mng` → 酒店订单列表
- [ ] `/air-ticket/order-mng` → 机票订单列表
- [ ] `/train-ticket/order-mng` → 火车票订单列表
- [ ] `/car/order-mng` → 用车订单列表
- [ ] `/food/store-mng` → 餐饮门店管理
- [ ] `/finance/bill-mng` → 财务账单管理
- [ ] `/sys/account-mng` → 系统账号管理
- [ ] 订单详情页（从列表跳转到详情）
- [ ] 带参数的路由（`/hotel/order-detail?orderId=xxx`）

### Vuex 验收

- [ ] Store 数据读写正常：
  - 用户信息（`user` 模块）登录后正确存储
  - 菜单数据（`menu` 模块）正确生成
  - Tab 页签（`tab` 模块）切换正常
- [ ] 异步 Action 正常（API 请求通过 Store action 触发的场景）
- [ ] 跨模块 dispatch / commit 正常
- [ ] `mapState`、`mapGetters`、`mapMutations`、`mapActions` 辅助函数正常

---

## 回滚方案

1. `pnpm add vue-router@3 vuex@3` 回退到旧版本
2. 恢复 `src/router/index.js` 和 `src/store/index.js` 的原始写法
3. `pnpm install` 确认依赖正确

---

## 已知风险与应对

| 风险                                        | 应对                                                                    |
| ------------------------------------------- | ----------------------------------------------------------------------- |
| Vue Router 4 / Vuex 4 在 Vue 2.7 下无法工作 | 将 Phase B 合并到 Phase C，在 @vue/compat 环境下一起升级                |
| `addRoutes` 批量替换遗漏                    | 全局搜索 `addRoutes`，确保全部替换为 `addRoute` 循环                    |
| 路由守卫中 `next()` 多次调用                | 检查所有 `beforeEach`、`beforeEnter` 守卫，确保每个分支只调用一次       |
| `<router-link tag="">` 用法较多             | 全局搜索 `<router-link` 确认是否使用了 `tag` 属性                       |
| 动态路由注册时序问题                        | Router 4 的 `addRoute` 不会触发已有导航的重新匹配，确认权限路由注册时序 |
| `router.app` 引用已移除                     | 搜索 `router.app`，如有使用需改用其他方式获取根实例                     |

---

## 修改文件清单

| 文件                                | 操作                                            |
| ----------------------------------- | ----------------------------------------------- |
| `package.json`                      | 修改（vue-router@4, vuex@4）                    |
| `src/router/index.js`               | 大幅修改（createRouter, 守卫改写）              |
| `src/router/output.js`              | 修改（addRoutes → addRoute, 通配符路由）        |
| `src/store/index.js`                | 修改（createStore）                             |
| `src/main.js`                       | 修改（如与 Phase C 合并）或暂不动（如单独执行） |
| 所有使用 `this.$router.push` 的文件 | 检查（大多数不需要改，但需确认）                |
| 使用 `<router-link tag="">` 的组件  | 需搜索并逐个修改                                |

---

## 附录：需全局搜索的关键词

执行 Phase B 前，建议先统计以下关键词的使用情况：

```bash
# Vue Router 相关
grep -rn "new Router(" src/
grep -rn "addRoutes" src/
grep -rn "onReady" src/
grep -rn "router\.app" src/
grep -rn "router\.match" src/
grep -rn "getMatchedComponents" src/
grep -rn '<router-link.*tag=' src/
grep -rn "path.*\"\*\"" src/router/
grep -rn "scrollBehavior" src/

# Vuex 相关
grep -rn "new Vuex.Store" src/
grep -rn "Vue\.use(Vuex)" src/
grep -rn "import Vuex" src/
```
