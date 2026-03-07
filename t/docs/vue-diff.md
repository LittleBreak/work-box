## Vue 2 vs Vue 3 语法差异对照表

### 一、核心语法差异

| 类别                 | Vue 2                                                 | Vue 3                                               | 说明                                  |
| -------------------- | ----------------------------------------------------- | --------------------------------------------------- | ------------------------------------- |
| **组件定义**         | `export default { data, methods, ... }` (Options API) | Options API 保留 + 新增 Composition API (`setup()`) | Vue 3 两种都支持                      |
| **响应式声明**       | `data() { return { x: 1 } }`                          | `const x = ref(1)` / `const obj = reactive({})`     | Composition API 使用 `ref`/`reactive` |
| **计算属性**         | `computed: { foo() {} }`                              | `const foo = computed(() => {})`                    | 从选项变为函数调用                    |
| **侦听器**           | `watch: { foo(val) {} }`                              | `watch(foo, (val) => {})` / `watchEffect(() => {})` | 新增 `watchEffect` 自动收集依赖       |
| **生命周期**         | `beforeCreate` / `created`                            | `setup()` 本身替代                                  | setup 在 beforeCreate 之前执行        |
|                      | `beforeMount` / `mounted`                             | `onBeforeMount` / `onMounted`                       | 加 `on` 前缀                          |
|                      | `beforeUpdate` / `updated`                            | `onBeforeUpdate` / `onUpdated`                      |                                       |
|                      | `beforeDestroy` / `destroyed`                         | `onBeforeUnmount` / `onUnmounted`                   | **重命名** destroy → unmount          |
| **`<script setup>`** | 不支持                                                | `<script setup>` 语法糖                             | 无需 return，顶层变量自动暴露给模板   |

### 二、模板语法差异

| 类别                            | Vue 2                                  | Vue 3                                                       | 说明                        |
| ------------------------------- | -------------------------------------- | ----------------------------------------------------------- | --------------------------- |
| **根节点**                      | 模板必须单根节点                       | 支持多根节点 (Fragment)                                     | 不再需要外层 `<div>` 包裹   |
| **`v-model`**                   | 单个 `v-model`，对应 `value` + `input` | 多个 `v-model:xxx`，对应 `modelValue` + `update:modelValue` | 自定义组件 v-model 机制变化 |
| **`.sync` 修饰符**              | `v-bind:title.sync="val"`              | **移除**，用 `v-model:title="val"` 替代                     |                             |
| **`v-if` / `v-for` 优先级**     | `v-for` 优先于 `v-if`                  | `v-if` 优先于 `v-for`                                       | **破坏性变更**              |
| **`v-bind` 合并**               | 独立属性总是覆盖 `v-bind`              | 按声明顺序合并                                              |                             |
| **`key` in `v-if`**             | 需要手动加 key 区分分支                | 自动生成唯一 key                                            |                             |
| **`key` in `<template v-for>`** | key 放在子元素上                       | key 放在 `<template>` 上                                    |                             |
| **事件修饰符**                  | `.native` 监听原生事件                 | **移除** `.native`，未声明 emits 的事件默认透传             |                             |
| **`$listeners`**                | 单独存在                               | **移除**，合并到 `$attrs`                                   |                             |
| **过滤器**                      | `{{ msg \| capitalize }}`              | **移除** filters                                            | 用 computed 或方法替代      |

### 三、组件系统差异

| 类别                         | Vue 2                                 | Vue 3                                                 | 说明                             |
| ---------------------------- | ------------------------------------- | ----------------------------------------------------- | -------------------------------- |
| **Props 声明**               | `props: { ... }`                      | Options API 相同 / `defineProps()` (`<script setup>`) |                                  |
| **Emits 声明**               | 无需声明                              | `emits: [...]` / `defineEmits()`                      | Vue 3 推荐显式声明               |
| **`$emit`**                  | `this.$emit('event')`                 | `setup` 中用 `emit('event')` (context 参数)           |                                  |
| **`$slots`**                 | `this.$slots.default` (VNode 数组)    | `this.$slots.default()` (函数)                        | 统一为函数式                     |
| **`$scopedSlots`**           | 独立存在                              | **移除**，合并到 `$slots`                             |                                  |
| **函数式组件**               | `functional: true` + `render(h, ctx)` | 普通函数即可 `(props) => h(...)`                      | 简化                             |
| **异步组件**                 | `() => import('...')`                 | `defineAsyncComponent(() => import('...'))`           | 需包裹                           |
| **`$children`**              | `this.$children`                      | **移除**                                              | 用 `ref` / `provide/inject` 替代 |
| **`$on` / `$off` / `$once`** | `this.$on('event', handler)`          | **移除** (EventBus 不再可行)                          | 用 mitt/tiny-emitter 替代        |
| **Provide/Inject**           | 非响应式                              | 可配合 `ref`/`reactive` 实现响应式                    |                                  |

### 四、全局 API 差异

| 类别                             | Vue 2                                 | Vue 3                                    | 说明             |
| -------------------------------- | ------------------------------------- | ---------------------------------------- | ---------------- |
| **应用创建**                     | `new Vue({ ... }).$mount('#app')`     | `createApp(App).mount('#app')`           |                  |
| **全局注册组件**                 | `Vue.component('name', comp)`         | `app.component('name', comp)`            | 实例方法而非全局 |
| **全局指令**                     | `Vue.directive('name', def)`          | `app.directive('name', def)`             |                  |
| **全局 Mixin**                   | `Vue.mixin({})`                       | `app.mixin({})`                          |                  |
| **全局属性**                     | `Vue.prototype.$foo = bar`            | `app.config.globalProperties.$foo = bar` |                  |
| **插件安装**                     | `Vue.use(plugin)`                     | `app.use(plugin)`                        |                  |
| **`Vue.set` / `Vue.delete`**     | 需要动态添加响应式属性                | **移除**，Proxy 原生支持                 |                  |
| **`this.$set` / `this.$delete`** | 同上                                  | **移除**                                 |                  |
| **`Vue.nextTick`**               | `Vue.nextTick()` / `this.$nextTick()` | `import { nextTick } from 'vue'`         |                  |
| **`Vue.observable`**             | `Vue.observable(obj)`                 | `reactive(obj)`                          |                  |

### 五、渲染函数差异

| 类别                 | Vue 2                               | Vue 3                                                   | 说明                 |
| -------------------- | ----------------------------------- | ------------------------------------------------------- | -------------------- |
| **render 参数**      | `render(h) { return h('div') }`     | `import { h } from 'vue'; render() { return h('div') }` | `h` 不再作为参数传入 |
| **VNode 结构**       | `{ attrs, on, domProps, ... }` 分层 | 扁平化 `{ class, style, onClick, ... }`                 |                      |
| **插槽在 render 中** | `this.$scopedSlots.default({})`     | `this.$slots.default({})`                               |                      |

### 六、TypeScript 支持

| 类别         | Vue 2                        | Vue 3                                                   | 说明 |
| ------------ | ---------------------------- | ------------------------------------------------------- | ---- |
| **TS 支持**  | 有限，需 vue-class-component | 原生深度支持                                            |      |
| **类型推断** | 较弱                         | `defineComponent` / `<script setup lang="ts">` 自动推断 |      |

### 七、其他重要变更

| 类别                 | Vue 2                                          | Vue 3                                                                      | 说明               |
| -------------------- | ---------------------------------------------- | -------------------------------------------------------------------------- | ------------------ |
| **响应式原理**       | `Object.defineProperty`                        | `Proxy`                                                                    | 不再需要 `$set`    |
| **Teleport**         | 不支持 (需 portal-vue)                         | 内置 `<Teleport>`                                                          |                    |
| **Suspense**         | 不支持                                         | 内置 `<Suspense>` (实验性)                                                 |                    |
| **自定义指令钩子**   | `bind/inserted/update/componentUpdated/unbind` | `created/beforeMount/mounted/beforeUpdate/updated/beforeUnmount/unmounted` | 与组件生命周期对齐 |
| **Transition class** | `v-enter` / `v-leave`                          | `v-enter-from` / `v-leave-from`                                            | 命名更清晰         |
| **data 选项**        | 可以是对象或函数                               | **必须**是函数                                                             |                    |
| **`$refs` 访问**     | `this.$refs.xxx`                               | `const xxx = ref(null)` (Composition API)                                  |                    |

---

## 针对你这个项目升级需要注意的事项

结合你们项目 (Vue 2.7 + Webpack 3 + Element UI 2) 的实际情况：

### 1. 构建工具必须升级

- **Webpack 3 → Webpack 5 或 Vite**：Vue 3 不支持 Webpack 3。推荐迁移到 Vite，构建速度大幅提升
- **Babel 6 → Babel 7+**：Vue 3 相关 Babel 插件都要求 7+
- **Node 16 → Node 18+**

### 2. UI 库迁移（最大工作量）

- **Element UI 2 → Element Plus**：API 有大量变化，几乎所有组件引用都需要修改
- `el-` 前缀保留，但很多 props/events/slots 命名变了
- 自定义主题 `@hose/eui-theme` 需要完全重做（Element Plus 用 CSS Variables）

### 3. EventBus 重构

- 你们项目有 `EventBus.js`，Vue 3 移除了 `$on/$off/$once`
- 需要替换为 `mitt` 或 `tiny-emitter`

### 4. 全局注册改造

- `main.js` 中大量 `Vue.prototype.$xxx` → `app.config.globalProperties.$xxx`
- `Vue.component()` → `app.component()`
- `Vue.mixin()` → `app.mixin()` 或改用 Composables

### 5. Vuex 迁移

- 你们有 35+ Vuex 模块，可以：
  - 继续用 Vuex 4 (兼容 Vue 3，改动最小)
  - 或逐步迁移到 Pinia (Vue 3 推荐)

### 6. 过滤器全部替换

- 你们有 15+ filters，全部需要改为 computed 或方法调用
- `{{ value | filterName }}` → `{{ filterName(value) }}`

### 7. Mixins 改造

- 20+ Mixins（`mixin-table`, `mixin-global` 等）建议逐步改为 Composables
- Mixins 在 Vue 3 中仍可用但不推荐

### 8. 推荐的升级路径

```
阶段1: Vue 2.7 → Vue 2.7 + Composition API (当前已在2.7，可先用 setup)
阶段2: Webpack 3 → Vite (或 Webpack 5)
阶段3: Vue 2.7 → Vue 3 (使用 @vue/compat 兼容模式过渡)
阶段4: Element UI → Element Plus
阶段5: Vuex → Pinia (可选)
阶段6: 移除 @vue/compat，完成纯 Vue 3
```

> **评估**：以你们项目 30+ 业务模块的体量，完整升级是一个大工程。建议使用 `@vue/compat` 兼容包渐进迁移，而不是一步到位重写。
