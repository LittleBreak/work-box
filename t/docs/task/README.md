# 方案二：@vue/compat 长期兼容（新旧共存）执行计划

> 基于 `docs/tech.md` 方案二制定的详细执行计划
>
> 创建日期：2026-03-03

---

## 概述

采用 **方案二：@vue/compat 长期兼容（新旧共存）** 路线，将项目从 Vue 2.7 + Webpack 3 升级到 @vue/compat + Webpack 5 环境，实现新页面使用 Vue 3 + 新 UI 库、老页面保持原样不动的共存模式。

## 执行阶段

| Phase   | 文档                                                       | 内容                                                | 预估人天 |
| ------- | ---------------------------------------------------------- | --------------------------------------------------- | -------- |
| Phase A | [phase-a-webpack5-babel7.md](./phase-a-webpack5-babel7.md) | Webpack 3 → 5 + Babel 6 → 7                         | 5-8 天   |
| Phase B | [phase-b-router-vuex.md](./phase-b-router-vuex.md)         | Vue Router 3 → 4 + Vuex 3 → 4                       | 3-5 天   |
| Phase C | [phase-c-vue-compat.md](./phase-c-vue-compat.md)           | 切换 @vue/compat + 双 UI 库共存                     | 3-4 天   |
| Phase D | [phase-d-ecosystem.md](./phase-d-ecosystem.md)             | 生态库升级（vue-i18n、Axios、第三方插件、监控 SDK） | 2-3 天   |
| 规范    | [dev-guidelines.md](./dev-guidelines.md)                   | 新页面开发规范与新老共存规则                        | -        |

**总计：13-20 人天（约方案一的 1/4）**

## 执行顺序与依赖关系

```
Phase A (Webpack 5 + Babel 7)
    │
    ▼
Phase B (Router 4 + Vuex 4)
    │
    ▼
Phase C (@vue/compat + 双 UI 库)  ←  Phase D (生态库升级，可与 C 并行)
    │
    ▼
  稳态运行（新旧共存）
```

- Phase A 是所有后续步骤的前提
- Phase B 依赖 Phase A 完成
- Phase C 和 Phase D 可并行推进，但建议 Phase C 先完成核心配置
- 每个 Phase 完成后项目必须能正常运行，可独立验证和回滚

## 后续渐进迁移路径

方案二完成后项目处于"新旧共存"稳态，后续可按需向方案一终态靠拢：

1. **按模块迁移老页面** — 业务迭代涉及老页面较大改动时，顺便迁移到 Vue 3 写法
2. **逐个消除 compat** — 在单个组件上设置 `compatConfig: { MODE: 3 }` 逐个切换
3. **替换 Element UI** — 某模块所有页面迁移完毕后，移除该模块对 Element UI 的依赖
4. **最终移除 @vue/compat** — 所有页面迁移完成后，切换到纯 Vue 3
