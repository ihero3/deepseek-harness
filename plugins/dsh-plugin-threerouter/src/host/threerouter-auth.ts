/**
 * Threerouter user authentication, API key auto-provisioning,
 * balance display, and invite link sharing.
 *
 * Host-side implementation (RPC server for client → host calls).
 */

import type { Context } from '@deepseek-ai/cordis'
import type { ConnectionRpcHandler } from '@deepseek-ai/dsh-client-connection'
import { credentialRef } from '@deepseek-ai/dsh-credentials'

// Threerouter API base URL from official site
export const THREEROUTER_BASE_URL = 'https://www.threerouter.com'
export const THREEROUTER_OPENAI_BASE = `${THREEROUTER_BASE_URL}/v1`

// The environment variable name used to inject the Threerouter API key into
// the llm-pi-ai OpenAI-compatible provider.
export const THREEROUTER_API_KEY_ENV = 'THREEROUTER_API_KEY'

// Credential seam reference for the Threerouter API key env name.
const THREEROUTER_API_KEY_REF = credentialRef(THREEROUTER_API_KEY_ENV)

// Provider route registered into the llm-pi-ai catalog when the user signs in.
export const THREEROUTER_PROVIDER = 'threerouter'

// Default model selected after sign-in.
export const THREEROUTER_DEFAULT_MODEL = 'deepseek-v4-pro'

/**
 * New-repo correction: the old rc.2 line exported a `settingsNamespace()`
 * helper and `SettingsNamespace` branded type from `@deepseek-ai/dsh-settings`.
 * Neither exists in the new 0.1.6-alpha.2 surface — namespace strings are
 * passed as plain strings directly.
 */
const LLM_PI_AI_NS = 'llm-pi-ai'
const AGENT_DEFAULT_MODEL_NS = 'agent-default-model'

// --- RPC request / response types ---

/** Login request from client → host. */
export interface ThreerouterLoginRequest {
  email: string
  password: string
  turnstileToken?: string
}

/** API key returned from Threerouter backend. */
export interface ThreerouterApiKey {
  id: number
  key: string
  name: string
  status: string
}

/** Authenticated user profile (camelCase, used in RPC responses). */
export interface ThreerouterUserProfile {
  id: number
  email: string
  username: string
  role: string
  balance: number
  allowedGroups: number[]
  apiKeys: ThreerouterApiKey[]
}

/** Login response from host → client. */
export interface ThreerouterLoginResponse {
  success: true
  accessToken: string
  apiKey: string | null
  profile: ThreerouterUserProfile
  affCode: string
}

/** Get current user info request. */
export interface ThreerouterGetProfileRequest {}

/** Current user info response. */
export interface ThreerouterProfileResponse {
  profile: ThreerouterUserProfile
  balance: number
  affCode: string
  hasApiKey: boolean
}

/** Copy invite link to clipboard request. */
export interface ThreerouterCopyInviteRequest {}

/** Copy invite link response. */
export interface ThreerouterCopyInviteResponse {
  link: string
  copied: true
}

/** Logout request. */
export interface ThreerouterLogoutRequest {}

/** Logout response. */
export interface ThreerouterLogoutResponse {
  success: true
}

/** Get available models from Threerouter. */
export interface ThreerouterGetModelsRequest {}

/** Available models response. */
export interface ThreerouterModelInfo {
  id: string
  name: string
  supported: boolean
}
export interface ThreerouterGetModelsResponse {
  models: ThreerouterModelInfo[]
  defaultModel: string
}

/** Set default model (called by the overlay model picker). */
export interface ThreerouterSelectModelRequest {
  model: string
}
export interface ThreerouterSelectModelResponse {
  success: true
  provider: string
  model: string
}

/** Stored session state on the host. */
export interface ThreerouterStoredState {
  accessToken: string
  refreshToken: string
  profile: ThreerouterUserProfile
  affCode: string
  apiKey: string
}

/**
 * Lightweight payload guards for the RPC endpoints (the caller is our own
 * client, so structural checks suffice — no schema library is required).
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function asLoginRequest(payload: unknown): ThreerouterLoginRequest {
  if (!isRecord(payload) || typeof payload.email !== 'string' || typeof payload.password !== 'string') {
    throw new Error('Invalid login request: email and password are required')
  }
  return {
    email: payload.email,
    password: payload.password,
    ...typeof payload.turnstileToken === 'string' ? { turnstileToken: payload.turnstileToken } : {},
  }
}

function asSelectModelRequest(payload: unknown): ThreerouterSelectModelRequest {
  if (!isRecord(payload) || typeof payload.model !== 'string' || payload.model.length === 0) {
    throw new Error('Invalid selectModel request: model is required')
  }
  return { model: payload.model }
}

function asEmptyRequest(payload: unknown): void {
  if (!isRecord(payload) && payload !== undefined) {
    throw new Error('Invalid request payload')
  }
}

/**
 * Standard Threerouter API response envelope (matches Go backend).
 */
interface ThreerouterApiEnvelope<T> {
  code: number
  message: string
  data: T
}

// --- Raw (snake_case) response shapes from the Threerouter Go backend ---

/** Raw API key shape from Threerouter backend (snake_case JSON). */
interface RawApiKey {
  id: number
  key: string
  name: string
  status: string
  group_id?: number | null
}

/** Raw user shape from Threerouter backend (snake_case JSON). */
interface RawUser {
  id: number
  email: string
  username: string
  role: string
  balance: number
  allowed_groups?: number[]
  api_keys?: RawApiKey[]
}

/** Raw login envelope from /api/v1/auth/login. */
interface RawLoginEnvelope {
  access_token: string
  refresh_token?: string
  token_type?: string
  expires_in?: number
  user: RawUser
}

/** Raw affiliate detail from /api/v1/user/aff. */
interface RawAffiliateDetail {
  aff_code: string
  aff_count?: number
  aff_quota?: number
}

/**
 * Map a raw API key (snake_case) to the camelCase RPC type.
 */
function mapApiKey(raw: RawApiKey): ThreerouterApiKey {
  return {
    id: raw.id,
    key: raw.key,
    name: raw.name,
    status: raw.status,
  }
}

/**
 * Map a raw user (snake_case) to the camelCase RPC type.
 */
function mapUser(raw: RawUser): ThreerouterUserProfile {
  return {
    id: raw.id,
    email: raw.email,
    username: raw.username,
    role: raw.role,
    balance: raw.balance,
    allowedGroups: raw.allowed_groups ?? [],
    apiKeys: (raw.api_keys ?? []).map(mapApiKey),
  }
}

/**
 * Factory: create the Threerouter Auth RPC endpoint handler and wiring
 * that performs auto-API-key creation/provisioning and pushes the
 * configured API key into ctx.credentials and the llm-pi-ai catalog.
 */
export function createThreerouterAuthHandler(ctx: Context) {
  // We store the authenticated state in memory (host side)
  let storedState: ThreerouterStoredState | null = null

  /**
   * Make an authenticated request to Threerouter backend.
   * Returns the unwrapped `data` field from the standard response envelope.
   */
  async function threerouterRequest<T>(
    path: string,
    method: 'GET' | 'POST' = 'GET',
    body?: unknown,
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (storedState?.accessToken) {
      headers.Authorization = `Bearer ${storedState.accessToken}`
    }
    const url = `${THREEROUTER_BASE_URL}/api/v1${path}`
    const options: RequestInit = {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }
    const resp = await fetch(url, options)
    if (!resp.ok) {
      const text = await resp.text()
      throw new Error(`Threerouter API ${method} ${path} failed: ${resp.status} ${text}`)
    }
    const envelope = await resp.json() as ThreerouterApiEnvelope<T>
    if (envelope.code !== 0) {
      throw new Error(`Threerouter API error: ${envelope.message}`)
    }
    return envelope.data
  }

  /**
   * Ensure the user has at least one API key, create one if none exists.
   * Returns the first active API key on success.
   */
  async function ensureApiKeyExists(): Promise<string | null> {
    // List existing API keys — response shape is { items: RawApiKey[] }
    const envelope = await threerouterRequest<{ items: RawApiKey[] }>('/keys')
    const keys = Array.isArray(envelope?.items) ? envelope.items : []
    const activeKey = keys.find(k => k.status === 'active' && k.group_id !== null && k.group_id !== undefined)
    if (activeKey) {
      ctx.logger.info(
        `threerouter-auth: found existing active API key "${activeKey.name}" (id=${activeKey.id})`,
      )
      return activeKey.key
    }

    // No active API key → create a new one automatically
    ctx.logger.info('threerouter-auth: no active API key found, creating new...')
    const groupId = storedState?.profile.allowedGroups[0]
    const newKey = await threerouterRequest<RawApiKey>('/keys', 'POST', {
      name: 'Deepseek Harness for Threerouter image/video  Desktop',
      ...(groupId === undefined ? {} : { group_id: groupId }),
    })
    ctx.logger.info(`threerouter-auth: created new API key "${newKey.name}" (id=${newKey.id})`)
    return newKey.group_id === null || newKey.group_id === undefined ? null : newKey.key
  }

  /**
   * Fetch user profile + affiliate code.
   */
  async function fetchProfileAndAffiliate(): Promise<{
    profile: ThreerouterUserProfile
    affCode: string
  }> {
    const [userResp, affResp] = await Promise.all([
      threerouterRequest<RawUser>('/auth/me'),
      threerouterRequest<RawAffiliateDetail>('/user/aff'),
    ])
    return {
      profile: mapUser(userResp),
      affCode: affResp.aff_code,
    }
  }

  /**
   * Inject the API key into the credentials store for llm-pi-ai to pick up.
   * Must be awaited so the async file write completes before the first LLM
   * request resolves the credential.
   */
  async function injectApiKeyToCredentials(apiKey: string): Promise<void> {
    const credentials = ctx.get('credentials')
    if (credentials !== undefined) {
      await credentials.set(THREEROUTER_API_KEY_REF, apiKey)
    }
    ctx.logger.info('threerouter-auth: injected API key into credentials', {
      env: THREEROUTER_API_KEY_ENV,
    })
  }

  /**
   * The fallback model list used when the /v1/models endpoint is unreachable.
   */
  function fallbackModels(): ThreerouterModelInfo[] {
    return [
      { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro', supported: true },
      { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash', supported: true },
      { id: 'deepseek-v3', name: 'DeepSeek V3', supported: true },
      { id: 'gpt-4o', name: 'GPT-4o', supported: true },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', supported: true },
      { id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet', supported: true },
      { id: 'claude-3-opus-latest', name: 'Claude 3 Opus', supported: true },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', supported: true },
    ]
  }

  /**
   * Query the OpenAI-compatible /v1/models endpoint for the models this API key
   * can use, falling back to a static list when the endpoint is unreachable.
   */
  async function fetchSupportedModels(apiKey: string): Promise<ThreerouterModelInfo[]> {
    try {
      const modelsResp = await fetch(
        `${THREEROUTER_OPENAI_BASE}/models`,
        apiKey ? { headers: { Authorization: `Bearer ${apiKey}` } } : undefined,
      )
      if (!modelsResp.ok) {
        throw new Error(`Failed to fetch models: ${modelsResp.status}`)
      }
      const openAiResp = await modelsResp.json() as {
        data: Array<{ id: string; object: string }>
      }
      const models: ThreerouterModelInfo[] = openAiResp.data
        .filter(m => m.object === 'model')
        .map(m => ({ id: m.id, name: m.id, supported: true }))
      return models.length > 0 ? models : fallbackModels()
    } catch (error) {
      ctx.logger.warn('threerouter-auth: failed to fetch models from API, using fallback list', error)
      return fallbackModels()
    }
  }

  /**
   * Register the Threerouter provider route into the llm-pi-ai catalog and set
   * the default Agent model, so the models this API key supports appear in the
   * picker and new sessions default to deepseek-v4-pro.
   */
  async function configureModelRoutes(apiKey: string): Promise<void> {
    const settings = ctx.get('settings')
    if (settings === undefined) {
      ctx.logger.warn('threerouter-auth: no settings service, model routes not registered')
      return
    }
    const models = await fetchSupportedModels(apiKey)
    // Field set mirrors what llm-pi-ai/config.ts::Config allows as a
    // profile — every non-defaulted field is spelled out so the settings
    // schema accepts the write, and the provider registers live.
    const providerProfile = {
      apiKeyEnv: THREEROUTER_API_KEY_ENV,
      displayName: 'Threerouter',
      api: 'openai-completions' as const,
      baseURL: THREEROUTER_OPENAI_BASE,
      models: models.map(m => ({
        id: m.id,
        name: m.name ?? m.id,
        contextWindow: 131072,
        maxTokens: 16384,
        input: ['text'] as const,
      })),
      defaultContextWindow: 131072,
      defaultMaxTokens: 16384,
      defaultInput: ['text'] as const,
    }
    // settings.mutate returns void on success and throws (or rejects) when
    // the write is refused by the section validator. Wrap in try/catch so a
    // refused profile is diagnosed instead of killing the login flow.
    try {
      await settings.mutate(LLM_PI_AI_NS, [
        { op: 'set', path: ['providers', THREEROUTER_PROVIDER], value: providerProfile },
      ])
      ctx.logger.info(
        `threerouter-auth: settings.mutate wrote ${models.length} model(s) under provider "${THREEROUTER_PROVIDER}"`,
      )
    } catch (error) {
      ctx.logger.warn(
        `threerouter-auth: settings.mutate refused the provider "${THREEROUTER_PROVIDER}" profile — `
        + 'llm-pi-ai onChange will NOT register this route. Inspect the caught error for schema fields.',
      )
      ctx.logger.warn(error)
    }
    const agentDefaultModel = ctx.get('agentDefaultModel')
    if (agentDefaultModel !== undefined) {
      try {
        await agentDefaultModel.saveSelection({ provider: THREEROUTER_PROVIDER, model: THREEROUTER_DEFAULT_MODEL })
      } catch (error) {
        ctx.logger.warn('threerouter-auth: agentDefaultModel.saveSelection failed (non-fatal)', error)
      }
    }
  }

  /**
   * Remove the Threerouter provider route and reset the default model when the
   * user signs out, so no session is left pointing at an unavailable provider.
   */
  async function clearModelConfiguration(): Promise<void> {
    const settings = ctx.get('settings')
    if (settings !== undefined) {
      await settings.mutate(LLM_PI_AI_NS, [
        { op: 'unset', path: ['providers', THREEROUTER_PROVIDER] },
      ])
      await settings.replace(AGENT_DEFAULT_MODEL_NS, {})
    }
    ctx.logger.info('threerouter-auth: cleared Threerouter model routes and default model')
  }

  /**
   * Handler entry point called by RPC.
   *
   * All cases are wrapped in try-catch so that API errors are returned as
   * structured RPC error responses ({ ok: false, error }) instead of
   * propagating as uncaught HTTP 500s.
   */
  const handler: ConnectionRpcHandler = async (
    endpoint,
    payload: unknown,
    signal,
  ) => {
    void signal
    try {
      switch (endpoint) {
        case 'login': {
          const { email, password, turnstileToken } = asLoginRequest(payload)

          // Step 1: login to Threerouter backend.
          ctx.logger.info(`threerouter-auth: login attempt for ${email}`)
          const loginData = await threerouterRequest<RawLoginEnvelope>(
            '/auth/login',
            'POST',
            { email, password, turnstile_token: turnstileToken },
          )

          storedState = {
            accessToken: loginData.access_token,
            refreshToken: loginData.refresh_token || '',
            profile: mapUser(loginData.user),
            affCode: '',
            apiKey: '',
          }

          // Step 2: get full profile + affiliate code.
          const { profile, affCode } = await fetchProfileAndAffiliate()
          storedState.profile = profile
          storedState.affCode = affCode

          // Step 3: ensure API key exists, get the key.
          let apiKey: string | null = null
          try {
            apiKey = await ensureApiKeyExists()
            if (apiKey) {
              storedState.apiKey = apiKey
              await injectApiKeyToCredentials(apiKey)
              await configureModelRoutes(apiKey)
            }
          } catch (apiKeyError) {
            // Non-fatal: the user is authenticated, they just don't have an
            // API key yet. Surface a warning but still return success.
            ctx.logger.warn('threerouter-auth: API key provisioning failed (non-fatal)', apiKeyError)
          }

          ctx.logger.info(`threerouter-auth: login successful for ${email}`)
          return {
            ok: true,
            value: {
              success: true,
              accessToken: storedState.accessToken,
              apiKey,
              profile,
              affCode,
            } satisfies ThreerouterLoginResponse,
          }
        }

        case 'getProfile': {
          asEmptyRequest(payload)
          if (!storedState) {
            throw new Error('Not authenticated')
          }
          const { profile, affCode } = await fetchProfileAndAffiliate()
          storedState.profile = profile
          storedState.affCode = affCode
          return {
            ok: true,
            value: {
              profile,
              balance: profile.balance,
              affCode,
              hasApiKey: !!storedState.apiKey,
            } satisfies ThreerouterProfileResponse,
          }
        }

        case 'copyInviteLink': {
          asEmptyRequest(payload)
          if (!storedState?.affCode) {
            throw new Error('No affiliate code available')
          }
          const link = `${THREEROUTER_BASE_URL}/register?aff=${encodeURIComponent(storedState.affCode)}`
          return {
            ok: true,
            value: {
              link,
              copied: true,
            } satisfies ThreerouterCopyInviteResponse,
          }
        }

        case 'logout': {
          asEmptyRequest(payload)
          storedState = null
          const credentials = ctx.get('credentials')
          if (credentials !== undefined) {
            await credentials.set(THREEROUTER_API_KEY_REF, '')
          }
          await clearModelConfiguration()
          return { ok: true, value: { success: true } satisfies ThreerouterLogoutResponse }
        }

        case 'getModels': {
          asEmptyRequest(payload)
          if (!storedState) {
            throw new Error('Not authenticated')
          }
          // Prefer the live key; fall back to the static catalog when the key
          // is still being provisioned or the endpoint refuses the key. This
          // keeps the model picker usable instead of showing a greyed-out
          // dropdown while the backend catches up.
          const models = storedState.apiKey
            ? await fetchSupportedModels(storedState.apiKey)
            : fallbackModels()
          const defaultModel = THREEROUTER_DEFAULT_MODEL
          const sorted = models.sort((a, b) => {
            if (a.id === defaultModel) return -1
            if (b.id === defaultModel) return 1
            if (a.id.startsWith('deepseek-v4')) return -1
            return a.id.localeCompare(b.id)
          })
          return {
            ok: true,
            value: { models: sorted, defaultModel } satisfies ThreerouterGetModelsResponse,
          }
        }

        case 'selectModel': {
          // NEW in the new-repo port: the old rc.2 client called
          // `connection.api.sessions.selectModel()` which does not exist in
          // 0.1.6-alpha.2. We instead persist the default model selection
          // through the host agentDefaultModel service.
          const { model } = asSelectModelRequest(payload)
          const agentDefaultModel = ctx.get('agentDefaultModel')
          if (agentDefaultModel === undefined) {
            throw new Error('agentDefaultModel service not available')
          }
          await agentDefaultModel.saveSelection({ provider: THREEROUTER_PROVIDER, model })
          if (storedState) {
            ctx.logger.info(`threerouter-auth: default model set to ${model}`)
          }
          return {
            ok: true,
            value: {
              success: true,
              provider: THREEROUTER_PROVIDER,
              model,
            } satisfies ThreerouterSelectModelResponse,
          }
        }

        default:
          throw new Error(`Unknown endpoint: ${endpoint}`)
      }
    } catch (error) {
      // Catch all errors and return them as structured RPC error responses
      // so the client sees a meaningful message instead of "HTTP 500".
      const message = error instanceof Error ? error.message : String(error)
      ctx.logger.error(`threerouter-auth: RPC "${endpoint}" failed: ${message}`)
      return {
        ok: false,
        error: { code: 'internal' as const, message, details: {} },
      }
    }
  }

  return {
    handler,
    getStoredState: () => storedState,
  }
}
