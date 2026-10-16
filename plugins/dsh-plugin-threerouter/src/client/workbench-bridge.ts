/**
 * 「发送到工作台 / 放入时间轴」的桥（`T6-1` 卡片半边）。
 *
 * 卡片只有文件路径，**不该知道工作台的项目状态**，所以这里只调
 * `dsh-image-video` 插件的 `/image-video` RPC 的 `assets/quick-add`：
 * 由宿主决定放进哪个项目、是否新建时间轴。插件没装时 runner 为 undefined，
 * 卡片就不渲染这两个动作（优雅降级，而不是点了报错）。
 *
 * @module dsh-plugin-threerouter/client/workbench-bridge
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'

/** 工作台快速登记的结果。 */
export interface WorkbenchQuickAddResult {
  readonly projectName: string
  /** 这次是否新建了素材记录（false = 之前登记过）。 */
  readonly created: boolean
  readonly timelineId?: string
}

/** 卡片可用的快速登记动作。 */
export type WorkbenchQuickAddRunner = (input: {
  path: string
  kind: 'image' | 'video'
  intoTimeline: boolean
}) => Promise<WorkbenchQuickAddResult | undefined>

/** 本插件依赖的工作台 RPC 通道（`dsh-image-video` 的固定通道名）。 */
const WORKBENCH_CHANNEL = '/image-video'

/**
 * 读取工作台快速登记动作。
 * @param ctx - 浏览器 Cordis 上下文。
 * @returns 可用的 runner；部署里没有连接服务或没装工作台时返回 undefined。
 */
export function workbenchQuickAdd(ctx: ClientContext): WorkbenchQuickAddRunner | undefined {
  const connection = ctx.get('connection') as {
    rpc?: { call?: (channel: string, endpoint: string, payload: unknown) => Promise<{ ok: boolean; value?: unknown }> }
  } | undefined
  const call = connection?.rpc?.call
  if (typeof call !== 'function') return undefined
  return async input => {
    try {
      const result = await call(WORKBENCH_CHANNEL, 'assets/quick-add', input)
      if (result?.ok !== true) return undefined
      const value = result.value as { projectName?: string; created?: boolean; timelineId?: string } | undefined
      return {
        projectName: value?.projectName ?? '工作台',
        created: value?.created === true,
        ...value?.timelineId === undefined ? {} : { timelineId: value.timelineId },
      }
    } catch {
      // 工作台没挂载/通道不可达：当作"没有这个动作"，卡片保持原样
      return undefined
    }
  }
}
