/**
 * Threerouter brand logo components for the sidebar brand slots.
 *
 * The sidebar slots mark and name separately, so `ThreerouterIcon` fills
 * `sidebar.brand.mark` (expanded brand row and collapsed rail) and
 * `ThreerouterWordmark` fills `sidebar.brand.name` with the lettering alone.
 */

import type { IconProps } from '@deepseek-ai/dsh-client-ui-primitives'

/**
 * Threerouter's official logo (the blue/cyan "3" tile) as a base64 data URI.
 * Inlined because the client build has no asset pipeline, and a cross-package
 * import would pull a second plugin entry into the bundle.
 */
export const THREEROUTER_LOGO_DATA_URI =
  'data:image/webp;base64,UklGRtYDAABXRUJQVlA4IMoDAABwEwCdASo8ADwAPpE6mUoloyIhqhZroLASCWwAuzMExaeq+bHVP8N+CeCsMNXm9S22T8wHnGejPzquo+9AD9gOt1fcZlveQ8PtDTOu8SXiPmoJMF6hMDkbUsRd6ISE0AtUPNwDauzRJ+mDpnFk3rrY4pxSrDaP3zlKLwM01O/PvX+kYW/NwUnDg1gLTRRaZYwiBLqE6PLrkmaCTYwn2/eXXK7YAAD+/qsPy7lPm3kbvBEvXMhBrT9LESGXmuHKN9DdNL8R6LM9k7tJVtJKs76e1xF83UycdH8mpjrXs1ToihpgwbHtwA7AFratV31a3kHRKYkNQzs69otRVsj+t7i9hXfbWGxwBqd4G5zIA6C3SDGHL3InC4Xo78Bi11PlJYC7tsb5wofqp8KFBx4kuZPjApuR7o9HaHNvng7P1ShL6lc4A+ZPC8pfqqql5HCoYj5e6KG1/xgSR5j0e5P822wdIE3L8qIWMED35k75Mq7l+t0dKliyg+MtvS21tRoI7gIXiqEy7B40i5pVIu/qP/8j6UmlHiK9uQvxyByl/svY9tueRVMJrYm5rez8L8wt9fol4FFDv8mEz2+Ln7NzFfP/Wm04LmJHF+6sx9QlEQiJCl8BIvCV/6EIO5/g5ScrXtSdAMNcYt0DnQIgCMznPCCrzab0efi6hAU3EV/pAAGE/JeLQMtkeNK+Dvst3uzf9xaIn8ZHY4AXQEUM0bTQZixWWG0eVQUZbmyObmd6xwH3/8+bK8qjmvBchOWKWTt0e6DPXS58AfE+gTRWW5y02W/OmkUXWOnPTcmXZRqgYdTjM0kp3fMl0d/Mw5mcjTSJdKv1RRqvq6Dtb3+zqWiIJc5AQ2TyHqr/HLwgTusOcMciI1SkQm4lWs+1VijW0FwM6xOwkSAnNYvBqvkyvgv6iJmMGYnIZaN72ujrhHVt3IYR30yqo/zwloUpF28hE7WTXLTSNZ0f86PeEgRbbZf1HN/wLeS2FrRg6gjk7rGLIkrz7FD7S7ygkW8w4hk989ZUZ1hJIOyHtcRnZaVjNLI7mAE63yNsD1+tcVC8dgp626bXQ/XoM0o+5zF1IuPu/Fd1YZK3csl2RQgfnAGYo1XhONVR2wAyrKAbJwoYHoSvrBSl2WScC/B7Nf+XCXHGkX1h8qHp5VSUimMjgIOU/eD5ISpji8B0lHuApRjcN/dWepmsZuoJRN+3qO7JrwrBTDjeQeXDckKu0We/DJ7sZAagWyxcYRZFjPFlYheRd32JyETf0HezMlqwL9mqNm5aiWCGaxWVBMUVJSyMQAAA'

/**
 * Brand mark: the official Threerouter logo, used by both the expanded sidebar
 * brand row and the collapsed rail.
 * @param props - owner geometry for the mark.
 * @returns the brand mark image.
 */
export function ThreerouterIcon({ size = 24, className }: IconProps) {
  return (
    <img
      src={THREEROUTER_LOGO_DATA_URI}
      width={size}
      height={size}
      className={className === undefined ? 'trBrandMark' : `trBrandMark ${className}`}
      alt=""
      aria-hidden="true"
    />
  )
}

/**
 * Brand name artwork for the expanded brand row: "Threerouter" lettering with
 * its small "HARNESS" caption trailing on the same baseline, without the icon
 * mark the mark slot carries. The single baseline keeps the pair inside the
 * 132-unit row the sidebar brand area reserves; a second line would overlap
 * because the caption's cap height exceeds the lettering's descender space.
 */
export function ThreerouterWordmark({ size = 24, className }: IconProps) {
  const wordmarkHeight = size
  const wordmarkWidth = (wordmarkHeight * 132) / 24
  return (
    <svg
      width={wordmarkWidth}
      height={wordmarkHeight}
      className={className}
      viewBox="0 0 132 24"
      fill="none"
      aria-hidden="true"
    >
      {/* "Threerouter" lettering */}
      <text
        x="0"
        y="17"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="12"
        fontWeight="600"
        fill="currentColor"
        letterSpacing="0.3"
      >
        Threerouter
      </text>
      <text
        x="81"
        y="17"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="6.5"
        fontWeight="400"
        fill="currentColor"
        letterSpacing="1.5"
        opacity="0.65"
      >
        HARNESS
      </text>
    </svg>
  )
}
