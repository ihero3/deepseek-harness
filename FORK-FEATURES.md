# Fork 个性需求台账（fetch upstream → merge master）

本文件是 fork 自有路径：上游没有这个文件，所以它**永远不参与冲突**。

它是**需求台账**：记录这个 fork 相对上游刻意保留的一切定制，以及每条定制在合并上游时"必须保住什么、可以放弃什么、怎么验证"。
机械的同步命令与冲突地图见 [FORK-SYNC.md](FORK-SYNC.md)；本文件是**取舍的权威来源**，冲突时以本文件的"必须保留"为准。

- 最后整理：2026-10-11（已含上游 0.2.1-alpha.1）
- 一句话定位：这是 **Threerouter 定制版桌面客户端**——品牌、三平台打包（含 Linux x64 与免证书构建）、两个私有产品插件（Threerouter 登录与图片/视频生成）随包发布。

## 一、这份文件怎么用

### 1. 更新上游**前**：先整理需求

1. 读本文件第二、三节，确认每条需求的"必须保留的最小内容"。
2. 跑只读预检，看这次要面对多少冲突：
   ```sh
   git fetch upstream
   git merge-tree --write-tree --name-only master upstream/master
   ```
   第一条输出是结果树 OID；其后每一行都是**会冲突的文件**，且不落盘、不动工作区。
3. 如果出现本文件第六节之外的新冲突文件，说明上游动了新地方，先在本文件登记一条新需求，再开始合并。

### 2. 更新与合并

```sh
git fetch upstream                     # 只更新引用，永不冲突
git merge upstream/master              # 冲突按本文第三节取舍
git status                             # 看剩余未解决文件
（逐条解决 → git add）
（跑第七节验证）
git commit && git push origin master
```

- `rerere.enabled=true` 已开启，历史上解过的**同样冲突会自动重放**（第五、六节有清单）。
- 想连 `git add` 也省掉：`git config rerere.autoUpdate true`。
- **不要 rebase、不要 `-X theirs`/`-X ours`、不要整文件 `git checkout --theirs`**：前者会把 44 个提交逐个重放，后两者正是历史上"静默吃掉 fork 行为"的元凶。

### 3. 合并时的取舍规则（按优先级从高到低）

1. **fork 自有路径**（见第四节）：无条件保留，冲突几乎不可能，若冲突说明文件被上游新增同名 → 改 fork 侧命名。
2. **本文件第三节列出的"必须保留"**：逐条贴回上游新结构，其余取上游。
3. **上游重构了承载文件**：以上游的**新结构为骨架**，把 fork 的最小改动贴回（只留 import + 一处调用/门控），不要保留旧结构。
4. **上游删除/改名了我们改过的文件**：视为上游重构 → 在 fork 自有模块里重建等价行为并登记；不要硬留旧文件。
5. **本文件第五节列出的部分**：直接跟随上游，不要纠缠。
6. **判断不了时**：以上游为准，但必须在第八节登记"待确认"，**不许静默丢**；能跑测试跑测试（红灯就是判据）。

### 4. 合并后

跑第七节验证命令 → 全绿才 push → 回填第九节的数字。

## 二、需求总表

按主题读：**品牌与三平台打包** R01–R05；**两个产品插件** R06–R08、R17；**上游文件的必要修复** R10–R12、R21；**工程与同步流程** R09、R13–R16、R18；**CI 与宿主兼容** R19、R20；**启动流程** R22；**人机操作能力** R23；**设置面板可见项** R24。

| 编号 | 需求 | 承载位置 | 独有？ | 冲突取舍一句话 |
| --- | --- | --- | --- | --- |
| R01 | 产品身份：`Deepseek Harness for Threerouter` | `fork-packaging.mjs`、`src/locale.ts`、`src/main.ts` | 部分 | 三处文案必须贴回；`aboutProduct` 保持上游 |
| R02 | 产物命名 `dsh-threerouter-*`（含 `-unsigned` 后缀） | `fork-packaging.mjs` | 是 | 只在 fork 模块里，冲突不影响 |
| R03 | 三平台图标与安装页美术（`resources-fork/`） | `resources-fork/`、`prepare-windows-installer.ps1`、`main.ts` | 部分是 | 保住指向 `resources-fork` 的引用行 |
| R04 | Linux x64 打包目标（AppImage + deb） | 11 个 desktop 脚本 + `fork-packaging.mjs` 的 `linux` 块 | 部分 | 保住全部 linux 分支/类型放宽 |
| R05 | 免证书构建：Windows `--unsigned` + macOS ad-hoc 签名 | `package-target.ts`、`electron-builder-config.mjs`、`prepare-dsh.ts`、`fork-adhoc-sign.mjs` | 部分 | 保住 unsigned 门控与 ad-hoc 调用 |
| R06 | 私有产品插件随包发布并进入 profile（版本走 peer 兼容区间） | `src/private-plugins.ts`、`prepare-dsh.ts`、`src/project-manager.ts` | 部分 | 保住两处调用 + "不重写 manifest"契约 + peer 兼容校验口径 |
| R07 | Threerouter 登录、品牌接管、模型路由 | `plugins/dsh-plugin-threerouter/**` | 是 | 永不冲突；上游改插槽名时改 patch |
| R08 | 图片/视频生成工具（4 个 provider，含图生图/图生视频） | 子模块 `plugins/dsh-image-video` → `ihero3/dsh-image-video` | 是 | 子模块 pointer 永不冲突；升级 = 推送插件仓库 + bump pin |
| R09 | 开发流程：`build:plugins`、dev 构建插件 | 根 `package.json`、`scripts/dev.ts`、`project-manager.ts` | 部分 | 加法式改动，冲突时两边都留 |
| R10 | profile 作用域修复（插件 bundle 可解析） | `packages/boot/app-boot/src/profile.ts`、`src/profile-resolution/resolver.ts` | 否 | 保住"不删 bundleLinks"那一行 + refresh 守卫的 profile 例外 |
| R11 | RPC 调用者 Context 修复（剥离 shadow） | `packages/client/connection/src/rpc-host.ts` | 否 | 保住 `callerCtx` |
| R12 | 图片输入默认开启 | `packages/llm/llm-pi-ai/src/config.ts`、`ui-settings-models/.../ModelInputTypes.tsx` | 否 | 保住两处 `['text','image']` |
| R13 | 桌面双语文档中的 fork 资源路径与托盘渲染说明 | `apps/desktop/README*.md`、`README.i18n.yaml` | 部分 | 只贴回路径与托盘段落，其余取上游 |
| R14 | 工程杂项：workspace 收录 `plugins/*`、忽略项、依赖 override | 根 `package.json`、`pnpm-workspace.yaml`、`.gitignore`、`pnpm-lock.yaml` | 部分 | 声明式改动全部保留；lockfile 重新生成 |
| R15 | fork 自有桌面发布 CI | `.github/workflows/desktop-release.yml` | 是 | 永不冲突 |
| R16 | 市场物料 | `marketing/**` | 是 | 永不冲突 |
| R17 | 模型路由声明值：上下文窗口 1000000、回复上限 250000 | `plugins/dsh-plugin-threerouter` 的 provisioning | 是 | 永不冲突；改小会让长回答被截断或误报超限 |
| R18 | 生成物与清单文件的合并驱动 | `.gitattributes`（3 行）、`scripts/fork-merge/**` | 部分是 | 保住那 3 行 `merge=` 绑定；驱动命令由 `install.mjs` 注册 |
| R19 | 有密钥 CI 作业打 Threerouter 网关（含一方端点套件自跳过） | 两个 workflow、`smoke-python-runtime.py`、`ci-workflow.spec.ts`、5 个 `*.e2e.ts`、`python/development.{md,zh.md}` | 部分 | 保住网关域名 + `DSH_SMOKE_MODEL` 覆盖 + 5 处跳过谓词 |
| R20 | Windows 无符号链接权限时测试可跑 | `scripts/repo-files.spec.ts`、`scripts/project-doc-site.spec.ts` | 否 | 保住探针式 skip 与 junction 夹具；不得削断言换绿 |
| R21 | 子模块文档不参与本仓库的双语门禁 | `scripts/translation-pairing.ts` 的作用域排除表 | 否 | 保住 `plugins/dsh-image-video/**` 一行（与 `vendor/**` 同型） |
| R22 | 启动直接进工作区，不显示上游欢迎窗口（登录走侧边栏底部 Threerouter 入口） | `apps/desktop/src/main.ts`、`apps/desktop/tests/fork-welcome-skip.spec.ts`、`apps/desktop/tests/welcome-startup.spec.ts` | 部分是 | 保住 `DSH_DESKTOP_WELCOME_WINDOW` 那 1 行常量与 4 处门控；上游重写 `main.ts` 时按同语义贴回 |
| R23 | 浏览器与桌面操作能力（browser-use + computer-use，含 agent 操作右侧侧边栏浏览器） | `$DSH_HOME/profiles/*/cordis.patch.yml`（用户态配置，不是仓库文件）+ 本文件第三节 | 是 | 纯配置、上游包不改；发布版要支持 attach 需改代码，届时另开一条 R |
| R24 | 设置面板不给用户展示「内置插件 / Agent 预设」两页（「模型」保留，用于改服务商与模型目录） | `packages/client/ui-settings-general/src/client/index.ts`（`HIDDEN_SECTION_IDS` + 导航投影里那一处 `filter`）+ 其 `tests/shell.client.spec.ts` 的 `PRODUCT_SECTIONS` | 否 | 保住隐藏清单与那一处 `filter`；上游重写 rows 投影时按同语义贴回，只留这两处 |

## 三、逐条需求（合并时的权威判据）

### R01 产品身份
- **要什么**：应用名（关于面板、菜单、启动失败、更新标题）是 `Deepseek Harness for Threerouter`。注意大小写就是 `Deepseek`，**不要**改成 `DeepSeek`。
- **承载**：
  - `apps/desktop/scripts/fork-packaging.mjs` → `FORK_PRODUCT_NAME`，经 `applyForkPackagingDelta` 写进 electron-builder 的 `productName`。
  - `apps/desktop/src/locale.ts` → `aboutMenu`、`startupFailed`、`updateTitle` 的 en 与 zh 共 6 处。
  - `apps/desktop/src/main.ts` → `app.setAboutPanelOptions({ applicationName })`。
- **必须保留**：上述 6 处文案 + `applicationName` 一行。
- **故意不动**：`apps/desktop/src/locale.ts` 的 `aboutProduct` 与 `hideApplication` 等保持上游 `DeepSeek Harness`——`aboutProduct` 被托盘、关闭确认等多处复用。
- **冲突取舍**：上游若重写 `locale.ts`，以上游结构为准逐键贴回这 6 个值；上游新增的键一律跟随上游。
- **验证**：`apps/desktop/tests/profile-brand.spec.ts`、`expected/about-panel.json`（该快照里 4 个平台/语言组合的名称都是 fork 名）。

### R02 产物命名
- **要什么**：所有发布产物前缀 `dsh-threerouter`；unsigned 产物额外带 `-unsigned` 后缀，绝不与正式产物同名。
- **承载**：`fork-packaging.mjs` 的 `FORK_ARTIFACT_PREFIX`、`artifactName`、`linux.artifactName`、`linux.executableName`；`apps/desktop/package.json` 的 `homepage`。
- **必须保留**：`artifactName` 模板与 `-unsigned` 后缀逻辑。
- **冲突取舍**：取值只在 fork 模块里；上游改 `electron-builder-config.mjs` 的结构时，只要保住函数末尾的 `const config = {…}` + `return applyForkPackagingDelta(config, { unsigned })` 两行与那行 import。

### R03 品牌美术
- **要什么**：应用图标、安装器位图、卸载页侧图、Windows 托盘全部是 Threerouter 美术，放在 `apps/desktop/resources-fork/`（12 个文件）。
- **承载与引用点**：
  - `fork-packaging.mjs` → `mac.icon` / `win.icon` / `linux.icon`、`extraResources` 里 `icon.png` 取 `icon-windows.png`、`tray.ico` 取 `tray-windows.ico`。
  - `apps/desktop/src/main.ts` → `brandIconPath()`（**开发模式**窗口 `icon` 与 About 面板）；**开发模式**托盘路径指向 `resources-fork/tray-windows.ico`。
  - `apps/desktop/scripts/fork-tray-icon.ts` → 整幅渲染 `resources-fork/icon-windows.svg` 生成 `resources-fork/tray-windows.ico`（`pnpm run render:tray-icon-fork`）。
  - `apps/desktop/scripts/prepare-windows-installer.ps1` → 5 张安装页位图从 `../resources-fork` 读取。
- **必须保留**：上述路径引用与托盘渲染脚本。
- **绝对不要动**：上游路径 `apps/desktop/resources/**` 与 `apps/desktop/installer/assets/**` 必须与上游逐字节一致（这是冲突面的隔离手段）。
- **托盘不复用上游渲染器**：fork 的 `icon-windows.svg` 是扁平导出、没有 `tray-glyph` 组，且上游渲染器"绕底板中心放大 20%"按鲸鱼几何调整、会把字标切角，故 fork 整幅光栅化，只借上游的 `packIco`/`TRAY_ICON_SIZES`。不要"修"回上游渲染器。
- **验证**：`apps/desktop/tests/fork-packaging.spec.ts`、`tray-icon.spec.ts`、`installer-packaging.spec.ts`（品牌接线守卫）。

### R04 Linux x64 打包目标
- **要什么**：在 Linux x64 主机上能打出 AppImage + deb 产物；Linux 发布**没有**强制更新策略、没有更新 feed、不进入上传流程。
- **上游已具备的部分（2026-10-11 同步实测）**：`desktopTargetPlatform()` 上游已有（返回值仍是 darwin/win32），`prepare-runtime.ts` 上游已重构成 `prepareElectron({platform,arch})`。所以 fork 侧只剩"值"层面的三处：`SUPPORTED_TARGETS` 加 `linux-x64`、`desktopTargetPlatform` 返回 `linux`、Electron 可执行文件在 Linux 上叫 `electron` 且要补可执行位。
- **必须保留（分散在上游文件里的最小改动）**：
  - `scripts/desktop-build-paths.{mjs,d.mts}`：`SUPPORTED_TARGETS` 加 `linux-x64`；`DesktopBuildTarget` 类型 = 自动更新目标 ∪ `linux-x64`；`desktopTargetPlatform` 返回 `linux`。
  - `scripts/prepare-runtime.ts`：`prepareElectron` 里 Linux 取 `electron` 并 `chmodSync(0o755)`（上游只认 mac/win 两种取法）。
  - `scripts/prepare-dsh.ts`：`NODE` 按**目标**平台取（`TARGET` 常量）、`target = { ...TARGET }`。
  - `scripts/desktop-package-environment.{mjs,d.mts}`：`platform` 允许 `linux`；读 `.env.linux`；`LINUX_SETTING` 只接受 `DSH_DESKTOP_APP_ID`；policy 解析跳过 `linux`（上游同期要求 `darwin && unsigned` 也跳过，合并后是 `target.platform !== 'linux' && (target.platform !== 'darwin' || !options.unsigned)` 一个组合条件）。
  - `scripts/electron-builder-config.mjs`：`policy` 与 update feed 在 `linux` 下为 `undefined`（与上游的 `unsigned` 门控合成一个条件）；unsigned 的平台守卫保留（Linux 不得 unsigned，见 R05）。
  - `apps/desktop/electron-builder.config.d.mts`：以上字段的类型面（`productName`、`linux` 块、`mac.icon`/`win.icon`、`hardenedRuntime`、`CFBundleLocalizations`）。
  - `scripts/package-target.ts`：`linux-x64` 目标（`--linux`）、必须 Linux x64 宿主、无 update 目标时不写 release record。
  - `scripts/prepare-cli.ts`：非 Windows 的 launcher 都要可执行位。
  - `scripts/desktop-toolchain-preflight.ts`、`scripts/development-project.ts`、`scripts/desktop-upload-plan.ts`、`scripts/upload-target.ts`：类型/目标名放宽（打包目标名与上传目标名分离，Linux 只打包不上传）。
  - `fork-packaging.mjs` 的 `linux` 块：`maintainer: ihero3 <ihero.cn@gmail.com>`、`icon`、产物名保持 `linux-x64` 拼写、`target: ['AppImage','deb']`、`executableName`。
- **冲突取舍**：上游重写这些函数时，**以上游新结构为骨架**，把 linux 分支与类型放宽逐处贴回；`fork-packaging.mjs` 的 linux 块是 fork 唯一住处，优先往那里放。
- **验证**：`apps/desktop/tests/desktop-build-paths.spec.ts`、`package-target.spec.ts`、`desktop-package-environment.spec.ts`、`installer-packaging.spec.ts`；真打包需 Linux x64 主机。

### R05 免证书构建
- **要什么**：没有付费 Apple 账号也能产出可运行的 macOS 包（ad-hoc 签名），Windows `--unsigned` 保持上游行为。
- **上游已具备的部分（2026-10-11 同步实测）**：上游现在自己支持 unsigned macOS——`mac.identity='-'`、`forceCodeSigning=false`、`notarize=false`、`dmg.sign=false`、`publish=null`、产物带 `-unsigned` 后缀并落在 `unsigned-artifacts` 目录，CLI 也接受 `win-x64`/`mac-arm64`/`mac-x64`。**fork 只剩两件事**：① 运行时树的 ad-hoc 签名（上游 unsigned 时干脆不签运行时）；② 拒绝 Linux（上游没有 Linux 目标，所以上游不需要这条守卫）。
- **为什么运行时还要签**：本仓库 electron-builder 的 `signIgnore` 明确排除 `/Contents/Resources/app.asar.unpacked/dsh` 与 `/Contents/Resources/runtime/primary-runtime`（这两棵树由 `signMacOSRuntime` 在打包前签），所以 unsigned 构建里 electron-builder 不会替它们补签；Apple Silicon 上未签的 arm64 Mach-O 无法加载，必须由 fork 自己 ad-hoc 签。
- **必须保留**：
  - `scripts/package-target.ts`：`UNSIGNED_TARGETS = new Set(['win-x64','mac-arm64','mac-x64'])`（跟随上游放开 mac-x64，**仍排除 `linux-x64`**）；`--unsigned` 允许 mac-arm64 与 mac-x64；`DSH_DESKTOP_UNSIGNED` 写进 electron-builder 环境；unsigned 时跳过 macOS 钥匙串包装、跳过公证分支、不写 release record。
  - `scripts/electron-builder-config.mjs`：unsigned 的平台守卫 `unsigned && resolvedPlatform !== 'win32' && resolvedPlatform !== 'darwin'` → 抛 `unsigned builds require Windows or macOS`（上游已删除同款守卫，Linux 靠这条挡住）。
  - `scripts/prepare-dsh.ts`：`DSH_DESKTOP_UNSIGNED === '1'` 走 `signMacOSRuntimeAdHoc`，否则走上游 `signMacOSRuntime`；判据用 `target.platform === 'darwin'`（不是 `process.platform`）。
  - `scripts/fork-adhoc-sign.mjs`（fork 自有）：`codesign --force --sign -`，签名标识符与 JIT entitlement 规则对齐上游 signer，但不用 keychain/timestamp/runtime 选项。
  - `fork-packaging.mjs`：unsigned 时 `mac.identity='-'`、`forceCodeSigning=false`、`hardenedRuntime=false`、`notarize=false`、`dmg.sign=false`。
- **待确认**：上游既有 unsigned macOS，日后可用一次真机 unsigned arm64 打包验证"去掉 fork 的运行时 ad-hoc 签名是否仍能启动"，能启动就按第八节注销掉半条。
- **判据（别把正常现象当故障）**：ad-hoc 包上 `spctl --assess` **必然拒绝**、`pnpm run verify:mac-signature`（按 Developer ID/Team ID 断言）**必然失败**。真判据是 `codesign -dv --verbose=4` 显示 `Signature=adhoc`、`TeamIdentifier=not set`，且包内 `*.node` 都有签名。
- **验证**：`apps/desktop/tests/fork-adhoc-sign.spec.ts`、`fork-adhoc-sign-macos.spec.ts`、`macos-signature.spec.ts`、`package-target.spec.ts`。

### R06 私有产品插件随包发布
- **要什么**：`plugins/` 里的两个产品插件不在上游包集里，必须被物化进打包后的 dsh `node_modules`，并作为 profile bundle 加载。
- **必须保留**：
  - `apps/desktop/src/private-plugins.ts`（fork 自有）：`PRIVATE_PLUGIN_NAMES`、复制 `package.json`/`cordis.patch.yml`/`lib`、校验 host/client 入口。
  - **版本校验口径**：插件按自己的 semver 走（`dsh-image-video` 在独立仓库发布，不再随桌面版本号），客户端只校验它对 `@deepseek-ai/dsh*` 的 peer 区间与发布版本兼容——复用 `@deepseek-ai/dsh-app-boot` 的 `evaluatePluginCompatibility(manifest, {}, releaseVersion)`，不兼容时报出具体 peer；**不要**退回「manifest.version 必须等于发布版本」的字符串相等校验（那会让独立版本线永远打不了包）。无 dsh peer 声明的插件按兼容处理，仍由构建产物与 host import 校验兜底。
  - `scripts/prepare-dsh.ts`：`materializePrivatePlugins(...)` + `await verifyPrivatePluginHostImports(...)` 两处调用。
  - `apps/desktop/src/project-manager.ts`：`LOCAL_PLUGIN_BUNDLES = ['dsh-image-video','dsh-plugin-threerouter']`；bundle 顺序**产品在前、已装第三方在后**；顺序已一致时**不重写 manifest**（这条"不重写"契约必须保留，否则每次启动都 churn）。
- **冲突取舍**：上游重写 `createPluginProfile`/`createDevelopmentProjectMetadata` 时，以上游结构为骨架，把"产品 bundle 前置 + 第三方保留 + 不变化不重写"三条语义贴回；上游加强版本校验时，保留"peer 兼容区间"这一口径。
- **验证**：`apps/desktop/tests/private-plugins.spec.ts`（含「独立版本号 + 兼容 peer 区间被接受」与「不兼容 peer 被拒绝」两条）、`packages/boot/app-boot/tests/profile-resolution.spec.ts`。

### R07 Threerouter 集成（登录 + 品牌接管）
- **要什么**：侧边栏品牌换成 Threerouter；`settings.launcher` 位置由 Threerouter 账号 chip 占据（登录 Threerouter，而不是上游账号服务）；补 composer 媒体标签页、hero 品牌、logo、样式与客户端文案。
- **承载（全部 fork 自有，永不冲突）**：`plugins/dsh-plugin-threerouter/**`，重点是 `src/host/threerouter-auth.ts`、`src/host/plugin.ts`、`src/client/threerouter-auth-ui.tsx`、`hero-brand.tsx`、`composer-media-tabs.tsx`、`locale.ts`、`media-toolview*.tsx`、`styles.ts`。
- **profile 接线**：`plugins/dsh-plugin-threerouter/cordis.patch.yml` 禁用 `ui-brand-official` 与 `ui-settings-account`（两处都是 `single` 槽位，靠 disable 而非优先级取胜），并 `insert: threerouter-integration`。
- **冲突取舍**：上游若**改名**了槽位、插件 id 或 profile manifest 字段，改 fork 的 patch/插件，不要改上游包——除非确认是上游缺陷（那种情况按 R10–R12 的方式登记）。
- **验证**：`pnpm run build:plugins` 成功；开发模式启动后侧边栏品牌与登录入口是 Threerouter。

### R08 图片/视频生成工具
- **要什么**：`generate_image` / `generate_video` 两个工具，支持四个 provider（`threerouter` 默认、`wanx`、`minimax`、`seedance`），可配置尺寸/时长/超时/轮询/重试/输出目录；`generate_image` 传 `image`/`images` 参考图时为图生图，`generate_video` 传首帧为图生视频、传 `media[].video` 为视频编辑（保留原片动作换主体）。
- **生图契约**：文生图与图生图都打网关的 OpenAI 图片端点 `/v1/images/generations`（网关实现里两个路径共用同一 `createMediaTask` 内核）：参考图放 `image` / `image_urls`（网关解析器接受这三种 + `media[]`），尺寸由插件按模型家族换算（阿里系 `W*H`、其余 `WxH`），`response_format: url`。默认异步传输（`/images/generations/async` + 幂等键找回），服务端未开异步（404）时**同一次调用内降级**为同步单次提交；提交状态未知时默认只按 `request_id` 反查、不自动重提（`imageUnknownStatePolicy: fail`）。旧入口 `/v1/media/generations` 现仅视频链路在用。
- **本部署实测（2026-10-09 headless 冒烟）**：文生图、图生图、参考图驱动都跑通；图生图保住人物/服装/背景（默认编辑模型 `qwen-image-3.0-pro` 在本分组可用），文生图默认模型 `qwen-image-3.0`。**行为与桌面内旧插件不同**：默认尺寸 3:4 → 1152×1536、**水印默认开启**（文本 `Threerouter`、右下角）。复现方式：拷 dev home 建一个非 `desktop` 名的 profile（CLI 禁止 headless 用 `desktop` 名），bundles = `dsh-base` + `dsh-headless` + 两个产品插件，再用 `--patch` 给 `llm-pi-ai`/`agent-default-model`/`image-video` 三行配置，命令形如 `DSH_HOME=<冒烟home> pnpm dsh --profile imgsmoke --patch <patch.yml> "调用 generate_image …"`。
- **参考图体积守卫**：参考图 data URL 超过阈值先压再传——图片本地参考图 > 4MB 缩到长边 2560 + JPEG(q88)（sharp），视频首帧 > 1.5MB 用 ffmpeg 压到长边 1600 + JPEG(q3) 并设 6MB 硬上限。原因：data URL 比原文件大约 1/3，手机原图直传会撞网关/上游请求体上限或被拖到超时；压不动时原样提交，交由服务端报错。
- **客户端/插件协议同步（选 3:4 曾会被 400 拒）**：composer 的图片尺寸下拉值与插件 `IMAGE_SIZE_OPTIONS` 白名单**必须逐字一致**（插件是校验源）；本次对齐了 3:4 = `1152*1536`（旧值 `864*1152` 不在白名单，POST `/image-video/defaults` 会 400）。改任一侧都要同步另一侧。
- **部署特有默认值（放 profile 的 `cordis.patch.yml`，不写进插件）**：`threerouter.apiKeyEnv: THREEROUTER_API_KEY`（用登录写入凭证缝的 Key，不内联明文）、`defaultVideoModel: wan3.0-video`（本分组实测可用；插件内置默认是 `minimax-h3`）、需要时再钉 `defaultImageModel` / `defaultImageSize` / `watermark.enabled`。用户层按 `- id: image-video` 覆盖是**整块替换 config**，省略的字段回落 schema 默认。
- **承载（fork 自有）**：源码在独立仓库 `ihero3/dsh-image-video`（**唯一源**：日志、测试、CHANGELOG 都在那里），本仓库以 **git submodule** 挂在 `plugins/dsh-image-video`，pin 到该仓库的 commit/tag（当前 pin：移植三件套 + DSH 范围修正）。子模块路径仍被 `pnpm-workspace.yaml` 的 `plugins/*` 收录，dev 软链与打包拷贝（`apps/desktop/src/private-plugins.ts`）读取的仍是同一条路径，因此客户端加载方式不变；插件把构建产物 `lib/` 入库，消费方无需构建。
- **客户端集成契约（该仓库必须保住）**：① 媒体模式注入——`/image-video/defaults` 路由接受 `mediaMode`，并在 `agent/pre-step` 注入「直接调用生成工具」的指令（只在有新的用户输入、非子代理时注入）；② 凭证缝解析——每个服务商支持 `apiKeyEnv`，经 `ctx.credentials.resolve(credentialRef(ref))` 现读，明文 `apiKey` 优先；③ `originalDimensions`——图片输出 schema（`image` / `previewImage`）声明并透传该字段，否则 DSH 0.2.x 上已生成的图会被输出校验丢弃（`returned invalid output`）。
- **升级流程**：在插件仓库改 → `pnpm test` + `pnpm typecheck` → 重建并提交 `lib/` → push（必要时打 tag）→ 回本仓库 `git add plugins/dsh-image-video && git commit`（bump pin）。**不要**在本仓库再放一份插件源码：两处源码正是 2026-10 之前"改动不同步"的根因。
- **依赖契约**：`tools`（必需，来自 `dsh-base`）；`attachments`（`generate_image` 必需，未挂载时该工具不注册）；`credentials` 与 `agents`（可选，缺失时分别退化为「无引用解析」与「不注入媒体模式指令」）。上游若改这些服务名，跟改插件仓库。
- **冲突取舍**：子模块 pointer 与 `.gitmodules` 是 fork 独有路径，永不与上游冲突；不因上游重构而把逻辑搬进 `packages/**`。插件按自己的 semver 走（版本记录只在该仓库的 `CHANGELOG.md`，本仓库不再另建版本文件），客户端只校验它对 `@deepseek-ai/dsh*` 的 peer 区间与本发布兼容（见 R06、`readPrivatePluginEntries`）。
- **客户端半边与工作树约定（2026-10-14 起）**：`dsh-image-video` 不再只是宿主角——新增 `exports["./client"]` 与 `dsh.client`（`platform: web`），在 Harness 右侧工作区注册工作台 tab（`kind: dsh-image-video-workbench`、`id: dsh-image-video`）。三条必须记住：① `lib/client/**` 与 `lib/types/client/**` 也是**入库产物**，改客户端代码必须 `pnpm run build` 后一起提交——声明了 `./client` 却没构建出来时，桌面 `private-plugins` 复制会直接抛错而不是降级；② 桌面私有插件复制会自动识别并带上 `clientEntry`，`LOCAL_PLUGIN_BUNDLES` / `PRIVATE_PLUGIN_NAMES` 无需改动（`apps/desktop/tests/private-plugins.spec.ts` 用自造 fixture，不读真实 manifest，加半边不会让它变红——这是对审计早期判断的更正）；③ **迭代工作树固定为子模块那份**（`<Harness>/plugins/dsh-image-video`，桌面 dev 直接软链它），`/Users/guxiongjian/Documents/code/dsh-image-video` 是同仓库的第二份检出，需要时 `git pull` 跟上，**不要两份同时改**。工作台的规划与进度文档都在插件仓库 `docs/`（`REQUIREMENTS.md` / `EXECUTION.md` / `TASKS.md` + 既有 `DESIGN-AUDIT.md` / `IMPLEMENTATION-PLAN.md`）。④ **给已在跑的插件后加 `./client` 时宿主不会重扫 manifest，必须重启宿主进程**（2026-10-14 实测：重载渲染进程后 `__DSH_BOOT__.entries` 里仍没有该包，也没有 boot 报错），所以"插件新增客户端半边"这类改动要连宿主一起重启才算落地。⑤ 插件 manifest 的依赖变化会牵动本仓根 `pnpm-lock.yaml`（`plugins/dsh-image-video` 是 workspace 成员）：跑一次根 `pnpm install` 同步，这类 lockfile 变更随子模块指针一起提交，否则根侧 `--frozen-lockfile` 会报 lockfile 过期。⑥ 连接层 RPC 通道名必须是**单段**（`/^\/[A-Za-z0-9._~-]+$/`，且不得占用 `/api`），插件用 `/image-video`；通道名写错时宿主 `rpc.handle` 在注册时抛错、浏览器调用被 `invalid RPC target` 拒（单测若用替身 handle 不会发现，靠桌面现场检查抓出）。

### R09 开发流程
- **要什么**：`pnpm run build:plugins` 单独打插件；开发模式（`dev.ts`）与打包都先构建插件，避免"只 pull 了 plugins/ 却用着旧 lib"。
- **必须保留**：根 `package.json` 的 `build:plugins`、`package:desktop:mac:arm64:unsigned[:dir]`、`package:desktop:linux:x64[:dir]`、workspaces 里的 `plugins/*`；`scripts/dev.ts` 里那次 `build:plugins`。
- **独立插件仓库的两条构建约束**（本次踩到）：① 必须提供 `bundle` 脚本（根 `build:plugins` 按 `bundle` 调用；只有 `build` 会静默漏建、`lib/` 缺失后插件直接加载失败）；② 构建工具版本要与宿主工作区的 rolldown 兼容（tsdown `^0.22.2`；`outputOptions.codeSplitting` 已被新版 rolldown 移除，写了会报 `Invalid key: codeSplitting`）。插件把 `lib/` 入库，所以消费方不构建也能用，但 `build:plugins` 必须保持可跑（打包前的自检）。
- **冲突取舍**：都是加法式改动（上游没有同名脚本），冲突时**两边都留**。

### R10 profile 作用域修复（`packages/boot/app-boot/src/profile.ts`）
- **要什么**：profile 自带的 bundle patch 行用裸 specifier 命名自己的包，需要经 `collectProfileScopePackages` 的 fallback 表解析；删除 `for (const layer of profile.layers) bundleLinks.delete(layer.packageName)` 这一行，让 profile 携带的 layer 包留在表里。
- **第二处承载（2026-10-07，上游同步 `ProfileResolution` 改动之后）**：`src/profile-resolution/resolver.ts` 的 `ResolutionRouter.replace()` 新增了
  "变成本地依赖就要重启"的守卫，它按上游语义假定"变成本地的名字不会是 profile entry"——R10 让 profile bundle 成为 profile 作用域 entry，正好踩中，
  上游自己的 `profile-resolution-service.spec.ts` 因此变红，而这条链路在 fork 里是**正常路径、不需要重启**。
  按上游同一函数里已有的例外（`next === undefined && current.scope === 'profile'` → `continue`）补一行同类例外：只对 installation 作用域的 entry 抛错。
  **这不是放宽断言**：上游已经认定 profile entry 可以在 refresh 中变化，这里只是让前后两段口径一致。
- **为什么是 fork 的**：这是 Threerouter 插件作为 profile bundle 能被解析的前提。
- **冲突取舍**：两处都必须保留；上游若重写 `replace()` 的守卫或 profile 表构造，按同一语义贴回（profile bundle 必须是 profile 作用域 entry，且刷新它不得抛错）；若上游已等价修复，以上游为准并在第八节注销本条。
- **验证**：`packages/boot/app-boot/tests/profile-resolution.spec.ts`（fork 的 27 行新增断言）与上游的 `profile-resolution-service.spec.ts`。
  **两个必须同时绿**：撤销 `profile.ts` 那处改动 → profile-resolution 红；撤销 `resolver.ts` 那处例外 → profile-resolution-service 红。

### R11 RPC 调用者 Context 修复（`packages/client/connection/src/rpc-host.ts`）
- **要什么**：`rpc`/`fetch` getter 通过 `callerCtx` 读取，剥掉 `symbols.shadow`，使 `webServer` 解析与 effect 归属落在调用方 fiber 上。
- **冲突取舍**：必须保留 `callerCtx`；上游若引入等价的 shadow 剥离惯用法，改用上游写法并在第八节注销。
- **验证**：`packages/client/connection/tests/`（`rpc-schema.host.spec.ts` 等）。

### R12 图片输入默认开启
- **要什么**：这个部署以图片输入为常态——未声明模态的模型按"文本 + 图片"处理，用户在设置里看到默认勾选 text 与 image。
- **承载**：`packages/llm/llm-pi-ai/src/config.ts` 的 `DEFAULT_INPUT = ['text','image']`；`packages/client/ui-settings-models/src/client/ModelInputTypes.tsx` 的 fallback `['text','image']`。
- **已知代价**：provider 不认图片时会在消息落库后中途失败（这是有意选择的失败模式，不要"修"回 `['text']`）。
- **冲突取舍**：保住这两处；上游若重写默认值机制，把语义（undeclared ⇒ image-capable）贴回新机制。
- **验证**：`packages/llm/llm-pi-ai/tests/config.spec.ts`、`catalog.spec.ts`、`ui-settings-models/tests/model-input-types.client.spec.tsx`、`model-list-catalog.client.spec.tsx`、`components.client.spec.tsx`、`provider-form.client.spec.tsx`。

### R13 桌面文档
- **要什么**：`apps/desktop/README.md` / `README.zh.md` 里的美术路径说明指向 `resources-fork/`，托盘位图指向 `resources-fork/tray-windows.ico`（由 `render:tray-icon-fork` 整幅渲染），并说明它不复用上游渲染器的 20% 放大。
- **必须保留**：`resources-fork/…` 路径与托盘渲染那两句（中英各一处）。
- **冲突取舍**：以上游重写后的段落为准，只把这两处贴回。
- **`README.i18n.yaml` 不要手改**：哈希由 `pnpm run verify-translation-pairing` 重新生成（上游 2026-09-23 起改成按标题锚点的 section 记录，普通文本合并且合并后重算即可）。

### R14 工程杂项
- **必须保留**：根 `package.json` 的 workspaces `plugins/*` 与 `build:plugins`；`pnpm-workspace.yaml` 的 `plugins/*` 注释行与 `micromark-util-types: '2.0.2'` override；`.gitignore` 的 `apps/desktop/desktop-dev.log`、`.workbuddy/*`。
- **子模块/独立插件仓库带来的两条 workspace 设置**（都写进 `pnpm-workspace.yaml`）：
  - `linkWorkspacePackages: true`：`plugins/*` 里现在有**独立仓库的 submodule**（如 `dsh-image-video`），它们为「能独立安装」声明的是 registry 版本区间而不是 `workspace:*`；不打开这个开关，插件会从 registry 解析出第二份 `@deepseek-ai/dsh-*`，branded 类型与运行时服务身份都会分裂。
  - `overrides: '@deepseek-ai/cordis': 'link:vendor/cordis'`：与既有的 `cosmokit`/`schemastery` 同型，保证插件与宿主共用同一个 Cordis 实例（否则第二个实例会打断事件声明合并与 DI）。
  - 插件侧配套：DSH 依赖区间要能**同时匹配当前预发布线**（现为 `^0.2.1-alpha.1`；`^0.2.0-rc.1` 按 semver 不含 `0.2.1-alpha.1`，会导致 pnpm 不链接工作区副本）。
- **`pnpm-lock.yaml` 政策**：**不要手工合并锁文件**。取上游版本后跑 `pnpm install` 重新生成，再把 fork 的 `plugins/*` importer 与 override 带回来。
- **验证**：`pnpm install --frozen-lockfile` 成功；`pnpm run build:plugins` 成功；`pnpm --filter dsh-image-video run typecheck`、`pnpm --filter dsh-image-video run test`。

### R15 / R16 fork 自有
- `.github/workflows/desktop-release.yml`：在托管 runner 上构建 unsigned 桌面产物并挂到 tag 的 Release。
- `marketing/deepseek-harness-promotion-kit.en.md`：市场物料。
- 两者上游都没有，永不冲突，不受合并影响。

### R17 模型路由声明值（上下文窗口与回复上限）
- 承载位置：`plugins/dsh-plugin-threerouter/src/host/threerouter-auth.ts` 的 provisioning（`contextWindow: 1000000`、`maxTokens: 250000`、`defaultContextWindow`、`defaultMaxTokens`）。
- 为什么必须保住：这两个数是 harness 用来判断"超限"和"回复是否被截断"的**声明值**，不是模型真实能力。
  - `contextWindow` 声明小于实际 → 正常长响应被当成上下文超限，触发压缩重试、失败时抛错。
  - `maxTokens` 声明小于实际 → 回复被截断并提示 `message.maxTokens`（"Output token limit reached"）。
  - 当前取值是 fork owner 定的**宽松声明**（输入 1M、输出 250K）：真正的超限由网关拒绝（映射为 `CONTEXT_WINDOW_EXCEEDED`，压缩后重试可恢复），而声明过小只会误伤正常请求。
- 风险：若网关不接受这么大的 `max_tokens`，会**每个请求都报错**；症状是 provider 报错而非截断，处理办法是把 App「设置 → 模型目录 → 最大输出 token 数」调小。
- 变更时注意：只能改这里（登录时写入）与 App 的「设置 → 模型目录 → 最大输出 token 数 / 上下文窗口」；不要在别处再引入一份声明。
- 验证：登录后看 profile 里 `llm-pi-ai.providers.threerouter` 的 `maxTokens`/`contextWindow` 是否为 250000/1000000；发一条长回答确认不再出现截断提示。

### R18 生成物与清单文件的合并驱动
- **要什么**：`pnpm-lock.yaml` 与两个 `package.json` 每次合并都冲突，而它们一个是生成物、一个只加了 `homepage` 与 4 个脚本——都不该由人手工解。合并时由驱动自动完成，人只看结果。
- **承载**：`.gitattributes` 的 3 行绑定（`/package.json`、`/apps/desktop/package.json` 走 `fork-package-json`；`/pnpm-lock.yaml` 走 `fork-lockfile`）+
  `scripts/fork-merge/`（两个驱动 + `install.mjs` + `fork-merge.spec.ts`，全部 fork 自有）。
- **必须保留**：`.gitattributes` 里那 3 行 `merge=` 绑定。驱动命令写在 `.git/config`、不能提交，由 `node scripts/fork-merge/install.mjs` 注册（幂等）；
  未注册时 git 退回普通文本合并，不会更糟。
- **语义**：JSON 驱动做三方合并（与祖先相同的一侧让位、数组加法合并、只有同一标量被两侧改成不同值才判冲突并保留上游 + stderr 警告）；
  lockfile 驱动取上游并在 stderr 要求合并后跑 `pnpm install`。
- **冲突取舍**：上游重写 `.gitattributes` 时，把 3 行绑定贴回（其余取上游）；上游若新增 `merge=dsh-translation-pairing` 之类条目，
  以 fork 的 `install.mjs` 清理为准（上游已删除该驱动）。
- **验证**：`pnpm exec vitest run scripts/fork-merge/`（合并驱动 16 个用例 + `fork-stats` 8 个用例）；
  端到端判据是「与上游合并后 `git diff --name-only --diff-filter=U` 为空」（2026-10-07 实测 266 个上游提交合并为 0 冲突）。

### R19 有密钥 CI 作业打 Threerouter 网关
- **要什么**：仓库的 `DEEPSEEK_API_KEY_EXTERNAL` 里放的是 Threerouter key，一方端点会拒绝它，因此两个消耗该 secret 的 workflow 把 `DEEPSEEK_BASE_URL` 钉到 `https://www.threerouter.com`；Python 安装后冒烟多一个 `DSH_SMOKE_MODEL` 覆盖（默认仍是 `deepseek-v4-flash`），两个 live 步骤钉 `deepseek-v4.1-flash`；5 个断言一方端点行为的 `*.e2e.ts` 在环境钉了别的 host 时自跳过。
- **承载**：
  - `.github/workflows/e2e.yml`、`.github/workflows/build-exe-for-python-sdk.yml`：`DEEPSEEK_BASE_URL: https://www.threerouter.com`，以及冒烟步骤的 `DSH_SMOKE_MODEL`。
  - `scripts/smoke-python-runtime.py`：`model=os.environ.get("DSH_SMOKE_MODEL", "deepseek-v4-flash")`（**不要**把模型 id 写死回去）。
  - `scripts/ci-workflow.spec.ts`：钉住上述两个 env 值，让域名与覆盖不能静默漂移。
  - 5 处 `OFFICIAL_ENDPOINT_CONFIGURED` 谓词：`packages/llm/llm-deepseek/tests/{adapter,runtime}.e2e.ts`、`packages/llm/llm-pi-ai/tests/adapter.e2e.ts`、`packages/subagent/subagent-claude-code/tests/real-deepseek.e2e.ts`、`packages/subagent/subagent-codex/tests/real-deepseek.e2e.ts`。
  - `python/development.{md,zh.md}`：正文里的网关域名（各 1 行）。
  - `.agents/notes/implemented/testing/2026-06-19-real-api-e2e-ci.{md,zh.md,i18n.yaml}` 与 `2026-08-23-installed-python-wheel-black-box-ci.{md,zh.md,i18n.yaml}` 被同步改写（这是仅有的两份被 fork 修改的上游 Agent Note）；设计与回退条件在 fork 自有的 `2026-10-08-ci-external-gateway-endpoint.{md,zh.md,i18n.yaml}`。
- **冲突取舍**：上游重写这两个 workflow 时，以上游新结构为骨架贴回域名与 `DSH_SMOKE_MODEL`；上游改冒烟的模型参数时贴回环境覆盖；谓词若被上游改写，按"固定了非一方 host 就跳过"的语义贴回。secret 换回一方 key 时，按 fork 自有 note 的"恢复官方端点"一节整体回退。
- **影响面提醒**：CI 的真实 API 覆盖描述的是网关行为；一方端点专属回归在 CI 里不再被覆盖，只能本地跑或换回官方 secret。
- **验证**：`pnpm exec vitest run scripts/ci-workflow.spec.ts`；真正的信号在 CI（本地无 key 时这条链路不执行）。

### R20 Windows 无符号链接权限时的测试兼容
- **要什么**：Windows 默认不允许普通用户创建文件符号链接；两个拿文件符号链接当夹具的上游 spec 在那种主机上应当跳过或换夹具，而不是失败。
- **承载**：
  - `scripts/repo-files.spec.ts`：`linksFiles()` 真建一次文件链接做探针，失败则整组 `describe.skipIf`。
  - `scripts/project-doc-site.spec.ts`：改用目录 junction（Windows 无特权可用）验证"经链接指向仓库外的文件不可发布"。
- **冲突取舍**：上游重写这两个 spec 时按同一语义贴回（夹具不得依赖符号链接特权）；**不要**为了让它们在无权限主机上变绿而削断言。
- **验证**：`pnpm exec vitest run scripts/repo-files.spec.ts scripts/project-doc-site.spec.ts`（macOS/Linux 真跑，Windows 无权限主机上 `repo-files` 跳过）。

### R21 子模块文档不参与本仓库的双语门禁
- **要什么**：`plugins/dsh-image-video` 是独立仓库的子模块，它的 `README.md` 与 `docs/**` 归那个仓库管（英文单语）；本仓库的双语门禁按文件系统 glob 发现文档，会把子模块的 `README.md` 当成自己的文档要求配对，于是 `pnpm run test:docs` 里 `verify-translation-pairing` 判红。
- **承载**：`scripts/translation-pairing.ts` 的 `TRANSLATION_SCOPE_GLOB_EXCLUDES` 加一行 `'plugins/dsh-image-video/**'`——与 `vendor/**` 同一类：外部仓库的文档不在本仓库作用域内。
- **为什么不放进 manifest 的 `excluded`**：manifest 的排除语义是"永不配对，且它出现 `.zh.md`/`.i18n.yaml` 反而报错"；子模块日后自己加中文 README 时不该被本仓库判红。作用域排除没有这个副作用。
- **冲突取舍**：保住这一行；上游若把文档发现改成基于 git（子模块只暴露 gitlink，天然不在语料里），本条可注销。以后再挂子模块时照此加一行。
- **验证**：`pnpm run verify-translation-pairing` 与 `pnpm run test:docs` 全绿。

### R22 启动直接进工作区（不显示上游欢迎窗口）
- **要什么**：这个部署登录的是 Threerouter（R07 已停用上游 `ui-settings-account`、把 `settings.launcher` 换成 Threerouter chip），而上游的原生欢迎窗口（登录 / 添加 API Key）走的是上游 account service 与 `llm-deepseek` 的 key，两条路在这个部署里都不成立，却每次冷启动都弹。所以默认不再显示它：冷启动、登录后登出、账号流结束（session-expired）、取消退出这四条路径都直接留在/进入工作区，登录在侧边栏底部。
- **承载**：`apps/desktop/src/main.ts` 一处常量 + 四处门控：
  - `const welcomeWindowEnabled = process.env.DSH_DESKTOP_WELCOME_WINDOW === '1'`——默认关闭；置 `1` 可恢复上游行为（对照、排障用）。
  - `openInitialWindow()`：默认 `enterWorkspace()`，只有显式打开时才 `showWelcome()`（此时才保留"不把更新焦点带进登录"的 `raiseAfterUpdate = false`）。
  - account watch 的登出分支、流结束（session-expired）回调，以及取消退出后的 `showWelcome()` 兜底，都先看这个开关。
- **必须保留**：上面 1 行常量与 4 处门控。欢迎窗口自身的实现（`welcome-window.ts`、`client/WelcomePage.tsx`、`preload-welcome.ts`、`welcome-backend.ts`、`welcome-api.ts`）保持上游原样，**不要删**——删了下次合并上游会整块回退，也失去 `DSH_DESKTOP_WELCOME_WINDOW=1` 的对照能力。
- **故意不动**：`needsWelcome()` 的语义（`welcome-api.ts`）原样保留，它仍是"是否需要欢迎窗口"的判断，只是被开关短路。
- **冲突取舍**：上游重写 `main.ts` 的启动或账号监听结构时，以上游新结构为骨架，把 `welcomeWindowEnabled` 常量与四处判断（三处 `welcomeWindowEnabled &&`、一处 `if (!welcomeWindowEnabled) return`）贴回；上游若自己提供等价的"跳过欢迎窗口"配置键，改用它并在第八节注销本条。
- **验证**：`pnpm exec vitest run apps/desktop/tests/`。新增的 `fork-welcome-skip.spec.ts` 守默认行为（直接 `show()` 工作区、`openWelcomeWindow` 未被调用，且随后的登出与流结束不会把它拉回来）；上游的 `welcome-startup.spec.ts` 显式置 `DSH_DESKTOP_WELCOME_WINDOW=1`，继续覆盖保留的欢迎流程。

### R23 浏览器与桌面操作能力（browser-use + computer-use）
- **要什么**：让 agent 能操作浏览器（含桌面 App **右侧侧边栏浏览器**）与整台电脑（列窗口/点击/输入/截图/窗口管理）。
- **承载**：能力缝与 provider 都是**上游包，本 fork 不改代码**——依赖已随 workspace 装好（`@playwright/mcp 0.0.80`、`chrome-devtools-mcp 1.9.0`、`@browserbasehq/stagehand 4.1.0`、`@trycua/cua-driver 0.28.0` 及其 darwin-arm64 原生包），只需在 `$DSH_HOME/profiles/<name>/cordis.patch.yml` 里 insert 四行（一个组合里每个服务只能有一个 provider）：
  ```yaml
  - insert:
      - id: browser-use
        name: '@deepseek-ai/dsh-browser-use'
      - id: playwright-mcp
        name: '@deepseek-ai/dsh-experimental-browser-use-playwright-mcp'
        config: { mode: launch, headless: false, executablePath: /Applications/Google Chrome.app/Contents/MacOS/Google Chrome }
      - id: computer-use
        name: '@deepseek-ai/dsh-computer-use'
      - id: cua-driver-native
        name: '@deepseek-ai/dsh-experimental-computer-use-cua-driver-native'
  ```
  工具面：浏览器侧是 `mcp__playwright-mcp__browser_*`；桌面侧是 59 个 `cua_driver_native__*`（`list_apps`/`list_windows`/`get_accessibility_tree`/`click`/`type_text`/`hotkey`/`get_window_state`/`verify_state`/`start_recording`，另外它自己也带一套 `browser_*` 屏上操作工具）。
- **本机已落地（用户态，不在 git 里）**：
  - CLI 验证 profile：`~/dsh-play/profiles/play`（launch 自有 Chrome）与 `play-attach`（attach 到 `http://127.0.0.1:9222`）；`DSH_HOME=~/dsh-play`，凭证是从 dev home 拷来的 `.credentials.yaml`。放在仓库外是为了不让 `DSH_HOME` 出现在 `git status` 里。
  - 桌面 App：`apps/desktop/.desktop-build/development/home/profiles/desktop/cordis.patch.yml` 追加了那四行，browser-use 用 **attach** 模式指向开发模式的 9222 → agent 能列出并操作右侧侧边栏浏览器的标签页；改动前的备份是同目录的 `cordis.patch.yml.bak-before-cua`。
- **必须保留/限制**：
  - `mode: attach` 的 `endpoint` 只有**开发模式**存在（`scripts/dev.ts` 传 `--remote-debugging-port=9222`）；**打包版没有该端口**，要在发布版支持得改代码（届时新开一条 R），不要假设它天然可用。
  - 该 provider **没有 origin 白名单**（config 只有 `mode`/`headless`/`executablePath`/`endpoint`/`toolCallTimeoutMs`）：attach 到 App 自己的 CDP，意味着 agent 也能看到并操作 `dsh-app://app/` 这个页面本身；只能靠系统提示约束，不是强隔离。attach 同时是**独占**的（同一时刻一个 Session 占用端点）。
  - 截图类工具需要 **Screen Recording**（2026-10-11 已解决，见下）：嵌入式模式下权限属于宿主进程，provider 自己不会弹窗，`check_permissions(prompt:true)` 在本 SDK 里也不会发起申请（返回仍是只读结论）。
  - **TCC 归属实测**：从 Terminal.app 跑 `pnpm run start:desktop` 时，责任方是 **`/System/Applications/Utilities/Terminal.app`**（进程链顶端），不是 Harness Dev——给 Harness Dev 授权对这条链**不生效**。解决办法：在「录屏与系统录音」里打开**终端**，然后 **⌘Q 完全退出 Terminal**（连同整条链）再重启 App。要让 App 自己持授权，就用 `open -a`/Finder 启动（责任方变成 App），或换 MCP 版独立 Cua Driver。
  - **`screenshot_out_file` 不能放在符号链接祖先下**：`/tmp` 是 `/private/tmp` 的软链，会报 `the output path's existing ancestor is not a directory`（看着像权限错误，其实是路径问题）——用 `/private/tmp/…` 或家目录这类真实路径。
- **验证**（2026-10-11 实测）：
  - `DSH_COMPUTER_USE_NATIVE_E2E=1` 跑 `computer-use-cua-driver-native/tests/native.e2e.ts` 通过（原生 SDK 加载、只读权限探测、59 个工具、干净卸载）。
  - `DSH_BROWSER_EXECUTABLE="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"` 跑 `browser-use-playwright-mcp/tests/upstream.e2e.ts`：launch 与 attach 两例都通过。
  - 真实探针（不靠模型"猜"）：`pnpm dsh --profile play "…"` 打开本地随机 token 页面后答出 `TITLE=PROBE59FC44EC`（与文件里的 token 一致），并调用 `cua_driver_native__get_screen_size` 答出 `1920x1080`（与本机真实分辨率一致）。
  - 组合校验用 `pnpm dsh --profile <name> --dump-config`；**`desktop` 这个名字被 Electron 独占，CLI 会拒绝**，要验证就把 profile 拷成别的名字再 dump。
  - **授权后真实抓屏（2026-10-11 19:37 补记）**：`cua_driver_native__get_desktop_state` → `isError: false`，写出 1920×1080 PNG（480KB，与显示分辨率一致）→ TCC 的 Screen Recording **与** ScreenCaptureKit 直采都真的可用。`health_report` 的 `tcc_accessibility`/`tcc_screen_recording` 均为 pass。
  - **App 右侧浏览器 attach 现状**：开发模式 `http://127.0.0.1:9222/json/list` 正常返回 target（App 自身页面 + DevTools 页）；打开右侧侧边栏浏览器后，该标签页会出现在同一列表里供 agent 选择。

### R24 设置面板隐藏「内置插件 / Agent 预设」两个 tab（「模型」保留）
- **要什么**：设置面板不给用户展示「内置插件」（plugins）与「Agent 预设」（agent-presets）两页；**「模型」（models）保留可见**——它是本项目自己的服务商/凭证/模型目录配置面，owner 要能进去改；桌面登录后的「账号」行按原逻辑照常出现（本部署 R07 已停用 `ui-settings-account`）。2026-10-12 从"隐藏三个"改成"隐藏两个"，只动下面那一个集合。
- **承载（改上游文件，尽量只有两处）**：
  - `packages/client/ui-settings-general/src/client/index.ts` → `HIDDEN_SECTION_IDS = new Set(['plugins','agent-presets'])` 及其上方注释；`shellInjected().hooks.sections.getSnapshot()` 里 `.entries('settings.section')` 之后的那一处 `.filter(e => !HIDDEN_SECTION_IDS.has(e.options.id ?? ''))`。
  - `packages/client/ui-settings-general/tests/shell.client.spec.ts` → `PRODUCT_SECTIONS`（真实 web-app roster 投影出来的可见行 = `['general','models']`）。
- **为什么放在 shell 的导航投影，而不是「注释掉注册」**：`settings.section` 是"一个功能拥有一页"的插槽，而面板只渲染 `active` 那一页；在唯一的 ledger→导航行投影处过滤，各包的注册、onboarding、行为与它们自己的单测（`ui-settings-models` / `ui-settings-plugins` / `ui-agent-preset` 的 `apply.client.spec.ts` 约 30 处断言与 AgentPresetSection 行为覆盖）全部原样保留。把注册注释掉会连覆盖一起废掉，正是第五节禁止的"削断言/丢覆盖"。被隐藏的 section 仍然在 ledger 上，`active` 回落到第一行，所以 onboarding 步骤里 `openSection('models')` 这类从别处发起的跳转仍会落到「模型」页（该页未被隐藏）。
- **冲突取舍**：上游重写 `SettingsRoot` 的 rows 投影（或把 rows 换成别的来源）时，把 `HIDDEN_SECTION_IDS` 与那处 `filter` 贴回同一位置；上游若自己提供"按部署隐藏 section"的机制，改用它并在第八节注销本条。
- **验证**：
  - `pnpm exec vitest run packages/client/ui-settings-general/tests` 全绿（`PRODUCT_SECTIONS = ['general','models']` 就是"真实 roster 注册了四个 section、投影剩 General + Models"的断言）。
  - 真机（开发版桌面 App）：重载窗口后打开设置，导航是「通用设置 + 模型」，点「模型」能进服务商/模型目录配置页。渲染进程执行的脚本源码里 `plugins/??@deepseek-ai/dsh-client-ui-settings-general/client.js` 含 `HIDDEN_SECTION_IDS`（用 CDP `Debugger.getScriptSource` 读，排除"包恰好没注册"的假阳性）。
- **已知影响（未处理，见第十节待办）**：`apps/web/tests` 里仍有 13 个 e2e 与 16 个 `expected/**` 快照按"四个 tab"录制/点击这几页（`agent-preset-authoring`、`bonus-notice`、`client-plugin-live`、`deepseek-messages-settings`、`default-model`、`model-menu-observer`、`models-settings`、`models-settings-recovery`、`onboarding-deepseek-config`、`onboarding-native`、`onboarding-usable-provider`、`settings-appearance`、`settings-chrome`）。按第五节这批上游用例跟随上游，本次只改了上面那条本包单测。注意：其中点「内置插件 / Agent 预设」的那些仍会红，而 `models-settings*` / `default-model` / `model-menu-observer` 等只涉及「模型」页的用例已随本次改动恢复（可见行回到四个里的三个）。

## 四、永不冲突的 fork 自有路径（67 个条目，2026-10-11 合并上游 0.2.1-alpha.2 后实测；子模块只算 1 条 gitlink）

| 路径 | 内容 |
| --- | --- |
| `plugins/**` | `dsh-plugin-threerouter`（18 个文件，R07）+ `dsh-image-video` 子模块（1 条 gitlink，源码在独立仓库，R08） |
| `apps/desktop/resources-fork/**` | 12 个品牌美术（R03） |
| `apps/desktop/scripts/fork-packaging.mjs`、`fork-adhoc-sign.mjs`(+`.d.mts`) | fork 打包覆盖与 ad-hoc 签名（R02、R03、R04、R05） |
| `scripts/fork-merge/**` | 合并驱动、安装器、基线统计脚本（`fork-stats.mjs`）、被删包残留清理（`prune-deleted-packages.mjs`）与 24 个用例（R18）；上游没有这个目录，永不冲突 |
| `apps/desktop/src/private-plugins.ts` | 私有插件物化（R06） |
| `apps/desktop/tests/fork-*.spec.ts`、`private-plugins.spec.ts`、`profile-brand.spec.ts` | 6 个 fork 守卫测试（新增 `fork-welcome-skip.spec.ts`，R22） |
| `apps/desktop/.env.linux.example`、`scripts/fetch-primary-runtime-cache.ps1` | Linux 环境模板、运行时缓存脚本 |
| `.github/workflows/desktop-release.yml`、`marketing/**`、`FORK-FEATURES.md`、`FORK-SYNC.md` | CI、物料、台账与同步手册 |

**唯一例外**：上游若在这些路径上**新增同名文件**（目前上游没有 `plugins/` 与 `resources-fork/`），会产生 add/add 冲突；此时改 fork 侧命名，不要动上游。

## 五、允许跟随上游（不要纠缠的部分）

| 内容 | 处理 |
| --- | --- |
| 上游重写后的测试与快照（`apps/desktop/tests/**`、`expected/**`、`packages/**/tests/**`） | 以上游为准；只把品牌字符串、`resources-fork/` 路径、Linux/unsigned 目标相关字面量改回 |
| 文档正文（README、docs、`.agents/notes` 的上游部分） | 以上游为准；只保留 R13 的两处；R19 唯一例外地改了 `2026-06-19-real-api-e2e-ci.*`（网关域名与其 i18n 哈希） |
| `.i18n.yaml` 哈希 | 不手改，`pnpm run verify-translation-pairing` 重算 |
| `pnpm-lock.yaml` | 取上游 + `pnpm install` |
| 上游新增的功能与配置键 | 一律接受；fork 只在**确有必要**时为它加 fork 侧默认值 |
| 为了让测试变绿而放宽的断言 | **禁止**（红灯要么是被覆盖的 fork 行为，要么是上游新断言与 fork 品牌/平台冲突，两者都必须显式处理） |

## 六、已知冲突热点与固定解法

上次同步（上游 293 个提交 / 1274 个文件，2026-09-27 → 09-29）实测：**双方都改的文件 15 个，实际冲突 5 个**，全部在 `apps/desktop`：

| 冲突文件 | fork 必须保住 | 解法 |
| --- | --- | --- |
| `apps/desktop/package.json` | `homepage`、`package:mac:arm64:unsigned*`、`package:linux:x64*` 脚本（5 行） | 与上游 scripts 合并：上游的键全留，fork 的 5 行加回去 |
| `apps/desktop/scripts/electron-builder-config.mjs` | 1 行 import + 函数末尾 2 行 + 6 处门控（R04/R05） | 以上游新结构为准，把门控行贴回，其余交给 `fork-packaging.mjs` |
| `apps/desktop/scripts/prepare-dsh.ts` | 目标平台解析 `NODE`、私有插件两处调用、ad-hoc 分支（R04/R05/R06） | 保住这三块，其余取上游 |
| `apps/desktop/src/main.ts` | 开发模式图标指向 `resources-fork/`；`applicationName`（R01/R03） | 只贴回这两行 |
| `apps/desktop/tests/main-startup.spec.ts` | fork 品牌与路径字面量 | 以上游重写后的测试为准，只改字面量 |

这 5 个文件里 fork 相对上游的**全部差异只有 52 行新增 / 19 行删除**——冲突规模很小，别被 diff 的行数吓到。

**`rerere` 已记录 15 条冲突解法**（上次 5 个 + 2026-10-11 合并 0.2.1-alpha.2 的 10 个），历史实测重放结果与提交的解法**逐字节一致**。也就是说同样的冲突再出现时，git 会自动解好，你只需要 `git add`（或开 `rerere.autoUpdate`）。

**下一次同步的预计冲突面**（估计值，不是实测）：上游近 7 天动过我们的 25 个文件，所以下次大概率仍集中在上表这 5 个文件上，规模 5–15 个；理论上限是**全部 78 个"我们也改过的上游文件"**。同步越频繁，单次冲突越少（2 天一次 ≈ 5 个）。

R19/R20 碰的是 workflow、CI spec 与两个 gate spec（`.github/workflows/{e2e,build-exe-for-python-sdk}.yml`、`scripts/{ci-workflow,repo-files,project-doc-site}.spec.ts`、`scripts/smoke-python-runtime.py`）：上游动到它们就会冲突，解法只有"贴回域名 / 覆盖 / 谓词 / 夹具语义"，没有结构可争，所以没进上表。

## 七、合并后必须跑的验证

```sh
pnpm run typecheck
pnpm run lint
pnpm exec vitest run apps/desktop/tests/
pnpm exec vitest run packages/boot/app-boot/tests/ packages/llm/llm-pi-ai/tests/ \
  packages/client/ui-settings-models/tests/ packages/client/ui-settings-general/tests/ packages/client/connection/tests/
pnpm exec vitest run scripts/fork-merge/ scripts/ci-workflow.spec.ts
pnpm run build:plugins
pnpm run test:docs                              # 含 verify-translation-pairing（R21）与 repository-references
node scripts/fork-merge/fork-stats.mjs          # 回填第九节的数字
```

判据：

- 当前基线是**全绿**（2026-10-11 合并 0.2.1-alpha.2 后实测：`typecheck`、`lint`（1 条上游存量 warning）、`build:plugins`、`test:docs`（21 项）exit 0；`apps/desktop/tests` 131 文件 / 1452 用例通过；`app-boot`+`llm-pi-ai`+`ui-settings-models`+`connection` 60 文件 / 6486 用例通过；`fork-merge`+`ci-workflow` 82 用例通过）。所以**任何红灯都是真信号**，不存在"一直红着所以忽略"的情况。
- **本文件与 FORK-SYNC 的正文里不要写裸 commit SHA**：`verify-repository-references` 会把能解析到的短 SHA 判红（2026-10-11 清掉了一批）；指上游状态用版本标签（`0.2.1-alpha.2`）。
- `apps/desktop/tests/ptc-runtime.spec.ts` 会往宿主主目录建临时目录：在限制文件写入的沙箱里必然 `EPERM`，那是环境信号而不是代码红灯，用宿主权限单独重跑该文件即可（2026-10-11 实测 2/2 通过）。
- `packages/api/workspace-files/tests/changes.spec.ts` 的 "real local watcher" 用例在**全量并发**跑时可能 5s 超时，单独跑 43/43 通过——是负载/环境信号。
- `packages/subagent/subagent-codex/tests/real-product.spec.ts` 需要本机能解析 `@openai/codex-darwin-arm64` 平台包；缺失时 6 例以 `Missing optional dependency @openai/codex-darwin-arm64` 失败，属本机安装状态而非代码红灯（重装该可选依赖即可）。
- `apps/desktop/tests/fork-packaging.spec.ts` 是品牌接线守卫：品牌取值、图标路径、`extendInfo`、`extraResources` 被静默改动就红灯。
- 红 → 对照第三节判断属于哪条 R：被上游覆盖（贴回）还是上游新断言与 fork 冲突（改断言）。
- 跑完对照第九节的行数复查风险集是否仍在 78 个左右。

## 八、台账维护规则

1. **新增任何定制必须在这里登记一条 R**；优先放第四节的自有路径，必须改上游文件时坚持"一个 import + 一处调用/最小门控"。
2. **上游已经等价提供的能力要主动注销**：把该条标记为"已上游化"，删掉 fork 侧冗余改动，风险集只会变小。
3. **每次同步后回填**：风险集文件数、当次冲突数、`rerere` 条目数——直接跑 `node scripts/fork-merge/fork-stats.mjs`（HEAD 口径，未提交的工作区改动不计入），不要手数。
4. **判断不了就登记"待确认"**，不要静默丢——历史上丢东西就是这么发生的。
5. 本文件与 [FORK-SYNC.md](FORK-SYNC.md) 有重叠：**本文件管"保住什么"，FORK-SYNC.md 管"怎么操作与签名细节"**；若两者冲突，以本文件为准并顺手修 FORK-SYNC.md。

## 九、当前基线与历史数据

| 指标 | 数值（2026-10-11 合并上游 0.2.1-alpha.2 之后，`node scripts/fork-merge/fork-stats.mjs` 打印） |
| --- | --- |
| `upstream/master` | 0.2.1-alpha.2（上游提交日 2026-10-09） |
| `master` | `0 behind / 64 ahead` |
| 相对上游改动的文件 | 147（上游也有的 80 + fork 独有 67） |
| 接触面文件（上游也有、我们又改过） | 80 个（含 `pnpm-lock.yaml`）；`fork-stats` 打印的"作者改动 538 增 / 207 删 over 79 files" |
| 差异总量 | 1963 增 / 1142 删 = 作者改动 538/207 + `pnpm-lock.yaml` 1425/935（生成物） |
| 子模块 | `plugins/dsh-image-video`（pin 标签 `v0.1.0-53-g478832a`） |
| 本次同步（2026-10-11） | 合并上游 0.2.1-alpha.2（669 个提交）：**冲突 10 个文件**，全在 desktop 打包链 + `python/development.*`；两个 `package.json` 与 `pnpm-lock.yaml` 由驱动自动解决。新发现：上游删除/改名的包留下 14 个只有 `lib/` 的目录，会让 `build:lib:host` 报 `MISSING_EXPORT` → 新增 `scripts/fork-merge/prune-deleted-packages.mjs` |
| 上一次同步 | 2026-10-07 合并上游 0.2.1-alpha.1（266 个提交）**冲突 0**；再上一次 2026-09-29 为 5 个文件 / 52 增 19 删 |
| `rerere` 条目 | 15（本次 10 个冲突的解法已记录） |
| 上游速度 | 7 天 749 个提交、30 天 5484 个（2026-09-30 记录，未复测；本次 5 天 669 个） |
| 验证基线 | 2026-10-11（合并后）：`typecheck`、`lint`（1 条上游存量 warning）、`build:plugins`、`test:docs`（21 项）全绿；`apps/desktop/tests` 131 文件 / 1452 用例通过；四个关键包 60 文件 / 6486 用例通过；`scripts/fork-merge` + `ci-workflow` 82 用例通过。全量 `vitest run` 里只剩本机环境问题（codex 平台包缺失、真实 watcher 超时） |
| 历史（2026-10-11 合并前） | 含上游 0.2.1-alpha.1，`0 behind / 62 ahead`；143 个改动文件；187 文件 / 7859 用例 |

## 十、待办

- [x] **托盘美术**：`scripts/fork-tray-icon.ts` 整幅渲染 `resources-fork/icon-windows.svg` 生成 `resources-fork/tray-windows.ico`（不放大、零上游脚本改动）；`main.ts` 开发托盘路径与 `fork-packaging.mjs` 的 `tray.ico` extraResource 均指向它。同时 win32 任务栏窗口图标经 `main.ts` 的 `brandIconPath()` 设为本 fork 图标。
- [x] **清理陈旧 git 配置**（2026-10-07）：`merge.dsh-translation-pairing` 已由 `node scripts/fork-merge/install.mjs` 从 `.git/config.worktree` 删除；
      `.git/dsh-hooks/` 已不含 `/private/tmp/dsh-fork-c/...` 陈旧路径（`core.hooksPath` 指向当前检出，无需重装）。
- [x] **修文件尾换行**（2026-10-11）：`apps/desktop/scripts/desktop-build-paths.mjs` 补回结尾换行，同时消掉一处对上游的 EOF 无谓差异。
- [x] **重装 git 集成**：见上条——`.git/dsh-hooks/*` 路径已是当前检出，无需处理。
- [x] **合并驱动（R18）**（2026-10-07）：`pnpm-lock.yaml` 与两个 `package.json` 交给 `scripts/fork-merge/`；上游 266 个提交的合并实测 0 冲突。
- [x] **基线数字机械回填**（2026-10-11）：新增 `scripts/fork-merge/fork-stats.mjs`（+ 8 个用例），第九节的数字由它打印，不再手数。
- [x] **解开参考分支的上游跟踪**（2026-10-11）：`feat/desktop-linux-target` 原跟踪 `upstream/master`，在该分支一次 `git push` 就会推向 `deepseek-ai`；已 `git branch --unset-upstream`（纯本地配置，需要时用 `git branch --set-upstream-to` 恢复）。
- [ ] `feat/desktop-linux-target` 分支（3 个提交）保留在本机作参考、未 push、**不合并进 master**；既然不做上游 PR，除非改主意否则不用管它。
- [ ] **R24 的下游测试面**：`apps/web/tests` 里 13 个 e2e 与 16 个 `expected/**` 仍按"四个 tab"录制/点击这些页面（清单见 R24）。「模型」这次已放回，所以只涉及「模型」页的用例恢复；点「内置插件 / Agent 预设」的仍会红。两选一：为 fork 刷新/改写这批上游用例，或把隐藏收窄到桌面客户端（`'dshDesktop' in globalThis`，但 desktop-* 用例会 stub 它，仍会红）。定下来之前不要再动产品行为。

## R09 LLM 请求重试策略（threerouter provider）

**改动面**：仅 profile 配置（`profiles/desktop/cordis.patch.yml` 的 `llm-pi-ai.config.providers.threerouter.retryPolicy`），**未改核心代码**。

**内容**：`mode: normal` + `maxRetries: 8` + 退避 1s→20s；只对框架默认的瞬时类错误码（`TRANSPORT`/`SERVER`/`TIMEOUT`/`RATE_LIMIT`/`EMPTY_RESPONSE`）重试。刻意**不用** `mode: always`：那是"无上限重试直到成功"，遇到确定性错误（参数非法、内容被拒）会一直重试。

**起因**：2026-10-16 一轮对话因上游返回 "Upstream response stream was interrupted" 而失败；owner 要求这类服务商抖动至少重试 3 次。

**同源的插件侧改动**：`dsh-image-video` 的 `WorkflowRunner` 对**节点级瞬时失败**（流被中断/超时/5xx/限流/连接重置）自动重试，默认 3 次尝试；确定性失败（4xx 参数错、内容被拒、取消）立即收手——两侧都不"不中断地空转"。

## R10 对话媒体卡片 → 工作台入口（T6-1，跨包改动）

**改动面**：`plugins/dsh-plugin-threerouter/src/client/media-toolview.tsx`（新增两个动作按钮）、新增 `plugins/dsh-plugin-threerouter/src/client/workbench-bridge.ts`（只在有连接服务且装了工作台时启用），以及 `plugins/dsh-image-video` 新增 `assets/quick-add` 端点。**未改任何 Harness core 代码**；相邻插件只多两条按钮，卡片的既有信息与播放行为不变。

**内容**：媒体卡片（`generate_image`/`generate_video`）的动作行新增「发送到工作台」「放入时间轴」。卡片**不知道工作台的项目状态**——它只把文件路径交给 `/image-video` 的 `assets/quick-add`，由工作台宿主决定放进哪个项目（默认最近更新的项目，没有就新建「对话素材」）、是否新建一条三轨时间轴并把片段接在末尾。工作台插件没装时 bridge 返回 undefined，卡片**不渲染**这两个按钮（优雅降级）。

**回滚**：删掉两个按钮与 bridge 文件即可（`assets/quick-add` 端点保留，工作台自己的工具面也能用）。

**验收**：点击后素材出现在工作台的项目素材里；再点「放入时间轴」会在时间轴视频轨末尾多一个片段；卡片原有信息（模型、时长、路径、播放）与播放行为不变。
