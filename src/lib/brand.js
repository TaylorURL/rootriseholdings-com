/** Single source of truth for product facts and marketing-site navigation. */

export const PRODUCT = {
  name: 'Root & Rise',
  shortName: 'R&R',
  tagline: 'Smart Money Concepts signal intelligence for gold, indices and FX.',
  valueProp:
    'Scripts that read market structure across timeframes — BOS, CHoCH and OTE — on gold, the indices and a focused FX watch list, then flag the high-conviction setups as they form. You hold the trigger.',
  monthlyPrice: 99,
  annualPrice: 990,
}

/** The compliance framing repeated across the site. Decision-support, not a fund. */
export const COMPLIANCE = {
  short: 'Rise & Root does not trade on your behalf or manage your money.',
  long: 'Rise & Root is a decision-support tool. Our scripts analyze market structure and generate buy and sell signals — every trade is placed by you, on your own broker. We do not execute trades, custody funds, or guarantee returns. Trading carries substantial risk of loss.',
  roadmap:
    'Automated execution via third-party broker integrations is on our roadmap — an optional future capability, not part of the platform today.',
}

/** Primary marketing navigation. */
export const MARKETING_NAV = [
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/features', label: 'Features' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/about', label: 'About' },
]

/** Footer link groups. */
export const FOOTER_LINKS = [
  {
    heading: 'Product',
    links: [
      { to: '/how-it-works', label: 'How It Works' },
      { to: '/features', label: 'Features' },
      { to: '/pricing', label: 'Pricing' },
      { to: '/app', label: 'Open Terminal' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { to: '/about', label: 'About' },
      { to: '/about', label: 'Mission' },
      { to: '/login', label: 'Sign In' },
      { to: '/signup', label: 'Get Access' },
    ],
  },
]
