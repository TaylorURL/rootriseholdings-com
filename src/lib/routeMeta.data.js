/**
 * What the document head says on each route, and which of them are served as
 * their own file.
 *
 * The values live apart from the hook that applies them because the build reads
 * them too: a crawler that does not run the bundle sees only what the document
 * arrived with, so each public route is written out at build time with its own
 * title, description, canonical and share card already in the head. The hook
 * keeps them right as a reader moves between routes without a reload.
 */
const ORIGIN = 'https://www.rootriseholdings.com'

const DEFAULT_META = {
  title: 'Root & Rise · Trade on Structure',
  description:
    'Root & Rise is a Smart Money Concepts trading desk: structure read on gold and the US indices, a rule-gated journal, and a daily briefing from live data.',
}

const ROUTE_META = {
  '/': DEFAULT_META,
  '/login': {
    title: 'Sign In · Root & Rise Trading Desk',
    description:
      'Sign in to the Root & Rise terminal. The daily briefing, the rule-gated journal, and the desk rule book pick up where the last session ended.',
  },
  '/privacy': {
    title: 'Privacy · Root & Rise Trading Desk',
    description:
      'What the Root & Rise platform stores and where: an email for the account, journal data in your own browser, and nothing sold or shared.',
  },
  '/terms': {
    title: 'Terms · Root & Rise Trading Desk',
    description:
      'What Root & Rise is: a private trading desk and its software. Nothing on the site is investment advice, a signal service, or an offer to manage money.',
  },
  '/contact': {
    title: 'Contact · Root & Rise Trading Desk',
    description:
      'Reach the Root & Rise desk about the platform, the rule book, or access. Messages go straight to the person who runs it.',
  },
  '/app': {
    title: 'Dashboard · Root & Rise Terminal',
    description:
      'The desk dashboard: equity, the day loss budget, open positions, the A+ count, and the current briefing edition on one screen.',
  },
  '/app/briefing': {
    title: 'Briefing · Root & Rise Terminal',
    description:
      'The nine-section briefing: economic calendar, DXY, gold and index structure, FX watch, sentiment, the day plan, and the risk rules.',
  },
  '/app/journal': {
    title: 'Journal · Root & Rise Terminal',
    description:
      'The rule-aware trade journal: log entries with R:R, risk, setup, and session attached, with every departure from the rule book marked on the ticket.',
  },
  '/app/markets': {
    title: 'Markets · Root & Rise Terminal',
    description:
      'Live structure on the traded instruments: price, session range, BOS and CHoCH events, OTE zones, and the dealing range on each chart.',
  },
  '/app/signals': {
    title: 'Signals · Root & Rise Terminal',
    description:
      'Every published call with its entry, stop and target, alerts when a new one fires, and the outcome of each one scored against the tape.',
  },
  '/app/demo': {
    title: 'Demo Account · Root & Rise Terminal',
    description:
      'Every call the desk has published, sized at one per cent risk against a fifty-thousand-dollar book: balance, equity curve, drawdown and the trade-by-trade ledger.',
  },
  '/app/insights': {
    title: 'Insights · Root & Rise Terminal',
    description:
      'Performance cut by instrument, setup, session, and grade: win rate, expectancy, R-multiples, and prop-firm evaluation tracking.',
  },
  '/app/account': {
    title: 'Account · Root & Rise Terminal',
    description:
      'The account screen: starting equity, point values, prop-firm parameters, market data feed status, and the desk risk rules.',
  },
}

/** The public routes written out as their own document at build time. */
export const PRERENDERED_ROUTES = ['/', '/login', '/privacy', '/terms', '/contact']

export { ORIGIN, DEFAULT_META, ROUTE_META }
