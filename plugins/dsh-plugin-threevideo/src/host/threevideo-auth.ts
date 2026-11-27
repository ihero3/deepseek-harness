/**
 * Threevideo user authentication, API key auto-provisioning,
 * balance display, and invite link sharing.
 *
 * Host-side implementation (RPC server for client → host calls).
 */

import type { Context } from '@deepseek-ai/cordis'
import { withTransientRetry } from './retry-policy.ts'
import type { ConnectionRpcHandler } from '@deepseek-ai/dsh-client-connection'
import { credentialKey, credentialRef } from '@deepseek-ai/dsh-credentials'

// Threevideo API base URL from official site
export const THREEVIDEO_BASE_URL = 'https://www.threevideo.com'
export const THREEVIDEO_OPENAI_BASE = `${THREEVIDEO_BASE_URL}/v1`

// The environment variable name used to inject the Threevideo API key into
// the llm-pi-ai OpenAI-compatible provider.
export const THREEVIDEO_API_KEY_ENV = 'THREEVIDEO_API_KEY'

// Credential seam reference for the Threevideo API key env name.
const THREEVIDEO_API_KEY_REF = credentialRef(THREEVIDEO_API_KEY_ENV)

// Credential record holding the signed-in grant across restarts. The seam keeps
// the payload verbatim because only this plugin interprets it.
const THREEVIDEO_SESSION_KEY = credentialKey('threevideo-integration', 'session')

// Provider route registered into the llm-pi-ai catalog when the user signs in.
export const THREEVIDEO_PROVIDER = 'threevideo'

// Default model selected after sign-in.
export const THREEVIDEO_DEFAULT_MODEL = 'deepseek-v4-pro'

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
export interface ThreevideoLoginRequest {
  email: string
  password: string
  turnstileToken?: string
}

/** API key returned from Threevideo backend. */
export interface ThreevideoApiKey {
  id: number
  key: string
  name: string
  status: string
}

/** Authenticated user profile (camelCase, used in RPC responses). */
export interface ThreevideoUserProfile {
  id: number
  email: string
  username: string
  role: string
  balance: number
  allowedGroups: number[]
  apiKeys: ThreevideoApiKey[]
}

/** Login response from host → client. */
export interface ThreevideoLoginResponse {
  success: true
  accessToken: string
  apiKey: string | null
  profile: ThreevideoUserProfile
  affCode: string
}

/** Get current user info request. */
export interface ThreevideoGetProfileRequest {}

/**
 * Current user info response.
 *
 * The account block is answered from the stored grant whenever the backend
 * cannot be reached, so the signed-in surfaces never fall back to the sign-in
 * state over a transient failure. `stale` reports that the balance is the last
 * synchronized one; `needsReauth` reports that the grant itself was rejected,
 * which only a new sign-in repairs.
 */
export type ThreevideoProfileResponse =
  | { signedIn: false }
  | {
    signedIn: true
    profile: ThreevideoUserProfile
    balance: number
    affCode: string
    hasApiKey: boolean
    stale: boolean
    needsReauth: boolean
  }

/** Copy invite link to clipboard request. */
export interface ThreevideoCopyInviteRequest {}

/** Copy invite link response. */
export interface ThreevideoCopyInviteResponse {
  link: string
  copied: true
}

/** Logout request. */
export interface ThreevideoLogoutRequest {}

/** Logout response. */
export interface ThreevideoLogoutResponse {
  success: true
}

/** Get available models from Threevideo. */
export interface ThreevideoGetModelsRequest {}

/** Available models response. */
export interface ThreevideoModelInfo {
  id: string
  name: string
  supported: boolean
}
export interface ThreevideoGetModelsResponse {
  models: ThreevideoModelInfo[]
  defaultModel: string
}

/** Set default model (called by the overlay model picker). */
export interface ThreevideoSelectModelRequest {
  model: string
}
export interface ThreevideoSelectModelResponse {
  success: true
  provider: string
  model: string
}

/** Stored session state on the host. */
export interface ThreevideoStoredState {
  accessToken: string
  refreshToken: string
  profile: ThreevideoUserProfile
  affCode: string
  apiKey: string
  /** Epoch milliseconds at which `accessToken` stops being accepted, when the issuer reported a lifetime. */
  expiresAt?: number
}

/**
 * Failure carrying the HTTP status and the API's own reason code, so callers can
 * tell a rejected grant (renew, then sign in again) from an unreachable backend.
 */
class ThreevideoApiError extends Error {
  /** HTTP status of the failed response. */
  readonly status: number

  /** API reason code from the failure body, when the backend sent one. */
  readonly reason: string | undefined

  /**
   * @param message - operator-facing description of the failure.
   * @param status - HTTP status of the response that failed.
   * @param reason - API reason code, e.g. `REFRESH_TOKEN_INVALID`.
   */
  constructor(message: string, status: number, reason: string | undefined) {
    super(message)
    this.name = 'ThreevideoApiError'
    this.status = status
    this.reason = reason
  }
}

/**
 * Whether a failure means the access token was not accepted.
 * @param error - value thrown by an API call.
 * @returns true for an HTTP 401, the only status that a renewal can repair.
 */
function isUnauthorized(error: unknown): boolean {
  return error instanceof ThreevideoApiError && error.status === 401
}

/**
 * Lightweight payload guards for the RPC endpoints (the caller is our own
 * client, so structural checks suffice — no schema library is required).
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * Read one persisted API key entry, rejecting any other shape.
 * @param value - candidate entry.
 * @returns true when the entry carries every field the profile type names.
 */
function isApiKeyEntry(value: unknown): value is ThreevideoApiKey {
  if (!isRecord(value)) return false
  const { id, key, name, status } = value
  return typeof id === 'number' && typeof key === 'string' && typeof name === 'string' && typeof status === 'string'
}

/**
 * Read the persisted profile, rejecting a shape this plugin cannot render.
 * @param value - candidate profile.
 * @returns the profile, or undefined when a named field is missing.
 */
function asUserProfile(value: unknown): ThreevideoUserProfile | undefined {
  if (!isRecord(value)) return undefined
  const { id, email, username, role, balance, allowedGroups, apiKeys } = value
  if (typeof id !== 'number' || typeof email !== 'string' || typeof username !== 'string') return undefined
  if (typeof role !== 'string' || typeof balance !== 'number') return undefined
  if (!Array.isArray(allowedGroups) || !allowedGroups.every(entry => typeof entry === 'number')) return undefined
  if (!Array.isArray(apiKeys) || !apiKeys.every(isApiKeyEntry)) return undefined
  return { id, email, username, role, balance, allowedGroups, apiKeys }
}

/**
 * Read a persisted session payload. The record is written by this plugin, so a
 * structural check of its fields is enough to reject a stale or foreign shape.
 * @param value - record payload read from the credential seam.
 * @returns the stored state, or undefined when the payload is not one.
 */
function asStoredState(value: unknown): ThreevideoStoredState | undefined {
  if (!isRecord(value)) return undefined
  const { accessToken, refreshToken, affCode, apiKey, profile, expiresAt } = value
  if (typeof accessToken !== 'string' || accessToken === '') return undefined
  if (typeof refreshToken !== 'string' || typeof affCode !== 'string' || typeof apiKey !== 'string') return undefined
  if (expiresAt !== undefined && typeof expiresAt !== 'number') return undefined
  const restoredProfile = asUserProfile(profile)
  if (restoredProfile === undefined) return undefined
  return {
    accessToken,
    refreshToken,
    affCode,
    apiKey,
    profile: restoredProfile,
    ...expiresAt === undefined ? {} : { expiresAt },
  }
}

function asLoginRequest(payload: unknown): ThreevideoLoginRequest {
  if (!isRecord(payload) || typeof payload.email !== 'string' || typeof payload.password !== 'string') {
    throw new Error('Invalid login request: email and password are required')
  }
  return {
    email: payload.email,
    password: payload.password,
    ...typeof payload.turnstileToken === 'string' ? { turnstileToken: payload.turnstileToken } : {},
  }
}

function asSelectModelRequest(payload: unknown): ThreevideoSelectModelRequest {
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

/** Standard Threevideo API response envelope (matches Go backend). */
interface ThreevideoApiEnvelope<T> {
  /** 0 on success; a numeric status or a symbolic code (`INVALID_TOKEN`) on failure. */
  code: number | string
  message: string
  data: T
}

// --- Raw (snake_case) response shapes from the Threevideo Go backend ---

/** Raw API key shape from Threevideo backend (snake_case JSON). */
interface RawApiKey {
  id: number
  key: string
  name: string
  status: string
  group_id?: number | null
}

/** Raw user shape from Threevideo backend (snake_case JSON). */
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

/** Raw token pair from /api/v1/auth/refresh. The backend rotates the refresh token on every call. */
interface RawRefreshEnvelope {
  access_token: string
  refresh_token?: string
  token_type?: string
  expires_in?: number
}

/**
 * Whether an envelope or HTTP status code reports a rejected grant.
 * @param code - status or API code from a failed response.
 * @returns true when only a new sign-in (or a renewal) can repair the call.
 */
function isAuthCode(code: number | string): boolean {
  return code === 401 || code === '401'
    || code === 'INVALID_TOKEN' || code === 'UNAUTHORIZED' || code === 'TOKEN_EXPIRED'
}

/**
 * Outcome of one renewal attempt.
 *
 * - `renewed`: a new access token is in place.
 * - `unrenewable`: this grant can never renew again (no refresh token, or the
 *   backend retired it), so only a sign-in repairs it.
 * - `unavailable`: the attempt itself failed; the grant is intact and the next
 *   call may renew.
 */
type RenewalOutcome = 'renewed' | 'unrenewable' | 'unavailable'

/**
 * Record when an access token stops working, from the lifetime its issuer
 * reported with it.
 *
 * @param state - stored grant to stamp; an absent or unusable lifetime clears
 * the stamp, leaving renewal to the rejected-call path.
 * @param expiresIn - token lifetime in seconds, as returned by sign-in or renewal.
 */
function setExpiryFromLifetime(state: ThreevideoStoredState, expiresIn: number | undefined): void {
  if (typeof expiresIn !== 'number' || !Number.isFinite(expiresIn) || expiresIn <= 0) {
    delete state.expiresAt
    return
  }
  state.expiresAt = Date.now() + expiresIn * 1000
}

/**
 * Map a raw API key (snake_case) to the camelCase RPC type.
 */
function mapApiKey(raw: RawApiKey): ThreevideoApiKey {
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
function mapUser(raw: RawUser): ThreevideoUserProfile {
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
 * Factory: create the Threevideo Auth RPC endpoint handler and wiring
 * that performs auto-API-key creation/provisioning and pushes the
 * configured API key into ctx.credentials and the llm-pi-ai catalog. The
 * signed-in grant is written to the credential seam as well, so a host restart
 * resumes the account instead of asking the user to sign in again.
 */
export function createThreevideoAuthHandler(ctx: Context) {
  // Authenticated state of this host process; `restoreSession` rebuilds it from
  // the stored grant before any endpoint treats the caller as signed out.
  let storedState: ThreevideoStoredState | null = null

  /**
   * The one boot-time read of the stored grant. Every caller awaits the same
   * promise, so a second request during startup waits for the record instead of
   * observing the process as signed out.
   */
  let restoreRun: Promise<void> | null = null

  /**
   * In-flight renewal, shared by every caller: the backend retires the previous
   * refresh token on each renewal, so two parallel renewals would leave the
   * loser holding a token the backend has already invalidated.
   */
  let renewal: Promise<RenewalOutcome> | null = null

  /** Whether the stored grant can never renew again, so a sign-in is required. */
  let renewalExhausted = false

  /** Renew this long before the access token expires, so a request never races the clock. */
  const RENEWAL_SKEW_MS = 120_000

  /**
   * Rebuild the session from the record written at login. A missing or
   * unreadable record leaves the caller signed out; a profile without the
   * credentials service retries on the next call rather than giving up.
   */
  function restoreSession(): Promise<void> {
    if (restoreRun !== null) return restoreRun
    const credentials = ctx.get('credentials')
    if (credentials === undefined) return Promise.resolve()
    restoreRun = (async () => {
      try {
        const record = await credentials.readRecord(THREEVIDEO_SESSION_KEY)
        if (record?.kind !== 'grant') return
        const restored = asStoredState(record.payload)
        if (restored === undefined) return
        storedState = restored
        renewalExhausted = false
        ctx.logger.info('threevideo-auth: restored the stored session')
      } catch (error) {
        // A failed read signs the user out for this process only; the next login
        // overwrites the record.
        ctx.logger.warn('threevideo-auth: could not restore the stored session', error)
      }
    })()
    return restoreRun
  }

  /** Persist the signed-in grant so the next boot resumes it. */
  async function persistSession(): Promise<void> {
    const credentials = ctx.get('credentials')
    if (credentials === undefined || storedState === null) return
    const state = storedState
    await credentials.modifyRecord(THREEVIDEO_SESSION_KEY, async () => ({ kind: 'grant', payload: state }))
  }

  /** Drop the stored grant, so signing out does not survive a restart. */
  async function forgetSession(): Promise<void> {
    const credentials = ctx.get('credentials')
    if (credentials === undefined) return
    await credentials.deleteRecord(THREEVIDEO_SESSION_KEY)
  }

  /**
   * Make an authenticated request to Threevideo backend.
   * Returns the unwrapped `data` field from the standard response envelope.
   *
   * @param path - endpoint below `/api/v1`.
   * @param method - HTTP method.
   * @param body - JSON request body; omitted when undefined.
   * @param bearer - access token to send; omitted for the unauthenticated calls
   * (sign-in, renewal).
   * @returns the unwrapped `data` field of the response envelope.
   */
  async function apiExchange<T>(
    path: string,
    method: 'GET' | 'POST',
    body: unknown,
    bearer: string | undefined,
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (bearer !== undefined && bearer !== '') {
      headers.Authorization = `Bearer ${bearer}`
    }
    const url = `${THREEVIDEO_BASE_URL}/api/v1${path}`
    const options: RequestInit = {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }
    // 上游偶发 502/429/流中断不该一次就失败：3~6 次退避重试（见 retry-policy.ts）
    const resp = await withTransientRetry(() => fetch(url, options), { attempts: 4 })
    if (!resp.ok) {
      const failure = await readFailureBody(resp)
      throw new ThreevideoApiError(
        `Threevideo API ${method} ${path} failed: ${resp.status} ${failure.text}`,
        resp.status,
        failure.reason,
      )
    }
    const envelope = await resp.json() as ThreevideoApiEnvelope<T>
    if (envelope.code !== 0) {
      // Auth failures arrive as `code: "INVALID_TOKEN"` and, on some routes, as
      // `code: 401` inside a 200 response: both must reach the renewal path.
      throw new ThreevideoApiError(
        `Threevideo API error: ${envelope.message}`,
        isAuthCode(envelope.code) ? 401 : resp.status,
        typeof envelope.code === 'string' ? envelope.code : undefined,
      )
    }
    return envelope.data
  }

  /**
   * Read an API failure body. The backend answers errors with
   * `{ code, message, reason }`; the router answers an unknown route with a
   * plain-text 404 page.
   *
   * @param resp - the failed response, read once for its body.
   * @returns the message to report and the API reason code when one is present.
   */
  async function readFailureBody(resp: Response): Promise<{ text: string; reason: string | undefined }> {
    const raw = await resp.text()
    try {
      const parsed: unknown = JSON.parse(raw)
      if (isRecord(parsed)) {
        const message = typeof parsed.message === 'string' ? parsed.message : raw
        return {
          text: message,
          reason: typeof parsed.reason === 'string' ? parsed.reason : undefined,
        }
      }
    } catch {
      // A non-JSON body is the response's own text; report it verbatim below.
    }
    return { text: raw, reason: undefined }
  }

  /**
   * Renew the access token through the stored refresh token.
   *
   * @returns true when a new access token is in place; false when this grant
   * cannot be renewed because it carries no refresh token, the backend retired
   * it, or the backend is unreachable.
   */
  function renewAccessToken(): Promise<RenewalOutcome> {
    renewal ??= performRenewal().finally(() => { renewal = null })
    return renewal
  }

  /**
   * Run one renewal and store its result in place, so every caller holding the
   * state object observes the new token.
   *
   * @returns how the attempt ended; see {@link RenewalOutcome}.
   */
  async function performRenewal(): Promise<RenewalOutcome> {
    const state = storedState
    if (state === null) return 'unrenewable'
    // A grant stored without a refresh token, or one the backend already
    // retired, cannot renew before the user signs in again.
    if (state.refreshToken === '') {
      renewalExhausted = true
      return 'unrenewable'
    }
    if (renewalExhausted) return 'unrenewable'
    try {
      const fresh = await apiExchange<RawRefreshEnvelope>(
        '/auth/refresh',
        'POST',
        { refresh_token: state.refreshToken },
        undefined,
      )
      if (typeof fresh.access_token !== 'string' || fresh.access_token === '') {
        throw new Error('Threevideo API error: /auth/refresh returned no access token')
      }
      state.accessToken = fresh.access_token
      if (typeof fresh.refresh_token === 'string' && fresh.refresh_token !== '') {
        state.refreshToken = fresh.refresh_token
      }
      setExpiryFromLifetime(state, fresh.expires_in)
      try {
        await persistSession()
      } catch (persistError) {
        // The renewed grant works for this process; a restart then falls back to
        // the retired token and asks for a sign-in.
        ctx.logger.warn('threevideo-auth: could not persist the renewed grant', persistError)
      }
      ctx.logger.info('threevideo-auth: renewed the access token')
      return 'renewed'
    } catch (error) {
      if (isUnauthorized(error)) {
        // The backend retired this refresh token: only a new sign-in repairs the
        // grant. The cached account and the injected API key keep working.
        renewalExhausted = true
        ctx.logger.warn('threevideo-auth: the stored refresh token was rejected; a new sign-in is required')
        return 'unrenewable'
      }
      ctx.logger.warn('threevideo-auth: could not renew the access token; keeping the stored grant', error)
      return 'unavailable'
    }
  }

  /**
   * Renew ahead of expiry so a request never carries a token that dies in
   * flight. A grant stored before lifetimes were recorded has no expiry; the
   * rejected-call path below renews it instead.
   */
  async function renewIfExpiring(): Promise<void> {
    const state = storedState
    if (state === null || state.refreshToken === '') return
    if (state.expiresAt === undefined) return
    if (state.expiresAt - Date.now() > RENEWAL_SKEW_MS) return
    await renewAccessToken()
  }

  /**
   * Make an authenticated request, renewing the grant first when it is about
   * to expire and once more if the backend rejects the token.
   *
   * @param path - endpoint below `/api/v1`.
   * @param method - HTTP method.
   * @param body - JSON request body; omitted when undefined.
   * @returns the unwrapped `data` field of the response envelope.
   * @throws Error when the caller is signed out, and the original failure when
   * no renewal is possible or the renewed token is rejected too.
   */
  async function authorizedRequest<T>(
    path: string,
    method: 'GET' | 'POST' = 'GET',
    body?: unknown,
  ): Promise<T> {
    const state = storedState
    if (state === null) throw new Error('Not authenticated')
    await renewIfExpiring()
    try {
      return await apiExchange<T>(path, method, body, state.accessToken)
    } catch (error) {
      if (!isUnauthorized(error)) throw error
      if (await renewAccessToken() !== 'renewed') throw error
      return await apiExchange<T>(path, method, body, state.accessToken)
    }
  }

  /**
   * Ensure the user has at least one API key, create one if none exists.
   * Returns the first active API key on success.
   */
  async function ensureApiKeyExists(): Promise<string | null> {
    // List existing API keys — response shape is { items: RawApiKey[] }
    const envelope = await authorizedRequest<{ items: RawApiKey[] }>('/keys')
    const keys = Array.isArray(envelope?.items) ? envelope.items : []
    const activeKey = keys.find(k => k.status === 'active' && k.group_id !== null && k.group_id !== undefined)
    if (activeKey) {
      ctx.logger.info(
        `threevideo-auth: found existing active API key "${activeKey.name}" (id=${activeKey.id})`,
      )
      return activeKey.key
    }

    // No active API key → create a new one automatically
    ctx.logger.info('threevideo-auth: no active API key found, creating new...')
    const groupId = storedState?.profile.allowedGroups[0]
    const newKey = await authorizedRequest<RawApiKey>('/keys', 'POST', {
      name: 'Deepseek Harness for Threevideo image/video  Desktop',
      ...(groupId === undefined ? {} : { group_id: groupId }),
    })
    ctx.logger.info(`threevideo-auth: created new API key "${newKey.name}" (id=${newKey.id})`)
    return newKey.group_id === null || newKey.group_id === undefined ? null : newKey.key
  }

  /**
   * Fetch user profile + affiliate code.
   */
  async function fetchProfileAndAffiliate(): Promise<{
    profile: ThreevideoUserProfile
    affCode: string
  }> {
    const [userResp, affResp] = await Promise.all([
      authorizedRequest<RawUser>('/auth/me'),
      authorizedRequest<RawAffiliateDetail>('/user/aff'),
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
      await credentials.set(THREEVIDEO_API_KEY_REF, apiKey)
    }
    ctx.logger.info('threevideo-auth: injected API key into credentials', {
      env: THREEVIDEO_API_KEY_ENV,
    })
  }

  /**
   * The fallback model list used when the /v1/models endpoint is unreachable.
   *
   * Only ids the gateway actually serves belong here. A stale name is worse
   * than a short list: the login flow copies this list into the route's model
   * directory, and the Models page then presents it as the user's own catalog,
   * so a model that does not exist stays selectable until someone notices the
   * request failing.
   */
  function fallbackModels(): ThreevideoModelInfo[] {
    return [
      { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro', supported: true },
      { id: 'deepseek-flash', name: 'DeepSeek Flash', supported: true },
    ]
  }

  /**
   * Listing kinds a gateway may report per row that are not chat routes. The
   * Threevideo gateway labels every row `type: "model"`, so this only matters
   * for a standard OpenAI-shaped listing that also publishes embeddings or
   * speech models; those would otherwise land in the picker as chat models.
   */
  const NON_CHAT_LISTING_KINDS = new Set([
    'embedding',
    'embeddings',
    'audio',
    'tts',
    'speech',
    'transcription',
    'rerank',
    'moderation',
  ])

  /**
   * Read one model row out of a listing reply.
   *
   * `/v1/models` rows are read by `id`, never by the OpenAI `object: "model"`
   * marker: the Threevideo gateway answers
   * `{ object: "list", data: [{ id, type: "model", display_name }] }`, so
   * keying on that marker drops the whole listing and silently leaves the
   * picker on the static fallback.
   *
   * @param raw - one element of the reply's `data` array.
   * @returns the model, or undefined for a row with no usable id or one that
   * declares a non-chat kind.
   */
  function readListingRow(raw: unknown): ThreevideoModelInfo | undefined {
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return undefined
    const row = raw as {
      id?: unknown
      object?: unknown
      type?: unknown
      name?: unknown
      display_name?: unknown
      displayName?: unknown
    }
    const id = typeof row.id === 'string' ? row.id.trim() : ''
    if (id.length === 0) return undefined
    const kind = [row.object, row.type].find(value => typeof value === 'string') as string | undefined
    if (kind !== undefined && NON_CHAT_LISTING_KINDS.has(kind)) return undefined
    const display = [row.display_name, row.displayName, row.name]
      .find(value => typeof value === 'string' && value.trim().length > 0) as string | undefined
    return { id, name: display?.trim() ?? id, supported: true }
  }

  /**
   * Query the OpenAI-compatible /v1/models endpoint for the models this API key
   * can use, falling back to a static list when the endpoint is unreachable or
   * answers nothing readable.
   */
  async function fetchSupportedModels(apiKey: string): Promise<ThreevideoModelInfo[]> {
    try {
      const modelsResp = await fetch(
        `${THREEVIDEO_OPENAI_BASE}/models`,
        apiKey ? { headers: { Authorization: `Bearer ${apiKey}` } } : undefined,
      )
      if (!modelsResp.ok) {
        throw new Error(`Failed to fetch models: ${modelsResp.status}`)
      }
      const openAiResp = await modelsResp.json() as { data?: unknown }
      const rows = Array.isArray(openAiResp.data) ? openAiResp.data : []
      const models = rows.flatMap((row) => {
        const model = readListingRow(row)
        return model === undefined ? [] : [model]
      })
      if (models.length === 0) {
        ctx.logger.warn(
          'threevideo-auth: /v1/models returned no readable model row, using the fallback list',
        )
        return fallbackModels()
      }
      return models
    } catch (error) {
      ctx.logger.warn('threevideo-auth: failed to fetch models from API, using fallback list', error)
      return fallbackModels()
    }
  }

  /**
   * Register the Threevideo provider route into the llm-pi-ai catalog and set
   * the default Agent model, so the models this API key supports appear in the
   * picker and new sessions default to deepseek-v4-pro.
   */
  async function configureModelRoutes(apiKey: string): Promise<void> {
    const settings = ctx.get('settings')
    if (settings === undefined) {
      ctx.logger.warn('threevideo-auth: no settings service, model routes not registered')
      return
    }
    const models = await fetchSupportedModels(apiKey)
    // Field set mirrors what llm-pi-ai/config.ts::Config allows as a
    // profile — every non-defaulted field is spelled out so the settings
    // schema accepts the write, and the provider registers live. Every route
    // is declared image-capable: the gateway advertises no capability
    // metadata, and a model that declares nothing is read as text-only.
    // The window and the reply cap are the deployment's declared capacity, not
    // a measurement of the route: pi-ai reads a response whose usage exceeds
    // the window as a context overflow and stops a reply at the cap, so both
    // are declared generously. A request the gateway actually refuses still
    // arrives as an overflow error, which compaction recovers from.
    const providerProfile = {
      apiKeyEnv: THREEVIDEO_API_KEY_ENV,
      displayName: 'Threevideo',
      api: 'openai-completions' as const,
      baseURL: THREEVIDEO_OPENAI_BASE,
      models: models.map(m => ({
        id: m.id,
        name: m.name ?? m.id,
        contextWindow: 1000000,
        maxTokens: 250000,
        input: ['text', 'image'] as const,
      })),
      defaultContextWindow: 1000000,
      defaultMaxTokens: 250000,
      defaultInput: ['text', 'image'] as const,
    }
    // settings.mutate returns void on success and throws (or rejects) when
    // the write is refused by the section validator. Wrap in try/catch so a
    // refused profile is diagnosed instead of killing the login flow.
    try {
      await settings.mutate(LLM_PI_AI_NS, [
        { op: 'set', path: ['providers', THREEVIDEO_PROVIDER], value: providerProfile },
      ])
      ctx.logger.info(
        `threevideo-auth: settings.mutate wrote ${models.length} model(s) under provider "${THREEVIDEO_PROVIDER}"`,
      )
    } catch (error) {
      ctx.logger.warn(
        `threevideo-auth: settings.mutate refused the provider "${THREEVIDEO_PROVIDER}" profile — `
        + 'llm-pi-ai onChange will NOT register this route. Inspect the caught error for schema fields.',
      )
      ctx.logger.warn(error)
    }
    const agentDefaultModel = ctx.get('agentDefaultModel')
    if (agentDefaultModel !== undefined) {
      try {
        await agentDefaultModel.saveSelection({ provider: THREEVIDEO_PROVIDER, model: THREEVIDEO_DEFAULT_MODEL })
      } catch (error) {
        ctx.logger.warn('threevideo-auth: agentDefaultModel.saveSelection failed (non-fatal)', error)
      }
    }
  }

  /**
   * Remove the Threevideo provider route and reset the default model when the
   * user signs out, so no session is left pointing at an unavailable provider.
   */
  async function clearModelConfiguration(): Promise<void> {
    const settings = ctx.get('settings')
    if (settings !== undefined) {
      await settings.mutate(LLM_PI_AI_NS, [
        { op: 'unset', path: ['providers', THREEVIDEO_PROVIDER] },
      ])
      await settings.replace(AGENT_DEFAULT_MODEL_NS, {})
    }
    ctx.logger.info('threevideo-auth: cleared Threevideo model routes and default model')
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
      // A restart resumes the account: the stored grant is read back before any
      // endpoint treats the caller as signed out.
      await restoreSession()
      switch (endpoint) {
        case 'login': {
          const { email, password, turnstileToken } = asLoginRequest(payload)

          // Step 1: login to Threevideo backend.
          ctx.logger.info(`threevideo-auth: login attempt for ${email}`)
          const loginData = await apiExchange<RawLoginEnvelope>(
            '/auth/login',
            'POST',
            { email, password, turnstile_token: turnstileToken },
            undefined,
          )

          storedState = {
            accessToken: loginData.access_token,
            refreshToken: loginData.refresh_token || '',
            profile: mapUser(loginData.user),
            affCode: '',
            apiKey: '',
          }
          setExpiryFromLifetime(storedState, loginData.expires_in)
          renewalExhausted = false

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
            ctx.logger.warn('threevideo-auth: API key provisioning failed (non-fatal)', apiKeyError)
          }

          try {
            await persistSession()
          } catch (persistError) {
            // Non-fatal: the session works in this process but will not survive
            // a restart.
            ctx.logger.warn('threevideo-auth: could not persist the session', persistError)
          }

          ctx.logger.info(`threevideo-auth: login successful for ${email}`)
          return {
            ok: true,
            value: {
              success: true,
              accessToken: storedState.accessToken,
              apiKey,
              profile,
              affCode,
            } satisfies ThreevideoLoginResponse,
          }
        }

        case 'getProfile': {
          asEmptyRequest(payload)
          const state = storedState
          if (state === null) {
            return { ok: true, value: { signedIn: false } satisfies ThreevideoProfileResponse }
          }
          // A grant that was never retired answers from the backend. Anything
          // else — an unreachable backend, a retired refresh token — answers
          // from the stored grant instead: the account block stays put and the
          // injected API key keeps generating, so only a rejected grant asks for
          // a sign-in and only through `needsReauth`.
          try {
            const { profile, affCode } = await fetchProfileAndAffiliate()
            state.profile = profile
            state.affCode = affCode
            return {
              ok: true,
              value: {
                signedIn: true,
                profile,
                balance: profile.balance,
                affCode,
                hasApiKey: state.apiKey !== '',
                stale: false,
                needsReauth: false,
              } satisfies ThreevideoProfileResponse,
            }
          } catch (error) {
            if (!isUnauthorized(error) && !renewalExhausted) {
              ctx.logger.warn('threevideo-auth: profile refresh failed; answering from the stored grant', error)
            }
            return {
              ok: true,
              value: {
                signedIn: true,
                profile: state.profile,
                balance: state.profile.balance,
                affCode: state.affCode,
                hasApiKey: state.apiKey !== '',
                stale: true,
                needsReauth: renewalExhausted,
              } satisfies ThreevideoProfileResponse,
            }
          }
        }

        case 'copyInviteLink': {
          asEmptyRequest(payload)
          if (!storedState?.affCode) {
            throw new Error('No affiliate code available')
          }
          const link = `${THREEVIDEO_BASE_URL}/register?aff=${encodeURIComponent(storedState.affCode)}`
          return {
            ok: true,
            value: {
              link,
              copied: true,
            } satisfies ThreevideoCopyInviteResponse,
          }
        }

        case 'logout': {
          asEmptyRequest(payload)
          // Deleting the record can fail; failing the request keeps this session
          // and the stored grant consistent.
          await forgetSession()
          storedState = null
          renewalExhausted = false
          const credentials = ctx.get('credentials')
          if (credentials !== undefined) {
            await credentials.set(THREEVIDEO_API_KEY_REF, '')
          }
          await clearModelConfiguration()
          return { ok: true, value: { success: true } satisfies ThreevideoLogoutResponse }
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
          const defaultModel = THREEVIDEO_DEFAULT_MODEL
          const sorted = models.sort((a, b) => {
            if (a.id === defaultModel) return -1
            if (b.id === defaultModel) return 1
            if (a.id.startsWith('deepseek-v4')) return -1
            return a.id.localeCompare(b.id)
          })
          return {
            ok: true,
            value: { models: sorted, defaultModel } satisfies ThreevideoGetModelsResponse,
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
          await agentDefaultModel.saveSelection({ provider: THREEVIDEO_PROVIDER, model })
          if (storedState) {
            ctx.logger.info(`threevideo-auth: default model set to ${model}`)
          }
          return {
            ok: true,
            value: {
              success: true,
              provider: THREEVIDEO_PROVIDER,
              model,
            } satisfies ThreevideoSelectModelResponse,
          }
        }

        default:
          throw new Error(`Unknown endpoint: ${endpoint}`)
      }
    } catch (error) {
      // Catch all errors and return them as structured RPC error responses
      // so the client sees a meaningful message instead of "HTTP 500".
      const message = error instanceof Error ? error.message : String(error)
      ctx.logger.error(`threevideo-auth: RPC "${endpoint}" failed: ${message}`)
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
