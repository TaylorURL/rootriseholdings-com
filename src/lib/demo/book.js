import { RISK_RULES } from '../../data/riskRules.js'
import { ctDateKey } from '../time.js'

/**
 * The demo book — the published record priced as an account.
 *
 * The signal record already says what the desk called and what the tape did
 * about it, in R. What it does not say is what that would have been worth to
 * somebody holding a book, and R is not an answer to that question for anyone
 * who has not already decided how much a unit of risk is. So this walks the
 * settled record in the order it settled and keeps a balance.
 *
 * Nothing here is a second opinion about the calls. The book takes the record
 * exactly as the sweep wrote it and does arithmetic on top; it cannot add a
 * trade the desk did not call, drop one it did, or change what the tape
 * answered. That matters more than the arithmetic: a track record whose owner
 * can choose which trades appear in it is worth nothing, and the only reason
 * this one is worth showing is that the table underneath it is written by the
 * service role and by nothing else.
 *
 * Position sizing is what turns R into dollars, and it is the one place a
 * choice is made. Every trade risks the same fixed share of the balance
 * standing when it opened, which is the desk's own rule rather than a flatter
 * one chosen to make the curve look better. So a stop costs exactly that share
 * and a target pays that share times the R the call was published at.
 *
 * The consequence worth stating: the book compounds. A winning run sizes the
 * next trade larger and a losing one sizes it smaller, so the same sequence of
 * R in a different order ends at a different balance. That is how an account
 * actually behaves, and a curve drawn on flat sizing would be a smoother line
 * describing something nobody traded.
 */

/**
 * What the book is, stated once.
 *
 * Frozen, and deliberately not a row in a table somebody can edit. Changing the
 * capital or the risk redraws every point on the curve behind it, so it is a
 * change that should arrive as a commit with a diff on it rather than as an
 * update nobody can see afterwards.
 */
export const DEMO_BOOK = Object.freeze({
  /** What the book opened with. */
  startingEquity: 50_000,
  /** Share of the standing balance risked per trade, as a fraction. */
  riskPerTrade: RISK_RULES.maxRiskPerTradePct / 100,
})

/** Statuses the tape has answered with a fill and an outcome. */
const TRADED = new Set(['target', 'stop'])

/**
 * A call that expired never became a trade, so it never cost or paid anything
 * and it does not belong on the curve. It is still counted, because a desk that
 * publishes ten calls and fills two is describing something a reader should be
 * able to see.
 */
const isTraded = (signal) => TRADED.has(signal.status)

/**
 * Walks the settled record and returns the book.
 *
 * Ordering is by when the tape answered, not by when the call was published,
 * because that is the order the balance actually moved in. Two calls published
 * an hour apart can settle in either order and the compounding follows the
 * settlement.
 *
 * @param {object[]} signals - the record, in any order
 * @param {object} [config] - {@link DEMO_BOOK}
 * @returns {object} the book: balance, curve, closed trades, open risk and stats
 */
export function buildDemoBook(signals, config = DEMO_BOOK) {
  const { startingEquity, riskPerTrade } = config
  const settled = (signals ?? [])
    .filter(isTraded)
    .filter((signal) => signal.resolvedAt != null)
    .sort((a, b) => a.resolvedAt - b.resolvedAt)

  let equity = startingEquity
  let peak = startingEquity
  let maxDrawdown = 0
  let maxDrawdownPct = 0
  const closed = []

  for (const signal of settled) {
    // The risk is taken against the balance standing when the trade opened,
    // which for a book that only books settled trades is the balance before
    // this one resolved. Sizing off the balance after it would let a trade pay
    // for itself.
    const risk = equity * riskPerTrade
    const realisedR = signal.realisedR ?? 0
    const pnl = risk * realisedR
    equity += pnl
    peak = Math.max(peak, equity)
    const drawdown = peak - equity
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown
      maxDrawdownPct = peak > 0 ? (drawdown / peak) * 100 : 0
    }
    closed.push({
      ...signal,
      risk,
      pnl,
      equityAfter: equity,
    })
  }

  // Positions the tape has filled and not yet answered. They are shown with the
  // risk they are carrying rather than with a running profit: the record holds
  // no live price, and a book that marks its open trades to a number it did not
  // read would be reporting a balance nobody could check.
  const open = (signals ?? [])
    .filter((signal) => signal.status === 'filled')
    .sort((a, b) => (b.filledAt ?? 0) - (a.filledAt ?? 0))
    .map((signal) => ({ ...signal, risk: equity * riskPerTrade }))

  const wins = closed.filter((trade) => (trade.realisedR ?? 0) > 0)
  const losses = closed.filter((trade) => (trade.realisedR ?? 0) < 0)
  const grossWin = wins.reduce((sum, trade) => sum + trade.pnl, 0)
  const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + trade.pnl, 0))
  const totalR = closed.reduce((sum, trade) => sum + (trade.realisedR ?? 0), 0)

  return {
    startingEquity,
    riskPerTrade,
    equity,
    closed,
    open,
    curve: curveFrom(closed, startingEquity),
    stats: {
      trades: closed.length,
      wins: wins.length,
      losses: losses.length,
      winRate: closed.length ? wins.length / closed.length : null,
      totalR,
      averageR: closed.length ? totalR / closed.length : null,
      netPnl: equity - startingEquity,
      returnPct: startingEquity > 0 ? ((equity - startingEquity) / startingEquity) * 100 : 0,
      profitFactor: grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : null,
      maxDrawdown,
      maxDrawdownPct,
      peak,
      // Published and expired come off the whole record rather than the closed
      // set, because the share of calls the tape never filled is part of what
      // the record says about itself.
      published: (signals ?? []).length,
      expired: (signals ?? []).filter((signal) => signal.status === 'expired').length,
      openCount: open.length,
    },
  }
}

/**
 * The curve, one point per CT day the book moved, opening on the starting
 * balance.
 *
 * The opening point carries no date because there is no day on which the book
 * was worth its starting balance and nothing else had happened - it is where
 * the line begins rather than a day that was traded. It is labelled as the
 * open so a reader hovering the first point is not told a date that means
 * nothing.
 *
 * @param {object[]} closed - closed trades, oldest first
 * @param {number} startingEquity
 * @returns {Array<{date:string, equity:number}>}
 */
function curveFrom(closed, startingEquity) {
  const byDay = new Map()
  for (const trade of closed) {
    byDay.set(ctDateKey(trade.resolvedAt), trade.equityAfter)
  }
  return [
    { date: 'Open', equity: startingEquity },
    ...[...byDay.entries()].map(([date, equity]) => ({ date, equity: +equity.toFixed(2) })),
  ]
}
