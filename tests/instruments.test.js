import test from 'node:test'
import assert from 'node:assert/strict'
import {
  INSTRUMENTS,
  INSTRUMENT_CATEGORIES,
  INSTRUMENT_META,
  PRIMARY_INSTRUMENTS,
  SWEPT_INSTRUMENTS,
  TRADED_INSTRUMENTS,
  WATCH_ONLY_INSTRUMENTS,
  decimalsForInstrument,
} from '../src/data/instruments.js'
import { oandaInstrumentFor } from '../src/lib/marketData/oanda.js'
import { FALLBACK_SYMBOLS, VENUE_NAMES } from '../api/lib/quoteFallback.js'
import { PUBLISHED_INSTRUMENTS } from '../src/lib/signals/engine.js'
import { formatInstrumentPrice } from '../src/lib/format.js'

const NO_FALLBACK = new Set()

test('an instrument is registered once, under one ticker', () => {
  const symbols = INSTRUMENTS.map((entry) => entry.symbol)
  const tickers = INSTRUMENTS.map((entry) => entry.providerSymbol)
  assert.equal(new Set(symbols).size, symbols.length)
  assert.equal(new Set(tickers).size, tickers.length)
  assert.equal(Object.keys(INSTRUMENT_META).length, INSTRUMENTS.length)
})

test('every entry carries the fields the surfaces read', () => {
  for (const entry of INSTRUMENTS) {
    assert.ok(entry.displaySymbol, `${entry.symbol} has no display symbol`)
    assert.ok(entry.name, `${entry.symbol} has no name`)
    assert.ok(INSTRUMENT_CATEGORIES.includes(entry.category), `${entry.symbol} has no class`)
    assert.ok(entry.note, `${entry.symbol} has no note`)
    assert.ok(entry.tickSize > 0, `${entry.symbol} has no tick`)
    assert.ok(entry.biasTimeframes.length > 0, `${entry.symbol} has no bias timeframe`)
    assert.ok(!entry.name.includes('undefined'), `${entry.symbol} names an unknown currency`)
  }
})

test('a pair is executed or watched, never neither and never both', () => {
  for (const entry of INSTRUMENTS) {
    assert.equal(entry.tradeable, !entry.isWatchOnly, `${entry.symbol} contradicts itself`)
  }
  assert.equal(TRADED_INSTRUMENTS.length + WATCH_ONLY_INSTRUMENTS.length, INSTRUMENTS.length)
})

test('the playbook instruments are the four the site leads with', () => {
  assert.deepEqual(
    PRIMARY_INSTRUMENTS.map((entry) => entry.symbol),
    ['XAUUSD', 'NAS100', 'US30', 'SP500']
  )
  for (const entry of PRIMARY_INSTRUMENTS) {
    assert.ok(entry.tradeable && !entry.isWatchOnly, `${entry.symbol} cannot carry a call`)
  }
})

/**
 * The swept set is deliberately wider than the primaries and deliberately
 * narrower than the book. Wider because the desk trades the FX majors and used
 * to publish nothing on them; narrower because every entry costs three feed
 * reads on every pass. Both halves are asserted so neither drifts unnoticed.
 */
test('a call can be published on the primaries and the FX majors', () => {
  assert.deepEqual(
    SWEPT_INSTRUMENTS.map((entry) => entry.symbol),
    ['XAUUSD', 'NAS100', 'US30', 'SP500', 'EURUSD', 'GBPUSD', 'AUDUSD', 'USDCAD', 'USDCHF']
  )
  assert.deepEqual(
    PUBLISHED_INSTRUMENTS.map((entry) => entry.symbol),
    SWEPT_INSTRUMENTS.map((entry) => entry.symbol)
  )
})

test('nothing watch-only is ever swept', () => {
  for (const entry of WATCH_ONLY_INSTRUMENTS) {
    assert.equal(entry.swept, false, `${entry.symbol} is watch-only and cannot carry a call`)
  }
})

test('every primary is swept', () => {
  for (const entry of PRIMARY_INSTRUMENTS) {
    assert.equal(entry.swept, true, `${entry.symbol} leads the site and must carry calls`)
  }
})

test('the keyed feed names every instrument it carries, and no crypto', () => {
  for (const entry of INSTRUMENTS) {
    const instrument = oandaInstrumentFor(entry.providerSymbol)
    if (entry.category === 'Crypto') {
      assert.equal(instrument, null, `${entry.symbol} is not OANDA's to serve`)
      continue
    }
    assert.match(instrument ?? '', /^[A-Z0-9]+_[A-Z]{3}$/, `${entry.symbol} is unmapped`)
  }
})

test('the fallback venue names every instrument it carries', () => {
  for (const entry of INSTRUMENTS) {
    const venueSymbol = FALLBACK_SYMBOLS[entry.providerSymbol]
    if (NO_FALLBACK.has(entry.symbol)) {
      assert.equal(venueSymbol, undefined, `${entry.symbol} has an unverified venue name`)
      continue
    }
    assert.ok(venueSymbol, `${entry.symbol} has no venue name`)
    assert.ok(VENUE_NAMES[venueSymbol], `${venueSymbol} is unlabelled`)
  }
})

test('a price prints at the precision its instrument trades in', () => {
  assert.equal(formatInstrumentPrice(1.164341, 'EURUSD'), '1.16434')
  assert.equal(formatInstrumentPrice(216.4251, 'GBPJPY'), '216.425')
  assert.equal(formatInstrumentPrice(68.0553, 'XAGUSD'), '68.055')
  assert.equal(formatInstrumentPrice(1.42391, 'XRPUSD'), '1.4239')
  assert.equal(formatInstrumentPrice(4586.239, 'XAUUSD'), '4586.24')
  assert.equal(formatInstrumentPrice(53367.85, 'US30'), '53367.8')
  for (const entry of INSTRUMENTS) {
    if (entry.category !== 'FX') continue
    assert.equal(decimalsForInstrument(entry.symbol), entry.symbol.endsWith('JPY') ? 3 : 5)
  }
})
