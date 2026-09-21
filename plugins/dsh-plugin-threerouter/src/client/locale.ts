/**
 * Threerouter client locale dictionary and namespace declaration.
 *
 * Own translations for the overlay auth UI — self-contained so the plugin
 * does not depend on any desktop-shell locale surface.
 */

const threerouterZh = {
  account: 'Threerouter 1$ ≈ 30M token',
  close: '关闭',
  signInTitle: '登录 Threerouter 账号',
  signIn: '登录',
  signingIn: '登录中…',
  email: '邮箱',
  password: '密码',
  enterCredentials: '请输入邮箱和密码',
  createAccount: '注册账号',
  apiKeyHint: '登录后自动申请并配置 API Key，默认使用 deepseek-v4-pro 模型。',
  loggedInNotice: '已登录 Threerouter，API Key 已自动配置',
  accountBalance: '账户余额',
  apiKeyReady: 'API Key 已就绪',
  apiKeyNotCreated: 'API Key 未创建',
  quickModelSwitch: '快速切换模型',
  shareInviteLink: '分享邀请链接',
  signOut: '退出登录',
  inviteCopied: '分享链接已复制到剪贴板',
  openSessionFirst: '请先打开一个会话再切换模型',
} as const

export type ThreerouterKey = keyof typeof threerouterZh

const threerouterEn = {
  account: 'Threerouter 1$ ≈ 30M token',
  close: 'Close',
  signInTitle: 'Sign in to your Threerouter account',
  signIn: 'Sign in',
  signingIn: 'Signing in…',
  email: 'Email',
  password: 'Password',
  enterCredentials: 'Please enter your email and password.',
  createAccount: 'Create an account',
  apiKeyHint: 'Your API key is configured automatically after sign-in. The default model is deepseek-v4-pro.',
  loggedInNotice: 'Signed in to Threerouter. API key configured automatically.',
  accountBalance: 'Account balance',
  apiKeyReady: 'API key ready',
  apiKeyNotCreated: 'API key not created',
  quickModelSwitch: 'Quick model switch',
  shareInviteLink: 'Share invite link',
  signOut: 'Sign out',
  inviteCopied: 'Invite link copied to clipboard',
  openSessionFirst: 'Please open a session before switching models',
} satisfies Record<ThreerouterKey, string>

/** Combined zh/en bundle passed to `ctx.locale.register('threerouter', …)`. */
export const threerouterLocale = { zh: threerouterZh, en: threerouterEn }

// Augment the upstream slot locale registry so `TranslateNS<'threerouter'>`
// resolves against this plugin's keys in any consumer that imports it.
declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    threerouter: ThreerouterKey
  }
}
