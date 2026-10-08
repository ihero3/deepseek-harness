/**
 * 插件配置类型与 Schemastery schema。所有部署可变参数都通过 Config 暴露，
 * 不存在硬编码可调参数；切换服务商只需改 `provider` 字段，HMR 自动重载。
 * @module dsh-image-video/config
 */

import z from '@deepseek-ai/schemastery'

/** 支持的生成服务商。 */
export type Provider = 'threerouter' | 'wanx' | 'seedance'

/**
 * 按凭证引用名解析密钥值的回调。工具 execute 内由插件经 `ctx.credentials`
 * 构造，使配置只携带引用、不内联明文凭证。
 * @param ref - 凭证引用名（POSIX 环境变量式标识符）。
 * @returns 引用当前解析到的值；引用未配置或凭证服务缺失时为 undefined。
 */
export type ApiKeyResolver = (ref: string) => Promise<string | undefined>

/** 单个服务商的凭证与自定义接口地址。 */
export interface ProviderCredentials {
  /** 服务商 API Key；切换 provider 后对应 key 立即生效。 */
  apiKey: string
  /**
   * API Key 的凭证引用名；apiKey 留空时按此引用经凭证缝解析，如桌面端
   * Threerouter 登录后写入的 Key。留空表示不使用引用。
   */
  apiKeyEnv: string
  /** 自定义接口地址，留空使用服务商默认端点。 */
  baseURL?: string
}

/** 插件配置：服务商选择、凭证、模型、生成默认值、轮询与重试策略。 */
export interface Config {
  /** 当前激活的服务商，切换后立即生效（HMR）。 */
  provider: Provider
  /** Threerouter 凭证；provider=threerouter 时使用（支持图片+视频）。 */
  threerouter: ProviderCredentials
  /** 万象（wanx）凭证；provider=wanx 时使用。 */
  wanx: ProviderCredentials
  /** Seedance2.5 凭证；provider=seedance 时使用。 */
  seedance: ProviderCredentials
  /** 默认图片服务商；留空跟随激活服务商，adapter 使用其内置默认模型。 */
  defaultImageProvider: '' | Provider
  /** 默认视频服务商；留空跟随激活服务商，adapter 使用其内置默认模型。 */
  defaultVideoProvider: '' | Provider
  /** 默认图片尺寸，形如 "1024*1024"。 */
  defaultImageSize: string
  /** 默认视频时长（秒），上限 10。 */
  defaultVideoDuration: number
  /** 单次 HTTP 请求超时（毫秒）。 */
  timeoutMs: number
  /** 视频任务轮询间隔（毫秒）。 */
  pollIntervalMs: number
  /** 视频任务整体超时（毫秒），超时后中止轮询。 */
  pollTimeoutMs: number
  /** 可重试错误的最大重试次数（鉴权失败等不可重试错误立即抛出）。 */
  retryTimes: number
  /** 生成媒体落地目录，相对路径基于进程 cwd 解析。 */
  outputsDir: string
}

/**
 * Threerouter API Key 的凭证引用名，与 `dsh-plugin-threerouter` 登录写入凭证缝时使用的引用一致，
 * 属两个插件间的集成常量而非部署可变项。作为 threerouter provider 的 apiKeyEnv 默认值，
 * 使未显式声明 apiKeyEnv 的配置层（如覆盖整块 config 的 profile patch）也能解析登录后的 Key。
 */
const DEFAULT_THREEROUTER_API_KEY_ENV = 'THREEROUTER_API_KEY'

/**
 * 服务商凭证 schema，复用于 threerouter/wanx/seedance；apiKey 留空时按 apiKeyEnv 解析。
 * @param defaultApiKeyEnv - 该服务商 apiKeyEnv 未声明时的默认凭证引用名。
 * @returns 该服务商的凭证 schema。
 */
function providerCredentialsSchema(defaultApiKeyEnv: string): z<ProviderCredentials> {
  return z.object({
    apiKey: z.string().default('').description('服务商 API Key；未激活的 provider 可留空'),
    apiKeyEnv: z.string().role('credential-ref').default(defaultApiKeyEnv).description('API Key 的凭证引用名；apiKey 留空时按此引用解析，留空表示不使用引用'),
    baseURL: z.string().default('').description('自定义接口地址，留空使用默认端点'),
  })
}

/** 插件配置 schema，默认服务商为 threerouter（图片+视频统一入口），wanx/seedance 可选。 */
export const Config: z<Config> = z.object({
  provider: z.union(['threerouter', 'wanx', 'seedance']).default('threerouter').description('激活的生成服务商'),
  threerouter: providerCredentialsSchema(DEFAULT_THREEROUTER_API_KEY_ENV)
    .default({ apiKey: '', apiKeyEnv: DEFAULT_THREEROUTER_API_KEY_ENV }).description('Threerouter 凭证（默认服务商）'),
  wanx: providerCredentialsSchema('').default({ apiKey: '', apiKeyEnv: '' }).description('万象（wanx）凭证'),
  seedance: providerCredentialsSchema('').default({ apiKey: '', apiKeyEnv: '' }).description('Seedance2.5 凭证'),
  defaultImageProvider: z.union(['', 'threerouter', 'wanx', 'seedance']).default('').description('默认图片服务商，留空跟随激活服务商'),
  defaultVideoProvider: z.union(['', 'threerouter', 'wanx', 'seedance']).default('').description('默认视频服务商，留空跟随激活服务商'),
  defaultImageSize: z.string().default('1024*1024').description('默认图片尺寸，如 1024*1024'),
  defaultVideoDuration: z.number().default(5).min(1).max(10).description('默认视频时长（秒），上限 10'),
  timeoutMs: z.number().default(60_000).min(1_000).description('单次 HTTP 请求超时（毫秒）'),
  pollIntervalMs: z.number().default(5_000).min(1_000).description('视频任务轮询间隔（毫秒）'),
  pollTimeoutMs: z.number().default(300_000).min(10_000).description('视频任务整体超时（毫秒）'),
  retryTimes: z.number().default(3).min(0).max(10).description('可重试错误的最大重试次数'),
  outputsDir: z.string().default('./outputs').description('生成媒体落地目录'),
})

/**
 * 解析指定服务商的凭证，校验非空。供按模型自动路由的生成工具使用：
 * composer 选中某服务商分组下的模型时，工具以该服务商的凭证直连。
 *
 * 取值优先级：明文 `apiKey` > `apiKeyEnv` 引用经凭证缝解析的值。引用使部署可
 * 只声明凭证名（如桌面端 Threerouter 登录写入的 Key），不把明文写进配置文件。
 * @param config - 已校验的插件配置。
 * @param provider - 目标服务商。
 * @param resolveApiKey - 按引用名解析凭证值的回调，由插件经 `ctx.credentials` 构造。
 * @returns 服务商凭证与端点。
 * @throws 当明文与引用都取不到非空 API Key 时（报错指明缺 key 的 provider 字段）。
 */
export async function resolveProviderCredentials(
  config: Config,
  provider: Provider,
  resolveApiKey: ApiKeyResolver,
): Promise<{ provider: Provider; apiKey: string; baseURL: string }> {
  const creds = provider === 'threerouter' ? config.threerouter
    : provider === 'wanx' ? config.wanx
    : config.seedance

  const literal = creds.apiKey.trim()
  const ref = creds.apiKeyEnv.trim()
  let apiKey: string | undefined = literal === '' ? undefined : literal
  if (apiKey === undefined && ref !== '') {
    apiKey = (await resolveApiKey(ref))?.trim() || undefined
  }
  if (apiKey === undefined) {
    throw new Error(
      `dsh-image-video: 服务商 ${provider} 未配置 API Key，请设置 ${provider}.apiKey，`
      + `或把 ${provider}.apiKeyEnv 指向已配置的凭证`,
    )
  }
  return {
    provider,
    apiKey,
    baseURL: creds.baseURL?.trim() || defaultBaseURL(provider),
  }
}

/** 服务商默认接口地址。 */
function defaultBaseURL(provider: Provider): string {
  switch (provider) {
    case 'threerouter': return 'https://api.threerouter.com/v1'
    case 'wanx': return 'https://dashscope.aliyuncs.com/api/v1'
    case 'seedance': return 'https://ark.cn-beijing.volces.com/api/v3'
  }
}
