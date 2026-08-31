/** Single source of truth for brand facts and marketing-site navigation. */

export const PRODUCT = {
  name: 'Root & Rise',
  shortName: 'R&R',
  tagline: 'A Smart Money Concepts trading desk.',
  heroLine:
    'Structure read the Smart Money way on gold and the US indices, with a rule gate on every trade.',
  valueProp:
    'One desk, four charts, hard rules. Structure gets read the Smart Money way on gold and the US indices: BOS, CHoCH, OTE. Every trade passes a rule gate before it is taken, and a nine-section briefing frames each session.',
}

/** The compliance framing repeated across the site. A private desk, not a fund. */
export const COMPLIANCE = {
  short: 'Root & Rise does not manage outside money or sell trade signals.',
  long: 'Root & Rise is a private trading desk and the software it runs on. Nothing on this site is investment advice, a signal service, or an offer to manage money. Trading carries substantial risk of loss.',
}

/**
 * The one sentence the footer is built around, set at display size. It says
 * what the desk is rather than closing with a second call to action, which the
 * band above the footer already carries.
 */
export const FOOTER_STATEMENT = 'A desk that answers to its own rules.'

/**
 * Top-level destinations.
 *
 * Two of the five open a panel and carry `groups` and a `feature`; the other
 * three are plain links. A destination with a panel is a disclosure button, so
 * the shape of the entry decides the element rather than the other way round.
 */
export const NAV_GROUPS = [
  {
    key: 'method',
    label: 'Method',
    to: '/#method',
    items: [
      {
        to: '/#method',
        label: 'Bias From The Higher Timeframes',
        summary: 'The sequence of highs and lows sets the only direction the desk will trade.',
      },
      {
        to: '/#method',
        label: 'Entries At Structure',
        summary: 'A break or a change of character first, then the pullback into the OTE band.',
      },
      {
        to: '/#method',
        label: 'Risk Under Hard Rules',
        summary: 'One percent a trade, two R minimum, and a day that locks itself when it should.',
      },
    ],
    feature: {
      to: '/#method',
      label: 'Read One Chart End To End',
      summary:
        'Gold on the hour, with the change of character, the break, and the entry band marked where the desk saw them.',
    },
  },
  {
    key: 'platform',
    label: 'Platform',
    to: '/#platform',
    items: [
      {
        to: '/#platform',
        label: 'The Journal',
        summary: 'Logs a trade in seconds and refuses the ones that break the book.',
      },
      {
        to: '/#platform',
        label: 'The Briefing',
        summary: 'Nine sections composed twice a day from live feeds, every level computed.',
      },
      {
        to: '/#live',
        label: 'Live Markets',
        summary: 'Four charts, priced from the broker book, with structure read on each.',
      },
      {
        to: '/#platform',
        label: 'Performance',
        summary: 'Expectancy and R-multiples cut by instrument, setup, session, and grade.',
      },
    ],
    feature: {
      to: '/login',
      label: 'See A Ticket Get Gated',
      summary:
        'Every entry is measured against the risk cap, the R minimum, and the state of the day before it is written.',
    },
  },
  { key: 'live', label: 'Live', to: '/#live' },
  { key: 'questions', label: 'Questions', to: '/#faq' },
  { key: 'contact', label: 'Contact', to: '/contact' },
]

/** The flat list the mobile drawer and the footer read. */
export const MARKETING_NAV = NAV_GROUPS.map(({ key, label, to }) => ({ key, label, to }))

/** Footer links, one row beneath the statement. */
export const FOOTER_LINKS = [
  { to: '/#method', label: 'Method' },
  { to: '/#platform', label: 'Platform' },
  { to: '/#live', label: 'Live Markets' },
  { to: '/#faq', label: 'Questions' },
  { to: '/contact', label: 'Contact' },
]

/** Held apart from the rest so the legal row reads as one. */
export const LEGAL_LINKS = [
  { to: '/privacy', label: 'Privacy' },
  { to: '/terms', label: 'Terms' },
]
