/**
 * Threerouter-integrated client plugin.
 *
 * Independent slot registrations, all inert outside a cordis host profile
 * that wires this package:
 *
 *  1. `sidebar.brand.mark` + `sidebar.brand.name` — official-brand-style
 *     shadow-override so the sidebar brand row shows Threerouter glyph and
 *     wordmark. The official build's brand plugin is gated by
 *     `process.env.DSH_CLIENT_BUILD_PROFILE === 'official'`, so its
 *     registrations are inert under the standard dev build — ours lands at
 *     the default priority and wins cleanly.
 *
 *  2. `conversation.hero.brand.mark` — blank-session hero brand row (whale,
 *     Threerouter tile, product title) in place of the upstream headline copy
 *     and Preview badge.
 *
 *  3. `sidebar.footer.action` — account pill beside Settings at the sidebar
 *     foot: login / profile / model-switch / invite / logout, surfaced by the
 *     host RPC channel `/threerouter-auth`.
 *
 *  4. `conversation.input.left` — composer media-mode tabs (text / image /
 *     video) with per-mode parameter dropdowns, driving the dsh-image-video
 *     runtime-defaults loopback route (`/image-video/defaults`).
 *
 *  5. `tool.call.toolview` — embedded video/image players for the
 *     generate_video / generate_image tools, with an openFile fallback row.
 *
 *  6. `threerouter` + `threerouter.composerMedia` locale namespaces — zh/en
 *     dictionaries for the overlay and the composer media tabs.
 *
 * New-repo correction note:
 *   - ClientContext is imported from `@deepseek-ai/cordis` (not
 *     `@deepseek-ai/dsh-client-runtime/client` — that package does not
 *     exist in the 0.1.6-alpha.2 surface).
 *   - No URL/env gate — plugin applies whenever it is in the profile; the
 *     old `dsh-desktop-*` advanced-shell URL markers are gone.
 *   - `sessions` / `workspaces` services are not injected here — the model
 *     picker persists through the host `selectModel` RPC endpoint instead
 *     of the old `connection.api.sessions.selectModel` call that does not
 *     exist in the new line.
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import { applyComposerMediaTabs } from './composer-media-tabs.tsx'
import { applyHeroBrand } from './hero-brand.tsx'
import { applyMediaToolviews } from './media-toolview.tsx'
import { ThreerouterAuthUI } from './threerouter-auth-ui.tsx'
import { ThreerouterIcon, ThreerouterWordmark } from './threerouter-logo.tsx'
import { threerouterLocale } from './locale.ts'
import { installThreerouterStyles } from './styles.ts'

/** Services required by the Threerouter client surfaces. */
export const inject = ['slots', 'locale', 'connection']

/**
 * Register Threerouter branding and auth overlay.
 *
 * We intentionally do NOT set a higher priority on our slot registrations —
 * the official brand plugin's registrations are gated behind a build-time
 * define (`DSH_CLIENT_BUILD_PROFILE !== 'official'` short-circuits), so
 * under any non-official build the upstream brand slots are effectively
 * empty and our default-priority registration simply fills them.
 *
 * @param ctx - browser Cordis context.
 */
export function apply(ctx: ClientContext): void {
  // --- Styles ---
  ctx.effect(() => installThreerouterStyles(), 'threerouter: owned styles')

  // --- Brand shadow-override (sidebar.brand.mark + sidebar.brand.name) ---
  // Follows the official ui-brand-official two-nested-inject + generator
  // pattern so registration order is irrelevant and rollback is clean.
  ctx.effect(() => {
    return ctx.slots.inject('sidebar.brand.mark', () =>
      ctx.slots.inject('sidebar.brand.name', function* () {
        yield ctx.slots.register({ name: 'sidebar.brand.mark' }, ThreerouterIcon)
        yield ctx.slots.register({ name: 'sidebar.brand.name' }, ThreerouterWordmark)
      }))
  }, 'threerouter: brand slot shadow')

  // --- Sidebar foot account pill (left of Settings) ---
  ctx.effect(() => {
    const disposeLocale = ctx.locale.register('threerouter', threerouterLocale)
    const disposeSlot = ctx.slots.inject('sidebar.footer.action', () =>
      ctx.slots.register({
        name: 'sidebar.footer.action',
        id: 'threerouter-auth-ui',
        locale: 'threerouter',
        inject: () => ({
          connection: ctx.get('connection')!,
        }),
      }, ThreerouterAuthUI))
    return () => {
      void disposeSlot()
      disposeLocale()
    }
  }, 'threerouter: auth footer slot')

  // --- Blank-session hero brand row ---
  applyHeroBrand(ctx)

  // --- Composer media tabs (text / image / video segmented mode + params) ---
  applyComposerMediaTabs(ctx)

  // --- Embedded media toolviews (generate_video / generate_image) ---
  applyMediaToolviews(ctx)

  // Silence unused type-only import warning for `connection` inject.
  void null as unknown as ConnectionHandle
}
