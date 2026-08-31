/**
 * Instrument registry — everything the desk prices, and the smaller set it acts on.
 *
 * Three postures live here. The four primaries are the Smart-Money-Concepts
 * playbook's own: they are swept for structure, they are what a published call
 * can be about, and they are the charts the marketing pages draw. The FX watch
 * pairs are read for sentiment context and never executed. Everything else is
 * the rest of the book the desk holds — priced on the markets screen, charted,
 * and available to the journal, with no call published against it.
 *
 * `providerSymbol` is the ticker the market data layer requests. When the site
 * holds a market data key the market function answers these from OANDA's CFD
 * instruments — the metals price there as spot XAU_USD and XAG_USD, the numbers
 * the prop platforms quote. The public feed carries no spot metal series at
 * all, so it prices them off the COMEX front months and the market function
 * rebases those series onto a keyless spot print before they leave the origin;
 * the venue badge names which of the three answered. Every other entry is the
 * instrument itself, so no price on any surface stands in for something the
 * desk is not looking at.
 */

/** What each currency code is called in an instrument's long name. */
const CURRENCY_NAMES = {
  AUD: 'Australian dollar',
  CAD: 'Canadian dollar',
  CHF: 'Swiss franc',
  EUR: 'Euro',
  GBP: 'British pound',
  JPY: 'Japanese yen',
  NZD: 'New Zealand dollar',
  USD: 'US dollar',
}

/** What the book carries beyond the playbook's four, stated once. */
const BOOK_NOTE = 'Priced and journalled on the desk. Calls publish on the primaries only.'

/**
 * One FX pair in the desk's own shape.
 *
 * A yen quote moves in hundredths of a yen and every other quote in
 * hundred-thousandths, which is the precision the pair trades in rather than a
 * display choice, so the tick follows the quoted currency.
 *
 * @param {string} symbol - six-letter pair, e.g. EURJPY
 * @param {object} [posture] - the fields the playbook sets differently
 */
function fxPair(symbol, posture = {}) {
  const base = symbol.slice(0, 3)
  const quote = symbol.slice(3)
  return {
    symbol,
    displaySymbol: `${base}/${quote}`,
    name: `${CURRENCY_NAMES[base]} / ${CURRENCY_NAMES[quote]}`,
    category: 'FX',
    primaryTimeframe: '1H',
    biasTimeframes: ['4H', 'Daily'],
    sideConstraint: null,
    tradeable: true,
    isPrimary: false,
    isWatchOnly: false,
    note: BOOK_NOTE,
    providerSymbol: `${symbol}=X`,
    tickSize: quote === 'JPY' ? 0.001 : 0.00001,
    moveLabel: 'pips',
    ...posture,
  }
}

/** The posture of a pair read for context and never executed. */
const watching = (note) => ({
  primaryTimeframe: 'Watch',
  biasTimeframes: ['Daily'],
  tradeable: false,
  isWatchOnly: true,
  note,
})

export const INSTRUMENTS = [
  {
    symbol: 'XAUUSD',
    displaySymbol: 'XAU/USD',
    name: 'Gold spot',
    category: 'Commodity',
    primaryTimeframe: '1H',
    biasTimeframes: ['Daily', '4H'],
    sideConstraint: null,
    tradeable: true,
    isPrimary: true,
    isWatchOnly: false,
    note: 'Only trade in the direction of the higher-timeframe (Daily / 4H) bias.',
    providerSymbol: 'GC=F', // spot XAU_USD when keyed; the COMEX future rebased onto spot otherwise
    tickSize: 0.01,
    moveLabel: 'pts',
  },
  {
    symbol: 'NAS100',
    displaySymbol: 'NAS100',
    name: 'Nasdaq 100 index',
    category: 'Index',
    primaryTimeframe: '15m',
    biasTimeframes: ['1H', '4H'],
    sideConstraint: null,
    tradeable: true,
    isPrimary: true,
    isWatchOnly: false,
    note: 'Intraday 15m execution; bias confirmed off 1H/4H structure.',
    providerSymbol: '^NDX', // Nasdaq 100 index
    tickSize: 0.1,
    moveLabel: 'pts',
  },
  {
    symbol: 'US30',
    displaySymbol: 'US30',
    name: 'Dow Jones 30 index',
    category: 'Index',
    primaryTimeframe: '1H',
    biasTimeframes: ['4H', 'Daily'],
    sideConstraint: null,
    tradeable: true,
    isPrimary: true,
    isWatchOnly: false,
    note: '1H execution — cleaner structure than the other indices intraday.',
    providerSymbol: '^DJI', // Dow Jones Industrial Average
    tickSize: 1,
    moveLabel: 'pts',
  },
  {
    symbol: 'SP500',
    displaySymbol: 'SP500',
    name: 'S&P 500 index',
    category: 'Index',
    primaryTimeframe: '15m',
    biasTimeframes: ['1H', '4H'],
    sideConstraint: 'SHORT',
    tradeable: true,
    isPrimary: true,
    isWatchOnly: false,
    note: 'SHORTS ONLY. Bias rule — never long this index.',
    providerSymbol: '^GSPC', // S&P 500 index
    tickSize: 0.1,
    moveLabel: 'pts',
  },

  fxPair('EURUSD'),
  fxPair('GBPUSD'),
  fxPair('AUDUSD'),
  fxPair('NZDUSD', watching('Monitor only — risk-sentiment proxy.')),
  // The public feed's own name for dollar-yen predates the six-letter form and
  // is the one both fallback venues answer to.
  fxPair('USDJPY', {
    ...watching('Monitor only — DXY corroboration, never executed as a primary.'),
    providerSymbol: 'JPY=X',
  }),
  fxPair('USDCAD'),
  fxPair('USDCHF'),

  fxPair('AUDCAD'),
  fxPair('AUDCHF'),
  fxPair('AUDJPY'),
  fxPair('AUDNZD'),
  fxPair('CADCHF'),
  fxPair('CADJPY'),
  fxPair('CHFJPY'),
  fxPair('EURAUD'),
  fxPair('EURCAD'),
  fxPair('EURGBP'),
  fxPair('EURJPY'),
  fxPair('EURNZD'),
  fxPair('GBPAUD'),
  fxPair('GBPCAD'),
  fxPair('GBPCHF'),
  fxPair('GBPJPY'),
  fxPair('GBPNZD'),
  fxPair('NZDCAD'),
  fxPair('NZDCHF'),
  fxPair('NZDJPY', watching('Monitor only — composite risk barometer.')),

  {
    symbol: 'XAGUSD',
    displaySymbol: 'XAG/USD',
    name: 'Silver spot',
    category: 'Commodity',
    primaryTimeframe: '1H',
    biasTimeframes: ['4H', 'Daily'],
    sideConstraint: null,
    tradeable: true,
    isPrimary: false,
    isWatchOnly: false,
    note: BOOK_NOTE,
    providerSymbol: 'SI=F', // spot XAG_USD when keyed; the COMEX future rebased onto spot otherwise
    tickSize: 0.001,
    moveLabel: 'pts',
  },
  {
    symbol: 'USOIL',
    displaySymbol: 'USOIL',
    name: 'Crude oil WTI',
    category: 'Commodity',
    primaryTimeframe: '1H',
    biasTimeframes: ['4H', 'Daily'],
    sideConstraint: null,
    tradeable: true,
    isPrimary: false,
    isWatchOnly: false,
    note: BOOK_NOTE,
    providerSymbol: 'CL=F', // WTI front month, which is what a CFD on it tracks
    tickSize: 0.001,
    moveLabel: 'pts',
  },
  {
    symbol: 'BTCUSD',
    displaySymbol: 'BTC/USD',
    name: 'Bitcoin',
    category: 'Crypto',
    primaryTimeframe: '1H',
    biasTimeframes: ['4H', 'Daily'],
    sideConstraint: null,
    tradeable: true,
    isPrimary: false,
    isWatchOnly: false,
    note: BOOK_NOTE,
    providerSymbol: 'BTC-USD', // the dollar pair; a tether quote tracks it within its own peg
    tickSize: 0.01,
    moveLabel: 'pts',
  },
  {
    symbol: 'XRPUSD',
    displaySymbol: 'XRP/USD',
    name: 'Ripple',
    category: 'Crypto',
    primaryTimeframe: '1H',
    biasTimeframes: ['4H', 'Daily'],
    sideConstraint: null,
    tradeable: true,
    isPrimary: false,
    isWatchOnly: false,
    note: BOOK_NOTE,
    providerSymbol: 'XRP-USD', // the dollar pair; a tether quote tracks it within its own peg
    tickSize: 0.0001,
    moveLabel: 'pts',
  },
]

export const INSTRUMENT_META = INSTRUMENTS.reduce((map, entry) => {
  map[entry.symbol] = entry
  return map
}, {})

export function decimalsForInstrument(symbol) {
  const meta = INSTRUMENT_META[symbol]
  if (!meta) return 2
  const { tickSize } = meta
  if (tickSize >= 1) return 1
  if (tickSize >= 0.1) return 1
  if (tickSize >= 0.01) return 2
  if (tickSize >= 0.001) return 3
  if (tickSize >= 0.0001) return 4
  return 5
}

/** The playbook's own instruments: swept for structure, and called on. */
export const PRIMARY_INSTRUMENTS = INSTRUMENTS.filter((entry) => entry.isPrimary)

export const TRADED_INSTRUMENTS = INSTRUMENTS.filter((entry) => entry.tradeable)

export const WATCH_ONLY_INSTRUMENTS = INSTRUMENTS.filter((entry) => entry.isWatchOnly)

/** The classes the markets screen filters on, in the order it shows them. */
export const INSTRUMENT_CATEGORIES = ['FX', 'Commodity', 'Index', 'Crypto']
