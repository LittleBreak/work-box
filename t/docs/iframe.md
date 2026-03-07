# Iframe 嵌入页面逻辑梳理

## 一、架构总览

本项目 (wondermall-mos) 使用 iframe 嵌入外部/内部页面，实现跨系统功能集成。iframe 的使用分为 **三种模式**：

1. **代客下单模式** — 嵌入 C 端预订页面（mos-wmpc），供运营人员代客操作
2. **第三方系统集成模式** — 嵌入易快报(ekuaibao)等外部系统
3. **菜单级 iframe 路由模式** — 通过菜单配置将整个页面替换为 iframe 加载的外部 URL

---

## 二、核心流程图

### 2.1 整体 iframe 架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                        wondermall-mos (父窗口)                       │
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────────────────┐  │
│  │ Vuex Store   │    │ utils/       │    │ NavBar/               │  │
│  │ ┌──────────┐ │    │ iframe.js    │    │ SidebarItem.vue       │  │
│  │ │ iframe   │ │    │              │    │                       │  │
│  │ │ module   │ │    │ getIFramePath│    │ 菜单点击 → 判断 URL    │  │
│  │ │          │ │    │ getIFrameUrl │    │ 含 "iframeSrc=" 前缀   │  │
│  │ │ iframeUrl│ │    │ postMessage  │    │ → setIframeSrc(Vuex)  │  │
│  │ │ iframeUrls││    └──────────────┘    │ → 路由跳转 platform   │  │
│  │ └──────────┘ │                        └───────────────────────┘  │
│  │ ┌──────────┐ │                                                   │
│  │ │ app      │ │                                                   │
│  │ │ module   │ │                                                   │
│  │ │          │ │                                                   │
│  │ │iframeSrc │ │                                                   │
│  │ └──────────┘ │                                                   │
│  └──────────────┘                                                   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                    业务页面 (使用 iframe 的组件)                  ││
│  │                                                                 ││
│  │  ┌─────────────┐ ┌─────────────┐ ┌───────────────┐             ││
│  │  │ 酒店代客下单  │ │ 机票代客下单 │ │ 代理组(混合)    │  代客下单  ││
│  │  │ Hotel       │ │ Air         │ │ agentgroup    │             ││
│  │  │ OrderFor    │ │ OrderFor    │ │               │             ││
│  │  │ Customer    │ │ Customer    │ │ 酒店/机票      │             ││
│  │  └──────┬──────┘ └──────┬──────┘ └───────┬───────┘             ││
│  │         │               │                │                     ││
│  │  ┌──────┴──────┐ ┌──────┴──────┐ ┌───────┴───────┐             ││
│  │  │ 机票订单详情  │ │ 滴滴授权     │ │ 成本中心SAAS   │  系统集成  ││
│  │  │ BookTab     │ │ DDAuth     │ │ cost-center   │             ││
│  │  └──────┬──────┘ └──────┬──────┘ └───────┬───────┘             ││
│  │         │               │                │                     ││
│  │  ┌──────┴──────┐ ┌──────┴──────┐ ┌───────┴───────┐             ││
│  │  │ 运营活动预览  │ │ 平台iframe  │ │ BasicIFrame   │  通用组件   ││
│  │  │ manage.vue  │ │ platform   │ │ 基础弹窗       │             ││
│  │  └─────────────┘ └─────────────┘ └───────────────┘             ││
│  └─────────────────────────────────────────────────────────────────┘│
│                               │                                     │
│                     postMessage / URL 传参                           │
│                               │                                     │
└───────────────────────────────┼─────────────────────────────────────┘
                                │
                ┌───────────────┼──────────────────┐
                │               │                  │
       ┌────────▼──────┐ ┌─────▼──────┐  ┌────────▼────────┐
       │  mos-wmpc     │ │ 易快报 SAAS │  │  其他外部系统     │
       │  (C端预订页面) │ │ ekuaibao   │  │  (滴滴授权等)     │
       │               │ │            │  │                  │
       │ /hotel-list   │ │ /debugger  │  │  微信授权页面      │
       │ /flight-list  │ │ /web/...   │  │  活动预览页面      │
       └───────────────┘ └────────────┘  └──────────────────┘
```

### 2.2 代客下单流程 (酒店/机票)

```
运营人员                     MOS 父页面                        mos-wmpc (iframe)
   │                            │                                   │
   │  1. 选择企业/预订人/手机号    │                                   │
   │ ──────────────────────────>│                                   │
   │                            │                                   │
   │                            │  2. 调 API 获取用户 Token           │
   │                            │     getUserToken(userId)           │
   │                            │                                   │
   │                            │  3. 构造 iframe URL                │
   │                            │  开发: http://localhost:8001       │
   │                            │        /mos-wmpc/hotel-list?       │
   │                            │        access_token=xxx            │
   │                            │        &customerId=xxx             │
   │                            │        &createId=xxx               │
   │                            │        &contactMobile=xxx          │
   │                            │  生产: window.origin               │
   │                            │        /mos-wmpc/hotel-list?...    │
   │                            │                                   │
   │                            │  4. 设置 iframeUrl, showIframe=true│
   │                            │ ─────────────────────────────────>│
   │                            │                                   │
   │                            │           5. 加载预订页面            │
   │   6. 在 iframe 中操作预订    │<─────────────────────────────────│
   │ ──────────────────────────>│                                   │
   │                            │                                   │
   │                            │  7. postMessage('closeIframe')    │
   │                            │<─────────────────────────────────│
   │                            │                                   │
   │                            │  8. 关闭 iframe                    │
   │                            │     showIframe = false             │
   │<──────────────────────────│                                   │
   │   返回表单页面              │                                   │
```

### 2.3 SAAS 成本中心集成流程

```
MOS 父页面                    易快报 SAAS (iframe)
   │                                │
   │  1. apiGetLinkUrl(companyId)   │
   │     获取 accessToken, corpId   │
   │                                │
   │  2. 构造 URL 并加载 iframe      │
   │     /web/debugger.html?        │
   │     accessToken=xxx            │
   │     &corpId=xxx                │
   │ ─────────────────────────────>│
   │                                │
   │  3. 用户点击"填写单据"           │
   │     调用 sendDataForBill()     │
   │                                │
   │  4. iframe.contentWindow       │
   │     .postMessage(params, "*")  │
   │     发送: specificationId,     │
   │           mallField,           │
   │           flowId,              │
   │           defaultFields        │
   │ ─────────────────────────────>│
   │                                │
   │                                │  5. SAAS 处理单据
   │                                │
   │  6. window.addEventListener    │
   │     ('message', handler)       │
   │                                │
   │  7. 返回 specificationMap      │
   │<─────────────────────────────│
   │                                │
   │  8. 解析成本归属数据             │
   │     costCenterList             │
   │     saasSpecificationForm      │
   │                                │
   │  9. 关闭 drawer, 回显数据       │
```

### 2.4 菜单级 iframe 路由流程

```
用户点击菜单                SidebarItem.vue              Vuex / Router           platform.vue
   │                            │                            │                      │
   │  1. 点击菜单项              │                            │                      │
   │ ──────────────────────────>│                            │                      │
   │                            │                            │                      │
   │                            │  2. 判断 menu.url 是否      │                      │
   │                            │     包含 "iframeSrc="       │                      │
   │                            │                            │                      │
   │                            │  3a. 包含 → 分割 URL        │                      │
   │                            │     urlArr = url.split(    │                      │
   │                            │       "iframeSrc=")        │                      │
   │                            │                            │                      │
   │                            │  3b. commit setIframeSrc   │                      │
   │                            │     (urlArr[1])            │                      │
   │                            │ ─────────────────────────>│                      │
   │                            │                            │                      │
   │                            │  3c. router.push(urlArr[0])│                      │
   │                            │ ─────────────────────────>│                      │
   │                            │                            │  4. 路由匹配到         │
   │                            │                            │  /admin/inset-iframe  │
   │                            │                            │ ───────────────────>│
   │                            │                            │                      │
   │                            │                            │  5. 从 Vuex 读取      │
   │                            │                            │     iframeSrc        │
   │                            │                            │  6. 拼接 access_token │
   │                            │                            │  7. 渲染全屏 iframe    │
   │<─────────────────────────────────────────────────────────────────────────────│
   │  显示 iframe 页面                                                              │
```

---

## 三、核心基础设施

### 3.1 工具函数 — `src/utils/iframe.js`

| 函数                      | 作用                        | 说明                                                             |
| ------------------------- | --------------------------- | ---------------------------------------------------------------- |
| `getIFramePath(url)`      | 从菜单 URL 提取 iframe 路径 | 处理 `iframe:` 前缀和 `http(s)://` 格式                          |
| `getIFrameUrl(url)`       | 构造完整的 iframe 访问 URL  | `iframe:` 前缀 → baseUrl + path；http URL 直接使用               |
| `postMessage(msg, param)` | 向父窗口发送消息            | `window.parent.postMessage(JSON.stringify({action, data}), "*")` |

### 3.2 Vuex Store

| Store 模块 | State 字段       | 作用                                            |
| ---------- | ---------------- | ----------------------------------------------- |
| `iframe`   | `iframeUrl: []`  | 当前嵌套页面路由路径                            |
| `iframe`   | `iframeUrls: []` | 所有嵌套页面路由路径访问 URL                    |
| `app`      | `iframeSrc: ''`  | 菜单级 iframe 的目标 URL (供 platform.vue 使用) |

### 3.3 跨 iframe 通信协议

**统一消息格式：**

```javascript
// 子 → 父
window.parent.postMessage(JSON.stringify({
  action: "methodName",    // 调用父页面的方法名
  data: { /* 业务数据 */ }
}), "*")

// 父 → 子
iframe.contentWindow.postMessage({
  specificationId: "...",
  mallField: [...],
  defaultFields: {...}
  // ... 业务参数
}, "*")
```

**父窗口接收消息模式：**

```javascript
// 模式一：简单字符串匹配 (酒店代客下单)
window.addEventListener("message", (e) => {
  if (typeof e.data === "string" && e.data.includes("closeIframe")) {
    this.closeIframe();
  }
});

// 模式二：动态方法调用 (机票代客下单/BookTab)
window.addEventListener("message", (event) => {
  if (event.origin === window.origin || event.origin === "http://localhost:8001") {
    const dataObj = JSON.parse(event.data);
    if (typeof this[dataObj.action] === "function") {
      this[dataObj.action](dataObj.data); // 动态调用
    }
  }
});

// 模式三：数据回传解析 (SAAS 成本中心)
window.addEventListener("message", (data) => {
  const specificationMap = _.get(data, "data.value.specificationMap");
  if (specificationMap) {
    this.processCostCenterData(data.data.value);
  }
});
```

---

## 四、业务链路清单

### 4.1 酒店业务

| 序号 | 文件路径                                           | 场景            | iframe 目标                            | 通信方式                            |
| ---- | -------------------------------------------------- | --------------- | -------------------------------------- | ----------------------------------- |
| 1    | `src/views/Sys/Hotel/HotelOrderForCustomer.vue`    | 酒店代客下单    | `mos-wmpc/hotel-list` (C 端酒店搜索页) | postMessage 接收 `closeIframe` 关闭 |
| 2    | `src/views/Sys/Customer/agentgroup/agentgroup.vue` | 代理组-酒店下单 | 易快报商城 `/whotel`                   | 无通信，URL token 传参              |

### 4.2 机票业务

| 序号 | 文件路径                                           | 场景                    | iframe 目标                             | 通信方式                 |
| ---- | -------------------------------------------------- | ----------------------- | --------------------------------------- | ------------------------ |
| 3    | `src/views/Sys/Air/AirOrderForCustomer.vue`        | 机票代客下单            | `mos-wmpc/flight-list` (C 端机票搜索页) | postMessage 动态方法调用 |
| 4    | `src/views/Sys/Air/AirTicketBookTab.vue`           | 机票订单详情-预订选项卡 | `mos-wmpc` (动态 URL)                   | postMessage 动态方法调用 |
| 5    | `src/views/Sys/Customer/agentgroup/agentgroup.vue` | 代理组-机票下单         | 易快报商城 `/wflight`                   | 无通信，URL token 传参   |

### 4.3 用车业务

| 序号 | 文件路径                       | 场景         | iframe 目标                                  | 通信方式                       |
| ---- | ------------------------------ | ------------ | -------------------------------------------- | ------------------------------ |
| 6    | `src/views/Sys/Car/DDAuth.vue` | 滴滴出行授权 | 滴滴微信授权页面 (Vuex state.car.ddAuth.url) | 无通信，Dialog 弹窗内嵌 iframe |

### 4.4 运营管理

| 序号 | 文件路径                                        | 场景             | iframe 目标                                 | 通信方式                              |
| ---- | ----------------------------------------------- | ---------------- | ------------------------------------------- | ------------------------------------- |
| 7    | `src/views/Sys/operating-activities/manage.vue` | 运营活动草稿预览 | `/wmactivity/activity-preview/{activityId}` | 无通信，仅预览展示 (375x667 手机尺寸) |

### 4.5 财务/成本中心

| 序号 | 文件路径                              | 场景              | iframe 目标                      | 通信方式                                                |
| ---- | ------------------------------------- | ----------------- | -------------------------------- | ------------------------------------------------------- |
| 8    | `src/components/cost-center/saas.vue` | SAAS 费控单据填写 | 易快报 SAAS `/web/debugger.html` | 双向 postMessage (发送单据模板 ↔ 接收 specificationMap) |

### 4.6 平台管理 (菜单级 iframe)

| 序号 | 文件路径                                                    | 场景                     | iframe 目标                   | 通信方式                                 |
| ---- | ----------------------------------------------------------- | ------------------------ | ----------------------------- | ---------------------------------------- |
| 9    | `src/views/Sys/account-management/accountList/platform.vue` | 通用平台 iframe 页面     | Vuex `app.iframeSrc` 动态 URL | 无通信，全屏 iframe 展示                 |
| 10   | `src/views/NavBar/SidebarItem.vue`                          | 菜单导航 iframe 路由分发 | N/A (路由中转)                | 解析 `iframeSrc=` 前缀，写入 Vuex 并跳转 |

### 4.7 通用基础组件

| 序号 | 文件路径                              | 场景                 | iframe 目标                                       | 通信方式          |
| ---- | ------------------------------------- | -------------------- | ------------------------------------------------- | ----------------- |
| 11   | `src/components/base/BasicIFrame.vue` | 通用 iframe 弹窗组件 | 通过 EventBus `show-basic-iframe-dialog` 动态设置 | EventBus 事件驱动 |

---

## 五、环境与 URL 配置

### 5.1 代客下单 URL (mos-wmpc)

| 环境     | URL 模式                                                     |
| -------- | ------------------------------------------------------------ |
| 本地开发 | `http://localhost:8001/mos-wmpc/{page}?access_token=xxx&...` |
| 生产环境 | `{window.origin}/mos-wmpc/{page}?access_token=xxx&...`       |

### 5.2 代理组下单 URL (易快报商城)

| 环境     | URL                                                                 |
| -------- | ------------------------------------------------------------------- |
| 本地开发 | `https://mall-dev.ekuaibao.com/{/whotel\|/wflight}?accessToken=xxx` |
| 预发环境 | `businessOrgin.prepare` + 路径                                      |
| 生产环境 | `businessOrgin.production` + 路径                                   |

### 5.3 SAAS 成本中心 URL

| 环境     | URL                                                                                   |
| -------- | ------------------------------------------------------------------------------------- |
| 动态获取 | 通过 `apiGetLinkUrl(companyId, userId)` 接口返回                                      |
| URL 格式 | `{data.url}/web/debugger.html?accessToken=xxx&corpId=xxx&ekbCorpId=xxx#/new-homepage` |

### 5.4 菜单级 iframe (platform.vue)

| 环境       | 说明                                                                |
| ---------- | ------------------------------------------------------------------- |
| 通用       | URL 存储在后端菜单配置中，格式为 `{routePath}iframeSrc={targetUrl}` |
| Token 拼接 | `{iframeSrc}?access_token={session.token}`                          |
| 缓存       | localStorage `HOSE_MOS_IFARME_CACHE` 防刷新丢失                     |

---

## 六、统一传参规范

所有 iframe 嵌入均通过 URL query 参数传递认证信息：

| 参数名                         | 说明           | 使用场景         |
| ------------------------------ | -------------- | ---------------- |
| `access_token` / `accessToken` | 用户认证令牌   | 所有 iframe 场景 |
| `customerId`                   | 企业 ID        | 代客下单         |
| `createId`                     | 预订人用户 ID  | 代客下单         |
| `contactMobile`                | 联系电话       | 代客下单         |
| `mosName`                      | MOS 操作人姓名 | 代理组下单       |
| `corpId` / `ekbCorpId`         | 易快报企业 ID  | SAAS 成本中心    |

---

## 七、注意事项

1. **Origin 校验不严格** — 多数 postMessage 使用 `"*"` 作为 targetOrigin，存在安全隐患
2. **动态方法调用风险** — `this[dataObj.action](dataObj.data)` 模式允许 iframe 调用父组件任意方法
3. **Token 暴露在 URL** — access_token 通过 URL 传递，可能出现在浏览器历史和服务器日志中
4. **生命周期管理** — 各组件在 `beforeDestroy` 中移除 message 监听器，但部分组件（如 saas.vue）未做清理
5. **iframe 模块低使用率** — Vuex `iframe` store module 已定义但业务组件中基本未使用，实际状态管理分散在各组件 data 中
