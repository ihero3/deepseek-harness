/**
 * Top-right account / balance / invite / model quick-switch UI.
 *
 * Renders inside the `shell.overlay` frame layer. All Threerouter backend
 * work happens on the host through the `/threerouter-auth` RPC channel.
 *
 * New-report correction note:
 *   The old rc.2 line used `connection.api.sessions.models` and
 *   `connection.api.sessions.selectModel` — those APIs do not exist in
 *   0.1.6-alpha.2. The model picker now persists through the host
 *   `agentDefaultModel.saveSelection` RPC endpoint (`selectModel` below).
 */
import { useCallback, useEffect, useState } from 'react'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'

/** The host-registered RPC channel (see src/host/plugin.ts). */
const CHANNEL = '/threerouter-auth'

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

interface ModelInfo {
  id: string
  name: string
  supported: boolean
}

interface ModelsResponse {
  models: ModelInfo[]
  defaultModel: string
}

interface SelectModelResponse {
  success: true
  provider: string
  model: string
}

/** Component props injected by the threerouter client slot registration. */
export interface ThreerouterAuthUIProps {
  /** Shared wire client used to reach the host `/threerouter-auth` channel. */
  connection: ConnectionHandle
  /** i18n translator scoped to the 'threerouter' namespace. */
  t: TranslateNS<'threerouter'>
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

/** Copy text to the OS clipboard with a legacy fallback. */
async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    return
  } catch {
    // Clipboard API can be unavailable to the loopback renderer; fall back.
    const area = document.createElement('textarea')
    area.value = text
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    document.execCommand('copy')
    area.remove()
  }
}

/** Format a signed balance for display (e.g. $12.50). */
function formatBalance(value: number): string {
  const amount = Number.isFinite(value) ? value : 0
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

/**
 * A floating chip in the top-right corner of the frame. Closed, it shows a
 * compact account pill (balance when signed in, login shortcut otherwise).
 * Open, it expands into a popover with login / profile / model-switch /
 * invite-share / logout actions.
 */
export function ThreerouterAuthUI({ connection, t }: ThreerouterAuthUIProps) {
  const [open, setOpen] = useState(false)
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

  /** Fallback catalog shown before the host returns a live list. */
  const FALLBACK_MODELS: ModelInfo[] = [
    { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro', supported: true },
    { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash', supported: true },
    { id: 'deepseek-v3', name: 'DeepSeek V3', supported: true },
    { id: 'gpt-4o', name: 'GPT-4o', supported: true },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', supported: true },
    { id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet', supported: true },
    { id: 'claude-3-opus-latest', name: 'Claude 3 Opus', supported: true },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', supported: true },
  ]

  const [models, setModels] = useState<ModelInfo[]>([])
  const [currentModel, setCurrentModel] = useState<string>('deepseek-v4-pro')
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

  /** Refresh the supported model catalog through the host. */
  const refreshModels = useCallback(async () => {
    try {
      const data = await rpcValue<ModelsResponse>(await connection.rpc.call(CHANNEL, 'getModels', {}))
      setModels(data.models)
      if (data.defaultModel) setCurrentModel(data.defaultModel)
    } catch {
      // Not signed in or API unreachable — keep whatever list we already have.
    }
  }, [connection])

  useEffect(() => {
    void refreshSession().then(signedIn => {
      if (signedIn) void refreshModels()
    })
  }, [refreshSession, refreshModels])

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
      await refreshModels()
      showNotice(t('loggedInNotice'))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }, [connection, email, password, refreshSession, refreshModels, showNotice, t])

  const handleRegister = useCallback(() => {
    window.open('https://www.threerouter.com/register', '_blank', 'noopener,noreferrer')
  }, [])

  const handleLogout = useCallback(async () => {
    setBusy(true)
    try {
      await connection.rpc.call(CHANNEL, 'logout', {})
      setSession(null)
      setModels([])
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
      await copyText(data.link)
      showNotice(t('inviteCopied'))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }, [connection, showNotice])

  /**
   * NEW in the new-repo port: persist the default model selection through
   * the host agentDefaultModel service. The old `connection.api.sessions.selectModel`
   * path does not exist in 0.1.6-alpha.2, and we do not have direct access
   * to the session model-selector contract from this plugin surface.
   * Pushing it into the host default model achieves the same user-visible
   * effect (new sessions pick Threerouter + the chosen model).
   */
  const handleSelectModel = useCallback(async (modelId: string) => {
    setBusy(true)
    try {
      await rpcValue<SelectModelResponse>(
        await connection.rpc.call(CHANNEL, 'selectModel', { model: modelId }),
      )
      setCurrentModel(modelId)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }, [connection])

  const toggle = useCallback(() => {
    setOpen(prev => {
      const next = !prev
      if (next) {
        void refreshSession().then(signedIn => { if (signedIn) void refreshModels() })
      }
      return next
    })
  }, [refreshSession, refreshModels])

  const initial = session ? (session.username[0] ?? '?').toUpperCase() : 'T'
  const signedIn = session !== null

  return (
    <div className="trAuth">
      <button
        type="button"
        className="trAuthPill"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={signedIn ? `${session.email} · ${formatBalance(session.balance)}` : t('signInTitle')}
      >
        <span className="trAuthAvatar">{initial}</span>
        {signedIn && <span className="trAuthBalance">{formatBalance(session.balance)}</span>}
        {!signedIn && <span className="trAuthLabel">{t('signIn')}</span>}
      </button>

      {open && (
        <div className="trAuthDialog" role="dialog" aria-label={t('account')}>
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

              <div className="trAuthSection">
                <div className="trAuthSectionTitle">{t('quickModelSwitch')}</div>
                <select
                  className="trAuthSelect"
                  value={currentModel}
                  disabled={busy}
                  onChange={e => void handleSelectModel(e.target.value)}
                >
                  {(models.length > 0 ? models : FALLBACK_MODELS).map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

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
