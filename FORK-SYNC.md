# Fork 与上游同步手册

本文件是 fork 自有内容：上游没有这个路径，所以它**永远不参与冲突**。

## 当前状态（2026-09-29，已合并 `639ed01539` / 0.2.0-rc.2）

上游 293 个提交已合并进 `master`（合并提交 `0672a89294`）。**下一次合并的冲突只可能来自"我们改过的上游文件"**，当前共 **57 个**：

| 分组 | 文件数 | 说明 |
| --- | --- | --- |
| `apps/desktop/**` | 39 | 打包流水线、外壳、locale、**5 个二进制品牌资源**（`icon*.png/svg`、`uninstaller-sidebar.png`）、13 个测试与快照 |
| `packages/**` | 12 | `app-boot`（profile 作用域修复）、`client/connection`、`ui-settings-models`（图片兜底）、`llm-pi-ai`（图片默认） |
| 根/脚本 | 6 | `.gitignore`、`package.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml`、两个脚本 spec |

**fork 独有路径（上游没有 → 永不冲突）**：`plugins/**`（33 个文件：Threerouter 集成与 image-video 两个产品插件）、
`apps/desktop` 里 5 个新增文件（如 `src/private-plugins.ts`）、`.agents/notes` 的 fork 记录、`marketing/**`、`FORK-SYNC.md`、`.github/workflows`。

想进一步缩小风险集，见文末待办：搬走 5 个二进制资源、收敛打包逻辑、把通用能力上游化。

## 合并后必须跑的验证（本次教训）

这次合并暴露出：**之前几次合并已经静默吃掉了 fork 的行为**，而 `apps/desktop` 的测试**早就是红的**（16 个失败里 14 个在合并前就红），
没人发现。丢的东西包括：Linux 打包环境文件支持、locale 品牌文案、`linux` 打包块（deb 目标）、插件 profile manifest 的"不重写"契约。

所以每次合并后至少跑：

```sh
pnpm run typecheck
pnpm exec vitest run apps/desktop/tests/                      # fork 改动最密集的地方
pnpm exec vitest run packages/boot/app-boot/tests/ packages/llm/llm-pi-ai/tests/ \
  packages/client/ui-settings-models/tests/ packages/client/connection/tests/
```

**红灯不要当噪音**：要么是被上游覆盖的 fork 行为（恢复代码），要么是上游新断言与 fork 品牌/平台的冲突（改断言）。两者都要显式处理。

## 同步流程

```sh
git fetch upstream
git merge-tree --write-tree --name-only master upstream/master   # 先看冲突面（只读、不落盘）
git merge upstream/master                                        # 按下面的冲突地图解析
（跑上面的验证）
git commit && git push origin master:master
```

本仓库已开启 `rerere.enabled=true` 与 `merge.conflictStyle=zdiff3`：同一次冲突第二次出现时 git 会自动重放解法，
且本次 5 个冲突的解法已被 `rerere` 记录。

## 冲突地图

| 文件 | 我们改了什么 | 解析原则 |
| --- | --- | --- |
| `apps/desktop/scripts/electron-builder-config.mjs` | Linux 不要求更新策略/更新源、`linux` 块（AppImage+deb、maintainer、icon、`dsh-threerouter-` 产物名）；macOS 允许未签名（ad-hoc、跳过公证与签名缓存）；品牌名与产物前缀；`extendInfo` 合并（上游重复写了两次，后者覆盖前者会丢本地化） | 以上游新结构为准，把豁免条件、`linux` 块、品牌值贴回 |
| `apps/desktop/scripts/prepare-dsh.ts` | 调用 fork 自有模块 `src/private-plugins.ts` 物化 `plugins/**`；按**目标**平台选 Electron 可执行文件；未签名分支 | 保住私有插件两处调用与目标平台判断，其余取上游 |
| `apps/desktop/scripts/desktop-package-environment.mjs` | Linux 目标的 `.env.linux` 与"不要求 policy/update feed" | 恢复 Linux 分支 |
| `apps/desktop/src/locale.ts` | shell 文案品牌（`aboutMenu`/`startupFailed`/`updateTitle`，en+zh）；`aboutProduct` 故意不品牌化（被 tray、关闭确认等多处复用） | 恢复品牌文案 |
| `apps/desktop/src/main.ts` | 窗口 `applicationName` 品牌名 | 保住一行 |
| `apps/desktop/src/project-manager.ts` | 产品 bundle 在前、第三方在后重排；bundle 未变化时不重写 manifest | 保住重排语义与"不重写"契约 |
| `apps/desktop/tests/**`、`expected/**` | 断言/快照随 fork 品牌与 Linux 目标 | 以上游重写后的测试为准，只改品牌/平台相关字面量 |
| `packages/**`（12 个） | profile 作用域修复、图片默认与兜底等行为修复 | 这些通常能自动合并；合并后跑上面的 packages 测试确认没被覆盖 |

## 三条减少冲突的规则

1. **新定制优先放 fork 自有路径**：`plugins/**`、新增文件、`cordis.patch.yml` 里的行（用配置改行为，而不是改上游代码）。
   侧边栏品牌与账号行的替换、两个产品插件全程零冲突。
2. **必须改上游文件时，只留一个 import + 一处调用**：真实逻辑放 fork 自有模块（`apps/desktop/src/private-plugins.ts` 是范例）。
3. **通用能力优先上游化**：Linux 打包目标与未签名 macOS 上游都不支持（`package-target.ts` 无 linux 目标、`electron-builder-config.mjs` 要求 unsigned 只能是 Windows）。

## 待办

- [ ] **搬走 5 个二进制品牌资源**：让 `electron-builder-config.mjs`/NSIS 配置指向 fork 自有目录（如 `plugins/brand/assets/`），
      上游的 `resources/icon*.png|svg`、`installer/assets/uninstaller-sidebar.png` 保持原样 → 风险集直接少 5 个（且是合并最痛的二进制冲突）。
- [ ] **收敛打包逻辑**（A）：把散在 `electron-builder-config.mjs`、`prepare-dsh.ts` 函数体中段的 fork 分支移进 fork 自有模块 + 一处调用，
      让冲突从"函数体中段"移到"函数边界"。
- [ ] **上游 PR**（B）：Linux 打包目标（含 `.env.linux`、deb 目标、`prepare-cli` 的 Linux 可执行位）、未签名 macOS 构建、
      `mac` 块 `extendInfo` 重复键修复。被接受后 `desktop-package-environment.mjs`、`prepare-cli.ts` 等可回归上游版本。
- [ ] 合并后回来更新本文档的风险集数字。
