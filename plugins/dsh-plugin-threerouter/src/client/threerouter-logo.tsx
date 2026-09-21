/**
 * Threerouter brand logo components for the sidebar.
 *
 * Provides both a full wordmark (expanded sidebar) and a compact icon
 * (collapsed rail), matching the Threerouter brand identity.
 */

import type { IconProps } from '@deepseek-ai/dsh-client-ui-primitives'

/**
 * Compact icon logo used in the collapsed sidebar rail.
 * A stylised three-arc motif (three routes → threerouter).
 */
export function ThreerouterIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      {/* Three arcs meeting at the center — "three routes" motif */}
      <path
        d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M12 2v10l6 6M12 12l-6 6M12 12l2-8M12 12l-2 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
    </svg>
  )
}

/**
 * Compact brand mark for `sidebar.brand.mark` slot injection. A deep-blue
 * rounded tile carrying a white "3" glyph — matches the tray-icon identity.
 */
export function ThreerouterBrandMark({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      role="img"
    >
      <rect x="1" y="1" width="22" height="22" rx="5" fill="#004FAB" />
      {/* Bold filled "3" — matches the tray-icon visual identity */}
      <path
        d="M9 5h4c2.2 0 4 1.6 4 3.8 0 1.4-.7 2.6-1.8 3.2C17.4 12.7 18 14 18 15.6 18 18 16 19.8 13.5 19.8H9V5Zm2.2 2v3.8h2c1 0 1.8-.8 1.8-1.9s-.8-1.9-1.8-1.9h-2Zm0 5.8v4h2.5c1.2 0 2-.9 2-2s-.8-2-2-2h-2.5Z"
        fill="#FFFFFF"
        transform="translate(-0.5, -0.3)"
      />
    </svg>
  )
}

/**
 * Full wordmark logo used when the sidebar is expanded.
 * Icon + "Threerouter" lettering + small "HARNESS" caption.
 */
export function ThreerouterWordmark({ size = 24, className }: IconProps) {
  const wordmarkHeight = size
  const wordmarkWidth = (wordmarkHeight * 160) / 24
  return (
    <svg
      width={wordmarkWidth}
      height={wordmarkHeight}
      className={className}
      viewBox="0 0 160 24"
      fill="none"
      aria-hidden="true"
    >
      {/* Icon mark */}
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path
        d="M12 2v10l6 6M12 12l-6 6M12 12l2-8M12 12l-2 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2" fill="currentColor" />

      {/* "Threerouter" lettering */}
      <text
        x="28"
        y="17"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="13"
        fontWeight="600"
        fill="currentColor"
        letterSpacing="0.5"
      >
        Threerouter
      </text>
      <text
        x="28"
        y="22"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="7"
        fontWeight="400"
        fill="currentColor"
        letterSpacing="2"
        opacity="0.65"
      >
        HARNESS
      </text>
    </svg>
  )
}
