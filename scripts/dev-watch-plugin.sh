#!/bin/sh
# 开发期插件热更新：改界面**不用重启 App**（2026-10-23 实测通过）。
#
# 原理：`@deepseek-ai/dsh-hmr` 以 500ms 轮询客户端产物（`lib/client/*.js`）的
# mtime/ctime/size，变了就通过 SSE 通知客户端重新取该插件（不刷新页面、不重启宿主）。
# 所以这里只需要一个"保存即重建"的 watcher：tsdown --watch 写 lib/，HMR 负责让界面生效。
#
# 边界（别误会）：
# - `src/client/**`（界面半边）→ 保存即生效；
# - `src/host|workbench|media|tools/**`（宿主半边，Node 进程）→ 仍要重启（模块不热替换），
#   用 `sh scripts/refresh-plugin-dev.sh`；
# - 打包产物/壳（Harness 侧）→ 仍要重建 + 重启。
#
# 用法：sh scripts/dev-watch-plugin.sh      （仓库根；Ctrl-C 结束）
set -eu
cd "$(dirname "$0")/.."

echo "[watch] dsh-image-video 增量重建中（保存即写 lib/，HMR 让界面自动生效）"
echo "[watch] 只覆盖插件；宿主半边改动请用 scripts/refresh-plugin-dev.sh"
exec pnpm --filter dsh-image-video run dev
