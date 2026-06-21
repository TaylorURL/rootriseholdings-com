import { Wallet, Coins, TrendingUp, Layers, Sparkles, ShieldCheck } from 'lucide-react'
import { PageContainer, PageSection } from '../components/layout/PageContainer'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import KpiCard from '../components/ui/KpiCard'
import Badge from '../components/ui/Badge'
import Sparkline from '../components/ui/Sparkline'
import EquityCurveChart from '../components/ui/EquityCurveChart'
import ChartInView from '../components/charts/ChartInView'
import DailyBriefing from '../components/ui/DailyBriefing'
import {
  account,
  openPositions,
  tradeHistory,
  performance,
  generateEquityCurve,
  generateSparkline,
} from '../data/mockData'
import {
  RISK_RULES,
  evaluateRuleStatus,
  expectancyInR,
} from '../data/riskRules'
import { TRADED_INSTRUMENTS, INSTRUMENT_META, useInstrumentQuotes } from '../data/instruments'
import { cn } from '../lib/cn'
import {
  formatCurrency,
  formatInstrumentPrice,
  formatPercent,
  formatR,
  signedColor,
} from '../lib/format'

const equityCurve = generateEquityCurve()
const recentTrades = tradeHistory.slice(0, 5)
const TRADED_SYMBOLS = TRADED_INSTRUMENTS.map((entry) => entry.symbol)

/** Deterministic 10-point sparkline per traded instrument for the pulse strip. */
const PULSE_SPARKLINES = TRADED_INSTRUMENTS.reduce((accumulator, entry, index) => {
  accumulator[entry.symbol] = generateSparkline(entry.seed, 10, 0.005, index + 11)
  return accumulator
}, {})

/** Closed-trade R-stats power the headline performance row. */
const R_STATS = expectancyInR(tradeHistory)

const todayClosedTrades = tradeHistory.filter((trade) => trade.closeTime.startsWith('2026-06-14'))
const aPlusToday = openPositions.filter((entry) => entry.isAPlus).length
const ruleStatus = evaluateRuleStatus({
  todayTrades: todayClosedTrades,
  equity: account.equity,
  aPlusToday,
})
const totalRiskOnBook = openPositions.reduce((sum, position) => sum + position.riskPct, 0)

/** Card showing one headline performance metric for the summary row. */
function PerformanceSummaryCard({ label, children }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2/40 p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-text-faint">{label}</p>
      {children}
    </div>
  )
}

/** Single instrument tile in the traded-instrument pulse strip. */
function InstrumentPulseTile({ quote }) {
  const meta = INSTRUMENT_META[quote.symbol]
  return (
    <div className="flex w-48 shrink-0 flex-col gap-2 rounded-lg border border-border bg-surface-2/40 p-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm font-semibold text-text">{quote.displaySymbol}</span>
        <span className={cn('font-mono text-xs font-medium tabular-nums', signedColor(quote.changePct))}>
          {formatPercent(quote.changePct)}
        </span>
      </div>
      <span className="font-mono text-lg font-semibold tabular-nums text-text">
        {formatInstrumentPrice(quote.bid, quote.symbol)}
      </span>
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide">
        <span className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-text-muted">
          {meta?.primaryTimeframe ?? quote.primaryTimeframe}
        </span>
        {quote.sideConstraint && (
          <span className="rounded bg-[var(--ds-danger-soft)] px-1.5 py-0.5 text-danger">
            {quote.sideConstraint} only
          </span>
        )}
      </div>
      <div className="h-8">
        <Sparkline data={PULSE_SPARKLINES[quote.symbol]} positive={quote.changePct >= 0} height={32} />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { quotes } = useInstrumentQuotes(TRADED_SYMBOLS)

  return (
    <PageContainer>
      <PageSection>
        <PageHeader
          title="Dashboard"
          subtitle="Good morning, Trenton · Sunday, 14 June 2026"
        />
      </PageSection>

      <PageSection>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          <KpiCard
            label="Balance"
            value={formatCurrency(account.balance)}
            changePct={account.monthPnlPct}
            changeLabel="30d"
            icon={Wallet}
            active
          />
          <KpiCard
            label="Equity"
            value={formatCurrency(account.equity)}
            changePct={account.todayPnlPct}
            changeLabel="today"
            icon={Coins}
          />
          <KpiCard
            label="Today P&L"
            value={formatCurrency(account.todayPnl, { signed: true })}
            changePct={account.todayPnlPct}
            icon={TrendingUp}
            valueClassName={signedColor(account.todayPnl)}
          />
          <KpiCard
            label="Open Positions"
            value={openPositions.length}
            changeLabel={`${totalRiskOnBook.toFixed(1)}% risk on book`}
            icon={Layers}
          />
          <KpiCard
            label="A+ Today"
            value={`${aPlusToday}/${RISK_RULES.maxAPlusSetupsPerDay}`}
            changeLabel={ruleStatus.aPlusCapHit ? 'Cap reached' : `${ruleStatus.aPlusRemaining} slot left`}
            icon={Sparkles}
          />
          <KpiCard
            label="Daily Loss Budget"
            value={`${ruleStatus.dailyLossPctRemaining.toFixed(2)}%`}
            changeLabel={`Limit ${RISK_RULES.dailyLossLimitPct}%`}
            icon={ShieldCheck}
            valueClassName={ruleStatus.dailyLossLimitHit ? 'text-danger' : 'text-text'}
          />
        </div>
      </PageSection>

      <PageSection>
        <DailyBriefing variant="compact" />
      </PageSection>

      <PageSection>
        <Card
          title="Equity Curve"
          action={<span className="text-xs text-text-faint">Last 30 days · Balance growth</span>}
        >
          <ChartInView height={300}>
            {() => <EquityCurveChart data={equityCurve} height={300} xTickInterval={4} />}
          </ChartInView>
        </Card>
      </PageSection>

      <PageSection>
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          <PerformanceSummaryCard label="Win Rate">
            <div className="mt-3 flex items-baseline justify-between">
              <span className="font-mono text-2xl font-semibold tabular-nums text-text">
                {Math.round(R_STATS.winRate * 100)}%
              </span>
              <span className="text-xs text-text-faint">closed</span>
            </div>
            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2"
              role="meter"
              aria-valuenow={Math.round(R_STATS.winRate * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Win rate"
            >
              <div className="h-full rounded-full bg-[var(--ds-accent-face)]" style={{ width: `${R_STATS.winRate * 100}%` }} />
            </div>
          </PerformanceSummaryCard>

          <PerformanceSummaryCard label="Expectancy">
            <p className={cn('mt-3 font-mono text-2xl font-semibold tabular-nums', signedColor(R_STATS.expectancy))}>
              {formatR(R_STATS.expectancy)}
            </p>
            <p className="mt-3 text-xs text-text-faint">Per trade · (win% × avgWin) − (loss% × avgLoss)</p>
          </PerformanceSummaryCard>

          <PerformanceSummaryCard label="Avg R Multiple">
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-semibold tabular-nums text-positive">{formatR(R_STATS.avgWin)}</span>
              <span className="font-mono text-sm tabular-nums text-danger">/ −{R_STATS.avgLoss.toFixed(1)}R</span>
            </div>
            <p className="mt-3 text-xs text-text-faint">Avg winner vs. avg loser</p>
          </PerformanceSummaryCard>

          <PerformanceSummaryCard label="Profit Factor">
            <p className="mt-3 font-mono text-2xl font-semibold tabular-nums text-positive">
              {performance.profitFactor.toFixed(2)}
            </p>
            <p className="mt-3 text-xs text-text-faint">Across {performance.totalTrades} trades</p>
          </PerformanceSummaryCard>
        </div>
      </PageSection>

      <PageSection>
        <Card
          title="Instrument Pulse"
          action={<span className="text-xs text-text-faint">Traded set · live structure</span>}
          padded={false}
        >
          <div className="ds-scroll flex gap-3 overflow-x-auto p-5">
            {quotes.map((quote) => (
              <InstrumentPulseTile key={quote.symbol} quote={quote} />
            ))}
          </div>
        </Card>
      </PageSection>

      <PageSection>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card
            title="Open Positions"
            action={
              <a href="/app/positions" className="text-xs font-medium text-accent-bright transition-colors hover:text-accent">
                View all →
              </a>
            }
            padded={false}
          >
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['Instrument', 'Side', 'Setup', 'Entry', 'Current', 'P&L'].map((header, index) => (
                    <th
                      key={header}
                      className={cn(
                        'px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-text-faint',
                        index > 2 ? 'text-right' : 'text-left',
                      )}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {openPositions.map((position) => {
                  const meta = INSTRUMENT_META[position.symbol]
                  return (
                    <tr key={position.id} className="border-b border-border/60 last:border-b-0 hover:bg-surface-2">
                      <td className="px-4 py-2.5 font-mono font-medium text-text">
                        {meta?.displaySymbol ?? position.symbol}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={position.type === 'BUY' ? 'buy' : 'sell'}>{position.type}</Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="font-mono text-xs uppercase tracking-wide text-text-muted">{position.setup}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums text-text-muted">
                        {formatInstrumentPrice(position.entryPrice, position.symbol)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums text-text">
                        {formatInstrumentPrice(position.currentPrice, position.symbol)}
                      </td>
                      <td className={cn('px-4 py-2.5 text-right font-mono font-semibold tabular-nums', signedColor(position.pnl))}>
                        {formatCurrency(position.pnl, { signed: true })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Card>

          <Card title="Recent Trades" action={<span className="text-xs text-text-faint">Last 5 closed</span>}>
            <ul className="space-y-2">
              {recentTrades.map((trade) => {
                const meta = INSTRUMENT_META[trade.symbol]
                return (
                  <li
                    key={trade.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant={trade.type === 'BUY' ? 'buy' : 'sell'}>{trade.type}</Badge>
                      <span className="font-mono text-sm font-medium text-text">{meta?.displaySymbol ?? trade.symbol}</span>
                      <span className="font-mono text-[11px] uppercase tracking-wide text-text-faint">{trade.setup}</span>
                    </div>
                    <div className="flex items-center gap-5">
                      <span className={cn('font-mono text-xs tabular-nums', signedColor(trade.realisedR))}>
                        {formatR(trade.realisedR)}
                      </span>
                      <span className={cn('w-20 text-right font-mono text-sm font-semibold tabular-nums', signedColor(trade.pnl))}>
                        {formatCurrency(trade.pnl, { signed: true })}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </Card>
        </div>
      </PageSection>
    </PageContainer>
  )
}
