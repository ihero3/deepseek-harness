/**
 * Threerouter 适配器：基于 threerouter.com 网关。
 *
 * 图片走网关主推的 OpenAI 兼容端点（同步语义）：
 *   POST /images/generations（文生图）| POST /images/edits（图生图，参考图放 images[].image_url），
 *   成功即返回 {created, data:[{url}]}，超过网关同步等待窗口时回 504 并给出任务 id，
 *   本适配器把它交回既有轮询链路（GET /media/{id}）续跑。
 * 视频仍走历史兼容端点 POST /media/generations（显式携带 media_kind=video）→ GET /media/{id} 轮询。
 * 鉴权统一 Bearer Token。
 * @module dsh-image-video/providers/threerouter
 */

import { GenerationError, request, downloadMedia } from '../http-client.ts'
import type { ProviderAdapter, ImageGenParams, VideoGenParams, SubmitResult, TaskQueryResult, HttpOpts } from './types.ts'
import { toRequestOpts } from './types.ts'

/** Threerouter 默认文生图 / 图生图模型（网关文档默认模型，支持两类任务）。 */
const DEFAULT_IMAGE_MODEL = 'gpt-image-2'
/** Threerouter 默认文生视频模型。账号可用模型见 threerouter.com 控制台。 */
const DEFAULT_VIDEO_MODEL = 'wan2.2-t2v-plus'

/**
 * 生图同步请求的单次超时下限。网关在 /images/* 上同步等待任务终态最多 120s
 * （media_gateway_images.go 的 defaultImageSyncWait），之后再回 504 告知任务 id；
 * 客户端超时必须晚于该窗口，否则会在网关作答前先超时，拿不到那个任务 id。
 * 这是网关协议常量，不是部署可调项。
 */
const IMAGE_SYNC_TIMEOUT_MS = 150_000

/** OpenAI 图片响应（网关 /images/* 的成功体）。 */
interface OpenAIImageResponse {
  created?: number
  data?: Array<{ url?: string | null; b64_json?: string | null }>
}

/** 网关 504 文案里的任务 id（"…: task img_xxx (poll GET /v1/media/img_xxx)"）。 */
const TIMEOUT_TASK_ID = /task ([A-Za-z0-9_-]+)/

/** Threerouter API 请求头。 */
function threerouterHeaders(apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  }
}

/** 从失败响应中提取错误信息，兼容 string 与对象两种形态。 */
function extractTaskError(error: unknown): string {
  if (typeof error === 'string' && error.length > 0) return error
  if (error !== null && typeof error === 'object') {
    const obj = error as Record<string, unknown>
    if (typeof obj.message === 'string') return obj.message
  }
  return 'Threerouter 任务执行失败'
}

/**
 * 提交文生图 / 图生图任务。
 *
 * 两张端点都是 OpenAI 图片语义的同步接口：成功直接给图片 URL，本适配器据此回
 * `async: false` 让工具直接下载；参考图存在时改投 /images/edits 并把解析后的
 * data URL / 公网 URL 放进 `images[].image_url`（网关不接受 base_image_url）。
 * 网关在 120s 内没等到终态时回 504 并给出任务 id，这里把它转成异步任务交回
 * 既有轮询链路，避免整次生成白费；解析不到任务 id 就原样抛出网关诊断。
 */
async function submitImage(params: ImageGenParams, opts: HttpOpts): Promise<SubmitResult> {
  const hasReference = params.image !== undefined && params.image !== ''
  const url = `${opts.baseURL}/images/${hasReference ? 'edits' : 'generations'}`
  const body: Record<string, unknown> = {
    model: params.model ?? DEFAULT_IMAGE_MODEL,
    prompt: params.prompt,
    n: 1,
    // 网关在归一化层消费 response_format（缺省即 url）并剥掉后再转发上游。
    response_format: 'url',
  }
  // 尺寸按网关契约用 size 下发，且必须 x 分隔；本插件对外统一用 * 分隔（wanx 的口径）。
  const size = params.size.trim().replaceAll('*', 'x')
  if (size !== '') body.size = size
  if (hasReference) body.images = [{ image_url: params.image }]

  try {
    const data = await request(toRequestOpts('POST', url, threerouterHeaders(opts.apiKey), body, {
      ...opts,
      timeoutMs: Math.max(opts.timeoutMs, IMAGE_SYNC_TIMEOUT_MS),
    })) as OpenAIImageResponse
    const mediaUrl = Array.isArray(data?.data)
      ? data.data.find(item => typeof item?.url === 'string' && item.url !== '')?.url
      : undefined
    if (typeof mediaUrl !== 'string' || mediaUrl === '') {
      throw new Error('Threerouter 生图：响应未包含图片 URL')
    }
    return { taskId: '', async: false, mediaUrl, mediaType: 'image' }
  } catch (error) {
    if (error instanceof GenerationError && error.status === 504) {
      const taskId = TIMEOUT_TASK_ID.exec(error.message)?.[1]
      if (taskId !== undefined) return { taskId, async: true, mediaType: 'image' }
    }
    throw error
  }
}

/**
 * 提交视频任务（media_kind=video）。存在 image 时为首帧驱动的图生视频，
 * 请求携带 image 字段（服务端按此字段路由到图生视频通道），此时构图由首帧决定，不再传 ratio；
 * 纯文生时保持 ratio。resolution 为可选分辨率档位，取值由上游模型决定，缺失时服务端按模型默认处理。
 */
async function submitVideo(params: VideoGenParams, opts: HttpOpts): Promise<SubmitResult> {
  const url = `${opts.baseURL}/media/generations`
  const body: Record<string, unknown> = {
    model: params.model ?? DEFAULT_VIDEO_MODEL,
    prompt: params.prompt,
    media_kind: 'video',
    duration: params.duration,
  }
  if (params.image) {
    body.image = params.image
  } else if (params.aspectRatio) {
    body.ratio = params.aspectRatio
  }
  if (params.resolution) {
    body.resolution = params.resolution
  }
  const data = await request(toRequestOpts('POST', url, threerouterHeaders(opts.apiKey), body, opts)) as ThreerouterTaskResponse
  if (!data?.id) throw new Error('Threerouter 文生视频：未返回任务 ID')
  return { taskId: data.id, async: true, mediaType: 'video' }
}

/** 查询异步任务状态。完成后优先使用响应 url，缺失时回退 /content 302 端点。 */
async function queryTask(taskId: string, opts: HttpOpts): Promise<TaskQueryResult> {
  const url = `${opts.baseURL}/media/${taskId}`
  const data = await request(toRequestOpts('GET', url, threerouterHeaders(opts.apiKey), undefined, opts)) as ThreerouterQueryResponse
  switch (data?.status) {
    case 'processing':
      return { status: 'running' }
    case 'succeeded': {
      const mediaUrl = typeof data.url === 'string' && data.url.length > 0
        ? data.url
        : `${opts.baseURL}/media/${taskId}/content`
      return { status: 'succeeded', mediaUrl }
    }
    case 'failed':
      return { status: 'failed', error: extractTaskError(data.error) }
    case 'cancelled':
      return { status: 'failed', error: 'Threerouter 任务已取消' }
    default:
      return { status: 'failed', error: `Threerouter 未知任务状态: ${data?.status ?? '空'}` }
  }
}

/** Threerouter 任务提交响应。 */
interface ThreerouterTaskResponse {
  id?: string
  status?: string
  model?: string
  created_at?: string
}

/** Threerouter 任务查询响应。 */
interface ThreerouterQueryResponse {
  id?: string
  status?: string
  url?: string
  thumbnail_url?: string
  error?: unknown
}

/** Threerouter 适配器实例：统一入口同时支持文生图与文生视频。 */
export const threerouterAdapter: ProviderAdapter = {
  submitImage,
  submitVideo,
  queryTask,
}

/** 复用 downloadMedia。 */
export { downloadMedia }
