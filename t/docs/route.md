# 路由系统分析

## 1. 整体架构

### 1.1 技术流程图

```
┌─────────────────────────────────────────────────────────────────┐
│                        应用启动 (main.js)                        │
│  import router → new Vue({ router, store }) → 挂载到 #app        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    路由实例创建 (router/index.js)                  │
│                                                                 │
│   routes = commonRoutes (静态) + outputRoutes (权限路由)           │
│   new Router({ mode: "history", routes })                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│               beforeEach 路由守卫 (router/index.js:598-646)       │
│                                                                 │
│   1. 设置 document.title                                        │
│   2. 从 SessionStorage 获取 token                                │
│   3. 非 /login 页 → 调用 getFiltereMenuByOriginRoutes()          │
│   4. next() 放行                                                 │
│   5. 无 token 且非 /login → 重定向到 /login                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│          权限过滤 (router/output.js → store/modules/menu.js)      │
│                                                                 │
│   getFiltereMenuByOriginRoutes()                                │
│     └→ store.dispatch("routerAuth", outputRoutes)               │
│          ├→ dispatch("getCurrentUserInfo") → 获取 roleId         │
│          ├→ initAuthCodes(userData) → 存储 authCodes             │
│          ├→ getRoleId({ roleId }) → 获取角色菜单权限              │
│          ├→ 按 platform/status 过滤 → toTree() 生成树结构         │
│          └→ commit("MENU_SET_NAVTREE", filteredRoutes)           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              菜单渲染 (NavBar.vue + SidebarItem.vue)              │
│                                                                 │
│   computed: navTree → mapState(menu.navTree)                     │
│     └→ <SidebarItem v-for="route in navTree" /> (递归渲染)        │
│          └→ menuClick(menu) → $router.push(menu.url)             │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 关键文件一览

| 文件路径                           | 职责         | 关键内容                                                   |
| ---------------------------------- | ------------ | ---------------------------------------------------------- |
| `src/router/index.js`              | 路由主入口   | commonRoutes 定义、beforeEach 守卫、路由实例创建           |
| `src/router/output.js`             | 业务路由定义 | 35+ 模块的 outputRoutes、getFiltereMenuByOriginRoutes 函数 |
| `src/store/modules/menu.js`        | 权限过滤     | routerAuth action、navTree 状态管理                        |
| `src/store/modules/user.js`        | 用户信息     | baseInfo 状态、getCurrentUserInfo action                   |
| `src/store/modules/app.js`         | 应用状态     | menuRouteLoaded 标志、iframeSrc                            |
| `src/store/modules/tab.js`         | 标签页管理   | mainTabs、mainTabsActiveName                               |
| `src/utils/permission.js`          | 权限工具     | v-permission 指令、initAuthCodes 函数                      |
| `src/utils/session.js`             | 会话存储     | SessionStorage 的 getItem/setItem 封装                     |
| `src/views/NavBar/NavBar.vue`      | 左侧菜单     | navTree 映射到 UI                                          |
| `src/views/NavBar/SidebarItem.vue` | 菜单项       | 递归渲染、menuClick 导航处理                               |
| `src/views/Home.vue`               | 布局容器     | 所有业务路由的 parent component                            |
| `src/main.js`                      | 应用入口     | Router 注册、全局插件/组件注册                             |

---

## 2. 路由定义与注册

### 2.1 两类路由

路由分为 **静态路由 (commonRoutes)** 和 **权限路由 (outputRoutes)**，在 `router/index.js:592` 合并注册：

```javascript
// router/index.js:592
let routes = commonRoutes.concat(outputRoutes);
```

#### commonRoutes — 静态路由 (`router/index.js:29-590`)

不需要权限验证的页面，包括：

| 路径                    | 说明                |
| ----------------------- | ------------------- |
| `/login`                | 登录页              |
| `/test`                 | 测试页              |
| `/404`                  | 错误页              |
| `/hotelOrderDetail`     | 酒店订单详情        |
| `/trainOrderDetail`     | 火车票订单详情      |
| `/flightOrderDetail`    | 机票订单详情        |
| `/insuranceOrderDetail` | 保险订单详情        |
| ...                     | 40+ 个详情/操作页面 |

> 特点：大部分是从列表页跳转的详情页，不在左侧菜单中展示，但需要直接 URL 访问。

#### outputRoutes — 权限路由 (`router/output.js:11-2161`)

按业务域组织的 35+ 个模块，每个模块结构如下：

```javascript
{
  path: "/hotel",
  name: "酒店订单",
  component: Home,        // 布局容器（非懒加载）
  id: "1",                // 权限匹配 ID
  redirect: "/hotel/order-mng",
  children: [
    {
      path: "/hotel/order-mng",
      name: "酒店预订管理",
      id: "1-1",           // 子权限 ID
      component: () => import("@/views/Sys/Hotel/HotelOrderListPage")  // 懒加载
    },
    // ...更多子路由
  ]
}
```

### 2.2 outputRoutes 模块清单

| 模块       | path 前缀       | id  | 位置 (行号) |
| ---------- | --------------- | --- | ----------- |
| 酒店       | `/hotel`        | 1   | 12-74       |
| 机票       | `/air`          | 2   | 75-155      |
| 火车票     | `/train`        | 3   | 156-211     |
| 用车       | `/car`          | 4   | 212-244     |
| 华车2.0    | `/hcar`         | 25  | 245-346     |
| 通用订单   | `/commonOrder`  | 4   | 347-375     |
| 餐饮       | `/food`         | 16  | 376-396     |
| 商城       | `/shopping`     | 26  | 397-417     |
| 客户服务   | `/customer`     | 27  | 418-456     |
| 保险       | `/insurance`    | 5   | —           |
| 客户管理   | `/client-mng`   | —   | —           |
| 基础数据   | `/basic-data`   | —   | —           |
| 财务管理   | `/finance`      | —   | —           |
| 供应链管理 | `/supply-chain` | —   | —           |
| 发票管理   | `/invoice`      | —   | —           |
| 营销管理   | `/marketing`    | —   | —           |
| 系统管理   | `/system`       | —   | —           |
| ...        | ...             | ... | ...         |

> 总计 35+ 个一级模块，每个模块包含若干子路由。

---

## 3. 路由守卫 (beforeEach)

**位置**: `src/router/index.js:598-646`

```
用户导航到目标路由
        │
        ▼
  ┌─ 设置 document.title ──┐
  │  to.meta.title 存在？   │
  │  是 → "${title}-合思商城" │
  │  否 → "运营端-合思商城"   │
  └────────┬───────────────┘
           │
           ▼
  ┌─ 获取 token ────────────┐
  │  session.getItem(        │
  │    "user", "token"       │
  │  )                       │
  └────────┬────────────────┘
           │
           ▼
  ┌─ 是否 /login 页？ ──────┐
  │  否 → 调用               │
  │  getFiltereMenuByOrigin  │
  │  Routes() 触发权限过滤    │
  └────────┬────────────────┘
           │
           ▼
     next() 放行
           │
           ▼
  ┌─ token 为空且非 /login？─┐
  │  是 → next("/login")     │
  │  否 → 正常导航           │
  └─────────────────────────┘
```

> **注意**: 当前实现先调用 `next()` 再检查 token，这意味着无 token 用户可能短暂看到目标页面后才被重定向到登录页。

---

## 4. 权限过滤机制

### 4.1 过滤入口

```javascript
// router/output.js:2249-2252
let getFiltereMenuByOriginRoutes = function () {
  store.dispatch("routerAuth", outputRoutes);
};
```

### 4.2 routerAuth Action (`store/modules/menu.js:52-129`)

```
                  routerAuth(outputRoutes)
                          │
            ┌─────────────┼────────────────┐
            ▼             ▼                ▼
   getCurrentUserInfo  getHotelChannel  getHotelChannelPay
   (获取用户信息+roleId) (获取酒店渠道)   (获取酒店支付渠道)
            │
            ▼
   initAuthCodes(userData)
   → API: httpFindAuthCode({ userId })
   → sessionStorage.setItem("authCodes", [...])
            │
            ▼
   getRoleId({ roleId })
   → API: 获取角色对应的菜单权限列表
            │
            ▼
   ┌─ 过滤逻辑 ──────────────────────┐
   │ 1. putToLast(data, "105")       │ ← 将 id=105 的项移到最后
   │ 2. sort by sortnum (降序)        │
   │ 3. filter by status (启用状态)    │
   │ 4. filter by belong (平台类型)    │ ← platformType 区分不同平台
   │ 5. toTree() 转为树结构            │
   │ 6. filter type==2 → 按钮级权限    │
   └──────────────┬──────────────────┘
                  │
                  ▼
   commit("MENU_SET_NAVTREE", treeRoutes)    → 菜单树
   commit("MENU_SET_ORG_NAVTREE", [...])     → 原始菜单备份
   commit("SET_ABLE_PERMISSIONS", perms)     → 按钮级权限列表
```

### 4.3 权限数据流向

```
后端 API 返回角色权限列表
        │
        ├──→ 菜单级权限 → navTree (store) → NavBar 渲染侧边菜单
        │
        └──→ 按钮级权限 → authCodes (sessionStorage) → v-permission 指令控制元素显隐
```

---

## 5. v-permission 指令

**位置**: `src/utils/permission.js:42-54`

```javascript
Vue.directive("permission", {
  async inserted(el, binding) {
    const { value } = binding;
    const authCodes = JSON.parse(sessionStorage.getItem("authCodes") || "[]");
    el.style.display = "none"; // 默认隐藏
    if (!authCodes.length) {
      await initAuthCodes(); // 兜底获取权限码
    }
    if (value && authCodes.includes(value)) {
      el.style.display = "initial"; // 有权限则显示
    }
  }
});
```

**使用方式**:

```html
<el-button v-permission="'delete_order'">删除订单</el-button>
```

> 实现了**元素级**权限控制，与路由级权限（菜单显隐）形成两层权限体系。

---

## 6. 懒加载策略

### 6.1 两类组件加载方式

| 类型                | 加载方式                          | 说明                     |
| ------------------- | --------------------------------- | ------------------------ |
| 布局组件 (Home.vue) | `import Home from "@/views/Home"` | 直接导入，应用启动即加载 |
| 页面组件            | `() => import("@/views/Sys/...")` | 动态导入，访问时按需加载 |

### 6.2 代码分割效果

- Webpack 3 对每个 `() => import()` 自动生成独立 chunk
- 用户访问某模块时才加载该模块的 JS
- 降低首屏加载体积，提升初始加载速度

---

## 7. 菜单与路由的关联

### 7.1 NavBar 数据来源

```javascript
// NavBar.vue:70-79
computed: {
  ...mapState({
    navTree: (state) => state.menu.navTree,    // 过滤后的权限菜单树
    name: (state) => state.user.baseInfo.name,
    baseInfo: (state) => state.user.baseInfo,
    platformName: (state) => platformType[state.menu.currentBelong].name
  })
}
```

### 7.2 SidebarItem 递归渲染

```html
<!-- SidebarItem.vue:29-41 -->
<el-submenu :index="resolvePath(item.url)" v-if="hasChildren">
  <template slot="title">
    <span>{{ item.name }}</span>
  </template>
  <sidebar-item v-for="child in item.children" :key="child.url" :item="child" />
</el-submenu>
```

### 7.3 菜单点击导航

```javascript
// SidebarItem.vue:84-105
menuClick(menu) {
  if (menu.href === 2) {
    window.open(menu.url);                    // 外部链接
  } else if (menu.href) {
    // 带 token 的 iframe 嵌入
    href = `${menu.url}?access_token=${token}`;
  } else {
    this.$router.push(menu.url);              // 内部路由导航
  }
}
```

支持三种导航方式：

1. **内部路由** — `$router.push()` 跳转
2. **外部链接** — `window.open()` 新窗口打开
3. **Iframe 嵌入** — 带 token 的页面嵌入

---

## 8. Session 存储

**位置**: `src/utils/session.js`

对 SessionStorage 的封装，按模块化方式存储数据：

| 存储键 | 字段        | 用途         | 使用位置                             |
| ------ | ----------- | ------------ | ------------------------------------ |
| `user` | `token`     | 用户认证令牌 | beforeEach 守卫 (index.js:608)       |
| `user` | `roleId`    | 用户角色 ID  | routerAuth (menu.js:54)              |
| —      | `authCodes` | 权限码数组   | v-permission 指令 (permission.js:45) |

---

## 9. 完整请求流程示例

```
用户登录并访问 /hotel/order-mng 的完整流程：

1. 访问 /login
   └→ beforeEach: token 为空, 是 /login 页 → 放行

2. 用户登录
   └→ Login.vue 调用登录 API
   └→ 存储 token 到 sessionStorage("user", "token")

3. 登录成功后跳转到 /hotel
   └→ beforeEach 触发:
       ├→ 获取 token ✓
       ├→ 非 /login → 调用 getFiltereMenuByOriginRoutes()
       │   └→ dispatch("routerAuth")
       │       ├→ getCurrentUserInfo → 获取 roleId
       │       ├→ initAuthCodes → 存储 authCodes 到 sessionStorage
       │       ├→ getRoleId → 获取角色菜单权限
       │       ├→ 过滤: status + belong + toTree()
       │       └→ commit MENU_SET_NAVTREE → 更新 navTree
       └→ next() 放行

4. Home.vue 渲染 (布局容器)
   ├→ NavBar 读取 store.menu.navTree → 渲染侧边菜单
   ├→ HeadBar 渲染顶部导航
   └→ <router-view> 加载 /hotel/order-mng 对应的懒加载组件

5. 用户点击菜单项
   └→ SidebarItem.menuClick()
   └→ $router.push("/hotel/order-mng")
   └→ 触发 beforeEach → 重复步骤 3 的守卫逻辑
   └→ 懒加载对应组件 → 渲染页面
```

---

## 10. 页面文件统计

项目中 `src/views/` 下共有 **751 个 .vue 页面文件**，按业务模块统计如下：

| #   | 模块目录                    | 说明         |  文件数 |
| --- | --------------------------- | ------------ | ------: |
| 1   | Root (Home.vue, Login.vue)  | 首页 / 登录  |       2 |
| 2   | Core                        | 布局核心组件 |       4 |
| 3   | Error                       | 错误页       |       1 |
| 4   | HeadBar                     | 顶部导航     |       1 |
| 5   | MainContent                 | 主内容区     |       1 |
| 6   | NavBar                      | 左侧菜单     |       2 |
| 7   | warning                     | 告警页面     |       4 |
| 8   | Sys/Air                     | 机票管理     |      22 |
| 9   | Sys/Banner                  | Banner 管理  |       2 |
| 10  | Sys/BasicData               | 基础数据管理 |      85 |
| 11  | Sys/Car                     | 用车管理     |      28 |
| 12  | Sys/ClientMng               | 客户管理     |     117 |
| 13  | Sys/CommonOrder             | 通用订单     |      35 |
| 14  | Sys/Compay                  | 公司管理     |      11 |
| 15  | Sys/Customer                | 客户服务     |      28 |
| 16  | Sys/Finance                 | 财务管理     |      23 |
| 17  | Sys/Food                    | 餐饮管理     |       4 |
| 18  | Sys/HCar                    | 华车管理     |      56 |
| 19  | Sys/Hotel                   | 酒店管理     |      19 |
| 20  | Sys/Index                   | 首页模块     |       2 |
| 21  | Sys/Insurance               | 保险管理     |      23 |
| 22  | Sys/Invoices2               | 发票管理(v2) |      12 |
| 23  | Sys/JD                      | 京东模块     |       1 |
| 24  | Sys/MallAuthority           | 商城权限     |       5 |
| 25  | Sys/MallResource            | 商城资源     |       6 |
| 26  | Sys/MarketingManagement     | 营销管理     |      18 |
| 27  | Sys/Message                 | 消息管理     |       8 |
| 28  | Sys/RedPacketManagement     | 红包管理     |      10 |
| 29  | Sys/SmsManagement           | 短信管理     |       8 |
| 30  | Sys/System                  | 系统管理     |       2 |
| 31  | Sys/Value-addedServices     | 增值服务     |       1 |
| 32  | Sys/account-management      | 账户管理     |      26 |
| 33  | Sys/admin                   | 管理员       |       8 |
| 34  | Sys/channel-control         | 渠道管控     |       3 |
| 35  | Sys/downloadManagement      | 下载管理     |       3 |
| 36  | Sys/food-user-sync          | 餐饮用户同步 |       1 |
| 37  | Sys/invoice                 | 发票管理     |      37 |
| 38  | Sys/opLog                   | 操作日志     |       1 |
| 39  | Sys/operating-activities    | 运营活动     |       8 |
| 40  | Sys/point-management        | 积分管理     |       3 |
| 41  | Sys/shopping                | 商城管理     |       7 |
| 42  | Sys/supplierManage          | 供应商管理   |       8 |
| 43  | Sys/supply-chain-management | 供应链管理   |      55 |
| 44  | Sys/train-ticket            | 火车票管理   |      17 |
|     | **合计**                    |              | **751** |

页面数量 Top 5 模块：

1. **ClientMng (客户管理)** — 117 个文件，是最大的业务模块
2. **BasicData (基础数据)** — 85 个
3. **HCar (华车)** — 56 个
4. **supply-chain-management (供应链)** — 55 个
5. **invoice (发票)** — 37 个

> 注：以上统计包含了页面组件和页面内的子组件（如 Dialog、Tab 等），并非每个 .vue 文件都对应一个独立路由页面。实际路由注册的页面数会少于 751。
