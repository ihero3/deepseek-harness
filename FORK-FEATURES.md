# Fork 个性需求台账（fetch upstream → merge master）

本文件是 fork 自有路径：上游没有这个文件，所以它**永远不参与冲突**。

它是**需求台账**：记录这个 fork 相对上游刻意保留的一切定制，以及每条定制在合并上游时"必须保住什么、可以放弃什么、怎么验证"。
机械的同步命令与冲突地图见 [FORK-SYNC.md](FORK-SYNC.md)；本文件是**取舍的权威来源**，冲突时以本文件的"必须保留"为准。

- 最后整理：2026-09-30（已含上游 0.2.0-rc.2）
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

| 编号 | 需求 | 承载位置 | 独有？ | 冲突取舍一句话 |
| --- | --- | --- | --- | --- |
| R01 | 产品身份：`Deepseek Harness for Threerouter` | `fork-packaging.mjs`、`src/locale.ts`、`src/main.ts` | 部分 | 三处文案必须贴回；`aboutProduct` 保持上游 |
| R02 | 产物命名 `dsh-threerouter-*`（含 `-unsigned` 后缀） | `fork-packaging.mjs` | 是 | 只在 fork 模块里，冲突不影响 |
| R03 | 三平台图标与安装页美术（`resources-fork/`） | `resources-fork/`、`prepare-windows-installer.ps1`、`main.ts` | 部分是 | 保住指向 `resources-fork` 的引用行 |
| R04 | Linux x64 打包目标（AppImage + deb） | 11 个 desktop 脚本 + `fork-packaging.mjs` 的 `linux` 块 | 部分 | 保住全部 linux 分支/类型放宽 |
| R05 | 免证书构建：Windows `--unsigned` + macOS ad-hoc 签名 | `package-target.ts`、`electron-builder-config.mjs`、`prepare-dsh.ts`、`fork-adhoc-sign.mjs` | 部分 | 保住 unsigned 门控与 ad-hoc 调用 |
| R06 | 私有产品插件随包发布并进入 profile | `src/private-plugins.ts`、`prepare-dsh.ts`、`src/project-manager.ts` | 部分 | 保住两处调用 + "不重写 manifest"契约 |
| R07 | Threerouter 登录、品牌接管、模型路由 | `plugins/dsh-plugin-threerouter/**` | 是 | 永不冲突；上游改插槽名时改 patch |
| R08 | 图片/视频生成工具（3 个 provider，含图生图/图生视频） | `plugins/dsh-image-video/**` | 是 | 永不冲突；依赖上游服务名变更时跟改 |
| R09 | 开发流程：`build:plugins`、dev 构建插件 | 根 `package.json`、`scripts/dev.ts`、`project-manager.ts` | 部分 | 加法式改动，冲突时两边都留 |
| R10 | profile 作用域修复（插件 bundle 可解析） | `packages/boot/app-boot/src/profile.ts`、`src/profile-resolution/resolver.ts` | 否 | 保住"不删 bundleLinks"那一行 + refresh 守卫的 profile 例外 |
| R11 | RPC 调用者 Context 修复（剥离 shadow） | `packages/client/connection/src/rpc-host.ts` | 否 | 保住 `callerCtx` |
| R12 | 图片输入默认开启 | `packages/llm/llm-pi-ai/src/config.ts`、`ui-settings-models/.../ModelInputTypes.tsx` | 否 | 保住两处 `['text','image']` |
| R13 | 桌面双语文档中的 fork 资源路径与托盘例外说明 | `apps/desktop/README*.md`、`README.i18n.yaml` | 部分 | 只贴回路径与托盘段落，其余取上游 |
| R14 | 工程杂项：workspace 收录 `plugins/*`、忽略项、依赖 override | 根 `package.json`、`pnpm-workspace.yaml`、`.gitignore`、`pnpm-lock.yaml` | 部分 | 声明式改动全部保留；lockfile 重新生成 |
| R15 | fork 自有桌面发布 CI | `.github/workflows/desktop-release.yml` | 是 | 永不冲突 |
| R16 | 市场物料 | `marketing/**` | 是 | 永不冲突 |
| R17 | 模型路由声明值：上下文窗口 1000000、回复上限 250000 | `plugins/dsh-plugin-threerouter` 的 provisioning | 是 | 永不冲突；改小会让长回答被截断或误报超限 |
| R18 | 生成物与清单文件的合并驱动 | `.gitattributes`（3 行）、`scripts/fork-merge/**` | 部分是 | 保住那 3 行 `merge=` 绑定；驱动命令由 `install.mjs` 注册 |

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
- **要什么**：应用图标、安装器位图、卸载页侧图全部是 Threerouter 美术，放在 `apps/desktop/resources-fork/`（11 个文件）。
- **承载与引用点**：
  - `fork-packaging.mjs` → `mac.icon` / `win.icon` / `linux.icon`、`extraResources` 里 `icon.png` 取 `icon-windows.png`。
  - `apps/desktop/src/main.ts` → **开发模式**窗口图标指向 `resources-fork/icon-windows.png`。
  - `apps/desktop/scripts/prepare-windows-installer.ps1` → 5 张安装页位图从 `../resources-fork` 读取。
- **必须保留**：上述三处路径引用。
- **绝对不要动**：上游路径 `apps/desktop/resources/**` 与 `apps/desktop/installer/assets/**` 必须与上游逐字节一致（这是冲突面的隔离手段）。
- **已知例外（有意为之）**：**Windows 托盘仍是上游鲸鱼**。fork 的 `icon-windows.svg` 是扁平导出、没有 `tray-glyph` 组，而 `renderTrayIconEntries` 的合约要求该组存在；渲染器"绕底板中心放大 20%"也是按鲸鱼几何调的。这不是合并丢失，不要"修"成 fork 图标。
- **验证**：`apps/desktop/tests/fork-packaging.spec.ts`（21 处断言，品牌接线守卫）。

### R04 Linux x64 打包目标
- **要什么**：在 Linux x64 主机上能打出 AppImage + deb 产物；Linux 发布**没有**强制更新策略、没有更新 feed、不进入上传流程。
- **必须保留（分散在上游文件里的最小改动）**：
  - `scripts/desktop-build-paths.{mjs,d.mts}`：`SUPPORTED_TARGETS` 加 `linux-x64`；`DesktopBuildTarget` 类型 = 自动更新目标 ∪ `linux-x64`；`desktopTargetPlatform` 返回 `linux`。
  - `scripts/desktop-package-environment.{mjs,d.mts}`：`platform` 允许 `linux`；读 `.env.linux`；`LINUX_SETTING` 只接受 `DSH_DESKTOP_APP_ID`；跳过 `resolveDesktopPolicyEnvironment` 与 `resolveDesktopAutoUpdateConfig`。
  - `scripts/electron-builder-config.mjs`：`policy = resolvedPlatform === 'linux' ? undefined : …`；`update = unsigned || linux ? undefined : …`。
  - `scripts/package-target.ts`：`linux-x64` 目标（`--linux`）、必须 Linux x64 宿主、无 update 目标时不写 release record。
  - `scripts/prepare-runtime.ts`：Linux 的 Electron 可执行文件是 `electron`（不是 `Electron.app/...`），并 `chmod 0o755`。
  - `scripts/prepare-cli.ts`：非 Windows 的 launcher 都要可执行位。
  - `scripts/prepare-dsh.ts`：`NODE` 按**目标**平台解析。
  - `scripts/desktop-toolchain-preflight.ts`、`scripts/development-project.ts`、`scripts/desktop-upload-plan.ts`、`scripts/upload-target.ts`：类型/目标名放宽（打包目标名与上传目标名分离，Linux 只打包不上传）。
  - `fork-packaging.mjs` 的 `linux` 块：`maintainer: ihero3 <ihero.cn@gmail.com>`、`icon`、产物名保持 `linux-x64` 拼写、`target: ['AppImage','deb']`、`executableName`。
- **冲突取舍**：上游重写这些函数时，**以上游新结构为骨架**，把 linux 分支与类型放宽逐处贴回；`fork-packaging.mjs` 的 linux 块是 fork 唯一住处，优先往那里放。
- **验证**：`apps/desktop/tests/desktop-build-paths.spec.ts`、`package-target.spec.ts`、`desktop-package-environment.spec.ts`、`installer-packaging.spec.ts`；真打包需 Linux x64 主机。

### R05 免证书构建
- **要什么**：没有付费 Apple 账号也能产出可运行的 macOS 包（ad-hoc 签名），Windows `--unsigned` 保持上游行为。
- **必须保留**：
  - `scripts/package-target.ts`：`UNSIGNED_TARGETS = new Set(['win-x64','mac-arm64'])`；`--unsigned` 允许 mac-arm64；`DSH_DESKTOP_UNSIGNED` 写进 electron-builder 环境；unsigned 时跳过 macOS 钥匙串包装、跳过公证分支、不写 release record。
  - `scripts/electron-builder-config.mjs`：`unsigned` 允许 `darwin`；`packagesMacOS && !unsigned` 才解析签名与公证环境；`afterSign` 里 `if (!unsigned) verifyMacOSSignatureAfterSign(...)`；`artifactBuildCompleted` 的 `if (unsigned || !…endsWith('.dmg')) return`。
  - `scripts/prepare-dsh.ts`：`DSH_DESKTOP_UNSIGNED === '1'` 走 `signMacOSRuntimeAdHoc`，否则走上游 `signMacOSRuntime`。
  - `scripts/fork-adhoc-sign.mjs`（fork 自有）：`codesign --force --sign -`，签名标识符与 JIT entitlement 规则对齐上游 signer，但不用 keychain/timestamp/runtime 选项。
  - `fork-packaging.mjs`：unsigned 时 `mac.identity='-'`、`forceCodeSigning=false`、`hardenedRuntime=false`、`notarize=false`、`dmg.sign=false`。
- **判据（别把正常现象当故障）**：ad-hoc 包上 `spctl --assess` **必然拒绝**、`pnpm run verify:mac-signature`（按 Developer ID/Team ID 断言）**必然失败**。真判据是 `codesign -dv --verbose=4` 显示 `Signature=adhoc`、`TeamIdentifier=not set`，且包内 `*.node` 都有签名。
- **验证**：`apps/desktop/tests/fork-adhoc-sign.spec.ts`、`fork-adhoc-sign-macos.spec.ts`、`macos-signature.spec.ts`、`package-target.spec.ts`。

### R06 私有产品插件随包发布
- **要什么**：`plugins/` 里的两个产品插件不在上游包集里，必须被物化进打包后的 dsh `node_modules`，并作为 profile bundle 加载。
- **必须保留**：
  - `apps/desktop/src/private-plugins.ts`（fork 自有）：`PRIVATE_PLUGIN_NAMES`、复制 `package.json`/`cordis.patch.yml`/`lib`、校验 host/client 入口。
  - `scripts/prepare-dsh.ts`：`materializePrivatePlugins(...)` + `await verifyPrivatePluginHostImports(...)` 两处调用。
  - `apps/desktop/src/project-manager.ts`：`LOCAL_PLUGIN_BUNDLES = ['dsh-image-video','dsh-plugin-threerouter']`；bundle 顺序**产品在前、已装第三方在后**；顺序已一致时**不重写 manifest**（这条"不重写"契约必须保留，否则每次启动都 churn）。
- **冲突取舍**：上游重写 `createPluginProfile`/`createDevelopmentProjectMetadata` 时，以上游结构为骨架，把"产品 bundle 前置 + 第三方保留 + 不变化不重写"三条语义贴回。
- **验证**：`apps/desktop/tests/private-plugins.spec.ts`、`packages/boot/app-boot/tests/profile-resolution.spec.ts`。

### R07 Threerouter 集成（登录 + 品牌接管）
- **要什么**：侧边栏品牌换成 Threerouter；`settings.launcher` 位置由 Threerouter 账号 chip 占据（登录 Threerouter，而不是上游账号服务）；补 composer 媒体标签页、hero 品牌、logo、样式与客户端文案。
- **承载（全部 fork 自有，永不冲突）**：`plugins/dsh-plugin-threerouter/**`，重点是 `src/host/threerouter-auth.ts`、`src/host/plugin.ts`、`src/client/threerouter-auth-ui.tsx`、`hero-brand.tsx`、`composer-media-tabs.tsx`、`locale.ts`、`media-toolview*.tsx`、`styles.ts`。
- **profile 接线**：`plugins/dsh-plugin-threerouter/cordis.patch.yml` 禁用 `ui-brand-official` 与 `ui-settings-account`（两处都是 `single` 槽位，靠 disable 而非优先级取胜），并 `insert: threerouter-integration`。
- **冲突取舍**：上游若**改名**了槽位、插件 id 或 profile manifest 字段，改 fork 的 patch/插件，不要改上游包——除非确认是上游缺陷（那种情况按 R10–R12 的方式登记）。
- **验证**：`pnpm run build:plugins` 成功；开发模式启动后侧边栏品牌与登录入口是 Threerouter。

### R08 图片/视频生成工具
- **要什么**：`generate_image` / `generate_video` 两个工具，支持三个 provider（`threerouter` 默认、`wanx`、`seedance`），可配置尺寸/时长/超时/轮询/重试/输出目录；`generate_image` 传 `image` 参考图时为图生图，`generate_video` 传 `image` 首帧时为图生视频。
- **图生图契约**：参考图入参接受本地路径/http(s)/data URL，经 `media.resolveImageReference` 解析；Threerouter 适配器把它放进 `/v1/images/edits` 的 `images[].image_url`（该端点是网关主推的 OpenAI 图片语义，`/media/generations` 是其标记为"历史兼容、不再推荐新接入"的旧入口），文生图走 `/v1/images/generations`；两端点成功即返回 `data[].url`，网关同步等待上限 120s、超时回 504 并给出任务 id，适配器把该 id 转成异步任务交既有轮询链路。尺寸按网关要求以 `x` 分隔下发（本插件对外仍是 `*` 口径）。其他 provider 未支持参考图时**显式报错**而非静默降级成文生图。视频链路暂仍走 `/v1/media/generations`。
- **承载（fork 自有）**：`plugins/dsh-image-video/**`，配置与默认值在 `cordis.patch.yml` 的 `- insert` 行（含 `outputsDir: './outputs'`）。
- **依赖契约**：`tools`（必需，来自 `dsh-base`）；`attachments`（`generate_image` 必需，未挂载时该工具不注册）。上游若改这些服务名，跟改本插件。
- **冲突取舍**：永不冲突；不因上游重构而把逻辑搬进 `packages/**`。

### R09 开发流程
- **要什么**：`pnpm run build:plugins` 单独打插件；开发模式（`dev.ts`）与打包都先构建插件，避免"只 pull 了 plugins/ 却用着旧 lib"。
- **必须保留**：根 `package.json` 的 `build:plugins`、`package:desktop:mac:arm64:unsigned[:dir]`、`package:desktop:linux:x64[:dir]`、workspaces 里的 `plugins/*`；`scripts/dev.ts` 里那次 `build:plugins`。
- **冲突取舍**：都是加法式改动（上游没有同名脚本），冲突时**两边都留**。

### R10 profile 作用域修复（`packages/boot/app-boot/src/profile.ts`）
- **要什么**：profile 自带的 bundle patch 行用裸 specifier 命名自己的包，需要经 `collectProfileScopePackages` 的 fallback 表解析；删除 `for (const layer of profile.layers) bundleLinks.delete(layer.packageName)` 这一行，让 profile 携带的 layer 包留在表里。
- **第二处承载（2026-10-07，上游 `869afc493d` 之后）**：`src/profile-resolution/resolver.ts` 的 `ResolutionRouter.replace()` 新增了
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
- **要什么**：`apps/desktop/README.md` / `README.zh.md` 里的美术路径说明指向 `resources-fork/`，并说明"托盘是唯一保留上游鲸鱼的 Windows 界面"。
- **必须保留**：`resources-fork/…` 路径与托盘例外那两句（中英各一处）。
- **冲突取舍**：以上游重写后的段落为准，只把这两处贴回。
- **`README.i18n.yaml` 不要手改**：哈希由 `pnpm run verify-translation-pairing` 重新生成（上游 2026-09-23 起改成按标题锚点的 section 记录，普通文本合并且合并后重算即可）。

### R14 工程杂项
- **必须保留**：根 `package.json` 的 workspaces `plugins/*` 与 `build:plugins`；`pnpm-workspace.yaml` 的 `plugins/*` 注释行与 `micromark-util-types: '2.0.2'` override；`.gitignore` 的 `apps/desktop/desktop-dev.log`、`.workbuddy/*`。
- **`pnpm-lock.yaml` 政策**：**不要手工合并锁文件**。取上游版本后跑 `pnpm install` 重新生成，再把 fork 的 `plugins/*` importer 与 override 带回来。
- **验证**：`pnpm install --frozen-lockfile` 成功；`pnpm run build:plugins` 成功。

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
- **验证**：`pnpm exec vitest run scripts/fork-merge/fork-merge.spec.ts`（16 个用例）；
  端到端判据是「与上游合并后 `git diff --name-only --diff-filter=U` 为空」（2026-10-07 实测 266 个上游提交合并为 0 冲突）。

## 四、永不冲突的 fork 自有路径（72 个文件，2026-10-07 实测）

| 路径 | 内容 |
| --- | --- |
| `plugins/**` | Threerouter 集成 + image-video 两个产品插件（R07、R08） |
| `apps/desktop/resources-fork/**` | 11 个品牌美术（R03） |
| `apps/desktop/scripts/fork-packaging.mjs`、`fork-adhoc-sign.mjs`(+`.d.mts`) | fork 打包覆盖与 ad-hoc 签名（R02、R03、R04、R05） |
| `scripts/fork-merge/**` | 合并驱动、安装器与 16 个用例（R18）；上游没有这个目录，永不冲突 |
| `apps/desktop/src/private-plugins.ts` | 私有插件物化（R06） |
| `apps/desktop/tests/fork-*.spec.ts`、`private-plugins.spec.ts`、`profile-brand.spec.ts` | 5 个 fork 守卫测试 |
| `apps/desktop/.env.linux.example`、`scripts/fetch-primary-runtime-cache.ps1` | Linux 环境模板、运行时缓存脚本 |
| `.github/workflows/desktop-release.yml`、`marketing/**`、`FORK-SYNC.md`、`git_fetch_upstream_merge_master.md` | CI、物料、文档 |

**唯一例外**：上游若在这些路径上**新增同名文件**（目前上游没有 `plugins/` 与 `resources-fork/`），会产生 add/add 冲突；此时改 fork 侧命名，不要动上游。

## 五、允许跟随上游（不要纠缠的部分）

| 内容 | 处理 |
| --- | --- |
| 上游重写后的测试与快照（`apps/desktop/tests/**`、`expected/**`、`packages/**/tests/**`） | 以上游为准；只把品牌字符串、`resources-fork/` 路径、Linux/unsigned 目标相关字面量改回 |
| 文档正文（README、docs、`.agents/notes` 的上游部分） | 以上游为准；只保留 R13 的两处 |
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

**`rerere` 已记录这 5 个冲突的解法**，实测重放结果与上次提交的解法**逐字节一致**（在临时 worktree 复现验证过）。也就是说同样的冲突再出现时，git 会自动解好，你只需要 `git add`（或开 `rerere.autoUpdate`）。

**下一次同步的预计冲突面**（估计值，不是实测）：上游近 7 天动过我们的 25 个文件，所以下次大概率仍集中在上表这 5 个文件上，规模 5–15 个；理论上限是**全部 56 个"我们也改过的上游文件"**。同步越频繁，单次冲突越少（2 天一次 ≈ 5 个）。

## 七、合并后必须跑的验证

```sh
pnpm run typecheck
pnpm exec vitest run apps/desktop/tests/
pnpm exec vitest run packages/boot/app-boot/tests/ packages/llm/llm-pi-ai/tests/ \
  packages/client/ui-settings-models/tests/ packages/client/connection/tests/
pnpm run build:plugins
```

判据：

- 当前基线是**全绿**（2026-09-30 实测：183 个测试文件、7759 个用例通过、54 跳过；`pnpm run typecheck` exit 0）。所以**任何红灯都是真信号**，不存在"一直红着所以忽略"的情况。
- `apps/desktop/tests/fork-packaging.spec.ts` 是品牌接线守卫：品牌取值、图标路径、`extendInfo`、`extraResources` 被静默改动就红灯。
- 红 → 对照第三节判断属于哪条 R：被上游覆盖（贴回）还是上游新断言与 fork 冲突（改断言）。
- 跑完对照 `git diff --name-only upstream/master..master` 复查风险集是否仍在 56 个左右。

## 八、台账维护规则

1. **新增任何定制必须在这里登记一条 R**；优先放第四节的自有路径，必须改上游文件时坚持"一个 import + 一处调用/最小门控"。
2. **上游已经等价提供的能力要主动注销**：把该条标记为"已上游化"，删掉 fork 侧冗余改动，风险集只会变小。
3. **每次同步后回填**：风险集文件数、当次冲突数、`rerere` 条目数（`ls .git/rr-cache | wc -l`）。
4. **判断不了就登记"待确认"**，不要静默丢——历史上丢东西就是这么发生的。
5. 本文件与 [FORK-SYNC.md](FORK-SYNC.md) 有重叠：**本文件管"保住什么"，FORK-SYNC.md 管"怎么操作与签名细节"**；若两者冲突，以本文件为准并顺手修 FORK-SYNC.md。

## 九、当前基线与历史数据

| 指标 | 数值（2026-09-30） |
| --- | --- |
| `master` | 含上游 0.2.0-rc.2，`0 behind / 47 ahead` |
| 相对上游改动的文件 | 119（上游也有的 56 + fork 独有 63） |
| 56 个风险文件的 fork 差异总量 | 766 行 |
| 上次同步冲突 | 5 个文件 / 52 行新增 / 19 行删除 |
| `rerere` 条目 | 5（逐字节重放验证通过） |
| 上游速度 | 7 天 749 个提交、30 天 5484 个 |
| 验证基线 | 测试 183 文件 / 7759 用例全绿；typecheck exit 0 |
| 2026-10-07 复核 | 已合并上游 `5badb15009`（0.2.1-alpha.1，266 个提交，**冲突 0**）。相对上游改动 130 个文件（上游也有的 58 + fork 独有 72）；58 个接触面文件的 fork 差异总量 613 增 / 197 删 |

## 十、待办

- [ ] **托盘美术**：重新导出带 `tray-glyph` 的 `icon-windows.svg`，指到 `resources-fork/` 并重跑 `pnpm run render:tray-icon`（R03 的唯一缺口，属美术活，不是同步问题）。
- [x] **清理陈旧 git 配置**（2026-10-07）：`merge.dsh-translation-pairing` 已由 `node scripts/fork-merge/install.mjs` 从 `.git/config.worktree` 删除；
      `.git/dsh-hooks/` 已不含 `/private/tmp/dsh-fork-c/...` 陈旧路径（`core.hooksPath` 指向当前检出，无需重装）。
- [ ] **修文件尾换行**：`apps/desktop/scripts/desktop-build-paths.mjs` 结尾缺换行（仓库约定恰好一个），顺手修掉，避免 EOF 处反复冲突。
- [x] **重装 git 集成**：见上条——`.git/dsh-hooks/*` 路径已是当前检出，无需处理。
- [x] **合并驱动（R18）**（2026-10-07）：`pnpm-lock.yaml` 与两个 `package.json` 交给 `scripts/fork-merge/`；上游 266 个提交的合并实测 0 冲突。
- [ ] `feat/desktop-linux-target` 分支（3 个提交）保留在本机作参考、未 push、**不合并进 master**；既然不做上游 PR，除非改主意否则不用管它。
