/**
 * 媒体 toolview 纯逻辑模型：从工具调用块推导内嵌媒体视图状态。
 * 独立于 React 组件（无 DOM / react 依赖），可在 node 环境单测。
 *
 * 数据来源：dsh-image-video 工具 output 的 presentationMeta（UI-only）经
 * tool/result 事件持久化到 ToolResultNode.meta。媒体字节经插件侧 /outputs
 * 只读路由加载（渲染进程与 webServer 同源，相对 URL 即可命中）。
 *
 * @module dsh-plugin-threerouter/client/media-toolview-model
 */

/** 内嵌媒体视图状态。 */
export type MediaViewState =
  | { kind: 'running' }
  | { kind: 'media'; src: string; localPath: string; prompt?: string }
  | { kind: 'failed'; reason?: string }
  | { kind: 'unavailable' }

/**
 * 从工具调用块推导媒体视图状态。
 * 未结算（RunningToolCall，无 kind 字段）→ running；已结算且 isError 为真 →
 * failed（带首行原因，keyed toolview 替换了通用行，原因只有本卡片能交代）；
 * 已结算且 meta 携带非空 localPath 字符串 → media（src 指向 /outputs/<文件名>）；
 * 其余（历史会话无 meta、meta 结构不符）→ unavailable，由组件回退文件行展示。
 * @param block - 上游工具调用块（unknown，结构未知），按 `in` 收窄探测
 *   kind/isError/meta，避免对上游判别联合做强类型约束（RunningToolCall 无公共字段）。
 */
export function mediaViewFromBlock(block: unknown): MediaViewState {
  if (typeof block !== 'object' || block === null) return { kind: 'running' }
  if (!('kind' in block) || typeof block.kind !== 'string') return { kind: 'running' }
  if ('isError' in block && block.isError === true) {
    const reason = failureReason(block)
    return reason === undefined ? { kind: 'failed' } : { kind: 'failed', reason }
  }
  if (!('meta' in block) || typeof block.meta !== 'object' || block.meta === null) {
    return { kind: 'unavailable' }
  }
  const { localPath, prompt } = block.meta as { localPath?: unknown; prompt?: unknown }
  if (typeof localPath !== 'string' || localPath === '') return { kind: 'unavailable' }
  return {
    kind: 'media',
    src: `/outputs/${encodeURIComponent(mediaBasename(localPath))}`,
    localPath,
    ...(typeof prompt === 'string' && prompt !== '' ? { prompt } : {}),
  }
}

/**
 * 提取已结算失败块的首行原因：优先结果内容里的文本，回落 error 的 reason
 * 或 `name: code`，都取不到时不带原因。
 * @param block - 已结算失败的工具结果块。
 * @returns 首行原因；结构未知或无可展示文本时为 undefined。
 */
function failureReason(block: object): string | undefined {
  const fromContent = resultText(block)
  if (fromContent !== '') return firstLine(fromContent)
  const error = 'error' in block ? block.error : undefined
  if (typeof error !== 'object' || error === null) return undefined
  const { name, code, reason } = error as { name?: unknown; code?: unknown; reason?: unknown }
  const text = typeof reason === 'string' && reason !== '' ? reason : errorLabel(name, code)
  return text === '' ? undefined : firstLine(text)
}

/** 拼接结果内容块里的文本；无文本块时返回空串。 */
function resultText(block: object): string {
  const content = 'content' in block ? block.content : undefined
  if (!Array.isArray(content)) return ''
  const lines: string[] = []
  for (const part of content) {
    if (typeof part !== 'object' || part === null) continue
    if ('text' in part && typeof part.text === 'string' && part.text !== '') lines.push(part.text)
  }
  return lines.join('\n')
}

/** 组合错误名与错误码，形如 `name: code`；两者都缺时返回空串。 */
function errorLabel(name: unknown, code: unknown): string {
  const nameText = typeof name === 'string' ? name : ''
  const codeText = typeof code === 'string' ? code : ''
  if (nameText === '') return codeText
  return codeText === '' ? nameText : `${nameText}: ${codeText}`
}

/** 取首个换行前的内容并去掉首尾空白，把多行错误压成一行卡片文案。 */
function firstLine(text: string): string {
  const at = text.indexOf('\n')
  return (at === -1 ? text : text.slice(0, at)).trim()
}

/**
 * 取路径的最后一段（兼容 Windows 反斜杠与 POSIX 斜杠）。
 * 渲染进程无 node:path，meta.localPath 来自宿主端（Windows 盘符路径），
 * 必须在客户端侧自行解析文件名。
 * @param path - 本地文件路径。
 */
export function mediaBasename(path: string): string {
  const at = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  return at === -1 ? path : path.slice(at + 1)
}

/**
 * 把宿主家目录前缀折叠成 `~`，用于卡片上的路径显示。
 * 只影响展示：复制与路径动作仍用 meta 里的绝对路径。
 * @param path - 宿主返回的绝对路径。
 * @param home - 宿主账号家目录；未知时原样返回。
 * @returns 家目录内的路径显示为 `~/…`，其余保持绝对路径。
 */
export function displayPath(path: string, home: string | undefined): string {
  if (home === undefined || home === '') return path
  if (path === home) return '~'
  const rest = path.startsWith(home) ? path.slice(home.length) : undefined
  if (rest === undefined) return path
  return rest.startsWith('/') || rest.startsWith('\\') ? `~${rest}` : path
}
