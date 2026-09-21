/**
 * 自有媒体 toolview：generate_video / generate_image 的 keyed
 * `tool.call.toolview` 注册。结果 meta（presentationMeta，UI-only）携带
 * localPath 时内嵌 <video>/<img> 播放器，媒体字节经插件侧 /outputs 只读路由
 * 从本地 outputs 目录加载；加载失败或 meta 缺失时回退文件行，经 openFile
 * 交系统播放器打开。
 *
 * 上游类型（ClientContext）type-only import，构建后擦除，不进 client
 * bundle；toolview 的 props 用本地结构视图，避免引入 dsh-client-ui-tool
 * 类型入口的 augment 缺陷（见 MediaToolviewProps 注释）。
 *
 * 新仓适配说明：
 *   - ClientContext 从 `@deepseek-ai/cordis` 导入（0.1.6-alpha.2 无
 *     `@deepseek-ai/dsh-client-runtime/client` 入口）。
 *
 * @module dsh-plugin-threerouter/client/media-toolview
 */

import { useState } from 'react'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
// 仅拉类型面（'tool.call.toolview' slot augment），不导入具名类型；配合
// client tsconfig 的 skipLibCheck：上游该入口的声明把上游构建时才合并进场的
// conversation slot augment 引为约束，单独纳入插件编译会在 node_modules 内部
// 报约束错误，而上游自家 tsconfig.base 也开 skipLibCheck。
import type {} from '@deepseek-ai/dsh-client-ui-tool/client'
import { mediaBasename, mediaViewFromBlock } from './media-toolview-model.ts'

/**
 * 上游 ToolCallViewProps 的本地结构视图（组件仅消费 toolName / block /
 * openFile）。`block` 收为 unknown，实际探测交给 mediaViewFromBlock 的
 * `in` 收窄。
 */
interface MediaToolviewProps {
  toolName: string
  block: unknown
  openFile: (path: string) => void
}

/** 工具名 → 卡片标题（自有文案，产品语言为中文）。 */
const MEDIA_TITLES: Record<string, string> = {
  generate_video: '生成视频',
  generate_image: '生成图片',
}

/**
 * keyed toolview 组件：运行中显示占位行；完成后内嵌播放器 + 文件行；
 * 播放器加载失败（/outputs 路由不可用等）时回退文件行并保留 openFile 按钮。
 */
export function MediaToolview({ toolName, block, openFile }: MediaToolviewProps) {
  const state = mediaViewFromBlock(block)
  const [loadFailed, setLoadFailed] = useState(false)
  const title = MEDIA_TITLES[toolName] ?? toolName
  if (state.kind === 'running') {
    return (
      <div className="dshDesktopMediaTool" data-media-state="running">
        {title} · 正在生成…
      </div>
    )
  }
  const pathRow = state.kind === 'media' ? (
    <div className="dshDesktopMediaMeta">
      <span className="dshDesktopMediaPath" title={state.localPath}>{mediaBasename(state.localPath)}</span>
      <button
        type="button"
        className="dshDesktopMediaOpen"
        onClick={() => { openFile(state.localPath) }}
      >
        在系统播放器中打开
      </button>
    </div>
  ) : null
  if (state.kind !== 'media' || loadFailed) {
    return (
      <div className="dshDesktopMediaTool" data-media-state="unavailable">
        <span>{title}结果已保存到本地 outputs 目录</span>
        {pathRow}
      </div>
    )
  }
  return (
    <div className="dshDesktopMediaTool" data-media-state="ready">
      {state.prompt === undefined ? null : <div className="dshDesktopMediaPrompt">{state.prompt}</div>}
      {toolName === 'generate_video'
        ? (
            <video
              className="dshDesktopMediaPlayer"
              controls
              preload="metadata"
              src={state.src}
              onError={() => { setLoadFailed(true) }}
            />
          )
        : (
            <img
              className="dshDesktopMediaPlayer"
              alt={state.prompt ?? '生成的图片'}
              src={state.src}
              onError={() => { setLoadFailed(true) }}
            />
          )}
      {pathRow}
    </div>
  )
}

/**
 * 注册 generate_video / generate_image 的 keyed toolview。
 * `ctx.slots.inject` 的控制器归属调用方 fiber，插件卸载时随 apply fiber
 * 自动级联注销，无需外层 ctx.effect。
 * @param ctx - 浏览器 Cordis 上下文。
 */
export function applyMediaToolviews(ctx: ClientContext): void {
  ctx.slots.inject('tool.call.toolview', function* () {
    yield ctx.slots.register({ name: 'tool.call.toolview', key: 'generate_video' }, MediaToolview)
    yield ctx.slots.register({ name: 'tool.call.toolview', key: 'generate_image' }, MediaToolview)
  })
}
