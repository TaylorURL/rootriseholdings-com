import { Wallet, Coins, Landmark, TrendingUp, CalendarRange, CalendarDays } from 'lucide-react'
import { PageContainer, PageSection } from '../components/layout/PageContainer'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import KpiCard from '../components/ui/KpiCard'
import Badge from '../components/ui/Badge'
import Sparkline from '../components/ui/Sparkline'
import EquityCurveChart from '../components/ui/EquityCurveChart'
import {
  account,
  currencyPairs,
  openPositions,
  tradeHistory,
  performance,
  generateEquityCurve,
  generateSparkline,
} from '../data/mockData'
import { cn } from '../lib/cn'
import { formatCurrency, formatPercent, formatPips, formatPrice, signedColor } from '../lib/format'

const equityCurve = generateEquityCurve()
const majorPairs = currencyPairs.filter((entry) => entry.category === 'Majors')
const recentTrades = tradeHistory.slice(0, 4)

/** Deterministic 10-point sparkline per major pair for the market pulse strip. */
const PULSE_SPARKLINES = majorPairs.reduce((accumulator, pair, index) => {
  accumulator[pair.pair] = generateSparkline(pair.bid, 10, 0.005, index + 11)
  return accumulator
}, {})

/** Card showing one headline performance metric for the summary row. */
function PerformanceSummaryCard({ label, children }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2/40 p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-text-faint">{label}</p>
      {children}
    </div>
  )
}

export default function DashboardPage() {
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
            label="Free Margin"
            value={formatCurrency(account.freeMargin)}
            changePct={+1.84}
            changeLabel="available"
            icon={Landmark}
          />
          <KpiCard
            label="Today P&L"
            value={formatCurrency(account.todayPnl, { signed: true })}
            changePct={account.todayPnlPct}
            icon={TrendingUp}
            valueClassName={signedColor(account.todayPnl)}
          />
          <KpiCard
            label="Week P&L"
            value={formatCurrency(account.weekPnl, { signed: true })}
            changePct={account.weekPnlPct}
            icon={CalendarRange}
            valueClassName={signedColor(account.weekPnl)}
          />
          <KpiCard
            label="Month P&L"
            value={formatCurrency(account.monthPnl, { signed: true })}
            changePct={account.monthPnlPct}
            icon={CalendarDays}
            valueClassName={signedColor(account.monthPnl)}
          />
        </div>
      </PageSection>

      <PageSection>
        <Card
          title="Equity Curve"
          action={<span className="text-xs text-text-faint">Last 30 days · Balance growth</span>}
        >
          <EquityCurveChart data={equityCurve} height={300} xTickInterval={4} />
        </Card>
      </PageSection>

      <PageSection>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <PerformanceSummaryCard label="Win Rate">
            <div className="mt-3 flex items-baseline justify-between">
              <span className="font-mono text-2xl font-semibold tabular-nums text-text">{performance.winRate}%</span>
              <span className="text-xs text-text-faint">last 30d</span>
            </div>
            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2"
              role="meter"
              aria-valuenow={performance.winRate}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Win rate"
            >
              <div className="h-full rounded-full bg-[var(--ds-accent-face)]" style={{ width: `${performance.winRate}%` }} />
            </div>
          </PerformanceSummaryCard>

          <PerformanceSummaryCard label="Profit Factor">
            <p className="mt-3 font-mono text-2xl font-semibold tabular-nums text-positive">
              {performance.profitFactor.toFixed(2)}
            </p>
            <p className="mt-3 text-xs text-text-faint">Gross profit / gross loss</p>
          </PerformanceSummaryCard>

          <PerformanceSummaryCard label="Avg Trade Duration">
            <p className="mt-3 font-mono text-2xl font-semibold tabular-nums text-text">{performance.avgTradeDuration}</p>
            <p className="mt-3 text-xs text-text-faint">Across {performance.totalTrades} trades</p>
          </PerformanceSummaryCard>
        </div>
      </PageSection>

      <PageSection>
        <Card title="Market Pulse" action={<span className="text-xs text-text-faint">6 major pairs</span>} padded={false}>
          <div className="ds-scroll flex gap-3 overflow-x-auto p-5">
            {majorPairs.map((entry) => (
              <div
                key={entry.pair}
                className="flex w-44 shrink-0 flex-col gap-2 rounded-lg border border-border bg-surface-2/40 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-semibold text-text">{entry.pair}</span>
                  <span className={cn('font-mono text-xs font-medium tabular-nums', signedColor(entry.changePct))}>
                    {formatPercent(entry.changePct)}
                  </span>
                </div>
                <span className="font-mono text-lg font-semibold tabular-nums text-text">
                  {formatPrice(entry.bid, entry.pair)}
                </span>
                <div className="h-8">
                  <Sparkline data={PULSE_SPARKLINES[entry.pair]} positive={entry.changePct >= 0} height={32} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </PageSection>

      <PageSection>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card
            title="Open Positions"
            action={
              <button type="button" className="text-xs font-medium text-accent-bright transition-colors hover:text-accent">
                View all →
              </button>
            }
            padded={false}
          >
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['Pair', 'Type', 'Lots', 'Entry', 'Current', 'P&L'].map((header, index) => (
                    <th
                      key={header}
                      className={cn(
                        'px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-text-faint',
                        index > 1 ? 'text-right' : 'text-left',
                      )}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {openPositions.map((position) => (
                  <tr key={position.id} className="border-b border-border/60 last:border-b-0 hover:bg-surface-2">
                    <td className="px-4 py-2.5 font-mono font-medium text-text">{position.pair}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant={position.type === 'BUY' ? 'buy' : 'sell'}>{position.type}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-text-muted">{position.lots.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-text-muted">
                      {formatPrice(position.entryPrice, position.pair)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-text">
                      {formatPrice(position.currentPrice, position.pair)}
                    </td>
                    <td className={cn('px-4 py-2.5 text-right font-mono font-semibold tabular-nums', signedColor(position.pnl))}>
                      {formatCurrency(position.pnl, { signed: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card title="Recent Trades" action={<span className="text-xs text-text-faint">Last 4 closed</span>}>
            <ul className="space-y-2">
              {recentTrades.map((trade) => (
                <li
                  key={trade.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={trade.type === 'BUY' ? 'buy' : 'sell'}>{trade.type}</Badge>
                    <span className="font-mono text-sm font-medium text-text">{trade.pair}</span>
                  </div>
                  <div className="flex items-center gap-5">
                    <span className={cn('font-mono text-xs tabular-nums', signedColor(trade.pips))}>
                      {formatPips(trade.pips)} pips
                    </span>
                    <span className={cn('w-20 text-right font-mono text-sm font-semibold tabular-nums', signedColor(trade.pnl))}>
                      {formatCurrency(trade.pnl, { signed: true })}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </PageSection>
    </PageContainer>
  )
}
