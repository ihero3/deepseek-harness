# Fork 与上游同步手册

本文件是 fork 自有内容：上游没有这个路径，所以它**永远不参与冲突**。

**取舍的权威来源是 [FORK-FEATURES.md](FORK-FEATURES.md)**（个性需求台账，逐条写明必须保住什么、可以跟随上游什么、怎么验证）。
本文件负责操作流程、冲突地图与签名细节；两者冲突时以台账为准。

## 当前状态（2026-09-29，已合并 `639ed01539` / 0.2.0-rc.2）

上游 293 个提交已合并进 `master`（合并提交 `0672a89294`）。**下一次合并的冲突只可能来自"我们改过的上游文件"**，当前共 **56 个，其中二进制 0 个**：

| 分组 | 文件数 | 说明 |
| --- | --- | --- |
| `apps/desktop/**` | 39 | 打包流水线、外壳、locale、13 个测试与快照（品牌资源已移出上游路径） |
| `packages/**` | 11 | `app-boot`（profile 作用域修复）、`client/connection`、`ui-settings-models`（图片兜底）、`llm-pi-ai`（图片默认） |
| 根/脚本 | 6 | `.gitignore`、`package.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml`、两个脚本 spec |

**fork 独有路径（上游没有 → 永不冲突）**：`plugins/**`（33 个文件：Threerouter 集成与 image-video 两个产品插件）、
`apps/desktop/resources-fork/`（11 个品牌资源）、`apps/desktop/scripts/fork-packaging.mjs`、`apps/desktop/scripts/fork-adhoc-sign.mjs`、
`apps/desktop/src/private-plugins.ts`、`.agents/notes` 的 fork 记录、`marketing/**`、`FORK-SYNC.md`、`.github/workflows`。

## 合并后必须跑的验证（血的教训）

第一次量化风险集时发现：**之前几次合并已经静默吃掉了 fork 的行为，而 `apps/desktop` 的测试早就是红的**（16 个失败里 14 个在合并前就红），没人发现。丢的东西包括：

- Linux 打包环境文件支持（把 linux 当 macOS 去读 `.env.macos`）
- locale 品牌文案（`aboutMenu`/`startupFailed`/`updateTitle` 变回上游）
- `linux` 打包块（deb 目标、maintainer、icon、`dsh-threerouter-` 产物名）
- 插件 profile manifest 的"已有文件不动"契约
- **Windows 品牌资源**（任务栏、开发窗口、关于面板、安装页一度退回上游鲸鱼）

所以每次合并后至少跑：

```sh
pnpm run typecheck
pnpm exec vitest run apps/desktop/tests/
pnpm exec vitest run packages/boot/app-boot/tests/ packages/llm/llm-pi-ai/tests/ \
  packages/client/ui-settings-models/tests/ packages/client/connection/tests/
```

**红灯不要当噪音**：要么是被上游覆盖的 fork 行为（恢复代码），要么是上游新断言与 fork 品牌/平台的冲突（改断言）。两者都要显式处理。
`apps/desktop/tests/fork-packaging.spec.ts` 是"品牌接线"的守卫：品牌取值、图标路径、`extendInfo`、`extraResources` 被静默改动就会红灯。

## 同步流程

```sh
git fetch upstream
git merge-tree --write-tree --name-only master upstream/master   # 先看冲突面（只读、不落盘）
git merge upstream/master                                        # 按下面的冲突地图解析
（跑上面的验证）
git commit && git push origin master:master
```

本仓库已开启 `rerere.enabled=true` 与 `merge.conflictStyle=zdiff3`：同一次冲突第二次出现时 git 会自动重放解法，
上次那 5 个冲突的解法已被 `rerere` 记录。

## 冲突地图

| 文件 | 我们改了什么 | 解析原则 |
| --- | --- | --- |
| `apps/desktop/scripts/electron-builder-config.mjs` | 仅剩 **6 处门控**（Linux 跳过 policy 与 update feed、mac 签名与公证的 `!unsigned`、`unsigned` 平台白名单放宽、`afterSign` 的签名校验、`artifactBuildCompleted` 的公证守卫）+ 函数边界的 `const config = {…}` / `return applyForkPackagingDelta(config, { unsigned })` + 一行 import | 以上游新结构为准，把门控行贴回，其余全部由 fork 模块负责 |
| `apps/desktop/scripts/fork-packaging.mjs`（**fork 自有，永不冲突**） | 品牌名与产物前缀、三平台图标、`mac`/`dmg` 的 unsigned 覆盖、整个 `linux` 块 | fork 取值的唯一住处；改品牌/图标/产物名只改这里 |
| `apps/desktop/scripts/prepare-dsh.ts` | 调用 fork 自有模块 `src/private-plugins.ts` 物化 `plugins/**`；按**目标**平台选 Electron 可执行文件；未签名签名分支 | 保住私有插件两处调用与目标平台判断，其余取上游 |
| `apps/desktop/scripts/desktop-package-environment.mjs` | Linux 目标的 `.env.linux` 与"不要求 policy/update feed" | 恢复 Linux 分支 |
| `apps/desktop/scripts/prepare-windows-installer.ps1` | 5 张安装页位图从 `../resources-fork` 读取 | 保住取源目录一行 |
| `apps/desktop/src/locale.ts` | shell 文案品牌（`aboutMenu`/`startupFailed`/`updateTitle`，en+zh）；`aboutProduct` 故意不品牌化（被 tray、关闭确认等多处复用） | 恢复品牌文案 |
| `apps/desktop/src/main.ts` | 窗口 `applicationName` 品牌名；开发模式窗口图标指向 `resources-fork` | 保住两行 |
| `apps/desktop/src/project-manager.ts` | 产品 bundle 在前、第三方在后重排；bundle 未变化时不重写 manifest | 保住重排语义与"不重写"契约 |
| `apps/desktop/tests/**`、`expected/**` | 断言/快照随 fork 品牌、图标路径与 Linux 目标 | 以上游重写后的测试为准，只改品牌/平台/路径相关字面量 |
| `packages/**`（11 个） | profile 作用域修复、图片默认与兜底等行为修复 | 通常能自动合并；合并后跑上面的 packages 测试确认没被覆盖 |

## 品牌资源的唯一例外：Windows 托盘

`resources-fork/` 里有 11 个资源，但**托盘图标仍是上游鲸鱼**，且这不是合并丢失：

fork 的 `icon-windows.svg`（来自 `403a2a6203`）是 7 行扁平导出，**没有** `tray-glyph` 组，而 `renderTrayIconEntries` 的合约要求该组存在（缺了就 throw）。
手工补上该组后渲染全部尺寸可见：渲染器里硬编码的"绕底板中心放大 20%"是按鲸鱼几何调的，用在字标上会把左上角切出圆角底板（256px 肉眼可见，16px 更糊）。
`403a2a6203` 本身也没有重新生成过 `tray-windows.ico`——**托盘从来没有 fork 版本**，这是需要重新导出美术的活，不是同步问题。

## 签名：ad-hoc 是唯一的免费选项

macOS 上不存在免费的分发签名：Developer ID 证书与公证都需要付费开发者账号，免费 Apple ID 只给开发证书。免费的是 **ad-hoc 签名**
（`codesign --force --sign -`，无需证书、钥匙串、时间戳、公证），而 Apple Silicon 要求每个 arm64 Mach-O 都有有效签名，所以未签名的发布也必须签。
`apps/desktop/scripts/fork-adhoc-sign.mjs` 负责此事：签名标识符与 JIT entitlement 规则与上游 `signMacOSRuntime` 保持一致，但不带 `--keychain`/`--timestamp`/`--options runtime`。

- **能拿到**：arm64 上原生模块与 JIT 可以加载；本机与内测机可运行；`codesign --verify --strict` 自洽。
- **拿不到**：Gatekeeper 的"已识别开发者"。别人下载（带 quarantine）后需 `xattr -dr com.apple.quarantine "<app>"` 才能打开。
  `spctl --assess` 对 ad-hoc 包**必然拒绝**，`pnpm run verify:mac-signature`（按 Developer ID/Team ID 断言）也会失败——这两条都不是故障判据。
  判据是 `codesign -dv --verbose=4` 显示 `Signature=adhoc`、`TeamIdentifier=not set`，且包内 `*.node` 全部有签名。
- **验证配方**：先**退出正在运行的 App**（打包会重建 `.desktop-build/targets/mac-arm64`），再
  `pnpm --filter @deepseek-ai/dsh-desktop run package:mac:arm64:unsigned:dir`，然后按上面的判据核对。
  注意 `--unsigned` 只支持 `mac-arm64` 与 `win-x64`；`.env.macos` 里 `DSH_DESKTOP_MACOS_SIGNING_IDENTITY`、`DSH_DESKTOP_MACOS_TEAM_ID`、`CSC_*`、`APPLE_*` 全部留空。

## 三条减少冲突的规则

1. **新定制优先放 fork 自有路径**：`plugins/**`、`apps/desktop/resources-fork/`、`scripts/fork-packaging.mjs`、新增文件、`cordis.patch.yml` 里的行。
2. **必须改上游文件时，只留一个 import + 一处调用**（或最小的一行门控）：真实逻辑放 fork 自有模块。
   品牌与打包取值已经这么做；`electron-builder-config.mjs` 现在只剩函数边界两行 + 6 处门控。
3. **通用能力优先上游化**：Linux 打包目标与未签名 macOS 上游都不支持，已整理成 PR 分支（见待办）。

## 待办

- [x] 品牌资源搬出上游路径（11 个资源进 `apps/desktop/resources-fork/`，上游 `resources/`、`installer/assets/` 逐字节等于上游）
- [x] 收敛 `electron-builder-config.mjs` 的 fork 取值到 `scripts/fork-packaging.mjs`
- [x] 恢复被静默吃掉的 Windows/安装页品牌资源，并加守卫测试
- [x] **ad-hoc 运行时签名**（macOS 上唯一的免费签名方案）：`scripts/fork-adhoc-sign.mjs` 对运行时树执行 `codesign --force --sign -`；
      unsigned 构建不再需要任何 Apple 凭据（此前该分支在缺 Team ID / 钥匙串时直接失败，等于没有"未签名"这条路）。验证方式见下面"签名"一节。
- [ ] **托盘美术**：重新导出带 `tray-glyph` 的 `icon-windows.svg`，指到 `resources-fork/` 并重跑 `pnpm run render:tray-icon`。
- [x] **不做上游 PR**（fork owner 决定）：`feat/desktop-linux-target` 只留本地作参考、不推送；不再规划上游化，只守"少冲突 + 冲突来了就解决"。
- [ ] 每次合并后回来更新本文档的风险集数字。
