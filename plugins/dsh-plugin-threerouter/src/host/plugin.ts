/** Host-side registration entry for the Threerouter integration plugin.
 *
 *  Owns the `/threerouter-auth` RPC channel (login, profile, API key
 *  provisioning, model routing, invite link, logout, selectModel). Designed
 *  to compose alongside any desktop host without touching upstream source —
 *  register it as a standalone entry in cordis.patch.yml.
 */

import type { Context } from '@deepseek-ai/cordis'
import { createThreerouterAuthHandler } from './threerouter-auth.ts'

/** Stable Cordis plugin name (referenced by cordis.patch.yml entry id). */
export const name = 'threerouter-integration'

/**
 * Services required before the Threerouter RPC can register. `connection`
 * carries the `rpc.handle()` seam; the rest (credentials / settings /
 * agentDefaultModel) are probed at runtime by the auth handler so this plugin
 * stays inert in profiles that do not wire them.
 */
export const inject = ['connection']

/**
 * Register the Threerouter auth RPC handler on the loopback connection.
 *
 * Note: the new-repo `HostConnectionService.rpc.handle` only accepts
 * `(channel, handler)` — the old third-parameter `{ authority: 'loopback' }`
 * from the rc.2 line does not exist here and is intentionally omitted.
 *
 * @param ctx - Host context carrying the loopback connection service.
 */
export function apply(ctx: Context): void {
  ctx.effect(() => {
    const authHandler = createThreerouterAuthHandler(ctx)
    const connection = ctx.get('connection')!
    const removeRpc = connection.rpc.handle('/threerouter-auth', authHandler.handler)
    return () => {
      void removeRpc()
    }
  }, 'threerouter-auth: register RPC handler')
}
