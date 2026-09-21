/**
 * Composer 媒体模式 tab：工具行内「文本 / 图片 / 视频」分段切换 +
 * 参数下拉组。
 *
 * 注册在 `conversation.input.left` list slot（owner InputBar）——上游契约把
 * 该座位定义为「工具行 + 按钮旁的小常驻控件」，且 hero 与会话两种 composer
 * variant 都渲染工具行，因此 tab 组在首页和会话内均可见。上游 css modules
 * 的 `.select` 芯片即原生 `<select>`，这里沿用同一设计语言（appearance:none
 * + 内联 chevron + `--dsw-*` 主题 token）。
 *
 * 参数生效机制（与 dsh-image-video 的 runtime-defaults 模块配套）：
 *   - 下拉变更立即 POST 同源 `/image-video/defaults`（插件回环路由），host 返回
 *     「运行时覆盖 ?? settings 持久默认」合并视图，逐字段 stale 守卫回写实际
 *     生效值（选「自动」清空覆盖后落位 settings 持久默认）；仅写内存运行时
 *     覆盖值，不落盘、不触发宿主重启；
 *   - 生成工具按「工具显式参数 > 运行时覆盖服务商 > settings 持久默认服务商
 *     > 激活服务商」取参；
 *   - 挂载时 GET 回显同一合并视图（覆盖值未设时直接显示 settings 持久默认）；
 *     插件重载后运行时值清空，回落 settings。
 *
 * 文本模式不渲染参数组：聊天模型继续使用上游右侧模型选择器
 * （conversation.input.model seat），不做覆盖。
 *
 * 下拉的尺寸/比例取值必须与 dsh-image-video src/runtime-defaults.ts 的白名单
 * 一致（该处为协议校验源，此处为展示源），改动需两仓同步；服务商下拉用本
 * 命名空间的 providerThreerouter / providerWanx / providerSeedance 三键
 * （原桌面仓库复用 desktop.settings 命名空间，本插件自含字典，不再依赖
 * 桌面 settings 面）。下拉只列服务商不列模型：选中某服务商即用其内置默认
 * 模型出片（需该服务商 API Key），「自动」跟随 settings 持久默认服务商。
 *
 * 文案走 `threerouter.composerMedia` locale 命名空间（zh/en 字典在本文件
 * 注册，随上游界面语言切换），避免中英混排。
 *
 * @module dsh-plugin-threerouter/client/composer-media-tabs
 */

import { useEffect, useRef, useState } from 'react'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
// 仅拉类型面（'conversation.input.left' slot augment 与 locale 服务声明），
// 不导入具名类型；配合 client tsconfig 的 skipLibCheck（与 media-toolview
// 相同的理由）。
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'

/** Composer 媒体参数 locale 命名空间。 */
export const COMPOSER_MEDIA_LOCALE_NAMESPACE = 'threerouter.composerMedia'

const zh = {
  modeLabel: '生成模式',
  tabText: '文本',
  tabImage: '图片',
  tabVideo: '视频',
  auto: '自动',
  placeholderImage: '描述您想要的图片',
  placeholderVideo: '描述您想要的视频',
  fieldProvider: '服务商',
  fieldAspect: '比例',
  fieldStyle: '风格',
  fieldDuration: '时长',
  providerThreerouter: 'Threerouter',
  providerWanx: '万象（阿里云百炼）',
  providerSeedance: 'Seedance 2.5（火山引擎）',
  stylePhoto: '摄影',
  styleIllustration: '插画',
  style3d: '3D 渲染',
  styleAnime: '动漫',
  styleInk: '水墨',
  duration3: '3 秒',
  duration4: '4 秒',
  duration5: '5 秒',
  duration6: '6 秒',
  duration8: '8 秒',
  duration10: '10 秒',
} as const

export type ComposerMediaLocaleKey = keyof typeof zh

const en: Record<ComposerMediaLocaleKey, string> = {
  modeLabel: 'Generation mode',
  tabText: 'Text',
  tabImage: 'Image',
  tabVideo: 'Video',
  auto: 'Auto',
  placeholderImage: 'Describe the image you want',
  placeholderVideo: 'Describe the video you want',
  fieldProvider: 'Provider',
  fieldAspect: 'Aspect',
  fieldStyle: 'Style',
  fieldDuration: 'Duration',
  providerThreerouter: 'Threerouter',
  providerWanx: 'Wanx (Alibaba Cloud Bailian)',
  providerSeedance: 'Seedance 2.5 (Volcano Engine)',
  stylePhoto: 'Photography',
  styleIllustration: 'Illustration',
  style3d: '3D Render',
  styleAnime: 'Anime',
  styleInk: 'Ink painting',
  duration3: '3s',
  duration4: '4s',
  duration5: '5s',
  duration6: '6s',
  duration8: '8s',
  duration10: '10s',
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap { 'threerouter.composerMedia': ComposerMediaLocaleKey }
}

/** 本模块命名空间的翻译函数（slot 的 `locale` 字段自动注入 `t`）。 */
export type MediaT = TranslateNS<'threerouter.composerMedia'>

/** defaults 回环路由（dsh-image-video DEFAULTS_ROUTE_PATH；渲染进程同源直呼）。 */
const DEFAULTS_ROUTE = '/image-video/defaults'

/** 下拉选项：value 为协议值（'' = 自动，跟随 settings），label 为展示文案。 */
export interface SelectOption {
  value: string
  label: string
}

/** 「自动」占位项：清除运行时覆盖，回落 settings 持久值。 */
function autoOption(t: MediaT): SelectOption {
  return { value: '', label: t('auto') }
}

/**
 * 生成服务商预设（'' = 自动，跟随 settings 持久默认服务商）。三个服务商：
 * Threerouter 统一路由入口、万象直连阿里云百炼、Seedance 直连火山引擎；
 * 选中即用该服务商的内置默认模型出片/出图。图片与视频下拉共用同一份选项。
 */
function providerOptions(t: MediaT): ReadonlyArray<SelectOption> {
  return [
    autoOption(t),
    { value: 'threerouter', label: t('providerThreerouter') },
    { value: 'wanx', label: t('providerWanx') },
    { value: 'seedance', label: t('providerSeedance') },
  ]
}

/** 图像尺寸预设：label 为比例（语言无关），仅「自动」走文案。 */
function imageSizeOptions(t: MediaT): ReadonlyArray<SelectOption> {
  return [
    autoOption(t),
    { value: '1024*1024', label: '1:1' },
    { value: '1152*864', label: '4:3' },
    { value: '864*1152', label: '3:4' },
    { value: '1280*720', label: '16:9' },
    { value: '720*1280', label: '9:16' },
  ]
}

/** 视频宽高比预设。 */
function videoAspectOptions(t: MediaT): ReadonlyArray<SelectOption> {
  return [
    autoOption(t),
    { value: '16:9', label: '16:9' },
    { value: '9:16', label: '9:16' },
    { value: '1:1', label: '1:1' },
  ]
}

/** 视频时长预设（秒；1-10 上限与工具强制规范一致）。 */
function videoDurationOptions(t: MediaT): ReadonlyArray<SelectOption> {
  return [
    autoOption(t),
    { value: '3', label: t('duration3') },
    { value: '4', label: t('duration4') },
    { value: '5', label: t('duration5') },
    { value: '6', label: t('duration6') },
    { value: '8', label: t('duration8') },
    { value: '10', label: t('duration10') },
  ]
}

/** 图片风格预设：host 端映射英文提示词后缀（对所有服务商通用）。 */
function imageStyleOptions(t: MediaT): ReadonlyArray<SelectOption> {
  return [
    autoOption(t),
    { value: 'photo', label: t('stylePhoto') },
    { value: 'illustration', label: t('styleIllustration') },
    { value: '3d', label: t('style3d') },
    { value: 'anime', label: t('styleAnime') },
    { value: 'ink', label: t('styleInk') },
  ]
}

/** GET /image-video/defaults 响应视图（null = 未覆盖）。 */
interface DefaultsView {
  imageProvider: string | null
  imageSize: string | null
  imageStyle: string | null
  videoProvider: string | null
  videoAspectRatio: string | null
  videoDuration: number | null
}

/** 图像组下拉状态（'' = 自动）。 */
interface ImageSelection {
  provider: string
  size: string
  style: string
}

/** 视频组下拉状态（duration 为字符串，POST 时转数字）。 */
interface VideoSelection {
  provider: string
  aspect: string
  duration: string
}

type MediaMode = 'text' | 'image' | 'video'

/** tab 文案的 locale 键（值随语言切换，键固定）。 */
const MODE_KEYS: Record<MediaMode, ComposerMediaLocaleKey> = {
  text: 'tabText',
  image: 'tabImage',
  video: 'tabVideo',
}

/** 读取当前运行时覆盖值；webServer 未挂载（非桌面宿主）时返回 undefined。 */
async function readDefaults(): Promise<DefaultsView | undefined> {
  try {
    const res = await fetch(DEFAULTS_ROUTE)
    return res.ok ? (await res.json() as DefaultsView) : undefined
  } catch {
    return undefined
  }
}

/**
 * 写入运行时覆盖值并回读合并视图（运行时覆盖 ?? settings 持久默认，host 端
 * GET/POST 同语义）；失败静默——tab 选择仍是本地 UI 状态，不影响输入。
 */
async function writeDefaults(patch: Record<string, string | number>): Promise<DefaultsView | undefined> {
  try {
    const res = await fetch(DEFAULTS_ROUTE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    return res.ok ? (await res.json() as DefaultsView) : undefined
  } catch {
    // 非桌面宿主（无 webServer）或回环路由未注册：静默忽略
    return undefined
  }
}

/** 注册条目组件的本地结构视图——tab 组是常驻控件，不消费会话态，仅依赖
 * 本命名空间的 `t`（slot `locale` 字段自动注入）。 */
interface ComposerMediaTabsProps {
  t: MediaT
}

/** 单个参数下拉：label 文字 + 原生 select（appearance:none 芯片样式）。 */
function ComposerSelect(props: {
  label: string
  value: string
  options: ReadonlyArray<SelectOption>
  onChange: (value: string) => void
}) {
  return (
    <label className="dshDesktopComposerField">
      <span className="dshDesktopComposerFieldLabel">{props.label}</span>
      <select
        value={props.value}
        onChange={(event) => { props.onChange(event.target.value) }}
      >
        {props.options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  )
}

/**
 * 工具行媒体模式 tab：分段切换（文本/图片/视频）+ 当前模式的参数下拉组。
 * 文本模式仅显示分段控件本身（聊天模型用右侧上游模型选择器）。
 */
function ComposerMediaTabs(props: ComposerMediaTabsProps) {
  const { t } = props
  const [mode, setMode] = useState<MediaMode>('text')
  const [image, setImage] = useState<ImageSelection>({ provider: '', size: '', style: '' })
  const [video, setVideo] = useState<VideoSelection>({ provider: '', aspect: '', duration: '' })

  /**
   * 图片/视频模式下覆盖同卡输入框的 placeholder（图片→「描述您想要的
   * 图片」，视频→「描述您想要的视频」，随界面语言切换）。上游把 hero/default
   * 文案硬编码在受控 textarea 上，conversation 命名空间无法经 locale 按键
   * 覆盖（重复注册还会抛错），因此走 DOM 覆盖：React 只在自身 prop diff 时
   * 重写 placeholder，手改后 prop 不变即稳定生效；语言切换时上游 prop 变化
   * 会短暂写回，mediaPlaceholder 随之变化触发本 effect 重跑（晚于 commit），
   * 重新覆盖。切回文本模式恢复覆盖前的 React 原值，避免错杀 steer/plan 等
   * 动态提示。
   */
  const mediaPlaceholder =
    mode === 'image' ? t('placeholderImage')
    : mode === 'video' ? t('placeholderVideo')
    : null
  const composerRef = useRef<HTMLDivElement | null>(null)
  const reactPlaceholderRef = useRef<string | null>(null)
  const lastOverrideRef = useRef<string | null>(null)
  useEffect(() => {
    const textarea = composerRef.current?.closest('[data-composer-card]')?.querySelector('textarea')
    if (!textarea) return
    if (mediaPlaceholder === null) {
      if (lastOverrideRef.current !== null && reactPlaceholderRef.current !== null) {
        textarea.placeholder = reactPlaceholderRef.current
      }
      reactPlaceholderRef.current = null
      lastOverrideRef.current = null
      return
    }
    // DOM 值与上次写入不一致 => React 刚重写过（如语言切换），记录其最新值
    if (textarea.placeholder !== lastOverrideRef.current) {
      reactPlaceholderRef.current = textarea.placeholder
    }
    lastOverrideRef.current = mediaPlaceholder
    textarea.placeholder = mediaPlaceholder
  }, [mediaPlaceholder])

  // 挂载时回显 host 端合并视图（运行时覆盖 ?? settings 持久默认，其他入口写入的也能看到）
  useEffect(() => {
    let cancelled = false
    readDefaults().then((view) => {
      if (cancelled || view === undefined) return
      setImage({
        provider: view.imageProvider ?? '',
        size: view.imageSize ?? '',
        style: view.imageStyle ?? '',
      })
      setVideo({
        provider: view.videoProvider ?? '',
        aspect: view.videoAspectRatio ?? '',
        duration: view.videoDuration === null || view.videoDuration === undefined ? '' : String(view.videoDuration),
      })
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  // 外层快照 + POST 响应回写：host 返回「运行时覆盖 ?? settings 持久默认」合并
  // 视图，逐字段 stale 守卫（仅当该字段自写入后未被再次改动才回显），避免晚到的
  // 旧响应覆盖新选择；选「自动」（''）清空覆盖后落位到 settings 持久默认。
  const updateImage = (patch: Partial<ImageSelection>): void => {
    const next = { ...image, ...patch }
    setImage(next)
    void writeDefaults({ imageProvider: next.provider, imageSize: next.size, imageStyle: next.style }).then((view) => {
      if (view === undefined) return
      setImage((prev) => ({
        ...prev,
        provider: prev.provider === next.provider ? view.imageProvider ?? '' : prev.provider,
        size: prev.size === next.size ? view.imageSize ?? '' : prev.size,
        style: prev.style === next.style ? view.imageStyle ?? '' : prev.style,
      }))
    })
  }

  // 与 updateImage 同构：外层快照 + 合并视图逐字段 stale 守卫回写；
  // duration：'' = 自动（host 归一化 null），数字串转整数，回显时 null 还原 ''。
  const updateVideo = (patch: Partial<VideoSelection>): void => {
    const next = { ...video, ...patch }
    setVideo(next)
    void writeDefaults({
      videoProvider: next.provider,
      videoAspectRatio: next.aspect,
      videoDuration: next.duration === '' ? '' : Number(next.duration),
    }).then((view) => {
      if (view === undefined) return
      setVideo((prev) => ({
        ...prev,
        provider: prev.provider === next.provider ? view.videoProvider ?? '' : prev.provider,
        aspect: prev.aspect === next.aspect ? view.videoAspectRatio ?? '' : prev.aspect,
        duration:
          prev.duration === next.duration
            ? view.videoDuration === null || view.videoDuration === undefined
              ? ''
              : String(view.videoDuration)
            : prev.duration,
      }))
    })
  }

  return (
    <div ref={composerRef} className="dshDesktopComposerMedia" data-mode={mode}>
      <div className="dshDesktopComposerSeg" role="tablist" aria-label={t('modeLabel')}>
        {(['text', 'image', 'video'] as const).map((entry) => (
          <button
            key={entry}
            type="button"
            role="tab"
            aria-selected={mode === entry}
            className="dshDesktopComposerSegBtn"
            data-active={mode === entry}
            onClick={() => { setMode(entry) }}
          >
            {t(MODE_KEYS[entry])}
          </button>
        ))}
      </div>
      {mode === 'image' && (
        <div className="dshDesktopComposerParams">
          <ComposerSelect
            label={t('fieldProvider')}
            value={image.provider}
            options={providerOptions(t)}
            onChange={(provider) => { updateImage({ provider }) }}
          />
          <ComposerSelect
            label={t('fieldAspect')}
            value={image.size}
            options={imageSizeOptions(t)}
            onChange={(size) => { updateImage({ size }) }}
          />
          <ComposerSelect
            label={t('fieldStyle')}
            value={image.style}
            options={imageStyleOptions(t)}
            onChange={(style) => { updateImage({ style }) }}
          />
        </div>
      )}
      {mode === 'video' && (
        <div className="dshDesktopComposerParams">
          <ComposerSelect
            label={t('fieldProvider')}
            value={video.provider}
            options={providerOptions(t)}
            onChange={(provider) => { updateVideo({ provider }) }}
          />
          <ComposerSelect
            label={t('fieldAspect')}
            value={video.aspect}
            options={videoAspectOptions(t)}
            onChange={(aspect) => { updateVideo({ aspect }) }}
          />
          <ComposerSelect
            label={t('fieldDuration')}
            value={video.duration}
            options={videoDurationOptions(t)}
            onChange={(duration) => { updateVideo({ duration }) }}
          />
        </div>
      )}
    </div>
  )
}

/**
 * tab 组样式。选择器全部锚定自有 `dshDesktopComposerMedia` 命名空间，不触碰
 * 上游 css modules；颜色沿用上游 InputBar 工具行的 `--dsw-*` token（分段容器
 * 与 hover 底、主/次级文字），深浅主题自动跟随。select 芯片照抄上游
 * `.select` 的做法：appearance:none + 内联 chevron SVG。
 */
const COMPOSER_MEDIA_TABS_STYLES = `
.dshDesktopComposerMedia { display: flex; align-items: center; gap: 10px; min-width: 0; }
.dshDesktopComposerSeg {
  display: inline-flex; align-items: center; flex: none; padding: 2px;
  border-radius: 999px; background: var(--dsw-alias-interactive-bg-hover);
}
.dshDesktopComposerSegBtn {
  padding: 2px 10px; border: none; border-radius: 999px; background: transparent;
  color: var(--dsw-alias-label-secondary); font: inherit; font-size: 12px;
  line-height: 18px; font-weight: 500; white-space: nowrap; cursor: pointer;
}
.dshDesktopComposerSegBtn:hover { color: var(--dsw-alias-label-primary); }
.dshDesktopComposerSegBtn[data-active='true'] {
  background: var(--dsw-alias-button-info-fill); color: #fff; font-weight: 600;
}
.dshDesktopComposerParams { display: flex; align-items: center; gap: 6px; min-width: 0; }
.dshDesktopComposerField { display: inline-flex; align-items: center; gap: 2px; min-width: 0; }
.dshDesktopComposerFieldLabel {
  flex: none; color: var(--dsw-alias-label-secondary);
  font-size: 12px; line-height: 18px;
}
.dshDesktopComposerField select {
  max-width: 150px; height: 24px; padding: 0 18px 0 4px; border: none;
  border-radius: 6px; outline: none; background-color: transparent;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M3 4.5L6 7.5L9 4.5' stroke='%2381858C' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 3px center;
  background-size: 12px 12px; color: var(--dsw-alias-label-primary);
  font: inherit; font-size: 12px; line-height: 18px; font-weight: 500;
  white-space: nowrap; text-overflow: ellipsis; cursor: pointer; appearance: none;
}
.dshDesktopComposerField select:hover { background-color: var(--dsw-alias-interactive-bg-hover); }
.dshDesktopComposerField select:focus-visible { box-shadow: 0 0 0 1px var(--dsw-alias-button-info-fill); }

/* 加宽 composer 卡：媒体参数组（分段 + 服务商/比例/风格或时长下拉）比上游
   按纯文本对话预留的工具行更宽，放不下时上游 .row 的 flex-wrap 会把模型
   选择器/发送按钮整组挤到第二行。上游把宽度轴定义在会话根（css.root）上，
   :root 无法覆盖元素自身的类定义，故借根上的 data-phase 属性提升特异性
   重定义 composer 卡宽度轴；hero 列与卡片同源消费该变量，两态同步加宽且
   min(…,100%) 保留窄窗口收缩行为。消息列宽（--dsh-chat-content-width）
   与 dock 卡不受影响。 */
body [data-phase] { --dsh-composer-card-max-width: min(930px, 100%); }
`

function installComposerMediaTabsStyles(): () => void {
  const style = document.createElement('style')
  style.dataset.plugin = 'dsh-plugin-threerouter'
  style.dataset.pluginCss = 'dsh-plugin-threerouter/composer-media-tabs'
  style.textContent = COMPOSER_MEDIA_TABS_STYLES
  document.head.appendChild(style)
  return () => { style.remove() }
}

/**
 * 注册 composer 媒体模式 tab。`ctx.slots.inject` 的控制器归属调用方
 * fiber，插件卸载时随 apply fiber 自动级联注销（与 media-toolview /
 * brand shadow 一致）；全局样式与 locale 字典经 ctx.effect 挂载并随
 * disposer 卸载。
 * @param ctx - 浏览器 Cordis 上下文。
 */
export function applyComposerMediaTabs(ctx: ClientContext): void {
  const t = ctx.locale.bind(COMPOSER_MEDIA_LOCALE_NAMESPACE)
  ctx.effect(
    () => ctx.locale.register(COMPOSER_MEDIA_LOCALE_NAMESPACE, { zh, en }),
    'threerouter: composer media tabs dictionaries',
  )
  ctx.effect(
    () => installComposerMediaTabsStyles(),
    'threerouter: composer media tabs styles',
  )
  ctx.slots.inject('conversation.input.left', () => ctx.slots.register(
    {
      name: 'conversation.input.left',
      id: 'threerouter-media-tabs',
      order: 100,
      label: () => t('modeLabel'),
      locale: COMPOSER_MEDIA_LOCALE_NAMESPACE,
    },
    ComposerMediaTabs,
  ))
}
