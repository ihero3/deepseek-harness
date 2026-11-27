/**
 * Account persistence: a stored grant keeps the account block across restarts,
 * a retired access token is renewed silently, and only an absent or explicitly
 * rejected grant asks for a sign-in.
 */
import { Context } from '@deepseek-ai/cordis'
import type { PeerId, PeerScope } from '@deepseek-ai/dsh-client-connection'
import { credentialKey, type CredentialKey, type CredentialRecord } from '@deepseek-ai/dsh-credentials'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createThreevideoAuthHandler, type ThreevideoStoredState } from './threevideo-auth.ts'

/** Session record key the handler owns. */
const SESSION_KEY = credentialKey('threevideo-integration', 'session')

/** Stored grant used by the cases that start signed in. */
const grant: ThreevideoStoredState = {
  accessToken: 'access-retired',
  refreshToken: 'refresh-live',
  affCode: 'AFF123',
  apiKey: 'sk-test',
  profile: {
    id: 2,
    email: 'user@example.com',
    username: 'user',
    role: 'user',
    balance: 10,
    allowedGroups: [19],
    apiKeys: [],
  },
}

/** One JSON reply in the backend's envelope. */
function reply(data: unknown, status = 200): Response {
  return new Response(JSON.stringify({ code: 0, message: 'success', data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** A rejected-grant reply: HTTP 401 with the API's symbolic code. */
function unauthorized(): Response {
  return new Response(JSON.stringify({ code: 'INVALID_TOKEN', message: 'Invalid token' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** Raw user body `/auth/me` answers with. */
function rawUser(balance: number): unknown {
  return {
    id: 2,
    email: 'user@example.com',
    username: 'user',
    role: 'user',
    balance,
    allowed_groups: [19],
    api_keys: [],
  }
}

/**
 * Build a handler over a fake credential store and a scripted backend.
 *
 * @param stored - grant to seed the store with; omitted for a signed-out boot.
 * @param routes - per-path handler; a path with no route answers 404.
 */
function boot(
  stored: ThreevideoStoredState | undefined,
  routes: Record<string, (init: RequestInit | undefined) => Response | Promise<Response>>,
) {
  const records = new Map<CredentialKey, CredentialRecord>()
  if (stored !== undefined) {
    records.set(SESSION_KEY, { kind: 'grant', payload: stored })
  }
  const credentials = {
    readRecord: async (key: CredentialKey) => records.get(key),
    modifyRecord: async (key: CredentialKey, update: (current: CredentialRecord | undefined) => Promise<CredentialRecord>) => {
      const next = await update(records.get(key))
      records.set(key, next)
      return next
    },
    deleteRecord: async (key: CredentialKey) => { records.delete(key) },
    set: async () => {},
  }

  const ctx = new Context()
  ctx.provide('credentials', credentials)
  ctx.provide('logger', { info: () => {}, warn: () => {}, error: () => {} })

  const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input)
    const route = Object.keys(routes).find(path => url.endsWith(path))
    if (route === undefined) return new Response('404 page not found', { status: 404 })
    return await routes[route]!(init)
  })
  vi.stubGlobal('fetch', fetchMock)

  const { handler } = createThreevideoAuthHandler(ctx)
  // The handler reads neither the abort signal nor the calling peer: both are
  // the loopback bridge's own args.
  const peer: PeerScope = {
    id: 'threevideo-auth-test' as PeerId,
    ctx,
    principal: { kind: 'owner' },
    signal: new AbortController().signal,
    interactions: 'none',
    dispose: async () => {},
  }
  return {
    call: async (endpoint: string) => {
      const result = await handler(endpoint, {}, new AbortController().signal, peer)
      if (!result.ok) throw new Error(result.error?.message ?? 'rpc failed')
      return result.value as Record<string, unknown>
    },
    storedGrant: (): ThreevideoStoredState | undefined => {
      const record = records.get(SESSION_KEY)
      return record?.kind === 'grant' ? record.payload as ThreevideoStoredState : undefined
    },
    fetchMock,
  }
}

/** Bearer token a captured request carried. */
function bearerOf(init: RequestInit | undefined): string | undefined {
  const headers = init?.headers as Record<string, string> | undefined
  return headers?.Authorization?.replace('Bearer ', '')
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('threevideo account persistence', () => {
  it('reports a signed-out boot only when no grant is stored', async () => {
    const session = boot(undefined, {})
    await expect(session.call('getProfile')).resolves.toEqual({ signedIn: false })
  })

  it('renews a retired access token instead of asking for a sign-in again', async () => {
    const session = boot(grant, {
      '/auth/me': (init) => bearerOf(init) === 'access-renewed' ? reply(rawUser(42)) : unauthorized(),
      '/user/aff': (init) => bearerOf(init) === 'access-renewed' ? reply({ aff_code: 'AFF123' }) : unauthorized(),
      '/auth/refresh': () => reply({ access_token: 'access-renewed', refresh_token: 'refresh-rotated', expires_in: 86400 }),
    })

    const profile = await session.call('getProfile')

    expect(profile).toMatchObject({
      signedIn: true,
      balance: 42,
      stale: false,
      needsReauth: false,
    })
    const stored = session.storedGrant()
    expect(stored?.accessToken).toBe('access-renewed')
    expect(stored?.refreshToken).toBe('refresh-rotated')
    expect(stored?.expiresAt).toBeGreaterThan(Date.now())
  })

  it('keeps the account block when the backend retired the refresh token', async () => {
    const session = boot(
      { ...grant, profile: { ...grant.profile, balance: 10 } },
      {
        '/auth/me': () => unauthorized(),
        '/user/aff': () => unauthorized(),
        '/auth/refresh': () => unauthorized(),
      },
    )

    const profile = await session.call('getProfile')

    expect(profile).toMatchObject({
      signedIn: true,
      balance: 10,
      stale: true,
      needsReauth: true,
    })
    expect(session.storedGrant()?.refreshToken).toBe('refresh-live')
  })

  it('keeps the account block when the backend is unreachable', async () => {
    const session = boot(grant, {
      '/auth/me': () => { throw new Error('boom') },
      '/user/aff': () => { throw new Error('boom') },
    })

    expect(await session.call('getProfile')).toMatchObject({
      signedIn: true,
      stale: true,
      needsReauth: false,
    })
  })

  it('reports a failed renewal as stale, not as a sign-in request', async () => {
    const session = boot(grant, {
      '/auth/me': () => unauthorized(),
      '/user/aff': () => unauthorized(),
      '/auth/refresh': () => { throw new Error('boom') },
    })

    expect(await session.call('getProfile')).toMatchObject({
      signedIn: true,
      stale: true,
      needsReauth: false,
    })
  })

  it('shares one renewal between concurrent requests, because renewal rotates the refresh token', async () => {
    const session = boot(grant, {
      '/auth/me': (init) => bearerOf(init) === 'access-renewed' ? reply(rawUser(7)) : unauthorized(),
      '/user/aff': (init) => bearerOf(init) === 'access-renewed' ? reply({ aff_code: 'AFF123' }) : unauthorized(),
      '/auth/refresh': () => reply({ access_token: 'access-renewed', refresh_token: 'refresh-rotated', expires_in: 86400 }),
    })

    const [first, second] = await Promise.all([session.call('getProfile'), session.call('getProfile')])

    expect(first).toMatchObject({ signedIn: true, stale: false })
    expect(second).toMatchObject({ signedIn: true, stale: false })
    const renewals = session.fetchMock.mock.calls.filter(([input]) => String(input).endsWith('/auth/refresh'))
    expect(renewals).toHaveLength(1)
  })

  it('renews before the call when the stored lifetime has run out', async () => {
    const session = boot({ ...grant, expiresAt: Date.now() - 1_000 }, {
      '/auth/me': (init) => bearerOf(init) === 'access-renewed' ? reply(rawUser(9)) : unauthorized(),
      '/user/aff': () => reply({ aff_code: 'AFF123' }),
      '/auth/refresh': () => reply({ access_token: 'access-renewed' }),
    })

    expect(await session.call('getProfile')).toMatchObject({ signedIn: true, stale: false })
    // The rotation carried no refresh token: the stored one stays in place.
    expect(session.storedGrant()?.refreshToken).toBe('refresh-live')
  })
})
