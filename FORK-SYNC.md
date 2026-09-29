# Fork 与上游同步手册

本文件是 fork 自有内容：上游没有这个路径，所以它**永远不参与冲突**。

## 实测冲突面（2026-09-29）

上游 `upstream/master` = `639ed01539`（0.2.0-rc.2），比上次合并的基点 `21638c5631` 多 **293** 个提交。
预演命令（只读、不落盘、不动工作区）：

```sh
git fetch upstream
git merge-tree --write-tree --name-only master upstream/master
```

| 类别 | 数量 | 位置 |
| --- | --- | --- |
| **硬冲突**（必须人工解析） | 5 | 全部在 `apps/desktop` |
| 双方都改但 git 能自动合并（潜在风险区） | 15 | 同样集中在 `apps/desktop` |
| `plugins/**`、`marketing/**`、各类新增文件 | — | **零冲突** |

我们的产品定制（Threerouter 集成、image-video、品牌与账号 UI、`cordis.patch.yml` 行）全部落在 fork 自有路径，
上游没有 `plugins/` 这个目录，因此**产品功能本身不会和上游冲突**。冲突只来自"改上游的桌面打包与外壳文件"。

## 同步流程

```sh
git fetch upstream
git merge-tree --write-tree --name-only master upstream/master   # 先看冲突面
git merge upstream/master                                        # 按下面的冲突地图解析
pnpm run typecheck && pnpm install --frozen-lockfile             # 合并后至少跑这两项
git commit && git push origin master:master
```

本仓库已开启 `rerere.enabled=true` 与 `merge.conflictStyle=zdiff3`：同一个冲突第二次出现时，
git 会自动重放上一次的解法（`git rerere status` 可查看）。

## 冲突地图

| 文件 | 我们改了什么 | 解析原则 |
| --- | --- | --- |
| `apps/desktop/scripts/electron-builder-config.mjs` | Linux 不要求更新策略与更新源；macOS 允许未签名（跳过身份查找与公证）；品牌名 `Deepseek Harness for Threerouter`、产物前缀 `dsh-threerouter-` | 以上游新结构为准，把豁免条件与品牌值贴回 |
| `apps/desktop/scripts/prepare-dsh.ts` | 调用 fork 自有模块 `src/private-plugins.ts` 物化 `plugins/**` 私有插件；按目标平台选 Electron 可执行文件；未签名分支 | 保住两处调用（`materializePrivatePlugins`、`verifyPrivatePluginHostImports`），其余取上游 |
| `apps/desktop/src/main.ts` | 新增 `shell` 主机的文档服务（打包后的 renderer）；窗口 `applicationName` 品牌名 | 保住 `serveShellDocument` 分支与品牌名 |
| `apps/desktop/tests/main-startup.spec.ts` | 菜单文案随品牌名 | 以上游重写后的测试为准，只改断言里的品牌字符串 |
| `apps/desktop/package.json` | `homepage`、4 个 Linux/未签名打包脚本 | 两边都留 |

## 让冲突更少的三条规则

1. **新定制优先放 fork 自有路径**：`plugins/**`、新增文件、`cordis.patch.yml` 里的行（用配置改行为，而不是改上游代码）。
   侧边栏品牌与账号行的替换就是这么做的，全程零冲突。
2. **必须改上游文件时，只留一个 import + 一处调用**：真实逻辑放 fork 自有模块，
   `apps/desktop/src/private-plugins.ts` 就是范例。改动越少、越靠近函数边界（而不是函数体中间），越不容易和上游撞上。
3. **通用能力优先上游化**：目前上游仍不支持 Linux 打包目标（`package-target.ts` 无 `linux`）与未签名 macOS
   构建（`electron-builder-config.mjs` 要求 `unsigned` 只能是 Windows）。这两项做成上游 PR 被接受后，
   上表前两行的冲突会**永久消失**。

## 待办

- [ ] 收敛 `apps/desktop/scripts/electron-builder-config.mjs` 与 `apps/desktop/src/main.ts` 的 fork 改动：
      目前散在多个 hunk 里，可改成一个 fork 自有函数 + 一处调用，把冲突从"函数体中段"移到"函数边界"。
- [ ] 上游 PR：Linux 打包目标、未签名 macOS 构建。
- [ ] 每次合并后回来更新本文件的冲突面数字。
