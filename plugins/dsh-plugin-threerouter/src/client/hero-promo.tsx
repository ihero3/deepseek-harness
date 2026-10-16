/**
 * Threerouter 充值推广卡：New Session 空白会话 hero 页的广告模块。
 *
 * `conversation.hero.promo` 是本 fork 在 ui-conversation 里新增的 hero 单槽
 * （见 FORK-FEATURES R25），落在 hero composer 栈的末位——composer 卡下方；
 * 本模块是它唯一的占用者，负责整卡外观、文案与跳转目标。
 *
 * 视觉参照 threerouter-sub2api 的 `PromoBanner.vue`：渐变卡 + 装饰光斑 +
 * 徽章 + 标题 + CTA + 六条卖点网格。品牌色（渐变两端与强调绿）在上游
 * `--dsw-*` 语义 token 里没有对应取值，因此集中在 `.trPromoCard` 的
 * `--tr-promo-*` 变量上定义一次，规则体只引用变量；尺寸、间距与层级仍走
 * token 与相对单位。网格列数按卡片自身宽度用容器查询切换（1 / 2 / 3 列），
 * 窄容器（窄窗口、嵌入视图）不被挤压。
 *
 * 整卡可点击：鼠标点击、Enter 与 Space 都打开充值页外链。浏览器里是
 * `window.open` 的新标签页；桌面客户端由主进程的 `setWindowOpenHandler`
 * 接管，交给系统浏览器打开（apps/desktop/src/main.ts）。
 *
 * 文案走 `threerouter.promo` locale 命名空间（zh/en 字典在本文件注册，
 * 随界面语言切换）。
 *
 * @module dsh-plugin-threerouter/client/hero-promo
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
// 仅拉类型面（'conversation.hero.promo' slot augment 与 locale 服务声明）。
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'

/** 充值页地址；点击整卡的跳转目标。 */
const PURCHASE_URL = 'https://www.threerouter.com/purchase'

/** Hero 推广卡 locale 命名空间。 */
export const HERO_PROMO_LOCALE_NAMESPACE = 'threerouter.promo'

const zh = {
  badge: '限时活动',
  title: '充值越多，送得越多',
  cta: '立即充值',
  newUser: '新用户注册：送 10元',
  refer: '邀请好友：送 6元',
  topUp1: '充值 1元 → 送 1元（共 2元）',
  topUp10: '充值 10元 → 送 10元（共 20元）',
  deepseek: 'DeepSeek 开源模型：1元 ≈ 3000 万 tokens',
  freedom: '每月约 3元 = 实现 Token 自由',
} as const

export type HeroPromoLocaleKey = keyof typeof zh

const en: Record<HeroPromoLocaleKey, string> = {
  badge: 'Limited-Time Offer',
  title: 'More Credits, Less Spend',
  cta: 'Top Up Now',
  newUser: 'New users: $10 free',
  refer: 'Refer a friend: $6',
  topUp1: 'Top up $1 → get $10 free ($11)',
  topUp10: 'Top up $10 → get $100 free ($110)',
  deepseek: 'DeepSeek open model: $1 ≈ 30M tokens',
  freedom: '~$3/month = token freedom',
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap { 'threerouter.promo': HeroPromoLocaleKey }
}

/** 本模块命名空间的翻译函数（slot 的 `locale` 字段自动注入 `t`）。 */
export type HeroPromoT = TranslateNS<'threerouter.promo'>

/** 卖点列：徽章/标题/CTA 之外的字典键。 */
type PromoItemKey = Exclude<HeroPromoLocaleKey, 'badge' | 'title' | 'cta'>

/** 六条卖点：locale 键 + 展示 emoji，顺序即渲染顺序。 */
const PROMO_ITEMS: ReadonlyArray<{ key: PromoItemKey; emoji: string }> = [
  { key: 'newUser', emoji: '🎁' },
  { key: 'refer', emoji: '👥' },
  { key: 'topUp1', emoji: '💸' },
  { key: 'topUp10', emoji: '💸' },
  { key: 'deepseek', emoji: '⚡' },
  { key: 'freedom', emoji: '🔥' },
]

/** 注册条目组件的本地结构视图——推广卡是常驻控件，不消费会话态，仅依赖
 * 本命名空间的 `t`（slot `locale` 字段自动注入）。 */
interface HeroPromoProps {
  t: HeroPromoT
}

/**
 * Hero 充值推广卡：整卡一个可聚焦的按钮，Enter / Space 与点击等效。
 * @param props - 本命名空间的翻译函数。
 * @returns 推广卡元素。
 */
function HeroPromo({ t }: HeroPromoProps) {
  const openPurchase = (): void => {
    window.open(PURCHASE_URL, '_blank', 'noopener')
  }
  return (
    <section
      className="trPromoCard"
      role="button"
      tabIndex={0}
      aria-label={t('title')}
      onClick={openPurchase}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        openPurchase()
      }}
    >
      <span className="trPromoGlow trPromoGlowTop" aria-hidden="true" />
      <span className="trPromoGlow trPromoGlowBottom" aria-hidden="true" />
      <span className="trPromoSheen" aria-hidden="true" />
      <div className="trPromoBody">
        <div className="trPromoHeader">
          <span className="trPromoBadge">
            <span className="trPromoDot" aria-hidden="true" />
            {t('badge')}
          </span>
          <h2 className="trPromoTitle">{t('title')}</h2>
          <span className="trPromoCta">
            {t('cta')}
            <svg className="trPromoArrow" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </span>
        </div>
        <div className="trPromoGrid">
          {PROMO_ITEMS.map((item) => (
            <div key={item.key} className="trPromoItem">
              <span className="trPromoEmoji" aria-hidden="true">{item.emoji}</span>
              <span className="trPromoItemText">{t(item.key)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/**
 * 推广卡样式。选择器全部锚定自有 `trPromo*` 类名，不触碰上游 css modules；
 * 品牌色只在 `.trPromoCard` 上定义一次（上游 token 无对应取值），其余尺寸、
 * 间距、圆角与文字层级沿用 `--dsw-*` token 与继承字号，深浅主题下卡片自身
 * 保持蓝底白字（与参考实现的固定配色一致）。
 */
const HERO_PROMO_STYLES = `
.trPromoCard {
  --tr-promo-from: #04285f;
  --tr-promo-via: #0757b8;
  --tr-promo-to: #0a7fc4;
  --tr-promo-accent: #20f5b4;
  --tr-promo-ink: #fff;

  position: relative;
  display: block;
  box-sizing: border-box;
  overflow: hidden;
  padding: 20px 24px 24px;
  border-radius: 24px;
  corner-shape: round;
  background-image: linear-gradient(135deg, var(--tr-promo-from), var(--tr-promo-via), var(--tr-promo-to));
  color: var(--tr-promo-ink);
  cursor: pointer;
  container-type: inline-size;
  transition: transform 200ms ease;

  /* hero 列的宽度是 card-max + 2 * 侧留白，直接 stretch 会比输入卡每侧宽出
     一个侧留白；宽度按输入卡的几何算，并用 flex: none 保住内容高度（否则
     卡片作为列向 flex 项会被压到只剩标题区）。 */
  flex: none;
  align-self: center;
  width: calc(100% - 2 * var(--dsh-composer-side-clearance));
  max-width: var(--dsh-composer-card-max-width);
}
.trPromoCard:hover { transform: scale(1.01); }
.trPromoCard:focus-visible { outline: 2px solid var(--tr-promo-ink); outline-offset: 2px; }
.trPromoGlow {
  position: absolute;
  width: 224px; height: 224px;
  border-radius: 999px; corner-shape: round;
  background: color-mix(in srgb, var(--tr-promo-accent) 30%, transparent);
  filter: blur(64px);
  pointer-events: none;
}
.trPromoGlowTop { top: -96px; right: -64px; }
.trPromoGlowBottom {
  bottom: -96px; left: -48px;
  background: color-mix(in srgb, var(--tr-promo-accent) 20%, transparent);
}
.trPromoSheen {
  position: absolute; inset: 0;
  background-image: radial-gradient(circle at top right, color-mix(in srgb, var(--tr-promo-accent) 18%, transparent), transparent 55%);
  pointer-events: none;
}
.trPromoBody { position: relative; }
.trPromoHeader { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; margin-bottom: 20px; }
.trPromoBadge {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 12px; border-radius: 999px; corner-shape: round;
  background: var(--tr-promo-accent); color: var(--tr-promo-from);
  font-size: 12px; line-height: 16px; font-weight: 700;
  letter-spacing: 0.05em; text-transform: uppercase; white-space: nowrap;
}
.trPromoDot {
  width: 6px; height: 6px; border-radius: 999px; corner-shape: round;
  background: var(--tr-promo-from);
  animation: trPromoPulse 2000ms ease-in-out infinite;
}
.trPromoTitle { margin: 0; font-size: 20px; line-height: 1.25; font-weight: 800; }
.trPromoCta {
  display: inline-flex; align-items: center; gap: 6px; margin-left: auto;
  padding: 6px 14px; border-radius: 999px; corner-shape: round;
  background: color-mix(in srgb, var(--tr-promo-ink) 15%, transparent);
  font-size: 12px; line-height: 16px; font-weight: 600; white-space: nowrap;
  transition: background-color 200ms ease;
}
.trPromoCard:hover .trPromoCta { background: color-mix(in srgb, var(--tr-promo-ink) 25%, transparent); }
.trPromoArrow { width: 14px; height: 14px; flex: none; transition: transform 200ms ease; }
.trPromoCard:hover .trPromoArrow { transform: translateX(2px); }
.trPromoGrid { display: grid; grid-template-columns: 1fr; gap: 12px; }
.trPromoItem {
  display: flex; align-items: center; gap: 12px; min-width: 0;
  padding: 12px 16px;
  border-radius: 16px; corner-shape: round;
  background: color-mix(in srgb, var(--tr-promo-ink) 10%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--tr-promo-ink) 15%, transparent);
}
.trPromoEmoji { flex: none; font-size: 24px; line-height: 1; }
.trPromoItemText { min-width: 0; font-size: 14px; line-height: 1.35; font-weight: 600; }

/* 按卡片自身宽度定列数：hero 列的宽度随窗口变化，视口断点会让窄窗口里的
   卡片被压扁。 */
@container (min-width: 380px) {
  .trPromoGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@container (min-width: 760px) {
  .trPromoGrid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

@keyframes trPromoPulse { 50% { opacity: 0.45; } }

@media (prefers-reduced-motion: reduce) {
  .trPromoCard, .trPromoCta, .trPromoArrow { transition: none; }
  .trPromoCard:hover { transform: none; }
  .trPromoCard:hover .trPromoArrow { transform: none; }
  .trPromoDot { animation: none; }
}
`

/** 挂载推广卡样式；返回的 disposer 移除它。 */
function installHeroPromoStyles(): () => void {
  const style = document.createElement('style')
  style.dataset.plugin = 'dsh-plugin-threerouter'
  style.dataset.pluginCss = 'dsh-plugin-threerouter/hero-promo'
  style.textContent = HERO_PROMO_STYLES
  document.head.appendChild(style)
  return () => { style.remove() }
}

/**
 * 注册 hero 充值推广卡。locale 字典与样式经 `ctx.effect` 挂载并随 disposer
 * 卸载；slot 注册的控制器归属调用方 fiber，插件卸载时随 apply fiber 级联
 * 注销（与 hero brand / composer media tabs 一致）。
 * @param ctx - 浏览器 Cordis 上下文。
 */
export function applyHeroPromo(ctx: ClientContext): void {
  ctx.effect(
    () => ctx.locale.register(HERO_PROMO_LOCALE_NAMESPACE, { zh, en }),
    'threerouter: hero promo dictionaries',
  )
  ctx.effect(() => installHeroPromoStyles(), 'threerouter: hero promo styles')
  ctx.slots.inject('conversation.hero.promo', () => ctx.slots.register(
    {
      name: 'conversation.hero.promo',
      locale: HERO_PROMO_LOCALE_NAMESPACE,
    },
    HeroPromo,
  ))
}
