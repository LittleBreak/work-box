# 新页面开发规范与新老共存规则

> 适用于方案二完成后的"新旧共存"稳态阶段
>
> 所有新开发的页面必须遵循此规范

---

## 目录

1. [新页面开发规范](#1-新页面开发规范)
2. [新老页面共存规则](#2-新老页面共存规则)
3. [目录结构规范](#3-目录结构规范)
4. [新页面模板](#4-新页面模板)
5. [状态管理使用规范](#5-状态管理使用规范)
6. [HTTP 请求使用规范](#6-http-请求使用规范)
7. [路由配置规范](#7-路由配置规范)
8. [样式规范](#8-样式规范)
9. [老页面渐进迁移指南](#9-老页面渐进迁移指南)

---

## 1. 新页面开发规范

### 1.1 必须使用 `<script setup>`

所有新页面**必须**使用 `<script setup>` 语法。`<script setup>` 天然以 Vue 3 模式运行，无需额外配置 `compatConfig`。

```vue
<script setup>
import { ref, reactive, computed, onMounted } from "vue";
// 组件代码
</script>
```

### 1.2 如使用 Options API

如果特殊情况需要使用 Options API，**必须**声明组件级 Vue 3 模式：

```vue
<script>
export default {
  compatConfig: { MODE: 3 } // 强制此组件以 Vue 3 模式运行
  // Options API 代码
};
</script>
```

### 1.3 禁止在新页面中使用 Vue 2 废弃特性

| 禁止使用                                            | 正确替代                                                             |
| --------------------------------------------------- | -------------------------------------------------------------------- |
| `.sync` 修饰符                                      | `v-model:propName`                                                   |
| `slot-scope`                                        | `v-slot` / `#default`                                                |
| `filters`（管道语法 `\|`）                          | 方法调用或计算属性                                                   |
| `this.$set` / `this.$delete`                        | 直接赋值 / `delete`                                                  |
| `this.$on` / `this.$off` / `this.$emit`（事件总线） | mitt 或 provide/inject                                               |
| `beforeDestroy` 生命周期                            | `onBeforeUnmount` (Composition API) 或 `beforeUnmount` (Options API) |
| `Vue.extend`                                        | `defineComponent`                                                    |
| `this.$children`                                    | `ref` + `defineExpose`                                               |
| `this.$listeners`                                   | 已合并到 `$attrs`                                                    |

---

## 2. 新老页面共存规则

| 规则                   | 说明                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------- |
| **新页面用新 UI 库**   | 禁止在新页面中使用 Element UI 组件                                                  |
| **老页面不引新 UI 库** | 避免在未声明 `compatConfig: { MODE: 3 }` 的组件中使用新 UI 库                       |
| **路由懒加载隔离**     | 新老页面通过路由懒加载天然实现代码分割                                              |
| **公共组件可复用**     | 新页面可引用老的 wrapper 组件（compat 下兼容），但新封装的公共组件应使用 Vue 3 写法 |
| **状态管理共享**       | 新老页面共享 Vuex Store，新页面通过 `useStore()` 访问                               |
| **样式不互相污染**     | 新页面统一使用 `<style scoped>` 或 CSS Modules                                      |

---

## 3. 目录结构规范

### 新页面放置位置

推荐在各业务模块下建 `v3/` 子目录，清晰区分新老页面：

```
src/views/Sys/
├── Hotel/                    # 老页面（Vue 2 写法，不动）
│   ├── HotelOrderListPage.vue
│   └── ...
├── Hotel/v3/                 # 新页面（Vue 3 写法）
│   ├── HotelNewFeature.vue
│   └── ...
├── Air/
│   ├── AirOrderList.vue      # 老页面
│   └── v3/
│       └── AirNewFeature.vue # 新页面
└── ...
```

### 新公共组件

```
src/components/
├── base/                # 老的基础组件（保持不动）
│   ├── BasicCitySelect.vue
│   └── ...
├── v3/                  # 新的 Vue 3 公共组件
│   ├── BaseTable.vue
│   ├── BaseForm.vue
│   └── ...
└── ...
```

### 新 Composables

```
src/composables/         # Vue 3 组合式函数（替代 mixins）
├── useTable.js          # 表格通用逻辑（替代 mixin-table）
├── useFilters.js        # 格式化函数（替代 filters）
├── usePagination.js     # 分页逻辑
└── ...
```

---

## 4. 新页面模板

### 4.1 基础列表页模板

```vue
<template>
  <div class="page-container">
    <!-- 搜索区域 -->
    <div class="search-area">
      <!-- 使用新 UI 库组件 -->
    </div>

    <!-- 表格区域 -->
    <div class="table-area">
      <!-- 使用新 UI 库的 Table 组件 -->
    </div>

    <!-- 分页 -->
    <div class="pagination-area">
      <!-- 使用新 UI 库的 Pagination 组件 -->
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, getCurrentInstance } from "vue";
import { useStore } from "vuex";
import { useRouter, useRoute } from "vue-router";

// Store
const store = useStore();

// Router
const router = useRouter();
const route = useRoute();

// 全局属性（$api, global 等）
const { proxy } = getCurrentInstance();

// 响应式数据
const loading = ref(false);
const tableData = ref([]);
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
});

// 搜索条件
const searchForm = reactive({
  keyword: "",
  status: ""
});

// 方法
const fetchData = async () => {
  loading.value = true;
  try {
    const res = await proxy.$api.$post(
      ["mall-admin-web", "/api/endpoint"],
      {},
      { ...searchForm, page: pagination.page, pageSize: pagination.pageSize }
    );
    if (res.code === 0) {
      tableData.value = res.data.list || [];
      pagination.total = res.data.total || 0;
    }
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  pagination.page = 1;
  fetchData();
};

const handlePageChange = (page) => {
  pagination.page = page;
  fetchData();
};

const handleDetail = (row) => {
  router.push({ path: "/module/detail", query: { id: row.id } });
};

// 生命周期
onMounted(() => {
  fetchData();
});
</script>

<style scoped lang="less">
.page-container {
  padding: 20px;
}
.search-area {
  margin-bottom: 20px;
}
.pagination-area {
  margin-top: 20px;
  text-align: right;
}
</style>
```

### 4.2 基础表单页模板

```vue
<template>
  <div class="form-container">
    <!-- 使用新 UI 库的 Form 组件 -->
  </div>
</template>

<script setup>
import { ref, reactive, getCurrentInstance } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const { proxy } = getCurrentInstance();

const formRef = ref(null);
const formData = reactive({
  name: "",
  description: "",
  status: 1
});

const rules = {
  name: [{ required: true, message: "请输入名称", trigger: "blur" }]
};

const handleSubmit = async () => {
  // 表单验证（根据新 UI 库的 API）
  try {
    const res = await proxy.$api.$post(["mall-admin-web", "/api/save"], {}, formData);
    if (res.code === 0) {
      proxy.$sucMsg("保存成功");
      router.go(-1);
    }
  } catch (err) {
    proxy.$errMsg("保存失败");
  }
};
</script>

<style scoped lang="less">
.form-container {
  padding: 20px;
  max-width: 800px;
}
</style>
```

---

## 5. 状态管理使用规范

### 5.1 新页面访问 Vuex Store

```vue
<script setup>
import { useStore } from "vuex";
import { computed } from "vue";

const store = useStore();

// 读取 state
const userInfo = computed(() => store.state.user.userInfo);

// 读取 getter
const menuList = computed(() => store.getters["menu/menuList"]);

// 提交 mutation
store.commit("tab/ADD_TAB", { name: "新页面", path: "/new" });

// 派发 action
store.dispatch("user/getUserInfo");
</script>
```

### 5.2 新 Vuex 模块

如果新功能需要新的 Store 模块，模块定义方式不变（Vuex 4 模块格式兼容）：

```js
// src/store/modules/newModule.js
export default {
  namespaced: true,
  state: () => ({
    list: [],
    loading: false
  }),
  mutations: {
    SET_LIST(state, list) {
      state.list = list;
    }
  },
  actions: {
    async fetchList({ commit }) {
      // ...
    }
  }
};
```

---

## 6. HTTP 请求使用规范

### 6.1 在 `<script setup>` 中使用 $api

```vue
<script setup>
import { getCurrentInstance } from "vue";

const { proxy } = getCurrentInstance();

// POST 请求
const res = await proxy.$api.$post(
  ["mall-admin-web", "/endpoint"],
  {},       // query params
  { data }  // body
);

// GET 请求
const res = await proxy.$api.$get(
  ["mall-trade-web", "/endpoint"],
  { page: 1, size: 20 }  // query params
);
```

### 6.2 可选：创建 composable 封装

```js
// src/composables/useApi.js
import { getCurrentInstance } from "vue";

export function useApi() {
  const { proxy } = getCurrentInstance();
  return proxy.$api;
}
```

使用：

```vue
<script setup>
import { useApi } from "@/composables/useApi";

const api = useApi();
const res = await api.$post(["mall-admin-web", "/endpoint"], {}, data);
</script>
```

---

## 7. 路由配置规范

### 7.1 新页面路由配置

在 `src/router/output.js` 的对应模块下添加新路由：

```js
{
  path: "/hotel/v3/new-feature",
  name: "酒店新功能",
  id: "1-10",  // 按权限系统分配 ID
  component: () => import("@/views/Sys/Hotel/v3/HotelNewFeature.vue")
}
```

### 7.2 路由元信息

```js
{
  path: "/hotel/v3/new-feature",
  name: "酒店新功能",
  meta: {
    title: "酒店新功能",  // 页面标题
    permission: "hotel:new-feature",  // 权限码
    v3: true  // 标记为 Vue 3 新页面（可选，便于统计）
  },
  component: () => import("@/views/Sys/Hotel/v3/HotelNewFeature.vue")
}
```

---

## 8. 样式规范

### 8.1 强制使用 scoped 或 CSS Modules

```vue
<!-- 方式一：scoped -->
<style scoped lang="less">
.container {
  /* ... */
}
</style>

<!-- 方式二：CSS Modules -->
<style module lang="less">
.container {
  /* ... */
}
</style>
```

### 8.2 禁止在新页面中

- 使用 Element UI 的 CSS 类名（`.el-*`）
- 覆盖全局样式（不加 scoped 的 `<style>`）
- 直接修改 `src/assets/theme/` 下的公共样式文件

### 8.3 主题变量

新页面如需使用项目主题色，通过 CSS 变量或 Less 变量引用：

```less
@import "@/assets/theme/variables.less"; // 如存在公共变量文件

.button-primary {
  background-color: @primary-color;
}
```

---

## 9. 老页面渐进迁移指南

当业务迭代涉及老页面较大改动时，可顺便迁移到 Vue 3 写法。

### 9.1 迁移步骤

1. **添加 `compatConfig: { MODE: 3 }`**（或改为 `<script setup>`）
2. **替换 `.sync`** → `v-model:`
3. **替换 `slot-scope`** → `v-slot`
4. **替换 `filters`** → 方法调用
5. **替换 `beforeDestroy`** → `beforeUnmount` / `onBeforeUnmount`
6. **替换 `this.$set` / `this.$delete`** → 直接操作
7. **替换 EventBus** → mitt 或 provide/inject
8. **替换 Element UI 组件** → 新 UI 库组件
9. **测试验证**

### 9.2 迁移检查清单

```
迁移文件：_______________

[ ] compatConfig 设置为 MODE: 3 或使用 <script setup>
[ ] .sync 已替换为 v-model:
[ ] slot-scope 已替换为 v-slot
[ ] filters 已替换为方法
[ ] beforeDestroy 已替换为 beforeUnmount
[ ] this.$set / this.$delete 已移除
[ ] EventBus 已替换为 mitt
[ ] Element UI 组件已替换为新 UI 库
[ ] 样式已添加 scoped
[ ] 功能测试通过
[ ] 无 deprecation 警告
```

### 9.3 迁移后的 compat 配置清理

当某个模块下的所有页面都迁移完毕后：

1. 确认该模块所有组件都声明了 `compatConfig: { MODE: 3 }` 或使用 `<script setup>`
2. 确认不再引用 Element UI 组件
3. 移除该模块对 Element UI 的样式依赖
4. 当所有模块迁移完成后，可以：
   - 移除 `@vue/compat`
   - 移除 `configureCompat({ MODE: 2 })`
   - 移除 Element UI
   - 达到方案一的终态
