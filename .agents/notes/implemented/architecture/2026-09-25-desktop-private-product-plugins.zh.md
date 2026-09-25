# Agent Note：将私有产品插件随打包的 dsh 运行时一起发布

Status: implemented

[English](2026-09-25-desktop-private-product-plugins.md) | 中文

## Problem

Threerouter 品牌（侧边栏 logo 与文字标识）和图文/视频生成工具是 `plugins/` 下的私有包：`dsh-plugin-threerouter` 与 `dsh-image-video`。它们在 dsh 核心包集合之外，因此[运行时准备](../../../../apps/desktop/scripts/prepare-dsh.ts)物化的生产依赖图不包含它们，打包出的 `app.asar/dsh` 中同样不存在。

桌面 profile 已将这两个包列为启用的 bundles。在没有开发工作区的机器上，Host 在启动前就因 bundle 解析失败而中止（`dsh: cannot resolve profile bundle "dsh-image-video"`）。已发布版本显示默认的 DeepSeek 品牌，正是因为品牌插件从未加载；在开发机上，同一 profile 仅靠本地开发遗留的 `node_modules` junction 才能工作。

## Decision

私有产品插件属于发布运行时的一部分，而不是由 profile 安装的外部插件。打包构建在标准 `build:official` 步骤之后运行新增的根脚本 `build:plugins`，通过各插件包内的 tsdown 配置完成构建。

[运行时准备](../../../../apps/desktop/scripts/prepare-dsh.ts)调用 `materializePrivatePlugins`（[private-plugins.ts](../../../../apps/desktop/src/private-plugins.ts)）：先校验每个插件的清单（包名、与发布一致的精确版本、已构建的 host/client 入口、`cordis.patch.yml`），在运行时描述符封印文件清单之前把 `package.json`、`cordis.patch.yml` 和 `lib/` 复制到已准备好的 `dsh/node_modules/<plugin>` 目录，随后导入复制后的各 host 入口，证明其导入能从打包的 dsh 包家族解析，而打包运行时冒烟测试会从打包树启动这些 bundles。插件通过既有的 `dsh/node_modules` asar 映射进入 `app.asar/dsh/node_modules`，因此随包 profile 的 bundles 可以离线解析，无需在 profile 中声明依赖。

本 note 不改变外部插件的处理：用户安装的插件仍是 profile 依赖，由 [bundled-runtime 决策](2026-09-08-desktop-bundled-runtime-and-external-plugins.zh.md) 拥有，且 profile 中的条目仍优先于随包副本。

## 考虑过的替代方案

**把插件声明为 profile 依赖。** profile 已经以依赖方式安装外部插件。这两个包是私有且未发布的，没有 registry 能解析它们；作为 profile 依赖会把安装与链接重新带回首次启动，同一个失败会再次出现。

**把 `plugins/*` 纳入 dsh 核心包集合。** [core-package-set.ts](../../../../apps/desktop/src/core-package-set.ts) 拥有的是一份经过签名与版本校验的包集合，其闭包根为 `@deepseek-ai/dsh` 与 `@deepseek-ai/dsh-desktop-host`。纳入产品私有包会改变该已发布依赖图与 profile 安装集合，相比直接复制构建产物没有任何收益。

## Consequences

在没有开发工作区的机器上，发布版本同样携带 Threerouter 品牌与图文/视频工具，Host 不再因内置 bundles 解析失败而启动中止。本次变更前带有开发 junction 的旧 profile 继续有效；删除 `$DSH_HOME/profiles/desktop` 即可复现干净的首次启动。

[Desktop README](../../../../apps/desktop/README.zh.md) 记录了对应打包行。聚焦测试覆盖复制、清单校验、未构建入口拒绝、重新物化与 host 导入验证。新增私有产品插件时，需要把它加入 `PRIVATE_PLUGIN_NAMES` 并将其版本与发布版本对齐。
