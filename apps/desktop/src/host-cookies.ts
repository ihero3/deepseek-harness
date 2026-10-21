/**
 * Loopback Host cookie hygiene for the desktop runtime.
 *
 * Chromium scopes cookies by **host, not port**, while each launch's Host binds a
 * random loopback port. Every launch therefore used to leave one more auth cookie
 * for `127.0.0.1`, the `Cookie` request header grew launch after launch, and the
 * Host eventually answered **HTTP 431 (Request Header Fields Too Large)** — which
 * surfaces as "plugins failed to load" in the renderer. Dropping the Host's
 * cookies before authentication keeps a single fresh cookie in the jar.
 *
 * @module dsh-desktop/host-cookies
 */

/** Minimal cookie-jar view (Electron's `Cookies` is compatible). */
export interface CookieJar {
  /** List cookies that would be sent to `filter.url`. */
  get(filter: { url: string }): Promise<readonly { readonly name: string }[]>
  /** Remove one cookie from `url`. */
  remove(url: string, name: string): Promise<void>
}

/**
 * Remove every cookie the given Host origin holds.
 * Individual removals are best-effort: a partitioned cookie that refuses removal
 * must not prevent the rest of the cleanup (nor the launch) from proceeding.
 * @param jar - Session cookie jar.
 * @param url - Authenticated Host URL.
 * @returns how many cookies were removed.
 */
export async function discardHostCookies(jar: CookieJar, url: string): Promise<number> {
  const cookies = await jar.get({ url })
  let removed = 0
  for (const cookie of cookies) {
    try {
      await jar.remove(url, cookie.name)
      removed += 1
    } catch {
      // Best-effort: keep cleaning the remaining cookies.
    }
  }
  return removed
}
