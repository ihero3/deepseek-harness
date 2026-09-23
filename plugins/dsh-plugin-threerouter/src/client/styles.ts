/** Threerouter-owned stylesheet kept as a plain string so the client bundle stays self-contained. */
const THREEROUTER_OWNED_STYLES = `
/* ---- Threerouter sidebar brand mark (official logo tile) ---- */
.trBrandMark { flex: none; border-radius: 5px; }
/* ---- Threerouter account pill (sidebar.footer.action, left of Settings) ---- */
.trAuth { position: relative; flex: none; display: inline-flex; align-items: center; font-family: inherit; }
.trAuthPill { display: inline-flex; align-items: center; gap: 8px; height: 42px; padding: 0 10px 0 8px; border: none; border-radius: 12px; background: transparent; color: var(--dsw-alias-label-primary); font-family: inherit; font-size: 14px; line-height: 22px; white-space: nowrap; cursor: pointer; transition: background var(--ds-transition-duration-fast) var(--ds-ease); }
.trAuthPill:hover { background: var(--dsw-alias-interactive-bg-hover); }
.trAuthPill:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.trAuthRail .trAuthPill { justify-content: center; gap: 0; width: 36px; height: 36px; padding: 0; border-radius: 50%; corner-shape: round; }
.trAuthAvatar { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; background: var(--dsw-alias-button-primary-fill); color: var(--dsw-alias-label-primary-foreground); font-size: 12px; font-weight: 600; }
.trAuthBalance { font-size: 13px; font-weight: 600; color: var(--dsw-alias-label-primary); }
.trAuthLabel { font-size: 14px; font-weight: 500; color: var(--dsw-alias-label-primary); }
/* Sidebar rows overhang the padding box by 2px; the pill matches so it lines
   up with the New Session button above it. */
.trAuthWide { margin-left: -2px; }
/* The upstream foot stacks actions above Settings. These rules seat the pill
   beside Settings instead, and only while the pill is present in its wide
   form, so the column stacking keeps serving every other footer action and
   the 56px rail keeps its single-file stack. Each slot contribution is wrapped
   in a display:contents anchor, so the pill is matched as a descendant. */
[class$='_footArea']:has(.trAuth[data-wide='true']) { flex-direction: row; align-items: center; gap: 6px; }
[class$='_footArea']:has(.trAuth[data-wide='true']) > [class$='_footerActions'] { flex: none; align-items: center; width: auto; }
[class$='_footArea']:has(.trAuth[data-wide='true']) > [class$='_settingsArea'] { flex: 1 1 auto; width: auto; min-width: 0; }
[class$='_footArea']:has(.trAuth[data-wide='true']) > [class$='_footerActions'] [class$='_layer'] { width: auto; margin: 0; }
/* The wide account pill plus Settings leaves ~156px for the settings row, so
   a text-width connection pill (flex: none) starves the trigger and clips its
   label. Collapse the pill to its icon in this layout; its accessible name and
   CSS tooltip keep the reconnect wording. ui-primitives emits local-first
   classes (_indicator_<hash>_<n>), matched as substrings. */
[class$='_footArea']:has(.trAuth[data-wide='true']) [class*='_indicator_'] {
  position: relative;
  grid-template-columns: 14px;
  width: 28px;
  padding: 0;
}
[class$='_footArea']:has(.trAuth[data-wide='true']) [class*='_indicator_'] [class*='_label_'] { display: none; }
[class$='_footArea']:has(.trAuth[data-wide='true']) [class*='_indicator_']:hover::after {
  content: attr(aria-label);
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 8px;
  border-radius: 6px;
  background: var(--dsw-alias-bg-layer-3);
  border: 1px solid var(--dsw-alias-border-l2);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18);
  color: var(--dsw-alias-label-primary);
  font-size: 12px;
  font-weight: 500;
  line-height: 18px;
  white-space: nowrap;
  pointer-events: none;
}
.trAuthDialog { position: fixed; z-index: 1100; width: 300px; max-width: calc(100vw - 24px); border: 1px solid var(--dsw-alias-border-l2); border-radius: 12px; background: var(--dsw-alias-bg-layer-3); box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18); color: var(--dsw-alias-label-primary); overflow: hidden; }
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
