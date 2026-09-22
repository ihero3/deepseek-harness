/**
 * Threerouter brand row on the blank-session hero.
 *
 * Upstream renders the hero headline copy (`t('hero.headline')`) and the
 * Preview badge (`t('hero.preview')`) as hardcoded nodes inside its
 * `_titleGroup` element, with no slot; the `conversation` locale namespace is
 * owned upstream, so the copy cannot be replaced through locale either.
 * Instead:
 *
 *  1. `conversation.hero.brand.mark` is a single slot whose upstream content
 *     is only a fallback (the animated whale), so registering here replaces
 *     the mark with the whole row: whale, Threerouter tile, product title;
 *  2. an owned stylesheet hides the upstream `_titleGroup` and lets the mark
 *     hitbox span the headline row.
 *
 * Upstream class names are anchored by suffix against the client CSS-modules
 * compilation contract (`[hash]_[local]`, see packages/client/tsdown.client.ts),
 * and `:has()` scopes the rules to the hero headline that owns the mark
 * hitbox.
 *
 * @module dsh-plugin-threerouter/client/hero-brand
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import { FishLogo } from '@deepseek-ai/dsh-client-ui-primitives'
import { THREEROUTER_LOGO_DATA_URI } from './threerouter-logo.tsx'
// Type face only (the 'conversation.hero.brand.mark' slot augment); the
// conversation package is not a client module-table entry, so value imports
// would be inlined rather than shared.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'

/** Product title shown in place of the upstream hero headline copy. */
const HERO_TITLE = 'Deepseek Harness for Threerouter'

/** Owner-supplied geometry (`HeroBrandMarkOwnerProps`). */
interface HeroBrandProps {
  size?: number | undefined
  className?: string | undefined
}

/**
 * The hero brand row: upstream whale mark, Threerouter tile, product title.
 * Type metrics are inherited from the upstream headline (26px/32px, medium
 * weight, primary label color).
 * @param props - owner geometry for the mark.
 * @returns the brand row element.
 */
function HeroBrandMark({ size = 34, className }: HeroBrandProps) {
  return (
    <span className="trHeroBrand">
      <FishLogo size={size} className={className} />
      <img
        className="trHeroBrandTile"
        src={THREEROUTER_LOGO_DATA_URI}
        width={28}
        height={28}
        alt=""
        aria-hidden="true"
      />
      <span className="trHeroBrandTitle">{HERO_TITLE}</span>
    </span>
  )
}

/**
 * Owned hero overrides. `_titleGroup` carries both the headline copy and the
 * Preview badge; the mark hitbox is its previous sibling inside the headline
 * row, whose `flex: none` would otherwise keep the row from wrapping.
 */
const HERO_BRAND_STYLES = `
[class$='_headline']:has(> [class$='_fishHitbox']) > [class$='_titleGroup'] { display: none; }
[class$='_headline']:has(> [class$='_fishHitbox']) > [class$='_fishHitbox'] { min-width: 0; max-width: 100%; }
.trHeroBrand { display: inline-flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 10px; min-width: 0; max-width: 100%; }
.trHeroBrandTile { flex: none; border-radius: 6px; }
.trHeroBrandTitle { min-width: 0; }
`

/** Install the owned hero overrides; the returned disposer removes them. */
function installHeroBrandStyles(): () => void {
  const style = document.createElement('style')
  style.dataset.plugin = 'dsh-plugin-threerouter'
  style.dataset.pluginCss = 'dsh-plugin-threerouter/hero-brand'
  style.textContent = HERO_BRAND_STYLES
  document.head.appendChild(style)
  return () => { style.remove() }
}

/**
 * Register the hero brand row.
 * @param ctx - browser Cordis context.
 */
export function applyHeroBrand(ctx: ClientContext): void {
  ctx.slots.inject('conversation.hero.brand.mark', () =>
    ctx.slots.register({ name: 'conversation.hero.brand.mark' }, HeroBrandMark))
  ctx.effect(() => installHeroBrandStyles(), 'threerouter: hero brand styles')
}
