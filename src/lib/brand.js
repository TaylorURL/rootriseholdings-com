/** Single source of truth for product facts and marketing-site navigation. */

export const PRODUCT = {
  name: 'Rise & Root',
  shortName: 'R&R',
  tagline: 'Signal intelligence for the foreign exchange markets.',
  valueProp:
    'A system of FX charts and algorithmic scripts that watch the market around the clock and tell you precisely when to buy and when to sell. You hold the trigger.',
  monthlyPrice: 99,
  annualPrice: 990,
}

/** The compliance framing repeated across the site. Decision-support, not a fund. */
export const COMPLIANCE = {
  short: 'Rise & Root does not trade on your behalf or manage your money.',
  long: 'Rise & Root is a decision-support tool. Our scripts analyze the market and generate buy and sell signals — every trade is placed by you, on your own broker. We do not execute trades, custody funds, or guarantee returns. Forex trading carries substantial risk of loss.',
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
