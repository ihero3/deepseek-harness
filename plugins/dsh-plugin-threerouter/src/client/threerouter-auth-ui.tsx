/**
 * Sidebar-foot account / balance / invite UI.
 *
 * Renders as the `settings.launcher` occupant — the seat the companion bundle
 * patch frees by disabling the upstream account row — so the collapsed rail
 * shows the mark alone and Settings opens from the popover's entry. The chip
 * carries the brand mark (the profile exposes no avatar) beside the account name
 * once signed in, and the sign-in label otherwise. All Threerouter backend work
 * happens on the host through the `/threerouter-auth` RPC channel.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import { useDismissOnOutsidePointer } from '@deepseek-ai/dsh-client-ui-primitives'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { copyText } from './clipboard.ts'
import { ThreerouterIcon } from './threerouter-logo.tsx'

/** The host-registered RPC channel (see src/host/plugin.ts). */
const CHANNEL = '/threerouter-auth'

/** Popover width, mirrored by `.trAuthDialog` in styles.ts. */
const DIALOG_WIDTH = 300

// --- Host response shapes (mirrors src/host/threerouter-auth.ts) ---

interface ProfileInfo {
  id: number
  email: string
  username: string
  balance: number
}

interface ProfileResponse {
  profile: ProfileInfo
  balance: number
  affCode: string
  hasApiKey: boolean
}

/** Component props injected by the threerouter client slot registration. */
export interface ThreerouterAuthUIProps {
  /** Shared wire client used to reach the host `/threerouter-auth` channel. */
  connection: ConnectionHandle
  /** Owner width flag; `false` in the collapsed rail, where only the avatar fits. */
  wide: boolean
  /** i18n translator scoped to the 'threerouter' namespace. */
  t: TranslateNS<'threerouter'>
  /** Opens the application Settings panel. */
  openSettings: () => void
}

/**
 * Unwrap an RPC result into its value, throwing the reported error message.
 */
async function rpcValue<T>(result: Awaited<ReturnType<ConnectionHandle['rpc']['call']>>): Promise<T> {
  if (!result.ok) {
    throw new Error(result.error?.message ?? 'Threerouter request failed')
  }
  return result.value as T
}

/** Format a signed balance for display (e.g. $12.50). */
function formatBalance(value: number): string {
  const amount = Number.isFinite(value) ? value : 0
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

/**
 * Gear glyph for the popover's Settings row, drawn inline because a cross-package
 * icon import would pull a second plugin entry into the client bundle.
 */
const gearSvg = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.3"
    strokeLinejoin="round"
    strokeLinecap="round"
  >
    <path d="M6.6 1.7 A6.45 6.45 0 0 1 9.4 1.7 L9.4 3.83 A4.4 4.4 0 0 1 9.96 4.06 L11.47 2.56 A6.45 6.45 0 0 1 13.44 4.53 L11.94 6.04 A4.4 4.4 0 0 1 12.17 6.6 L14.3 6.6 A6.45 6.45 0 0 1 14.3 9.4 L12.17 9.4 A4.4 4.4 0 0 1 11.94 9.96 L13.44 11.47 A6.45 6.45 0 0 1 11.47 13.44 L9.96 11.94 A4.4 4.4 0 0 1 9.4 12.17 L9.4 14.3 A6.45 6.45 0 0 1 6.6 14.3 L6.6 12.17 A4.4 4.4 0 0 1 6.04 11.94 L4.53 13.44 A6.45 6.45 0 0 1 2.56 11.47 L4.06 9.96 A4.4 4.4 0 0 1 3.83 9.4 L1.7 9.4 A6.45 6.45 0 0 1 1.7 6.6 L3.83 6.6 A4.4 4.4 0 0 1 4.06 6.04 L2.56 4.53 A6.45 6.45 0 0 1 4.53 2.56 L6.04 4.06 A4.4 4.4 0 0 1 6.6 3.83 L6.6 1.7 Z" />
    <circle cx="8" cy="8" r="2.4" />
  </svg>
)

/**
 * The sidebar-foot account chip. Closed, it shows the brand mark beside the
 * account name when signed in, or the sign-in label otherwise. Open, it expands
 * into a popover with login / profile / invite-share / logout actions and a
 * Settings entry.
 */
export function ThreerouterAuthUI({ connection, wide, t, openSettings }: ThreerouterAuthUIProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const [anchor, setAnchor] = useState<{ left: number; bottom: number } | undefined>(undefined)

  // The sidebar column clips overflow, so the popover is position: fixed and
  // hugs the trigger through a measured offset instead of document flow.
  useLayoutEffect(() => {
    if (!open) return
    const place = (): void => {
      const rect = rootRef.current?.getBoundingClientRect()
      if (rect === undefined) return
      setAnchor({
        left: Math.max(8, Math.min(rect.left, window.innerWidth - DIALOG_WIDTH - 8)),
        bottom: window.innerHeight - rect.top + 8,
      })
    }
    place()
    window.addEventListener('resize', place)
    return () => { window.removeEventListener('resize', place) }
  }, [open])

  useDismissOnOutsidePointer(rootRef, open, setOpen)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [session, setSession] = useState<{
    email: string
    username: string
    balance: number
    affCode: string
    hasApiKey: boolean
  } | null>(null)

  const [notice, setNotice] = useState<string | null>(null)

  const showNotice = useCallback((message: string) => {
    setNotice(message)
    const timer = setTimeout(() => setNotice(null), 2600)
    return () => clearTimeout(timer)
  }, [])

  /** Fetch the persisted Threerouter profile on mount (in-memory host session). */
  const refreshSession = useCallback(async () => {
    try {
      const data = await rpcValue<ProfileResponse>(
        await connection.rpc.call(CHANNEL, 'getProfile', {}),
      )
      setSession({
        email: data.profile.email,
        username: data.profile.username || (data.profile.email.split('@')[0] ?? 'User'),
        balance: data.balance,
        affCode: data.affCode,
        hasApiKey: data.hasApiKey,
      })
      setError(null)
      setEmail(data.profile.email)
      return true
    } catch {
      setSession(null)
      return false
    }
  }, [connection])

  useEffect(() => {
    void refreshSession()
  }, [refreshSession])

  const handleLogin = useCallback(async () => {
    if (!email || !password) {
      setError(t('enterCredentials'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      await rpcValue<{ success: true }>(
        await connection.rpc.call(CHANNEL, 'login', { email, password }),
      )
      setPassword('')
      await refreshSession()
      showNotice(t('loggedInNotice'))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }, [connection, email, password, refreshSession, showNotice, t])

  const handleRegister = useCallback(() => {
    window.open('https://www.threerouter.com/register', '_blank', 'noopener,noreferrer')
  }, [])

  const handleLogout = useCallback(async () => {
    setBusy(true)
    try {
      await connection.rpc.call(CHANNEL, 'logout', {})
      setSession(null)
      setOpen(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }, [connection])

  const handleShare = useCallback(async () => {
    try {
      const data = await rpcValue<{ link: string }>(
        await connection.rpc.call(CHANNEL, 'copyInviteLink', {}),
      )
      if (await copyText(data.link)) showNotice(t('inviteCopied'))
      else setError(t('copyFailed'))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }, [connection, showNotice])

  const toggle = useCallback(() => {
    setOpen(prev => {
      const next = !prev
      if (next) void refreshSession()
      return next
    })
  }, [refreshSession])

  const signedIn = session !== null

  return (
    <div
      ref={rootRef}
      className={wide ? 'trAuth' : 'trAuth trAuthRail'}
      data-tr-auth=""
      data-wide={wide ? 'true' : 'false'}
    >
      <button
        type="button"
        className="trAuthPill"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={signedIn ? `${session.email} · ${formatBalance(session.balance)}` : t('signInTitle')}
      >
        <span className="trAuthMark"><ThreerouterIcon size={20} /></span>
        {wide && signedIn && <span className="trAuthName">{session.username}</span>}
        {wide && !signedIn && <span className="trAuthLabel">{t('signIn')}</span>}
      </button>

      {open && anchor !== undefined && (
        <div className="trAuthDialog" style={anchor} role="dialog" aria-label={t('account')}>
          <div className="trAuthDialogHeader">
            <span>{t('account')}</span>
            <button type="button" className="trAuthClose" aria-label={t('close')} onClick={() => setOpen(false)}>✕</button>
          </div>

          {error !== null && <div className="trAuthError">{error}</div>}
          {notice !== null && <div className="trAuthNotice">{notice}</div>}

          {!signedIn ? (
            <div className="trAuthLogin">
              <label>
                <span>{t('email')}</span>
                <input
                  type="email"
                  value={email}
                  autoComplete="email"
                  placeholder="you@example.com"
                  onChange={e => setEmail(e.target.value)}
                />
              </label>
              <label>
                <span>{t('password')}</span>
                <input
                  type="password"
                  value={password}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') void handleLogin() }}
                />
              </label>
              <button type="button" className="trAuthPrimary" disabled={busy} onClick={() => void handleLogin()}>
                {busy ? t('signingIn') : t('signIn')}
              </button>
              <button type="button" className="trAuthRegister" onClick={handleRegister}>
                {t('createAccount')}
              </button>
              <button type="button" className="trAuthCloseBtn" onClick={() => setOpen(false)}>
                {t('close')}
              </button>
              <p className="trAuthHint">{t('apiKeyHint')}</p>
            </div>
          ) : (
            <div className="trAuthProfile">
              <div className="trAuthProfileRow">
                <span className="trAuthEmail" title={session.email}>{session.email}</span>
                <span className="trAuthBalanceBig">{formatBalance(session.balance)}</span>
              </div>
              <div className="trAuthProfileRow">
                <span className="trAuthFieldLabel">{t('accountBalance')}</span>
                <span className="trAuthCopyHint">{session.hasApiKey ? t('apiKeyReady') : t('apiKeyNotCreated')}</span>
              </div>

              <button type="button" className="trAuthRow" disabled={busy} onClick={() => { setOpen(false); openSettings() }}>
                <span className="trAuthRowGlyph" aria-hidden="true">{gearSvg}</span>
                {t('settings')}
              </button>

              <div className="trAuthActions">
                <button type="button" className="trAuthSecondary" disabled={busy} onClick={() => void handleShare()}>
                  {t('shareInviteLink')}
                </button>
                <button type="button" className="trAuthDanger" disabled={busy} onClick={() => void handleLogout()}>
                  {t('signOut')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
