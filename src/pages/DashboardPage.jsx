import { Wallet, TrendingUp, Layers, Gauge, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { PageContainer, PageSection } from '../components/layout/PageContainer'
import Card from '../components/ui/Card'
import KpiCard from '../components/ui/KpiCard'
import PriceChart from '../components/ui/PriceChart'
import Badge from '../components/ui/Badge'
import { account, currencyPairs, openPositions, tradeHistory } from '../data/mockData'
import { cn } from '../lib/cn'
import { formatCurrency, formatPercent, signedColor } from '../lib/format'

const watchlist = currencyPairs.slice(0, 4)
const summaryPositions = openPositions.slice(0, 3)
const recentTrades = tradeHistory.slice(0, 3)

/** Single row in the dashboard market-watch mini table. */
function MarketWatchRow({ pair, bid, ask, changePct }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-md px-2.5 py-2 transition-colors hover:bg-surface-2">
      <span className="font-mono text-sm font-medium text-text">{pair}</span>
      <div className="flex items-center gap-4 font-mono text-xs tabular-nums">
        <span className="text-text-muted">{bid.toFixed(pair.includes('JPY') ? 3 : 5)}</span>
        <span className="text-text-faint">{ask.toFixed(pair.includes('JPY') ? 3 : 5)}</span>
        <span className={cn('w-14 text-right font-medium', signedColor(changePct))}>
          {formatPercent(changePct)}
        </span>
      </div>
    </li>
  )
}

export default function DashboardPage() {
  return (
    <PageContainer>
      <PageSection>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Account Balance"
            value={formatCurrency(account.balance)}
            changePct={account.weekPnlPct}
            changeLabel="this week"
            icon={Wallet}
            active
          />
          <KpiCard
            label="Today's P&L"
            value={formatCurrency(account.todayPnl, { signed: true })}
            changePct={account.todayPnlPct}
            icon={TrendingUp}
            valueClassName={signedColor(account.todayPnl)}
          />
          <KpiCard
            label="Open Positions"
            value={account.openPositions}
            changeLabel="across 4 pairs"
            icon={Layers}
          />
          <KpiCard
            label="Margin Level"
            value={`${account.marginLevel.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`}
            changeLabel="healthy"
            icon={Gauge}
            valueClassName="text-positive"
          />
        </div>
      </PageSection>

      <PageSection>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card title="EUR/USD" className="xl:col-span-2" action={<span className="text-xs text-text-faint">48h · Spot</span>}>
            <PriceChart pair="EUR/USD" baseValue={1.08423} changePct={0.31} />
          </Card>

          <Card title="Market Watch" action={<span className="text-xs text-text-faint">Bid / Ask / Chg</span>}>
            <ul className="space-y-0.5">
              {watchlist.map((entry) => (
                <MarketWatchRow key={entry.pair} {...entry} />
              ))}
            </ul>
          </Card>
        </div>
      </PageSection>

      <PageSection>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Open Positions" action={<span className="text-xs text-text-faint">Top 3</span>}>
            <ul className="space-y-2">
              {summaryPositions.map((position) => (
                <li
                  key={position.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={position.type === 'BUY' ? 'buy' : 'sell'}>{position.type}</Badge>
                    <div className="leading-tight">
                      <p className="font-mono text-sm font-medium text-text">{position.pair}</p>
                      <p className="font-mono text-xs text-text-faint">{position.lots.toFixed(2)} lots</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn('font-mono text-sm font-semibold tabular-nums', signedColor(position.pnl))}>
                      {formatCurrency(position.pnl, { signed: true })}
                    </p>
                    <p className={cn('font-mono text-xs tabular-nums', signedColor(position.pips))}>
                      {position.pips > 0 ? '+' : ''}
                      {position.pips.toFixed(1)} pips
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Recent Activity" action={<span className="text-xs text-text-faint">Closed</span>}>
            <ul className="space-y-2">
              {recentTrades.map((trade) => {
                const Icon = trade.pnl >= 0 ? ArrowUpRight : ArrowDownRight
                return (
                  <li
                    key={trade.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-md',
                          trade.pnl >= 0 ? 'bg-[var(--ds-positive-soft)] text-positive' : 'bg-[var(--ds-danger-soft)] text-danger',
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="leading-tight">
                        <p className="font-mono text-sm font-medium text-text">{trade.pair}</p>
                        <p className="font-mono text-xs text-text-faint">
                          {trade.type} · {trade.closeTime.slice(5)}
                        </p>
                      </div>
                    </div>
                    <p className={cn('font-mono text-sm font-semibold tabular-nums', signedColor(trade.pnl))}>
                      {formatCurrency(trade.pnl, { signed: true })}
                    </p>
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
