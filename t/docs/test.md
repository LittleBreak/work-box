# wondermall-mos 测试体系建设方案

> 服务于 Vue 3 迁移保障 + 长期质量体系建设
>
> 编写日期：2026-03-03

---

## 目录

1. [现状与问题](#1-现状与问题)
2. [测试策略总览](#2-测试策略总览)
3. [迁移阶段：测试保障机制](#3-迁移阶段测试保障机制)
4. [长期阶段：测试体系建设](#4-长期阶段测试体系建设)
5. [测试基础设施搭建](#5-测试基础设施搭建)
6. [CI/CD 集成方案](#6-cicd-集成方案)
7. [落地计划与优先级](#7-落地计划与优先级)

---

## 1. 现状与问题

### 1.1 当前测试现状

| 项目       | 状态                                                  |
| ---------- | ----------------------------------------------------- |
| 单元测试   | **无** — 无测试框架、无测试文件、无测试依赖           |
| 组件测试   | **无**                                                |
| E2E 测试   | **无**                                                |
| 测试配置   | **无** — 无 jest/vitest/cypress/playwright 配置文件   |
| CI/CD 测试 | **无** — 仅有 ESLint + Stylelint + SonarQube 静态检查 |
| 测试命令   | **无** — package.json 中无 test 相关 script           |

### 1.2 核心风险

在零测试覆盖的前提下进行 Vue 3 迁移（996 个文件、375 个路由），**唯一的质量保障手段是人工回归测试**。这意味着：

- 迁移每一个 Phase 后，都需要人工遍历全部业务流程
- 无法量化"改了什么、影响了什么、验证了什么"
- 隐蔽的回归 bug 容易在上线后才暴露

### 1.3 项目测试范围

| 维度            | 规模                                                                                               |
| --------------- | -------------------------------------------------------------------------------------------------- |
| 路由/页面       | 375 个                                                                                             |
| Vue 组件        | 996 个                                                                                             |
| API 模块        | 77 个                                                                                              |
| Vuex Store 模块 | 124 个                                                                                             |
| 业务域          | Air / Hotel / Train / Car / Food / Insurance / Finance / Shopping / Marketing / SupplyChain 等 10+ |

---

## 2. 测试策略总览

### 2.1 测试金字塔（适配后台管理系统）

```
        ╱  ╲
       ╱ E2E ╲          少量 — 覆盖核心业务流程
      ╱────────╲
     ╱ 组件测试  ╲       适量 — 覆盖可复用组件和复杂交互
    ╱────────────╲
   ╱   单元测试    ╲     大量 — 覆盖工具函数、Store、过滤器
  ╱────────────────╲
 ╱    静态检查/类型    ╲  全量 — ESLint + TypeScript（长期）
╱──────────────────────╲
```

### 2.2 分阶段策略

| 阶段                    | 目标               | 重点                                       |
| ----------------------- | ------------------ | ------------------------------------------ |
| **迁移期**（Phase 1-5） | 保障迁移不引入回归 | E2E 冒烟测试 + 页面可访问性检查 + 视觉回归 |
| **迁移完成后**          | 建立持续质量保障   | 单元测试 + 组件测试 + E2E 核心流程         |
| **长期**                | 全面质量体系       | 测试覆盖率门禁 + 自动化回归 + 性能监控     |

---

## 3. 迁移阶段：测试保障机制

迁移阶段不可能从零开始补齐全部单元测试，需要用**最小成本获得最大保障**。以下四个机制按投入产出比排序。

### 3.1 页面可访问性冒烟测试（投入最小，收益最高）

**原理**：自动遍历所有 375 个路由，检查每个页面是否能正常渲染、不报 JS 错误。不验证业务逻辑，只验证"页面不白屏、不崩溃"。

**工具**：Playwright

```js
// tests/e2e/smoke/page-smoke.spec.js
import { test, expect } from "@playwright/test";
import { routes } from "./route-list.js"; // 从 router 导出的路由路径列表

// 登录获取 session
test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  // 模拟登录，设置 token 到 sessionStorage
  await page.goto("http://localhost:9099/#/login");
  await page.evaluate(() => {
    sessionStorage.setItem("user.token", "test-token");
    sessionStorage.setItem("authCodes", JSON.stringify(["*"]));
  });
  await page.close();
});

for (const route of routes) {
  test(`页面可访问: ${route.path}`, async ({ page }) => {
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto(`http://localhost:9099/#${route.path}`);
    await page.waitForTimeout(2000);

    // 断言 1：无 JS 报错
    expect(errors).toEqual([]);

    // 断言 2：页面不白屏（body 有内容）
    const bodyText = await page.locator("body").innerText();
    expect(bodyText.length).toBeGreaterThan(0);

    // 断言 3：无 Vue 警告（可选，迁移期可放宽）
    // const warnings = await page.evaluate(() => window.__vue_warnings__ || []);
    // expect(warnings).toEqual([]);
  });
}
```

**执行时机**：每个 Phase 完成后、合入 master 前必须全部通过。

**覆盖效果**：一次性覆盖 375 个页面的基本可用性，能发现：

- 组件注册缺失（迁移漏改导致）
- import 路径错误
- 模板编译错误
- 运行时 JS 异常

### 3.2 视觉回归测试（捕捉样式问题）

**原理**：迁移前对每个页面截图作为基准，迁移后再截图进行像素级比对，自动标出差异区域。

**工具**：Playwright + @playwright/test 内置截图对比

```js
// tests/e2e/visual/visual-regression.spec.js
import { test, expect } from "@playwright/test";

const criticalPages = [
  { name: "机票订单列表", path: "/air/order/list" },
  { name: "酒店订单列表", path: "/hotel/order/list" },
  { name: "火车票订单列表", path: "/train/order/list" },
  { name: "财务账单", path: "/finance/bill/list" }
  // ... 挑选每个业务域的核心页面
];

for (const page of criticalPages) {
  test(`视觉回归: ${page.name}`, async ({ page: browserPage }) => {
    await browserPage.goto(`http://localhost:9099/#${page.path}`);
    await browserPage.waitForLoadState("networkidle");

    await expect(browserPage).toHaveScreenshot(`${page.name}.png`, {
      maxDiffPixelRatio: 0.01, // 允许 1% 像素差异
      fullPage: true
    });
  });
}
```

**执行流程**：

```
迁移前：运行测试，生成基准截图（自动保存到 tests/e2e/visual/snapshots/）
迁移后：运行测试，与基准截图对比
  ├── 通过 → 样式无变化
  └── 失败 → 查看 diff 图，判断是预期变更还是回归 bug
        ├── 预期变更 → 更新基准截图
        └── 回归 bug → 修复后重跑
```

### 3.3 核心业务流程 E2E 测试（保障关键路径）

不需要覆盖全部业务，只覆盖**最核心的操作路径**，确保迁移后主流程不断。

**建议覆盖的核心流程（按业务优先级选取 10-15 条）**：

| 序号 | 业务流程           | 验证点                             |
| ---- | ------------------ | ---------------------------------- |
| 1    | 登录 → 进入首页    | token 获取、菜单加载、权限路由生成 |
| 2    | 机票订单列表查询   | 表格渲染、分页、搜索条件           |
| 3    | 酒店订单列表查询   | 表格渲染、分页、搜索条件           |
| 4    | 火车票订单列表查询 | 表格渲染、分页、筛选               |
| 5    | 创建/编辑弹窗表单  | Dialog 打开/关闭、表单验证、提交   |
| 6    | 导出功能           | 文件下载触发                       |
| 7    | 菜单导航           | 左侧菜单展开/收起、路由跳转        |
| 8    | Tab 页管理         | 多标签打开/关闭/切换               |
| 9    | 权限控制           | 无权限按钮隐藏、无权限路由拦截     |
| 10   | 基础数据管理 CRUD  | 新增/编辑/查询完整流程             |

```js
// tests/e2e/flows/order-query.spec.js
import { test, expect } from "@playwright/test";

test("机票订单列表 - 查询与分页", async ({ page }) => {
  await page.goto("http://localhost:9099/#/air/order/list");

  // 等待表格加载
  await page.waitForSelector(".el-table__body-wrapper tr");

  // 验证表格有数据
  const rows = await page.locator(".el-table__body-wrapper tr").count();
  expect(rows).toBeGreaterThan(0);

  // 输入搜索条件
  await page.fill('input[placeholder="请输入订单号"]', "TEST001");
  await page.click('button:has-text("查询")');

  // 等待表格刷新
  await page.waitForResponse((resp) => resp.url().includes("/order/list") && resp.status() === 200);

  // 验证分页器存在
  await expect(page.locator(".el-pagination")).toBeVisible();

  // 切换第 2 页
  await page.click(".el-pagination .number:has-text('2')");
  await page.waitForResponse((resp) => resp.url().includes("/order/list"));
});
```

### 3.4 API 接口契约快照测试（防止请求层变更）

迁移中 HTTP 层不应变化，但可能因为 Axios 升级或拦截器改动导致请求格式变化。通过记录 API 请求/响应快照来检测。

```js
// tests/e2e/api/api-snapshot.spec.js
import { test, expect } from "@playwright/test";

test("API 请求格式不变 - 订单列表", async ({ page }) => {
  const requestPromise = page.waitForRequest((req) => req.url().includes("/order/list"));

  await page.goto("http://localhost:9099/#/air/order/list");
  const request = await requestPromise;

  // 验证请求头
  const headers = request.headers();
  expect(headers["content-type"]).toContain("application/json");
  expect(headers["authorization"]).toBeDefined();

  // 验证请求方法
  expect(request.method()).toBe("POST");

  // 验证请求体结构（不验证具体值）
  const body = request.postDataJSON();
  expect(body).toHaveProperty("pageNum");
  expect(body).toHaveProperty("pageSize");
});
```

### 3.5 迁移阶段测试执行矩阵

| Phase                 | 冒烟测试           | 视觉回归 | 核心流程 E2E | API 快照 | 人工回归     |
| --------------------- | ------------------ | -------- | ------------ | -------- | ------------ |
| Phase 1 (Webpack)     | 必须               | 推荐     | 推荐         | 推荐     | 必须（全量） |
| Phase 2 (Router/Vuex) | 必须               | 推荐     | 必须         | 必须     | 必须（全量） |
| Phase 3 (compat)      | 必须（每批次模块） | 必须     | 必须         | 必须     | 按模块       |
| Phase 4 (Vue 3)       | 必须               | 必须     | 必须         | 必须     | 必须（全量） |
| Phase 5 (UI 库)       | 必须               | 必须     | 必须         | —        | 必须（全量） |

---

## 4. 长期阶段：测试体系建设

迁移完成后，逐步建立分层测试体系，从高 ROI 的部分开始。

### 4.1 单元测试

**工具**：Vitest（Vue 3 生态首选，兼容 Jest API，速度更快）

**覆盖范围与优先级**：

| 优先级 | 测试对象                      | 文件数        | 说明                           |
| ------ | ----------------------------- | ------------- | ------------------------------ |
| P0     | `src/utils/` 工具函数         | 35+           | 纯函数，最容易测试，ROI 最高   |
| P0     | `src/filters/` 过滤器         | 15            | 纯函数，迁移后变为普通方法     |
| P1     | `src/store/modules/` 核心模块 | 选取 10-15 个 | 测试 mutations/actions/getters |
| P1     | `src/http/` 请求封装          | 3             | 测试拦截器逻辑、错误处理       |
| P2     | `src/permission/`             | —             | 测试权限判断逻辑               |
| P2     | `src/router/output.js`        | 1             | 测试动态路由过滤               |

**示例**：

```js
// tests/unit/utils/enum.test.js
import { describe, it, expect } from "vitest";
import { getEnumLabel, ORDER_STATUS } from "@/utils/enum";

describe("enum 工具", () => {
  it("根据 value 返回 label", () => {
    expect(getEnumLabel(ORDER_STATUS, 1)).toBe("待支付");
    expect(getEnumLabel(ORDER_STATUS, 2)).toBe("已完成");
  });

  it("找不到时返回空字符串", () => {
    expect(getEnumLabel(ORDER_STATUS, 999)).toBe("");
  });
});
```

```js
// tests/unit/store/user.test.js
import { describe, it, expect, vi } from "vitest";
import userModule from "@/store/modules/user";

describe("user store", () => {
  it("SET_TOKEN mutation 正确设置 token", () => {
    const state = { token: "" };
    userModule.mutations.SET_TOKEN(state, "abc123");
    expect(state.token).toBe("abc123");
  });

  it("login action 调用正确的 API", async () => {
    const commit = vi.fn();
    const mockApi = vi.fn().mockResolvedValue({ data: { token: "abc" } });

    await userModule.actions.login({ commit }, { api: mockApi, form: { username: "admin" } });
    expect(commit).toHaveBeenCalledWith("SET_TOKEN", "abc");
  });
});
```

### 4.2 组件测试

**工具**：Vitest + @vue/test-utils

**覆盖范围**：`src/components/` 下的可复用组件（244 个），优先覆盖全局注册的基础组件。

| 优先级 | 组件                | 测试重点                         |
| ------ | ------------------- | -------------------------------- |
| P0     | BasicCitySelect     | 搜索、选择、清空、回显           |
| P0     | BasicUpload         | 文件选择、上传回调、限制校验     |
| P0     | PageSplit           | 分页切换、每页条数变更、事件触发 |
| P0     | BasicTable          | 列渲染、排序、选择               |
| P1     | BasicLogTable       | 数据展示                         |
| P1     | BasicTransferDialog | 穿梭框交互                       |
| P2     | 业务组件            | 按需补充                         |

**示例**：

```js
// tests/components/PageSplit.test.js
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import PageSplit from "@/components/base/PageSplit.vue";

describe("PageSplit 分页组件", () => {
  it("渲染正确的总条数", () => {
    const wrapper = mount(PageSplit, {
      props: { total: 100, pageSize: 10, currentPage: 1 }
    });
    expect(wrapper.text()).toContain("100");
  });

  it("切换页码触发 change 事件", async () => {
    const wrapper = mount(PageSplit, {
      props: { total: 100, pageSize: 10, currentPage: 1 }
    });
    await wrapper.find(".next-page").trigger("click");
    expect(wrapper.emitted("current-change")).toBeTruthy();
    expect(wrapper.emitted("current-change")[0]).toEqual([2]);
  });
});
```

### 4.3 E2E 测试（长期维护）

迁移阶段写的核心流程 E2E 测试继续保留，逐步扩展：

| 阶段          | E2E 用例数 | 覆盖范围            |
| ------------- | ---------- | ------------------- |
| 迁移期        | 10-15 条   | 核心业务流程        |
| 迁移后 3 个月 | 30-40 条   | 每个业务域主流程    |
| 长期          | 60-80 条   | 核心流程 + 边界场景 |

### 4.4 测试覆盖率目标

| 阶段          | 单元测试覆盖率 | 组件测试          | E2E              |
| ------------- | -------------- | ----------------- | ---------------- |
| 迁移完成时    | utils/ 80%+    | 全局基础组件 100% | 10-15 条核心流程 |
| 迁移后 3 个月 | 整体 30%+      | 50+ 高频组件      | 30-40 条         |
| 迁移后 6 个月 | 整体 50%+      | 100+ 组件         | 60+ 条           |
| 长期目标      | 整体 60%+      | 可复用组件 80%+   | 核心路径 100%    |

---

## 5. 测试基础设施搭建

### 5.1 Vitest 配置（单元测试 + 组件测试）

```bash
pnpm add -D vitest @vue/test-utils jsdom @vitest/coverage-v8
```

```js
// vitest.config.js
import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import path from "path";

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: "jsdom",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: ["src/utils/**", "src/store/**", "src/filters/**", "src/components/**"],
      thresholds: {
        // 覆盖率门禁（逐步提高）
        "src/utils/**": { lines: 80 },
        "src/filters/**": { lines: 80 }
      }
    },
    include: ["tests/unit/**/*.test.js", "tests/components/**/*.test.js"]
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src")
    }
  }
});
```

### 5.2 Playwright 配置（E2E 测试）

```bash
pnpm add -D @playwright/test
npx playwright install chromium
```

```js
// playwright.config.js
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: "http://localhost:9099",
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    headless: true
  },
  webServer: {
    command: "npm run dev",
    port: 9099,
    reuseExistingServer: true,
    timeout: 120000
  },
  projects: [
    {
      name: "smoke",
      testMatch: "smoke/**/*.spec.js"
    },
    {
      name: "visual",
      testMatch: "visual/**/*.spec.js"
    },
    {
      name: "flows",
      testMatch: "flows/**/*.spec.js"
    },
    {
      name: "api",
      testMatch: "api/**/*.spec.js"
    }
  ]
});
```

### 5.3 目录结构

```
tests/
├── unit/                          # 单元测试
│   ├── utils/                     # 工具函数测试
│   │   ├── enum.test.js
│   │   ├── session.test.js
│   │   └── permission.test.js
│   ├── store/                     # Vuex 模块测试
│   │   ├── user.test.js
│   │   ├── app.test.js
│   │   └── menu.test.js
│   ├── filters/                   # 过滤器测试
│   │   └── index.test.js
│   └── http/                      # HTTP 层测试
│       └── request.test.js
├── components/                    # 组件测试
│   ├── PageSplit.test.js
│   ├── BasicCitySelect.test.js
│   ├── BasicUpload.test.js
│   └── BasicTable.test.js
└── e2e/                           # E2E 测试
    ├── smoke/                     # 冒烟测试（页面可访问性）
    │   └── page-smoke.spec.js
    ├── visual/                    # 视觉回归
    │   ├── visual-regression.spec.js
    │   └── snapshots/             # 基准截图
    ├── flows/                     # 核心业务流程
    │   ├── login.spec.js
    │   ├── order-query.spec.js
    │   └── crud-form.spec.js
    ├── api/                       # API 契约快照
    │   └── api-snapshot.spec.js
    └── fixtures/                  # 测试数据
        └── mock-data.json
```

### 5.4 NPM Scripts

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:unit": "vitest run --project unit",
    "test:component": "vitest run --project component",
    "e2e": "playwright test",
    "e2e:smoke": "playwright test --project smoke",
    "e2e:visual": "playwright test --project visual",
    "e2e:flows": "playwright test --project flows",
    "e2e:ui": "playwright test --ui",
    "e2e:update-snapshots": "playwright test --project visual --update-snapshots"
  }
}
```

---

## 6. CI/CD 集成方案

### 6.1 在现有 GitLab CI 中增加测试阶段

```yaml
# .gitlab-ci.yml
stages:
  - lint
  - test
  - build

# 现有的 lint job 保持不变
sonarqube-check:
  stage: lint
  # ... 现有配置

lint-job:
  stage: lint
  # ... 现有配置

# ========== 新增测试 job ==========

unit-test:
  stage: test
  image: node:18
  cache:
    key: ${CI_COMMIT_REF_SLUG}
    paths:
      - node_modules/
      - .pnpm-store/
  before_script:
    - corepack enable
    - pnpm install --frozen-lockfile
  script:
    - pnpm test:coverage
  coverage: '/Lines\s*:\s*(\d+\.?\d*%)/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
    paths:
      - coverage/
    when: always
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == "master"

e2e-smoke:
  stage: test
  image: mcr.microsoft.com/playwright:v1.40.0-jammy
  before_script:
    - corepack enable
    - pnpm install --frozen-lockfile
  script:
    - pnpm build:test
    - npx serve -s dist -l 9099 &
    - npx wait-on http://localhost:9099
    - pnpm e2e:smoke
  artifacts:
    paths:
      - test-results/
    when: on_failure
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == "master"
```

### 6.2 MR 门禁规则

| 检查项             | 门禁条件        | 阶段               |
| ------------------ | --------------- | ------------------ |
| ESLint + Stylelint | 0 error（现有） | 立即               |
| SonarQube          | 通过（现有）    | 立即               |
| 单元测试           | 全部通过        | 测试基础设施搭建后 |
| 覆盖率             | utils/ ≥ 80%    | 单元测试覆盖达标后 |
| E2E 冒烟           | 全部通过        | 迁移阶段必须       |
| 新增代码覆盖率     | ≥ 60%（增量）   | 长期目标           |

### 6.3 测试报告

在 MR 中自动展示测试结果：

- **单元测试**：覆盖率报告（Cobertura 格式，GitLab 原生支持 MR diff 中显示覆盖行）
- **E2E 测试**：失败时自动截图上传到 artifacts
- **视觉回归**：diff 截图上传到 artifacts，reviewer 可直接查看

---

## 7. 落地计划与优先级

### 7.1 迁移前准备（1-2 周）

| 任务                       | 产出                            |
| -------------------------- | ------------------------------- |
| 搭建 Playwright 基础设施   | playwright.config.js + 目录结构 |
| 编写页面冒烟测试           | 375 个路由的可访问性测试        |
| 对核心页面截图生成视觉基准 | 每个业务域 2-3 个核心页面       |
| 编写 10-15 条核心流程 E2E  | 覆盖登录、查询、CRUD、导航      |
| CI 集成 E2E 冒烟测试       | MR 门禁生效                     |

### 7.2 迁移期间（跟随 Phase 1-5）

| 任务                               | 说明                           |
| ---------------------------------- | ------------------------------ |
| 每个 Phase 完成后跑冒烟测试        | 375 个页面全过 → 可合入        |
| Phase 5 (UI 库替换) 后更新视觉基准 | 旧的 Element UI 截图不再适用   |
| 维护核心流程 E2E                   | 组件标签名变了需同步更新选择器 |

### 7.3 迁移完成后（持续投入）

| 时间        | 任务                                  | 目标               |
| ----------- | ------------------------------------- | ------------------ |
| 第 1 个月   | 补 utils/ 和 filters/ 单元测试        | 覆盖率 80%+        |
| 第 2 个月   | 补全局基础组件测试                    | 15 个基础组件 100% |
| 第 3 个月   | 补 Store 核心模块测试 + CI 覆盖率门禁 | MR 增量覆盖 60%+   |
| 第 4-6 个月 | 扩展 E2E 到 40+ 条 + 组件测试扩展     | 全面质量体系       |

### 7.4 长期规范

| 规范                       | 内容                                      |
| -------------------------- | ----------------------------------------- |
| **新增 utils 必须写测试**  | 工具函数提 MR 时必须包含对应的 .test.js   |
| **新增组件建议写测试**     | 可复用组件建议包含基础渲染和交互测试      |
| **Bug 修复必须补回归用例** | 修 bug 时先写一个能复现的测试用例，再修复 |
| **E2E 覆盖新业务流程**     | 重要新功能上线前补充 E2E 核心路径         |
| **定期更新视觉基准**       | UI 变更后及时更新截图基准，避免 CI 误报   |

---

> 本方案的核心原则：**迁移阶段用最小成本建立安全网（E2E 冒烟 + 视觉回归），迁移完成后逐步补齐分层测试体系**。不追求一步到位的高覆盖率，而是按投入产出比逐步建设。
