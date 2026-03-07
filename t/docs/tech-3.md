# wondermall-mos 技术架构升级方案（v3）

> 编写日期：2026-03-06
>
> 基于 tech-v2.md 方案优化，明确方案二为落地路径，方案一为终态目标，补充量化收益分析与按模块细化的全量迁移计划。

---

## 目录

1. [升级背景与目标](#1-升级背景与目标)
2. [升级收益分析（量化）](#2-升级收益分析量化)
3. [当前进度](#3-当前进度)
4. [方案概览：方案二落地 → 方案一终态](#4-方案概览方案二落地--方案一终态)
5. [阶段一：方案二落地（新旧共存）](#5-阶段一方案二落地新旧共存)
6. [阶段二：存量页面全量迁移（方案一终态）](#6-阶段二存量页面全量迁移方案一终态)
7. [成本与投入产出比](#7-成本与投入产出比)
8. [风险与应对策略](#8-风险与应对策略)

---

## 1. 升级背景与目标

### 1.1 升级原因

- **对齐公司技术标准**：公司前端技术栈已统一为 Vue 3 + 公司标准 UI 组件库，本项目仍基于 Vue 2.7 + Element UI 2，存在技术代差
- **Vue 2 已停止维护**：Vue 2 于 2023-12-31 EOL，不再接收安全补丁和 Bug 修复
- **依赖链安全风险**：Axios 0.18 存在已知安全漏洞（CVE），Webpack 3 不再维护
- **开发体验落后**：无法使用 Composition API、`<script setup>`、Vue 3 生态组件库等现代特性

### 1.2 升级目标

| 目标             | 说明                                                 |
| ---------------- | ---------------------------------------------------- |
| 对齐公司技术架构 | Vue 2 → Vue 3，Element UI → 公司标准 UI 库           |
| 升级构建工具链   | Webpack 3 → 5（已完成），后续可迁移 Vite             |
| 提升开发效率     | Composition API + `<script setup>` + TypeScript 支持 |
| 消除安全风险     | 升级 EOL 依赖，消除已知漏洞                          |

---

## 2. 升级收益分析（量化）

### 2.1 构建性能提升

| 指标             | 升级前 (Webpack 3) | 当前 (Webpack 5) | 终态 (Vite) | 提升幅度                           |
| ---------------- | ------------------ | ---------------- | ----------- | ---------------------------------- |
| 开发冷启动       | ~45-60s            | ~25-35s          | ~2-5s       | **已提升 40%**，Vite 可达 **90%+** |
| HMR 热更新       | ~3-5s              | ~1-2s            | <500ms      | **已提升 60%**，Vite 可达 **90%+** |
| 生产构建（首次） | ~120-150s          | ~70-90s          | ~40-60s     | **已提升 40%**，Vite 可再提升 30%  |
| 生产构建（缓存） | 无持久化缓存       | ~30-50s          | ~30-50s     | **Webpack 5 持久化缓存提升 60%**   |

> Webpack 3→5 已在 Phase 1 完成。Vite 迁移规划在方案一终态之后，预计可进一步将开发冷启动压缩到秒级。

### 2.2 包体积优化

| 组成部分             | 当前体积 (gzipped) | 终态体积 (gzipped)         | 节省              |
| -------------------- | ------------------ | -------------------------- | ----------------- |
| Vue 运行时           | ~33KB (Vue 2)      | ~14KB (Vue 3 tree-shaking) | **-19KB (-58%)**  |
| @vue/compat 兼容层   | 方案二阶段 +20KB   | 终态移除 0KB               | **-20KB**         |
| Element UI (CSS+JS)  | ~220KB             | 终态移除 0KB               | **-220KB**        |
| 新 UI 库（按需引入） | 0KB                | ~80-120KB                  | +100KB            |
| **运行时总计**       | **~253KB**         | **~134KB**                 | **-119KB (-47%)** |

> 方案二阶段因双 UI 库并存，包体积会临时增大约 100KB；方案一终态移除 Element UI + compat 后可实现整体 **47% 的体积优化**。

### 2.3 首屏加载性能

| 指标                   | 当前           | 方案一终态     | 改善       |
| ---------------------- | -------------- | -------------- | ---------- |
| 首屏 JS 体积           | ~800KB gzipped | ~500KB gzipped | **-37%**   |
| 首屏加载时间 (3G)      | ~4-5s          | ~2.5-3.5s      | **-30%**   |
| Lighthouse Performance | 预估 50-60     | 预估 70-80     | **+20 分** |

> 基于 Vue 3 tree-shaking + 移除双 UI 库 + 路由懒加载优化的综合预估。

### 2.4 开发效率提升

| 维度         | 当前 (Vue 2)                | 升级后 (Vue 3)                    | 改善                       |
| ------------ | --------------------------- | --------------------------------- | -------------------------- |
| 逻辑复用     | Mixin（隐式依赖、命名冲突） | Composables（显式导入、类型安全） | 调试时间减少，复用更清晰   |
| 组件样板代码 | Options API ~40 行基础代码  | `<script setup>` ~15 行           | **减少 ~60% 样板代码**     |
| IDE 智能提示 | Vue 2 类型支持有限          | Vue 3 原生 TypeScript 支持        | 自动补全、类型检查完整     |
| 状态管理     | Vuex（样板代码多）          | Pinia（更简洁，TS 原生）          | 后续可进一步优化           |
| 生态组件库   | Element UI 2（停止维护）    | Vue 3 生态（活跃维护）            | 更多组件可选，Bug 响应更快 |

### 2.5 安全与合规

| 风险项       | 当前状态                        | 升级后                       |
| ------------ | ------------------------------- | ---------------------------- |
| Vue 2 EOL    | 2023-12-31 停止维护，无安全补丁 | Vue 3 活跃维护               |
| Axios 0.18   | 存在已知 CVE 漏洞               | 升级到 1.x，漏洞修复         |
| Webpack 3    | 不再维护                        | Webpack 5 长期支持（已完成） |
| 公司技术合规 | 不符合公司 Vue 3 标准           | 完全对齐                     |

### 2.6 收益总结

| 收益类别     | 量化指标                                                      | 影响面             |
| ------------ | ------------------------------------------------------------- | ------------------ |
| **构建性能** | 开发冷启动 -40%（已实现），HMR -60%（已实现），Vite 可达 -90% | 全团队每日开发体验 |
| **包体积**   | 运行时 -47%（终态），首屏 -37%                                | 全量用户每次访问   |
| **开发效率** | 样板代码 -60%，逻辑复用从 mixin 升级到 composables            | 全团队每个新页面   |
| **安全合规** | 消除 Vue 2 EOL 风险 + Axios CVE + 对齐公司标准                | 项目长期可维护性   |

---

## 3. 当前进度

### 3.1 已完成

| 阶段    | 内容                        | 状态       |
| ------- | --------------------------- | ---------- |
| Phase 1 | Webpack 3 → 5 + Babel 6 → 7 | **已完成** |

当前 package.json 关键依赖版本：

| 依赖               | 版本     | 状态                   |
| ------------------ | -------- | ---------------------- |
| webpack            | ^5.90.0  | 已升级                 |
| @babel/core        | ^7.24.0  | 已升级                 |
| webpack-dev-server | ^4.15.0  | 已升级                 |
| vue-loader         | ^15.11.1 | 已升级（Vue 2 最终版） |
| vue                | 2.7.12   | 待升级                 |
| vue-router         | ^3.0.1   | 待升级                 |
| vuex               | ^3.1.2   | 待升级                 |
| element-ui         | ^2.13.0  | 待替换                 |
| axios              | ^0.18.0  | 待升级                 |
| vue-i18n           | ^8.14.1  | 待升级                 |

### 3.2 待完成

| 阶段           | 内容                       | 预估工期       |
| -------------- | -------------------------- | -------------- |
| Phase 2        | Vue Router 3→4 + Vuex 3→4  | 3-5 人天       |
| Phase C        | @vue/compat + 双 UI 库配置 | 3-4 人天       |
| 适配           | vue-i18n 9 + 监控 SDK      | 2-3 人天       |
| **方案二完成** | **新旧共存稳态**           | **8-12 人天**  |
| 存量迁移       | 全量页面 Vue 3 + 新 UI 库  | 54-78 人天     |
| **方案一终态** | **纯 Vue 3，移除 compat**  | **62-90 人天** |

---

## 4. 方案概览：方案二落地 → 方案一终态

### 4.1 整体路径

```
Phase 1: Webpack 5 + Babel 7 ..................... [已完成]
    ↓
Phase 2: Vue Router 4 + Vuex 4 .................. [待执行, 3-5 天]
    ↓
Phase C: @vue/compat + 双 UI 库共存 .............. [待执行, 3-4 天]
    ↓
[方案二稳态] 新页面 Vue 3 + 新 UI，老页面不动
    ↓
Wave 1~5: 按模块分波次迁移存量页面 .............. [按需推进, 54-78 天]
    ↓
[方案一终态] 纯 Vue 3 + 新 UI，移除 compat + Element UI
```

### 4.2 方案二不是终点

方案二是**快速获得 Vue 3 开发能力的落地路径**，但不是最终状态。长期保留 @vue/compat 和双 UI 库存在以下成本：

| 长期成本   | 说明                                     |
| ---------- | ---------------------------------------- |
| 包体积膨胀 | compat 层 +20KB + 双 UI 库 CSS/JS +220KB |
| 运行时开销 | compat 模拟层有性能损耗                  |
| 维护成本   | 团队需同时掌握 Vue 2 + Vue 3 两套写法    |
| 停维风险   | @vue/compat 可能随 Vue 版本迭代停止维护  |

**因此，方案二完成后应立即启动存量页面的分波次迁移，目标是在 2026 年内达到方案一终态。**

---

## 5. 阶段一：方案二落地（新旧共存）

> Phase 2、Phase C 的详细执行步骤见 tech-v2.md 第 6 节，此处仅列要点。

### 5.1 Phase 2: Vue Router 3→4 + Vuex 3→4（3-5 人天）

| 改造项          | 工作内容                                                 |
| --------------- | -------------------------------------------------------- |
| Router 创建方式 | `new Router()` → `createRouter()` + `createWebHistory()` |
| 路由守卫        | `next()` 回调 → 返回值控制                               |
| 通配符路由      | `path: "*"` → `path: "/:pathMatch(.*)*"`                 |
| 动态路由        | `addRoutes()` → 循环 `addRoute()`                        |
| Vuex 创建方式   | `new Vuex.Store()` → `createStore()`                     |
| 注册方式        | `Vue.use(Vuex)` → `app.use(store)`                       |

### 5.2 Phase C: @vue/compat + 双 UI 库（3-4 人天）

| 改造项           | 工作内容                                                     |
| ---------------- | ------------------------------------------------------------ |
| 安装 @vue/compat | `vue@3` + `@vue/compat` + `vue-loader@17`                    |
| Webpack 别名     | `vue` → `@vue/compat`                                        |
| 入口改造         | `new Vue()` → `createApp()` + `configureCompat({ MODE: 2 })` |
| 全局 API         | `Vue.prototype` → `app.config.globalProperties`              |
| vue-i18n         | 升级到 9.x，`legacy: true` 保持 `$t()` 兼容                  |
| 双 UI 库         | Element UI（老页面）+ 新 UI 库（新页面）并存                 |

### 5.3 方案二验收标准

- 所有老页面功能正常（compat 模式兼容）
- 新页面可使用 Composition API + `<script setup>` + 新 UI 库
- `npm run build` 正常产出，可部署上线

### 5.4 方案二预计完成时间

**2026 年 4 月中旬**（从当前状态起 2-3 周）

---

## 6. 阶段二：存量页面全量迁移（方案一终态）

### 6.1 项目现状总览

#### 代码规模

| 统计项                       | 数量    |
| ---------------------------- | ------- |
| Vue 文件总数                 | 995 个  |
| 页面组件 (src/views/)        | 751 个  |
| 可复用组件 (src/components/) | 244 个  |
| 路由总数（含子路由）         | ~357 条 |
| Vuex Store 模块              | 129 个  |
| API 模块                     | 77 个   |
| Mixin 文件                   | 23 个   |
| Filter 文件                  | 15 个   |

#### Vue 2 废弃特性使用量

| 特性                         | 涉及文件数 | 可批量替换     | 迁移难度 |
| ---------------------------- | ---------- | -------------- | -------- |
| `slot-scope` 旧语法          | 419 个     | 是（正则）     | 低       |
| `.sync` 修饰符               | 348 个     | 是（正则）     | 低       |
| `this.$message` (Element UI) | 479 个     | 部分           | 中       |
| EventBus 事件总线            | 173 个     | 部分           | 高       |
| `beforeDestroy` 生命周期     | 141 个     | 是（全局替换） | 低       |
| `filters` 过滤器             | 78 个      | 否             | 中       |
| `this.$set`                  | 70 个      | 是（全局替换） | 低       |

### 6.2 业务模块全量清单

以下按 `src/views/Sys/` 下的业务目录整理，包含 Vue 文件数、路由数、近 9 个月提交数（2025-06 至今）、迁移改造点数量。

| 业务模块     | 目录名                  | Vue 文件 | 路由数 | 近9月提交 | 迁移改造点 | 活跃度 |
| ------------ | ----------------------- | -------- | ------ | --------- | ---------- | ------ |
| 发票管理(新) | Invoices2               | 12       | 8      | 136       | 22         | 极高   |
| 客户管理     | ClientMng               | 118      | 9      | 102       | 175        | 高     |
| 酒店订单     | Hotel                   | 19       | 8      | 71        | 61         | 高     |
| 火车票       | train-ticket            | 17       | 8      | 47        | 34         | 高     |
| 机票订单     | Air                     | 22       | 10     | 44        | 42         | 高     |
| 供应链管理   | supply-chain-management | 74       | 37     | 42        | 189        | 高     |
| 基础数据     | BasicData               | 93       | 24     | 40        | 226        | 中高   |
| 财务结算     | Finance                 | 23       | 14     | 22        | 42         | 中     |
| 通用订单     | CommonOrder             | 34       | 4      | 20        | 44         | 中     |
| 客服工单     | Customer                | 28       | 9      | 6         | 25         | 低     |
| 发票管理(旧) | invoice                 | 41       | 6      | 5         | 60         | 低     |
| 用车2.0      | HCar                    | 59       | 16     | 5         | 81         | 低     |
| 积分管理     | point-management        | 3        | 4      | 4         | 3          | 低     |
| 账户管理     | account-management      | 26       | 8      | 4         | 51         | 低     |
| 短信平台     | SmsManagement           | 8        | 6      | 3         | 15         | 低     |
| 保险         | Insurance               | 23       | 6      | 2         | 30         | 稳定   |
| 营销管理     | MarketingManagement     | 17       | 8      | 2         | 30         | 稳定   |
| 餐饮         | Food                    | 4        | 3      | 2         | 7          | 稳定   |
| 用车1.0      | Car                     | 28       | 5      | 1         | 40         | 稳定   |
| 企业购       | shopping                | 7        | 3      | 1         | 6          | 稳定   |
| 下载管理     | downloadManagement      | 3        | 4      | 1         | 4          | 稳定   |
| 商城资源     | MallResource            | 6        | 4      | 1         | 16         | 稳定   |
| 企业管理     | Compay                  | 11       | —      | 0         | 28         | 稳定   |
| 红包管理     | RedPacketManagement     | 10       | 7      | 0         | 15         | 稳定   |
| 供应商管理   | supplierManage          | 8        | 4      | 0         | 10         | 稳定   |
| 运营活动     | operating-activities    | 8        | 3      | 0         | 8          | 稳定   |
| 系统管理     | admin                   | 8        | 6      | 0         | 16         | 稳定   |
| 消息管理     | Message                 | 8        | 4      | 0         | 12         | 稳定   |
| 权限管理     | MallAuthority           | 5        | 3      | 0         | 12         | 稳定   |
| 渠道控制     | channel-control         | 3        | 1      | 0         | 10         | 稳定   |
| 首页/系统    | Index/System/Banner 等  | 8        | 3      | 0         | —          | 稳定   |

> **迁移改造点** = 该模块中 `.sync` + `slot-scope` + `$message` + `EventBus` + `beforeDestroy` + `filters` 的文件级总次数，反映迁移工作量。

### 6.3 迁移优先级策略

**原则**：稳定模块先迁移，高频迭代模块后迁移，最大化减少并行冲突。

```
优先级排序逻辑：

活跃度低 + 文件少 → 优先迁移（快速收割，积累经验，零冲突风险）
活跃度低 + 文件多 → 次优先迁移（无冲突风险，但需要更多时间）
活跃度中 → 选择业务间歇期迁移（协调排期）
活跃度高 + 文件多 → 最后迁移（结合业务迭代逐步消化）
公共组件层      → 与 Wave 4 并行，被依赖模块迁移完才可安全改造
```

### 6.4 分波次迁移计划

#### Wave 1：稳定小模块（快速收割）

**目标**：低风险快速推进，积累迁移经验，建立工作流。

| 模块                                              | Vue 文件      | 改造点 | 预估人天   |
| ------------------------------------------------- | ------------- | ------ | ---------- |
| Index / System / Banner                           | 6             | —      | 0.5        |
| opLog / JD / food-user-sync / Value-addedServices | 4             | —      | 0.5        |
| channel-control                                   | 3             | 10     | 0.5        |
| downloadManagement                                | 3             | 4      | 0.5        |
| point-management                                  | 3             | 3      | 0.5        |
| Food                                              | 4             | 7      | 0.5        |
| MallAuthority                                     | 5             | 12     | 1          |
| MallResource                                      | 6             | 16     | 1          |
| shopping                                          | 7             | 6      | 1          |
| **Wave 1 合计**                                   | **41 个文件** |        | **6 人天** |

**计划时间**：2026-04（方案二完成后立即启动）
**人员**：1 人
**风险**：极低（近 9 个月 0-1 次提交，无并行冲突）

---

#### Wave 2：稳定中型模块

**目标**：扩大迁移覆盖面，处理中等复杂度模块。

| 模块                 | Vue 文件       | 改造点 | 预估人天    |
| -------------------- | -------------- | ------ | ----------- |
| Message              | 8              | 12     | 1           |
| admin                | 8              | 16     | 1           |
| operating-activities | 8              | 8      | 1           |
| SmsManagement        | 8              | 15     | 1           |
| supplierManage       | 8              | 10     | 1           |
| RedPacketManagement  | 10             | 15     | 1.5         |
| Compay               | 11             | 28     | 2           |
| MarketingManagement  | 17             | 30     | 2.5         |
| Insurance            | 23             | 30     | 3           |
| Car                  | 28             | 40     | 3           |
| **Wave 2 合计**      | **129 个文件** |        | **17 人天** |

**计划时间**：2026-05 ~ 2026-06
**人员**：1-2 人
**风险**：低（近 9 个月 0-3 次提交）

---

#### Wave 3：中频中型模块

**目标**：处理有一定业务迭代的模块，需与业务团队协调排期。

| 模块               | Vue 文件       | 改造点 | 近9月提交 | 预估人天    |
| ------------------ | -------------- | ------ | --------- | ----------- |
| Customer           | 28             | 25     | 6         | 3           |
| account-management | 26             | 51     | 4         | 4           |
| invoice (旧)       | 41             | 60     | 5         | 5           |
| HCar               | 59             | 81     | 5         | 7           |
| CommonOrder        | 34             | 44     | 20        | 4           |
| Finance            | 23             | 42     | 22        | 4           |
| **Wave 3 合计**    | **211 个文件** |        |           | **27 人天** |

**计划时间**：2026-06 ~ 2026-07
**人员**：2 人
**风险**：中（CommonOrder 和 Finance 有中等迭代频率，需选择业务间歇期操作）
**策略**：迁移分支每日从 master 同步，单模块迁移完立即合入，减少冲突窗口

---

#### Wave 4：高频大型模块

**目标**：攻克最复杂、最活跃的核心业务模块，需与业务版本紧密配合。

| 模块                             | Vue 文件       | 改造点 | 近9月提交 | 预估人天    |
| -------------------------------- | -------------- | ------ | --------- | ----------- |
| Invoices2 (新发票)               | 12             | 22     | 136       | 2           |
| Air (机票)                       | 22             | 42     | 44        | 4           |
| train-ticket (火车票)            | 17             | 34     | 47        | 3           |
| Hotel (酒店)                     | 19             | 61     | 71        | 4           |
| BasicData (基础数据)             | 93             | 226    | 40        | 10          |
| supply-chain-management (供应链) | 74             | 189    | 42        | 8           |
| ClientMng (客户管理)             | 118            | 175    | 102       | 10          |
| **Wave 4 合计**                  | **355 个文件** |        |           | **41 人天** |

**计划时间**：2026-07 ~ 2026-09
**人员**：2-3 人
**风险**：高（高频迭代模块，冲突概率大）
**策略**：

1. 与业务团队约定"冻结窗口"——每次迁移一个模块，该模块冻结 2-3 天
2. 机械性改动（`.sync`、`slot-scope`、`beforeDestroy`）写成脚本可重跑，不怕业务代码合入后回退
3. 按子模块拆分 PR，每个 PR 控制在 20 个文件以内，当天审核当天合入
4. 新增业务代码统一使用 Vue 3 写法，减少增量债务

---

#### Wave 5：公共组件层

**目标**：迁移全局共享的组件、Mixin、Filter，与 Wave 3-4 并行推进。

| 类型                                        | 文件数         | 工作内容                                             | 预估人天    |
| ------------------------------------------- | -------------- | ---------------------------------------------------- | ----------- |
| base 组件 (BasicCitySelect, BasicUpload 等) | ~30            | Element UI → 新 UI 库内部替换                        | 5           |
| 业务组件 (components/)                      | ~214           | 逐步迁移，被依赖时触发                               | 5           |
| Mixin → Composables                         | 23             | 重构为 composables（mixin-table, mixin-global 优先） | 3           |
| Filters → 工具函数                          | 15             | 模板管道 → 方法调用                                  | 1           |
| **Wave 5 合计**                             | **282 个文件** |                                                      | **14 人天** |

**计划时间**：2026-06 ~ 2026-08（与 Wave 3-4 并行）
**人员**：1 人
**策略**：被 Wave 3-4 迁移的模块依赖到哪个公共组件，就先迁移哪个，按需驱动

---

#### 收尾：移除 @vue/compat + Element UI

所有 Wave 完成后执行：

| 步骤            | 工作内容                                                   | 预估人天   |
| --------------- | ---------------------------------------------------------- | ---------- |
| 移除 compat     | Webpack 别名去掉 @vue/compat，main.js 移除 configureCompat | 1          |
| 移除 Element UI | `pnpm remove element-ui`，清理相关 CSS 引用和主题文件      | 1          |
| 全量回归测试    | 所有模块功能验证                                           | 3          |
| **收尾合计**    |                                                            | **5 人天** |

**计划时间**：2026-09

### 6.5 迁移时间线总览

```
2026-03 ──── Phase 1 [已完成] Webpack 5 + Babel 7
  │
2026-04 ──── Phase 2 + C [方案二落地] Router 4 + Vuex 4 + @vue/compat
  │           Wave 1 [快速收割] 41 文件, 6 天, 1 人
  │
2026-05 ──── Wave 2 [稳定中型] 129 文件, 17 天, 1-2 人
  │
2026-06 ──── Wave 2 收尾 + Wave 3 启动 + Wave 5 启动（并行）
  │
2026-07 ──── Wave 3 [中频模块] 211 文件, 27 天, 2 人
  │           Wave 4 启动 [高频模块]
  │           Wave 5 持续推进（并行）
  │
2026-08 ──── Wave 4 [高频模块] 355 文件, 41 天, 2-3 人
  │           Wave 5 收尾
  │
2026-09 ──── Wave 4 收尾 + 移除 compat + 全量回归
  │
  ▼
[方案一终态] 纯 Vue 3 + 新 UI 库
```

### 6.6 各模块每迁移一个页面的标准流程

```
1. 组件顶部声明 compatConfig: { MODE: 3 }（或使用 <script setup>）
2. 替换 Vue 2 废弃语法：
   - .sync → v-model:xxx
   - slot-scope → #default / #xxx
   - beforeDestroy → beforeUnmount
   - this.$set → 直接赋值
   - EventBus.$on → EventBus.on
   - filters → methods / computed
3. 替换 Element UI 组件为新 UI 库组件
4. 替换 this.$message → 新 UI 库消息 API
5. 验证页面功能正常
6. 提交 PR，标注迁移模块名
```

---

## 7. 成本与投入产出比

### 7.1 全量成本拆解

| 阶段                      | 工作量        | 人员       | 耗时           |
| ------------------------- | ------------- | ---------- | -------------- |
| Phase 2 (Router + Vuex)   | 3-5 人天      | 1 人       | 1 周           |
| Phase C (compat + 双 UI)  | 3-4 人天      | 1 人       | 1 周           |
| vue-i18n + 监控适配       | 2-3 人天      | 1 人       | 0.5 周         |
| **方案二小计**            | **8-12 人天** |            | **2-3 周**     |
| Wave 1 (稳定小模块)       | 6 人天        | 1 人       | 1.5 周         |
| Wave 2 (稳定中型)         | 17 人天       | 1-2 人     | 2-3 周         |
| Wave 3 (中频模块)         | 27 人天       | 2 人       | 3-4 周         |
| Wave 4 (高频模块)         | 41 人天       | 2-3 人     | 4-5 周         |
| Wave 5 (公共组件)         | 14 人天       | 1 人       | 3-4 周（并行） |
| 收尾 (移除 compat + 测试) | 5 人天        | 1-2 人     | 1 周           |
| **存量迁移小计**          | **110 人天**  |            | **~5 个月**    |
| **全量总计**              | **~120 人天** | **2-3 人** | **~6 个月**    |

### 7.2 投入产出比分析

#### 投入

| 项目           | 成本                        |
| -------------- | --------------------------- |
| 方案二落地     | 8-12 人天（1 人 × 2-3 周）  |
| 全量迁移至终态 | 110 人天（2-3 人 × 5 个月） |
| **总投入**     | **~120 人天**               |

#### 产出

| 收益项           | 量化估算                                       | 持续时间     |
| ---------------- | ---------------------------------------------- | ------------ |
| 开发冷启动节省   | 每人每天节省 ~2-3 分钟 × 5 人 = 10-15 分钟/天  | 永久         |
| HMR 热更新节省   | 每人每天节省 ~5-10 分钟 × 5 人 = 25-50 分钟/天 | 永久         |
| 样板代码减少 60% | 新页面开发提速 ~20%，按月均 10 个新页面估算    | 永久         |
| 包体积优化 47%   | 用户体验改善，加载时间减少 ~1-1.5s             | 永久         |
| 安全合规         | 消除 EOL + CVE 风险，对齐公司标准              | 合规硬性要求 |
| 人才吸引力       | 现代技术栈更易招聘和留人                       | 长期         |

#### ROI 估算

- **开发效率提升**：每天团队节省 ~35-65 分钟 → 每月约 **2-3 人天**的纯效率回收
- **按 120 人天投入，每月回收 2-3 人天**，约 **40-60 个月回本**——单算开发效率不够
- **但加上安全合规（硬性要求）+ 首屏性能（用户体验）+ 技术吸引力（团队稳定性），升级是必选项**
- **方案二优势**：仅需 8-12 人天即可获得 Vue 3 能力（快速产出），后续迁移可与业务并行推进，不存在"一次性大投入"的资金和人力压力

---

## 8. 风险与应对策略

### 8.1 方案二阶段风险

| 风险                                     | 概率 | 影响         | 应对策略                                          |
| ---------------------------------------- | ---- | ------------ | ------------------------------------------------- |
| Element UI 在 @vue/compat 下部分组件异常 | 中   | 老页面不可用 | 提前对核心组件做兼容性测试，异常组件单独 polyfill |
| 新老页面 CSS 全局污染                    | 中   | UI 错乱      | 新 UI 库使用 CSS Modules 或前缀隔离               |
| 双 UI 库导致首屏体积增大                 | 中   | 加载变慢     | 路由懒加载分割，新旧 UI 库按需加载                |
| SGM/Sentry 监控 SDK 不兼容 Vue 3         | 中   | 线上无监控   | 提前联系 SGM 团队确认，灰度验证                   |

### 8.2 存量迁移阶段风险

| 风险                            | 概率 | 影响         | 应对策略                                                                                                  |
| ------------------------------- | ---- | ------------ | --------------------------------------------------------------------------------------------------------- |
| 高频模块迁移与业务并行冲突      | 高   | 合并困难     | 冻结窗口 + 脚本可重跑 + 小 PR 快合入                                                                      |
| 第三方 Vue 2 插件无 Vue 3 替代  | 中   | 功能缺失     | 提前调研替代方案，涉及 4 个插件（vue-baidu-map、vue-quill-editor、vue-json-viewer、vue-virtual-scroller） |
| 自定义主题 CSS 在新 UI 库下失效 | 高   | UI 走样      | 专人负责样式迁移，88 个 Element UI 主题文件需重写                                                         |
| @vue/compat 在迁移中期停止维护  | 低   | 被迫加速迁移 | 控制迁移节奏在 6 个月内完成，降低窗口期风险                                                               |
| 迁移后回归测试覆盖不足          | 中   | 线上故障     | 每 Wave 完成后执行模块级回归，灰度发布验证                                                                |

### 8.3 分波次迁移的冲突管理策略

```
1. 迁移分支每日从 master 同步（rebase 或 merge），不攒到最后
2. 单模块迁移完成立即合入 master，不等整个 Wave 完成
3. 业务分支合入后，迁移分支立刻同步，保持差异最小化
4. 机械性改动（.sync、slot-scope、beforeDestroy）写成脚本可重跑
5. 迁移 PR 控制在 20 个文件以内，当天审核当天合入
6. 业务 PR 标注涉及模块，方便迁移负责人判断冲突风险
7. 迁移启动后，所有新增业务代码统一使用 Vue 3 写法
```

---

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

> 本文档将随迁移推进持续更新，每个 Wave 完成后补充实际工时、遇到的问题和解决方案。
