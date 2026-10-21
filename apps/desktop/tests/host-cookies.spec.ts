/** Stale loopback Host cookie cleanup (desktop runtime). */
import { describe, expect, it } from 'vitest'
import { discardHostCookies, type CookieJar } from '../src/host-cookies.ts'

/** Cookie jar stub recording removals; `stubborn` names always fail. */
function jar(names: readonly string[], stubborn: readonly string[] = []): CookieJar & { removed: string[]; requestedUrl: string[] } {
  const removed: string[] = []
  const requestedUrl: string[] = []
  return {
    removed,
    requestedUrl,
    async get(filter) {
      requestedUrl.push(filter.url)
      return names.map(name => ({ name }))
    },
    async remove(url, name) {
      removed.push(`${url}|${name}`)
      if (stubborn.includes(name)) throw new Error(`cannot remove ${name}`)
    },
  }
}

describe('discardHostCookies', () => {
  it('removes every cookie the Host origin holds', async () => {
    const cookies = jar(['dsh-host', 'dsh-welcome'])
    const removed = await discardHostCookies(cookies, 'http://127.0.0.1:54321/')
    expect(removed).toBe(2)
    expect(cookies.removed).toEqual([
      'http://127.0.0.1:54321/|dsh-host',
      'http://127.0.0.1:54321/|dsh-welcome',
    ])
    expect(cookies.requestedUrl).toEqual(['http://127.0.0.1:54321/'])
  })

  it('keeps going when one cookie refuses removal (cleanup must not block launch)', async () => {
    const cookies = jar(['a', 'b', 'c'], ['b'])
    expect(await discardHostCookies(cookies, 'http://127.0.0.1:1/')).toBe(2)
    expect(cookies.removed).toHaveLength(3)
  })

  it('is a no-op on a clean jar', async () => {
    expect(await discardHostCookies(jar([]), 'http://127.0.0.1:1/')).toBe(0)
  })
})
