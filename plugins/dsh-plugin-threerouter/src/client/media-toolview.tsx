/**
 * 自有媒体 toolview：generate_video / generate_image 的 keyed
 * `tool.call.toolview` 注册。结果 meta（presentationMeta，UI-only）携带
 * localPath 时内嵌 <video>/<img> 播放器，媒体字节经插件侧 /outputs 只读路由
 * 从本地 outputs 目录加载；加载失败或 meta 缺失时回退文件行。
 *
 * 卡片同时交代落地位置：文件行显示完整保存路径（家目录前缀显示为 `~`，复制与
 * 路径动作仍用绝对路径），并提供「复制路径 / 在文件夹中显示 / 用系统应用打开」，
 * 后两个动作经 Client Remote 交给宿主执行（见 path-actions.ts）；部署未挂载该
 * Remote 时退回聊天侧的 openFile。
 *
 * 上游类型（ClientContext）type-only import，构建后擦除，不进 client
 * bundle；toolview 的 props 用本地结构视图，避免引入 dsh-client-ui-tool
 * 类型入口的 augment 缺陷（见 MediaToolviewProps 注释）。
 *
 * @module dsh-plugin-threerouter/client/media-toolview
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
// 仅拉类型面（'tool.call.toolview' slot augment），不导入具名类型；配合
// client tsconfig 的 skipLibCheck：上游该入口的声明把上游构建时才合并进场的
// conversation slot augment 引为约束，单独纳入插件编译会在 node_modules 内部
// 报约束错误，而上游自家 tsconfig.base 也开 skipLibCheck。
import type {} from '@deepseek-ai/dsh-client-ui-tool/client'
import { copyText } from './clipboard.ts'
import { displayPath, mediaViewFromBlock } from './media-toolview-model.ts'
import type { MediaPathAction, MediaPathActionRunner } from './path-actions.ts'
import { mediaPathAction } from './path-actions.ts'

/**
 * 上游 ToolCallViewProps 的本地结构视图（组件仅消费其中几项）。`block` 收为
 * unknown，实际探测交给 mediaViewFromBlock 的 `in` 收窄；`pathAction` 由
 * {@link applyMediaToolviews} 注入，未注入时为 undefined。
 */
interface MediaToolviewProps {
  toolName: string
  block: unknown
  openFile: (path: string) => void
  pathAction?: MediaPathActionRunner | undefined
  /** 宿主账号家目录；用于把保存路径显示成 `~/…`。 */
  home?: string | undefined
}

/** 工具名 → 卡片标题（自有文案，产品语言为中文）。 */
const MEDIA_TITLES: Record<string, string> = {
  generate_video: '生成视频',
  generate_image: '生成图片',
}

/** 动作反馈的停留时长（毫秒）。 */
const NOTE_DURATION_MS = 2400

/** 揭示文件所在目录的按钮文案，随宿主桌面平台取名（沿用壳层 data-platform 约定）。 */
const REVEAL_LABEL = typeof document !== 'undefined' && document.documentElement.dataset.platform === 'darwin'
  ? '在访达中显示'
  : '在文件夹中显示'

/**
 * keyed toolview 组件：运行中显示占位行；完成后内嵌播放器 + 保存路径行，
 * 播放器加载失败（/outputs 路由不可用等）时保留路径行，用户仍能定位文件。
 */
export function MediaToolview({ toolName, block, openFile, pathAction, home }: MediaToolviewProps) {
  const state = mediaViewFromBlock(block)
  const [loadFailed, setLoadFailed] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const noteTimer = useRef<number | undefined>(undefined)
  const announce = useCallback((text: string): void => {
    setNote(text)
    window.clearTimeout(noteTimer.current)
    noteTimer.current = window.setTimeout(() => { setNote(null) }, NOTE_DURATION_MS)
  }, [])
  useEffect(() => () => { window.clearTimeout(noteTimer.current) }, [])
  const copyPath = useCallback(async (path: string): Promise<void> => {
    announce(await copyText(path) ? '已复制完整路径' : '复制失败，请手动选中路径复制')
  }, [announce])
  const runPathAction = useCallback(async (path: string, action: MediaPathAction): Promise<void> => {
    if (pathAction === undefined) return
    const done = await pathAction(path, action)
    if (!done) {
      announce(action === 'reveal' ? '未能打开所在文件夹，可复制路径手动打开' : '未能调用系统应用，可复制路径手动打开')
    }
  }, [pathAction, announce])

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
      <div className="dshDesktopMediaPath" title={state.localPath}>{displayPath(state.localPath, home)}</div>
      <div className="dshDesktopMediaActions">
        <button
          type="button"
          className="dshDesktopMediaButton"
          onClick={() => { void copyPath(state.localPath) }}
        >
          复制路径
        </button>
        {pathAction === undefined
          ? (
              <button
                type="button"
                className="dshDesktopMediaButton"
                onClick={() => { openFile(state.localPath) }}
              >
                在侧边栏打开
              </button>
            )
          : (
              <>
                <button
                  type="button"
                  className="dshDesktopMediaButton"
                  onClick={() => { void runPathAction(state.localPath, 'reveal') }}
                >
                  {REVEAL_LABEL}
                </button>
                <button
                  type="button"
                  className="dshDesktopMediaButton"
                  onClick={() => { void runPathAction(state.localPath, 'open') }}
                >
                  用系统应用打开
                </button>
              </>
            )}
      </div>
      {note === null ? null : <div className="dshDesktopMediaNote" role="status">{note}</div>}
    </div>
  ) : null
  if (state.kind !== 'media' || loadFailed) {
    return (
      <div className="dshDesktopMediaTool" data-media-state="unavailable">
        <span>{state.kind === 'media' ? `${title}结果无法在对话内预览` : `${title}结果已保存到本地 outputs 目录`}</span>
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
 * 注册 generate_video / generate_image 的 keyed toolview，并把宿主路径动作
 * 注入卡片。`ctx.slots.inject` 的控制器归属调用方 fiber，插件卸载时随 apply
 * fiber 自动级联注销，无需外层 ctx.effect。
 * @param ctx - 浏览器 Cordis 上下文。
 */
export function applyMediaToolviews(ctx: ClientContext): void {
  ctx.slots.inject('tool.call.toolview', function* () {
    // 每次渲染现读 Remote：Remote 装配晚于本插件挂载时，卡片下一次渲染即拿到路径动作。
    const inject = (): { pathAction: MediaPathActionRunner | undefined } => ({ pathAction: mediaPathAction(ctx) })
    yield ctx.slots.register({ name: 'tool.call.toolview', key: 'generate_video', inject }, MediaToolview)
    yield ctx.slots.register({ name: 'tool.call.toolview', key: 'generate_image', inject }, MediaToolview)
  })
}
