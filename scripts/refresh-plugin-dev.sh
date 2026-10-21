#!/bin/sh
# 开发时让 plugins/ 的改动真正生效（Track A 交付，2026-10-20）。
#
# 背景：desktop 的 `dev:start`（即 `tsx scripts/dev.ts --skip-build`）会跳过
# `build:plugins`，而私有插件（dsh-image-video / threerouter）的产物不在整仓 build 里。
# 结果就是"改了 plugins/ 代码、重启 app 还是旧版本"。
#
# 用法：sh scripts/refresh-plugin-dev.sh
set -eu
cd "$(dirname "$0")/.."

echo "[1/2] 重建私有插件产物（dsh-image-video / threerouter）"
pnpm build:plugins

echo "[2/2] 启动桌面开发版（会重新准备开发工程）"
exec pnpm -C apps/desktop run start
