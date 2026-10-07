/** Threerouter-owned stylesheet kept as a plain string so the client bundle stays self-contained. */
const THREEROUTER_OWNED_STYLES = `
/* ---- Threerouter sidebar brand mark (official logo tile) ---- */
.trBrandMark { flex: none; border-radius: 5px; }
/* ---- Threerouter account chip (settings launcher seat) ----
   Mirrors the New Session button's surface, height and radius so the sidebar
   foot reads as one column. The chip keeps a comfortable minimum width so a
   short account name does not collapse it, grows with a longer one, and only
   ellipsizes the name once the column cannot hold it. */
.trAuth { position: relative; flex: 1 1 auto; display: flex; align-items: center; justify-content: center; min-width: 0; font-family: inherit; }
.trAuthPill { display: inline-flex; align-items: center; justify-content: center; gap: 10px; box-sizing: border-box; width: auto; min-width: min(168px, 100%); max-width: 100%; height: 38px; padding: 0 16px; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-button-elevated-fill); color: var(--dsw-alias-label-primary); font-family: inherit; font-size: 14px; font-weight: 500; line-height: 22px; white-space: nowrap; cursor: pointer; overflow: hidden; transition: background var(--ds-transition-duration-fast) var(--ds-ease); }
/* macOS: the themed elevated fill reads as a foreign slab on the vibrancy
   sidebar, so the chip carries the same white wash as New Session. */
[data-platform='darwin'] .trAuthPill { background: rgb(255 255 255 / 0.55); }
.trAuthPill:hover { background: var(--dsw-alias-button-floating-hover); }
.trAuthPill:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.trAuthRail .trAuthPill { min-width: 0; width: 38px; padding: 0; border-radius: 50%; corner-shape: round; }
.trAuthMark { display: inline-flex; flex: none; align-items: center; justify-content: center; width: 22px; height: 22px; }
.trAuthName, .trAuthLabel { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; font-weight: 500; letter-spacing: 0.1px; color: var(--dsw-alias-label-primary); }
/* The chip occupies the settings launcher seat inside the trigger row. With the
   upstream account row disabled that row holds nothing else, so the chip stays
   centered across the column and the row's other occupants — the connection and
   desktop-update indicators — stay out of the foot. Each slot contribution is
   wrapped in a display:contents anchor, so the chip is matched as a descendant.
   The foot keeps its column layout: the chip's seat is a full-width row, and the
   now-empty footer-action area collapses instead of competing with it. */
[class$='_triggerRow'] { justify-content: center; }
[class$='_triggerRow'] > :not(:has(.trAuth)) { display: none; }
/* Keep the chip off the sidebar's bottom edge. */
[class$='_triggerRow']:has(.trAuth[data-wide='true']) { margin-bottom: 8px; }
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
/* Popover entry for the application Settings panel, seated above the
   share/sign-out actions and reading as a control row, not a button pair. */
.trAuthRow { display: flex; align-items: center; gap: 8px; box-sizing: border-box; width: 100%; height: 34px; padding: 0 10px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; background: transparent; color: var(--dsw-alias-label-primary); font-family: inherit; font-size: 13px; font-weight: 500; text-align: left; cursor: pointer; }
.trAuthRow:hover { background: var(--dsw-alias-interactive-bg-hover); }
.trAuthRow:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.trAuthRow:disabled { color: var(--dsw-alias-label-dimmed); cursor: default; }
.trAuthRowGlyph { display: inline-flex; flex: none; align-items: center; justify-content: center; width: 16px; height: 16px; color: var(--dsw-alias-label-secondary); }
.trAuthActions { display: flex; gap: 8px; }
.trAuthSecondary { flex: 1; height: 32px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; background: transparent; color: var(--dsw-alias-label-primary); font-size: 12px; font-weight: 600; cursor: pointer; }
.trAuthSecondary:hover { background: var(--dsw-alias-interactive-bg-hover); }
.trAuthDanger { height: 32px; padding: 0 12px; border: 1px solid transparent; border-radius: 8px; background: transparent; color: var(--dsw-alias-state-error-primary); font-size: 12px; font-weight: 600; cursor: pointer; }
.trAuthDanger:hover { background: var(--dsw-alias-interactive-bg-hover-danger); }
@media (prefers-reduced-motion: reduce) {
  .trAuth * { transition: none !important; animation: none !important; }
}
/* ---- Generated-media card (generate_image / generate_video toolview) ----
   Upstream styles nothing under the dshDesktopMedia prefix: the saved-path row
   is the only place a user learns where generated media landed, so the path
   stays selectable and wraps instead of truncating. */
.dshDesktopMediaTool { display: flex; flex-direction: column; gap: 8px; }
.dshDesktopMediaPlayer { max-width: 100%; border-radius: 8px; }
.dshDesktopMediaPrompt { color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 1.5; }
.dshDesktopMediaMeta { display: flex; flex-direction: column; gap: 6px; padding: 8px 10px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: var(--dsw-alias-bg-layer-2, rgba(127, 133, 143, 0.06)); }
.dshDesktopMediaPath { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 11.5px; line-height: 1.5; color: var(--dsw-alias-label-secondary); word-break: break-all; user-select: text; -webkit-user-select: text; }
.dshDesktopMediaActions { display: flex; flex-wrap: wrap; gap: 6px; }
.dshDesktopMediaButton { height: 26px; padding: 0 10px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 6px; background: transparent; color: var(--dsw-alias-label-primary); font-family: inherit; font-size: 12px; font-weight: 500; cursor: pointer; }
.dshDesktopMediaButton:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dshDesktopMediaButton:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.dshDesktopMediaNote { color: var(--dsw-alias-label-tertiary, #98a2b3); font-size: 11.5px; line-height: 1.5; }
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
