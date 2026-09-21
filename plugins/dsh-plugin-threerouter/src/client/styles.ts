/** Threerouter-owned stylesheet kept as a plain string so the client bundle stays self-contained. */
const THREEROUTER_OWNED_STYLES = `
/* ---- Threerouter account / balance / invite / model-switch (shell.overlay) ---- */
.trAuth { position: absolute; top: 48px; right: 180px; z-index: 1100; font-family: inherit; }
.trAuthPill { display: inline-flex; align-items: center; gap: 8px; height: 32px; padding: 0 12px 0 4px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 999px; background: var(--dsw-alias-bg-layer-3); color: var(--dsw-alias-label-primary); cursor: pointer; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12); transition: background var(--ds-transition-duration-fast) var(--ds-ease), border-color var(--ds-transition-duration-fast) var(--ds-ease); }
.trAuthPill:hover { background: var(--dsw-alias-interactive-bg-hover); border-color: var(--dsw-alias-border-l3); }
.trAuthAvatar { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: var(--dsw-alias-button-primary-fill); color: var(--dsw-alias-label-primary-foreground); font-size: 12px; font-weight: 600; }
.trAuthBalance { font-size: 12px; font-weight: 600; color: var(--dsw-alias-label-primary); }
.trAuthLabel { font-size: 12px; font-weight: 600; color: var(--dsw-alias-label-primary); }
.trAuthDialog { position: absolute; top: 40px; right: 0; width: 300px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 12px; background: var(--dsw-alias-bg-layer-3); box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18); color: var(--dsw-alias-label-primary); overflow: hidden; }
.trAuthDialogHeader { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid var(--dsw-alias-border-l1); color: var(--dsw-alias-label-primary); font-size: 13px; font-weight: 600; }
.trAuthClose { border: none; background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer; font-size: 13px; line-height: 1; padding: 4px; }
.trAuthClose:hover { color: var(--dsw-alias-label-primary); }
.trAuthError { margin: 10px 14px 0; padding: 8px 10px; border-radius: 8px; background: var(--dsw-alias-state-error-secondary); color: #fff; font-size: 12px; }
.trAuthNotice { margin: 10px 14px 0; padding: 8px 10px; border-radius: 8px; background: var(--dsw-alias-state-success-tertiary); color: var(--dsw-alias-label-primary); font-size: 12px; }
.trAuthLogin, .trAuthProfile { padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; }
.trAuthLogin label { display: flex; flex-direction: column; gap: 4px; color: var(--dsw-alias-label-primary); font-size: 12px; }
.trAuthLogin input { height: 32px; padding: 0 10px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; background: var(--dsw-specific-login-input, var(--dsw-alias-bg-layer-2, rgba(127, 133, 143, 0.08))); color: var(--dsw-alias-label-primary); font-size: 13px; outline: none; color-scheme: inherit; }
.trAuthLogin input::placeholder { color: var(--dsw-alias-label-tertiary, #98a2b3); opacity: 1; }
.trAuthLogin input:focus { border-color: var(--dsw-alias-state-business-primary); }
.trAuthHint { margin: 0; color: var(--dsw-alias-label-secondary); font-size: 11px; line-height: 1.5; }
.trAuthPrimary { height: 34px; border: none; border-radius: 8px; background: var(--dsw-alias-button-primary-fill); color: var(--dsw-alias-label-primary-foreground); font-size: 13px; font-weight: 600; cursor: pointer; }
.trAuthPrimary:hover { background: var(--dsw-alias-button-primary-hover); }
.trAuthPrimary:disabled { background: var(--dsw-alias-button-primary-dimmed); cursor: default; }
.trAuthRegister { height: 34px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; background: transparent; color: var(--dsw-alias-label-primary); font-size: 13px; font-weight: 600; cursor: pointer; }
.trAuthRegister:hover { background: var(--dsw-alias-interactive-bg-hover); }
.trAuthCloseBtn { height: 32px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; background: transparent; color: var(--dsw-alias-label-secondary); font-size: 13px; font-weight: 500; cursor: pointer; }
.trAuthCloseBtn:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.trAuthProfileRow { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.trAuthEmail { font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.trAuthBalanceBig { font-size: 15px; font-weight: 700; color: var(--dsw-alias-label-primary); }
.trAuthFieldLabel { font-size: 12px; color: var(--dsw-alias-label-tertiary); }
.trAuthCopyHint { font-size: 12px; color: var(--dsw-alias-state-success-primary); }
.trAuthSection { display: flex; flex-direction: column; gap: 6px; }
.trAuthSectionTitle { font-size: 12px; color: var(--dsw-alias-label-tertiary); }
.trAuthSelect { height: 32px; padding: 0 8px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; background: var(--dsw-specific-login-input); color: var(--dsw-alias-label-primary); font-size: 13px; outline: none; }
.trAuthActions { display: flex; gap: 8px; }
.trAuthSecondary { flex: 1; height: 32px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; background: transparent; color: var(--dsw-alias-label-primary); font-size: 12px; font-weight: 600; cursor: pointer; }
.trAuthSecondary:hover { background: var(--dsw-alias-interactive-bg-hover); }
.trAuthDanger { height: 32px; padding: 0 12px; border: 1px solid transparent; border-radius: 8px; background: transparent; color: var(--dsw-alias-state-error-primary); font-size: 12px; font-weight: 600; cursor: pointer; }
.trAuthDanger:hover { background: var(--dsw-alias-interactive-bg-hover-danger); }
@media (prefers-reduced-motion: reduce) {
  .trAuth * { transition: none !important; animation: none !important; }
}
`

/** Install Threerouter-owned panel styles for the auth overlay. */
export function installThreerouterStyles(): () => void {
  const style = document.createElement('style')
  style.dataset.plugin = 'dsh-plugin-threerouter'
  style.dataset.pluginCss = 'dsh-plugin-threerouter/threerouter-owned-styles'
  style.textContent = THREEROUTER_OWNED_STYLES
  document.head.appendChild(style)
  return () => { style.remove() }
}
