/**
 * Threerouter-integrated client plugin.
 *
 * Independent slot registrations, all inert outside a cordis host profile
 * that wires this package:
 *
 *  1. `sidebar.brand.mark` + `sidebar.brand.name` — the sidebar brand glyph
 *     and wordmark. Both are `single` slots, and neither registration order nor
 *     an explicit priority decides the winner: the client-module guard
 *     overwrites the priority of every non-chain registration, and a release
 *     build compiles out the upstream plugin's build-profile gate. The bundle
 *     patch therefore disables the `ui-brand-official` row outright.
 *
 *  2. `conversation.hero.brand.mark` — blank-session hero brand row (whale,
 *     Threerouter tile, product title) in place of the upstream headline copy
 *     and Preview badge.
 *
 *  3. `settings.launcher` — the account chip at the sidebar foot, in the seat
 *     the companion bundle patch frees by disabling the upstream account row:
 *     login / profile / settings / invite / logout, surfaced by the host RPC
 *     channel `/threerouter-auth`.
 *
 *  4. `conversation.input.left` — composer media-mode tabs (text / image /
 *     video) with per-mode parameter dropdowns, driving the dsh-image-video
 *     runtime-defaults loopback route (`/image-video/defaults`).
 *
 *  5. `tool.call.toolview` — embedded video/image players for the
 *     generate_video / generate_image tools, each showing the saved file's full
 *     path with copy / reveal-in-file-manager / open-in-system-application
 *     actions, falling back to the chat-side opener without a Client Remote.
 *
 *  6. `threerouter` + `threerouter.composerMedia` locale namespaces — zh/en
 *     dictionaries for the overlay and the composer media tabs.
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-connection/client'
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
 * The `sidebar.brand.*` slot registrations below are not ordered against the
 * upstream brand plugin: the companion bundle patch disables its loader row, so
 * this plugin is the only occupant of those slots in a packaged release.
 *
 * @param ctx - browser Cordis context.
 */
export function apply(ctx: ClientContext): void {
  // --- Styles ---
  ctx.effect(() => installThreerouterStyles(), 'threerouter: owned styles')

  // --- Sidebar brand (sidebar.brand.mark + sidebar.brand.name) ---
  // Nested `slots.inject` generators defer both registrations until their slots
  // exist and dispose them together.
  ctx.effect(() => {
    return ctx.slots.inject('sidebar.brand.mark', () =>
      ctx.slots.inject('sidebar.brand.name', function* () {
        yield ctx.slots.register({ name: 'sidebar.brand.mark' }, ThreerouterIcon)
        yield ctx.slots.register({ name: 'sidebar.brand.name' }, ThreerouterWordmark)
      }))
  }, 'threerouter: brand slot shadow')

  // --- Sidebar foot: the account chip owns the settings launcher seat ---
  ctx.effect(() => {
    const disposeLocale = ctx.locale.register('threerouter', threerouterLocale)
    const disposeSlot = ctx.slots.inject('settings.launcher', () =>
      ctx.slots.register({
        name: 'settings.launcher',
        locale: 'threerouter',
        inject: () => ({
          connection: ctx.get('connection')!,
        }),
      }, ThreerouterAuthUI))
    return () => {
      void disposeSlot()
      disposeLocale()
    }
  }, 'threerouter: account chip')

  // --- Blank-session hero brand row ---
  applyHeroBrand(ctx)

  // --- Composer media tabs (text / image / video segmented mode + params) ---
  applyComposerMediaTabs(ctx)

  // --- Embedded media toolviews (generate_video / generate_image) ---
  applyMediaToolviews(ctx)
}
