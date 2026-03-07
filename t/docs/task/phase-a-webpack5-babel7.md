# Phase A: Webpack 3 → Webpack 5 + Babel 6 → Babel 7

> 预估工期：5-8 人天 | 建议人员：1-2 人
>
> 前置条件：无
>
> 目标：升级构建工具链，保持 Vue 2.7 + Element UI 不变，项目正常运行

---

## 目录

1. [Step 1: 升级 Node.js](#step-1-升级-nodejs)
2. [Step 2: 升级 Babel 6 → 7](#step-2-升级-babel-6--7)
3. [Step 3: 升级 Webpack 3 → 5 核心包](#step-3-升级-webpack-3--5-核心包)
4. [Step 4: 改造 webpack.base.conf.js](#step-4-改造-webpackbaseconfjs)
5. [Step 5: 改造 webpack.dev.conf.js](#step-5-改造-webpackdevconfjs)
6. [Step 6: 改造 webpack.prod.conf.js](#step-6-改造-webpackprodconfjs)
7. [Step 7: 改造 build/utils.js 样式处理](#step-7-改造-buildutilsjs-样式处理)
8. [Step 8: 升级 vue-loader 到 v15](#step-8-升级-vue-loader-到-v15)
9. [Step 9: 升级其他 Loader 与 Plugin](#step-9-升级其他-loader-与-plugin)
10. [Step 10: 处理 Node.js Polyfill 问题](#step-10-处理-nodejs-polyfill-问题)
11. [Step 11: 升级 pnpm](#step-11-升级-pnpm)
12. [Step 12: 清理废弃依赖](#step-12-清理废弃依赖)
13. [验收标准](#验收标准)
14. [回滚方案](#回滚方案)
15. [已知风险与应对](#已知风险与应对)

---

## Step 1: 升级 Node.js

### 操作

修改 `.nvmrc`：

```
18.20
```

切换 Node 版本：

```bash
nvm install 18.20
nvm use 18.20
```

### 原因

- Node 18 LTS 是 Webpack 5 的推荐运行环境
- 可移除 `package.json` 中 `d` 脚本里的 `--openssl-legacy-provider` hack
- Node 16 已于 2023-09 停止维护（EOL）

### 验证

```bash
node -v  # 应输出 v18.20.x
```

### 注意事项

- 确认 CI/CD 流水线（jdb-releaser）支持 Node 18
- 确认 `@jd/sgm-web` 等京东内部包在 Node 18 下正常安装

---

## Step 2: 升级 Babel 6 → 7

### 2.1 移除 Babel 6 相关包

```bash
pnpm remove babel-core babel-loader babel-preset-env babel-preset-stage-2 \
  babel-plugin-transform-runtime babel-plugin-transform-vue-jsx \
  babel-plugin-dynamic-import-node babel-helper-vue-jsx-merge-props
```

### 2.2 安装 Babel 7 相关包

```bash
pnpm add -D @babel/core @babel/preset-env @babel/plugin-transform-runtime babel-loader@9
pnpm add @babel/runtime
```

如需保留 Vue JSX 支持：

```bash
pnpm add -D @vue/babel-preset-jsx @vue/babel-helper-vue-jsx-merge-props
```

### 2.3 替换配置文件

删除根目录 `.babelrc`，创建 `babel.config.js`：

```js
// babel.config.js
module.exports = {
  presets: [
    [
      "@babel/preset-env",
      {
        modules: false,
        targets: { browsers: ["> 1%", "last 2 versions", "not dead"] }
      }
    ],
    "@vue/babel-preset-jsx" // 如需 Vue JSX 支持
  ],
  plugins: [["@babel/plugin-transform-runtime", { corejs: false }]]
};
```

### 变更对照

| Babel 6                            | Babel 7                                                              |
| ---------------------------------- | -------------------------------------------------------------------- |
| `babel-core`                       | `@babel/core`                                                        |
| `babel-preset-env`                 | `@babel/preset-env`                                                  |
| `babel-preset-stage-2`             | 移除（Stage 预设已废弃，按需添加单独插件）                           |
| `babel-plugin-transform-runtime`   | `@babel/plugin-transform-runtime`                                    |
| `babel-plugin-transform-vue-jsx`   | `@vue/babel-preset-jsx`                                              |
| `babel-plugin-dynamic-import-node` | `@babel/plugin-syntax-dynamic-import`（Babel 7 原生支持动态 import） |
| `babel-loader@7`                   | `babel-loader@9`                                                     |
| `.babelrc`                         | `babel.config.js`                                                    |

### 验证

```bash
npx babel --version  # 应输出 7.x
```

---

## Step 3: 升级 Webpack 3 → 5 核心包

### 3.1 移除旧版

```bash
pnpm remove webpack webpack-dev-server webpack-merge
```

### 3.2 安装新版

```bash
pnpm add -D webpack@5 webpack-cli@5 webpack-dev-server@4 webpack-merge@5
```

### 注意

- Webpack 5 需要 `webpack-cli` 作为独立包
- `webpack-dev-server@4` API 与 v2 有较大差异

---

## Step 4: 改造 webpack.base.conf.js

### 文件：`build/webpack.base.conf.js`

#### 4.1 添加 VueLoaderPlugin

Webpack 4+ 要求 `vue-loader` 必须配合 `VueLoaderPlugin` 使用：

```js
const { VueLoaderPlugin } = require("vue-loader");

module.exports = {
  // ...
  plugins: [new VueLoaderPlugin()]
};
```

#### 4.2 替换 Asset Loaders

Webpack 5 内置 Asset Modules，替代 `url-loader` / `file-loader`：

```js
// 旧 — url-loader
{
  test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
  loader: "url-loader",
  options: { limit: 10000, name: utils.assetsPath("img/[name].[hash:7].[ext]") }
},
{
  test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/,
  loader: "url-loader",
  options: { limit: 10000, name: utils.assetsPath("media/[name].[hash:7].[ext]") }
},
{
  test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
  loader: "url-loader",
  options: { limit: 10000, name: utils.assetsPath("fonts/[name].[hash:7].[ext]") }
}

// 新 — Asset Modules
{
  test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
  type: "asset",
  parser: { dataUrlCondition: { maxSize: 10 * 1024 } },
  generator: { filename: utils.assetsPath("img/[name].[hash:7][ext]") }
},
{
  test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/,
  type: "asset",
  parser: { dataUrlCondition: { maxSize: 10 * 1024 } },
  generator: { filename: utils.assetsPath("media/[name].[hash:7][ext]") }
},
{
  test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
  type: "asset/resource",
  generator: { filename: utils.assetsPath("fonts/[name].[hash:7][ext]") }
}
```

> 注意：Asset Modules 的 `generator.filename` 中 `[ext]` 已包含 `.`，不需要额外加点。

#### 4.3 移除 Node Polyfill 配置

Webpack 3 配置中的 `node` 字段需要调整：

```js
// 旧 — Webpack 3
node: {
  dgram: "empty",
  fs: "empty",
  net: "empty",
  tls: "empty",
  child_process: "empty"
}

// 新 — Webpack 5（Node polyfill 不再自动提供）
resolve: {
  fallback: {
    dgram: false,
    fs: false,
    net: false,
    tls: false,
    child_process: false
  }
}
```

#### 4.4 DefinePlugin 保持不变

`webpack.DefinePlugin` 定义 `RELEASE_VERSION` 的逻辑不变，但注意 Webpack 5 中 `process.env` 不再自动注入，确保 `config/dev.env.js` 和 `config/prod.env.js` 通过 `DefinePlugin` 正确注入。

---

## Step 5: 改造 webpack.dev.conf.js

### 文件：`build/webpack.dev.conf.js`

#### 5.1 webpack-merge API 变更

```js
// 旧 — webpack-merge@4
const merge = require("webpack-merge");
module.exports = merge(baseWebpackConfig, {
  /* ... */
});

// 新 — webpack-merge@5
const { merge } = require("webpack-merge");
module.exports = merge(baseWebpackConfig, {
  /* ... */
});
```

#### 5.2 移除废弃插件

```js
// 移除以下 Webpack 3 专属插件（Webpack 5 内置替代）
// - webpack.NamedModulesPlugin    → Webpack 5 默认启用
// - webpack.NoEmitOnErrorsPlugin  → Webpack 5 默认启用
// - webpack.HotModuleReplacementPlugin → devServer.hot: true 自动启用
```

#### 5.3 devServer 配置升级

```js
// 旧 — webpack-dev-server@2
devServer: {
  clientLogLevel: "warning",
  historyApiFallback: { rewrites: [{ from: /.*/, to: "/index.html" }] },
  hot: true,
  contentBase: false,
  compress: true,
  host: HOST || config.dev.host,
  port: PORT || config.dev.port,
  open: config.dev.autoOpenBrowser,
  overlay: { warnings: false, errors: true },
  publicPath: config.dev.assetsPublicPath,
  proxy: config.dev.proxyTable,
  quiet: true,
  disableHostCheck: true,
  watchOptions: { poll: config.dev.poll }
}

// 新 — webpack-dev-server@4
devServer: {
  historyApiFallback: { rewrites: [{ from: /.*/, to: "/index.html" }] },
  hot: true,
  compress: true,
  host: HOST || config.dev.host,
  port: PORT || config.dev.port,
  open: config.dev.autoOpenBrowser,
  client: {
    overlay: { warnings: false, errors: true },
    logging: "warn"
  },
  proxy: config.dev.proxyTable,
  allowedHosts: "all",
  static: false
}
```

**关键变更对照**：

| webpack-dev-server@2     | webpack-dev-server@4                 |
| ------------------------ | ------------------------------------ |
| `clientLogLevel`         | `client.logging`                     |
| `contentBase`            | `static`                             |
| `overlay`                | `client.overlay`                     |
| `disableHostCheck: true` | `allowedHosts: "all"`                |
| `quiet: true`            | 移除（使用 `infrastructureLogging`） |
| `publicPath`             | 移除（使用 output.publicPath）       |
| `watchOptions.poll`      | `watchFiles.options.poll`（或移除）  |

#### 5.4 HtmlWebpackPlugin 升级

```bash
pnpm add -D html-webpack-plugin@5
```

API 基本不变，确认模板路径正确。

#### 5.5 CopyWebpackPlugin 升级

```bash
pnpm add -D copy-webpack-plugin@11
```

```js
// 旧 — copy-webpack-plugin@4
new CopyWebpackPlugin([
  {
    from: path.resolve(__dirname, "../static"),
    to: config.dev.assetsSubDirectory,
    ignore: [".*"]
  }
]);

// 新 — copy-webpack-plugin@11
new CopyWebpackPlugin({
  patterns: [
    {
      from: path.resolve(__dirname, "../static"),
      to: config.dev.assetsSubDirectory,
      globOptions: { ignore: [".*"] }
    }
  ]
});
```

#### 5.6 portfinder 保持不变

`portfinder` 寻找可用端口的逻辑不需要修改。

#### 5.7 SGM 插件兼容性

确认 `@jd/sgm-web-webpack-plugin`（`SgmWebWebpackPlugin`）是否支持 Webpack 5：

- 如果支持：保持配置不变
- 如果不支持：联系 SGM 团队获取 Webpack 5 版本，或暂时移除 source map 上传功能

---

## Step 6: 改造 webpack.prod.conf.js

### 文件：`build/webpack.prod.conf.js`

#### 6.1 替换 ExtractTextPlugin → MiniCssExtractPlugin

```bash
pnpm remove extract-text-webpack-plugin
pnpm add -D mini-css-extract-plugin
```

```js
// 旧
const ExtractTextPlugin = require("extract-text-webpack-plugin");
new ExtractTextPlugin({
  filename: utils.assetsPath("css/[name].[contenthash].css"),
  allChunks: true
});

// 新
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
new MiniCssExtractPlugin({ filename: utils.assetsPath("css/[name].[contenthash:8].css") });
```

同步修改 `build/utils.js` 中的样式 loader 配置，将 `ExtractTextPlugin.extract` 替换为 `MiniCssExtractPlugin.loader`（见 Step 7）。

#### 6.2 替换 UglifyJsPlugin

```bash
pnpm remove uglifyjs-webpack-plugin
```

Webpack 5 内置 `terser-webpack-plugin`，无需单独安装：

```js
// 旧
const UglifyJsPlugin = require("uglifyjs-webpack-plugin");
plugins: [
  new UglifyJsPlugin({
    uglifyOptions: { compress: { warnings: false } },
    sourceMap: true,
    parallel: true
  })
];

// 新 — 通过 optimization.minimizer 配置
optimization: {
  minimizer: [
    "..." // 保留默认 terser 压缩
  ];
}
```

如需自定义 terser 选项：

```bash
pnpm add -D terser-webpack-plugin
```

```js
const TerserPlugin = require("terser-webpack-plugin");
optimization: {
  minimizer: [
    new TerserPlugin({
      parallel: true,
      terserOptions: {
        compress: { drop_console: false },
        keep_fnames: true // 保持与旧配置一致
      }
    })
  ];
}
```

#### 6.3 替换 OptimizeCSSPlugin → CssMinimizerPlugin

```bash
pnpm remove optimize-css-assets-webpack-plugin
pnpm add -D css-minimizer-webpack-plugin
```

```js
// 旧
const OptimizeCSSPlugin = require("optimize-css-assets-webpack-plugin");
plugins: [new OptimizeCSSPlugin({ cssProcessorOptions: { safe: true, map: { inline: false } } })];

// 新
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
optimization: {
  minimizer: ["...", new CssMinimizerPlugin()];
}
```

#### 6.4 替换 CommonsChunkPlugin → splitChunks

Webpack 5 使用 `optimization.splitChunks` 替代 `CommonsChunkPlugin`：

```js
// 旧 — CommonsChunkPlugin
plugins: [
  new webpack.optimize.CommonsChunkPlugin({ name: "vendor", minChunks(module) { return module.context && /node_modules/.test(module.context); } }),
  new webpack.optimize.CommonsChunkPlugin({ name: "manifest", minChunks: Infinity }),
  new webpack.optimize.CommonsChunkPlugin({ name: "app", async: "vendor-async", children: true, minChunks: 3 })
]

// 新 — splitChunks
optimization: {
  splitChunks: {
    chunks: "all",
    cacheGroups: {
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: "vendor",
        chunks: "all",
        priority: 10
      },
      common: {
        name: "common",
        minChunks: 3,
        chunks: "async",
        priority: 5,
        reuseExistingChunk: true
      }
    }
  },
  runtimeChunk: { name: "manifest" }
}
```

#### 6.5 移除废弃插件

```js
// 移除以下 Webpack 3 专属插件
// - webpack.HashedModuleIdsPlugin → Webpack 5 使用 optimization.moduleIds: "deterministic"
// - webpack.optimize.ModuleConcatenationPlugin → Webpack 5 默认启用 (production mode)
```

替代配置：

```js
optimization: {
  moduleIds: "deterministic",  // 替代 HashedModuleIdsPlugin
  // ModuleConcatenationPlugin 在 production mode 下自动启用
}
```

#### 6.6 output.hashFunction

Webpack 5 默认使用 `xxhash64`，如需保持与旧构建兼容：

```js
output: {
  // hash → contenthash（Webpack 5 推荐）
  filename: utils.assetsPath("js/[name].[contenthash:8].js"),
  chunkFilename: utils.assetsPath("js/[name].[contenthash:8].js")
}
```

#### 6.7 CompressionPlugin（可选 gzip）

如果 `productionGzip: true`：

```bash
pnpm add -D compression-webpack-plugin@10
```

API 基本不变。

#### 6.8 SGM 插件

同 Step 5.7，确认 `SgmWebWebpackPlugin` 对 Webpack 5 的兼容性。

---

## Step 7: 改造 build/utils.js 样式处理

### 文件：`build/utils.js`

#### 7.1 替换 ExtractTextPlugin.extract

```js
// 旧
const ExtractTextPlugin = require("extract-text-webpack-plugin");

if (options.extract) {
  return ExtractTextPlugin.extract({
    use: loaders,
    fallback: "vue-style-loader",
    publicPath: "../../"
  });
}

// 新
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

if (options.extract) {
  return [{ loader: MiniCssExtractPlugin.loader, options: { publicPath: "../../" } }, ...loaders];
}
```

#### 7.2 升级 css-loader

```bash
pnpm add -D css-loader@6
```

css-loader@6 的配置差异：

```js
// 旧 — css-loader@0.28
{ loader: "css-loader", options: { sourceMap: true, minimize: true } }

// 新 — css-loader@6
{ loader: "css-loader", options: { sourceMap: true } }
// minimize 选项已移除，压缩由 css-minimizer-webpack-plugin 处理
```

#### 7.3 升级 less-loader

```bash
pnpm add -D less-loader@11 less@4
```

less-loader@11 配置变化：

```js
// 旧 — less-loader@5
{ loader: "less-loader", options: { sourceMap: true } }

// 新 — less-loader@11
{ loader: "less-loader", options: { sourceMap: true, lessOptions: { javascriptEnabled: true } } }
```

> `javascriptEnabled` 某些 Element UI 主题需要。

#### 7.4 升级 postcss-loader

```bash
pnpm add -D postcss-loader@7 postcss@8
```

postcss-loader@7 不再需要单独的 `.postcssrc.js`，配置可以内联：

```js
// 旧
{ loader: "postcss-loader", options: { sourceMap: true } }

// 新（如继续使用 .postcssrc.js）
{ loader: "postcss-loader", options: { sourceMap: true, postcssOptions: { config: path.resolve(__dirname, "../.postcssrc.js") } } }
```

或将 `.postcssrc.js` 重命名为 `postcss.config.js`（postcss-loader@7 默认查找路径）。

---

## Step 8: 升级 vue-loader 到 v15

```bash
pnpm add -D vue-loader@15
```

> **重要**：此阶段 `vue-loader` 升级到 **15**（Vue 2 的最终兼容版本），不是 16+。`vue-loader@16+` 是 Vue 3 专用，将在 Phase C 阶段升级。

### 8.1 vue-loader.conf.js 变更

```js
// 旧 — vue-loader@13 配置 (build/vue-loader.conf.js)
module.exports = {
  loaders: utils.cssLoaders({ sourceMap: sourceMapEnabled, extract: isProduction }),
  cssSourceMap: sourceMapEnabled,
  cacheBusting: config.dev.cacheBusting,
  transformToRequire: { video: ["src", "poster"], source: "src", img: "src", image: "xlink:href" }
};

// 新 — vue-loader@15 不再需要单独的配置文件
// 样式处理由 Webpack rules 统一管理
// transformToRequire 改为 transformAssetUrls（vue-loader@15 内置默认值）
```

### 8.2 webpack.base.conf.js 中的 vue-loader rule

```js
// 新 — vue-loader@15
{
  test: /\.vue$/,
  loader: "vue-loader"
  // 不再需要 options 引用 vue-loader.conf.js
}
```

### 8.3 VueLoaderPlugin

vue-loader@15 必须配合 `VueLoaderPlugin`（已在 Step 4.1 添加）。

---

## Step 9: 升级其他 Loader 与 Plugin

### 9.1 style-loader

```bash
pnpm add -D style-loader@3
```

### 9.2 移除 url-loader / file-loader

```bash
pnpm remove url-loader file-loader
```

已由 Webpack 5 内置 Asset Modules 替代（见 Step 4.2）。

### 9.3 html-webpack-plugin

```bash
pnpm add -D html-webpack-plugin@5
```

### 9.4 copy-webpack-plugin

```bash
pnpm add -D copy-webpack-plugin@11
```

（API 变更见 Step 5.5）

### 9.5 friendly-errors-webpack-plugin（如使用）

确认是否使用了 `friendly-errors-webpack-plugin`，如有需升级到兼容 Webpack 5 的版本：

```bash
pnpm add -D @soda/friendly-errors-webpack-plugin
```

---

## Step 10: 处理 Node.js Polyfill 问题

Webpack 5 不再自动提供 Node.js 核心模块的 polyfill。当前项目依赖了以下 Node 模块：

- `dgram`, `fs`, `net`, `tls`, `child_process` — 在 Webpack 3 中设为 `"empty"`
- `aws-sdk` 可能依赖 `buffer`、`crypto`、`stream` 等

### 处理方式

```js
// webpack.base.conf.js
resolve: {
  fallback: {
    dgram: false,
    fs: false,
    net: false,
    tls: false,
    child_process: false,
    // 如果 aws-sdk 报错，按需添加：
    // buffer: require.resolve("buffer/"),
    // crypto: require.resolve("crypto-browserify"),
    // stream: require.resolve("stream-browserify"),
    // path: require.resolve("path-browserify"),
    // os: require.resolve("os-browserify/browser"),
  }
}
```

如需 polyfill：

```bash
pnpm add -D buffer crypto-browserify stream-browserify path-browserify os-browserify
```

并添加 ProvidePlugin：

```js
const webpack = require("webpack");
plugins: [
  new webpack.ProvidePlugin({
    Buffer: ["buffer", "Buffer"],
    process: "process/browser"
  })
];
```

> 建议：先不加 polyfill，构建后根据报错按需添加。

---

## Step 11: 升级 pnpm

```bash
npm install -g pnpm@8
```

修改 `package.json`：

```json
{
  "packageManager": "pnpm@8.15.0"
}
```

### 注意

- pnpm 8 的 `pnpm-lock.yaml` 格式与 pnpm 7 不同，升级后需重新生成 lockfile
- 确认 CI/CD 环境中 pnpm 版本同步更新

---

## Step 12: 清理废弃依赖

### 确认移除列表

```bash
pnpm remove \
  babel-core babel-loader babel-preset-env babel-preset-stage-2 \
  babel-plugin-transform-runtime babel-plugin-transform-vue-jsx \
  babel-plugin-dynamic-import-node babel-helper-vue-jsx-merge-props \
  extract-text-webpack-plugin uglifyjs-webpack-plugin \
  optimize-css-assets-webpack-plugin \
  url-loader file-loader \
  webpack-dev-server  # 旧版，已安装新版
```

### 确认安装列表

| 包名                              | 版本 | 类型            |
| --------------------------------- | ---- | --------------- |
| `webpack`                         | 5.x  | devDependencies |
| `webpack-cli`                     | 5.x  | devDependencies |
| `webpack-dev-server`              | 4.x  | devDependencies |
| `webpack-merge`                   | 5.x  | devDependencies |
| `@babel/core`                     | 7.x  | devDependencies |
| `@babel/preset-env`               | 7.x  | devDependencies |
| `@babel/plugin-transform-runtime` | 7.x  | devDependencies |
| `@babel/runtime`                  | 7.x  | dependencies    |
| `babel-loader`                    | 9.x  | devDependencies |
| `vue-loader`                      | 15.x | devDependencies |
| `css-loader`                      | 6.x  | devDependencies |
| `less-loader`                     | 11.x | devDependencies |
| `less`                            | 4.x  | devDependencies |
| `style-loader`                    | 3.x  | devDependencies |
| `postcss-loader`                  | 7.x  | devDependencies |
| `postcss`                         | 8.x  | devDependencies |
| `mini-css-extract-plugin`         | 2.x  | devDependencies |
| `css-minimizer-webpack-plugin`    | 5.x  | devDependencies |
| `html-webpack-plugin`             | 5.x  | devDependencies |
| `copy-webpack-plugin`             | 11.x | devDependencies |

---

## 验收标准

### 功能验收

- [ ] `npm run dev` 正常启动，控制台无构建错误
- [ ] 首页加载正常，Element UI 组件样式正确渲染
- [ ] 至少验证以下核心页面功能无回归：
  - 登录/退出
  - 酒店订单列表
  - 机票订单列表
  - 火车票订单列表
  - 用车订单列表
  - 系统管理页面
- [ ] 路由懒加载正常工作（检查 chunk 文件加载）
- [ ] 代理转发正常（API 请求到达预发环境）
- [ ] Hot Module Replacement (HMR) 正常工作

### 构建验收

- [ ] `npm run build` 正常产出到 `dist/` 目录
- [ ] `npm run build:beta` 正常产出
- [ ] `npm run build:prod` 正常产出
- [ ] 构建产物可部署到测试环境并正常访问
- [ ] 构建速度对比 Webpack 3 有改善（Webpack 5 持久化缓存）
- [ ] Source map 正常生成

### 代码检查

- [ ] `npm run eslint` 通过（不引入新的 lint 错误）
- [ ] `npm run stylelint` 通过

---

## 回滚方案

Phase A 的所有变更应在独立分支上进行。如遇不可解决的问题：

1. 切回原分支，项目恢复 Webpack 3 + Babel 6 状态
2. `pnpm install` 重新安装原版依赖
3. `.nvmrc` 切回 `16.20`

---

## 已知风险与应对

| 风险                                               | 应对                                                                |
| -------------------------------------------------- | ------------------------------------------------------------------- |
| `@jd/sgm-web-webpack-plugin` 不兼容 Webpack 5      | 联系 SGM 团队确认，必要时暂时移除 source map 上传，改用手动上传     |
| `aws-sdk` 依赖大量 Node polyfill                   | 如 polyfill 引入过多，考虑按需引入或替换为 `@aws-sdk/client-s3`(v3) |
| Less 4 与 Element UI 自定义主题不兼容              | 在 `less-loader` 配置中添加 `lessOptions: { math: "always" }`       |
| `pnpm overrides` 中的补丁包不兼容新依赖            | 逐个检查 `node-sass -> sass`、`simple-endpoint` 等覆盖项            |
| `react/react-dom` (operational-slots) 与新构建冲突 | 确认 `@operational-slots` 在 Webpack 5 下正常编译                   |
| `vue-template-compiler` 版本必须与 `vue` 完全匹配  | 此阶段保持 Vue 2.7.12 不变，`vue-template-compiler@2.7.12` 保持安装 |

---

## 修改文件清单

| 文件                         | 操作                                      |
| ---------------------------- | ----------------------------------------- |
| `.nvmrc`                     | 修改（16.20 → 18.20）                     |
| `.babelrc`                   | 删除                                      |
| `babel.config.js`            | 新建                                      |
| `package.json`               | 修改（依赖版本、scripts、packageManager） |
| `build/webpack.base.conf.js` | 大幅修改                                  |
| `build/webpack.dev.conf.js`  | 大幅修改                                  |
| `build/webpack.prod.conf.js` | 大幅修改                                  |
| `build/utils.js`             | 修改（样式 loader 配置）                  |
| `build/vue-loader.conf.js`   | 可能废弃或简化                            |
| `build/check-versions.js`    | 可能需要更新版本检查逻辑                  |
| `config/index.js`            | 可能微调                                  |
| `.postcssrc.js`              | 可能重命名为 `postcss.config.js`          |
