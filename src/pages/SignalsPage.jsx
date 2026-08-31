import { useMemo, useState } from 'react'
import { Bell, BellOff, RefreshCw } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Table from '../components/ui/Table'
import Badge from '../components/ui/Badge'
import { Figure, FigureRow } from '../components/ui/Figures'
import SegmentedTabs from '../components/ui/SegmentedTabs'
import MarketingButton from '../components/marketing/MarketingButton'
import TradeCallCard from '../components/ui/TradeCallCard'
import { Skeleton, SkeletonRegion } from '../components/ui/Skeleton'
import { useSignals } from '../context/SignalsContext'
import { PUBLISHED_INSTRUMENTS } from '../lib/signals/engine.js'
import { SETTLED } from '../lib/signals/model.js'
import { requestNotificationAccess } from '../lib/alerts/notify.js'
import { INSTRUMENT_META, decimalsForInstrument } from '../data/instruments'
import { formatInstrumentPrice, formatR, NO_VALUE } from '../lib/format'
import { formatCt } from '../lib/time'
import { cn } from '../lib/cn'

const HISTORY_TABS = ['All', 'Hit', 'Stopped', 'Expired']

const OUTCOME = {
  live: { label: 'Live', variant: 'warning' },
  filled: { label: 'In Trade', variant: 'buy' },
  target: { label: 'Target', variant: 'positive' },
  stop: { label: 'Stopped', variant: 'danger' },
  expired: { label: 'Expired', variant: 'neutral' },
}

/**
 * The alert switch. The browser's permission prompt is bound to this click, so
 * a reader who never asks for alerts never meets it.
 */
function AlertToggle() {
  const { preferences, permission, setNotifications } = useSignals()
  const [pending, setPending] = useState(false)
  const on = preferences.notifications && permission === 'granted'

  const toggle = async () => {
    if (on) {
      setNotifications(false)
      return
    }
    setPending(true)
    const state = await requestNotificationAccess()
    setNotifications(state === 'granted', state)
    setPending(false)
  }

  if (permission === 'unsupported') {
    return <span className="text-xs text-text-faint">This browser sends no notifications.</span>
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <MarketingButton type="button" size="sm" variant="secondary" onClick={toggle}>
        {on ? (
          <BellOff className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Bell className="h-4 w-4" aria-hidden="true" />
        )}
        {on ? 'Turn Alerts Off' : 'Turn Alerts On'}
      </MarketingButton>
      <span className="text-xs text-text-faint">
        {pending
          ? 'Waiting on the browser…'
          : permission === 'denied'
            ? 'Notifications are blocked for this site in your browser settings.'
            : on
              ? 'A new call reaches you outside this tab.'
              : 'Alerts are off — calls appear here only.'}
      </span>
    </div>
  )
}

export default function SignalsPage() {
  const { signals, reads, stats, sweeping, lastSweep, refresh } = useSignals()
  const [tab, setTab] = useState('All')

  const standing = useMemo(
    () =>
      signals
        .filter((signal) => !SETTLED.has(signal.status))
        .sort((a, b) => b.emittedAt - a.emittedAt),
    [signals]
  )

  const history = useMemo(() => {
    const settled = signals
      .filter((signal) => SETTLED.has(signal.status))
      .sort((a, b) => b.emittedAt - a.emittedAt)
    if (tab === 'Hit') return settled.filter((signal) => signal.status === 'target')
    if (tab === 'Stopped') return settled.filter((signal) => signal.status === 'stop')
    if (tab === 'Expired') return settled.filter((signal) => signal.status === 'expired')
    return settled
  }, [signals, tab])

  const priceCell = (key, align = 'right') => ({
    key,
    header: key[0].toUpperCase() + key.slice(1),
    align,
    render: (row) => (
      <span className="font-mono tabular-nums text-text-muted">
        {formatInstrumentPrice(row[key], row.symbol, decimalsForInstrument(row.symbol))}
      </span>
    ),
  })

  const columns = [
    {
      key: 'emittedAt',
      header: 'Published',
      render: (row) => (
        <span className="whitespace-nowrap font-mono text-xs text-text-muted">
          {formatCt(row.emittedAt)}
        </span>
      ),
    },
    {
      key: 'symbol',
      header: 'Instrument',
      render: (row) => (
        <span className="font-mono font-medium text-text">
          {INSTRUMENT_META[row.symbol]?.displaySymbol ?? row.symbol}
        </span>
      ),
    },
    { key: 'side', header: 'Side', render: (row) => <Badge>{row.side}</Badge> },
    {
      key: 'setup',
      header: 'Setup',
      render: (row) => (
        <span className="text-text-muted">
          {row.setup} · {row.grade}
        </span>
      ),
    },
    priceCell('entry'),
    priceCell('stop'),
    priceCell('target'),
    {
      key: 'status',
      header: 'Outcome',
      align: 'center',
      render: (row) => (
        <Badge variant={OUTCOME[row.status].variant}>{OUTCOME[row.status].label}</Badge>
      ),
    },
    {
      key: 'realisedR',
      header: 'R',
      align: 'right',
      render: (row) => (
        <span
          className={cn(
            'font-mono tabular-nums',
            row.realisedR == null
              ? 'text-text-faint'
              : row.realisedR > 0
                ? 'text-positive'
                : 'text-danger'
          )}
        >
          {row.realisedR == null ? NO_VALUE : formatR(row.realisedR)}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Signals"
        subtitle="Every call the desk publishes, scored against the tape that followed it."
        action={
          <MarketingButton type="button" size="sm" variant="secondary" onClick={refresh}>
            <RefreshCw className={cn('h-4 w-4', sweeping && 'animate-spin')} aria-hidden="true" />
            Refresh
          </MarketingButton>
        }
      />

      {/* The record, as one strip. Four boxed tiles say the same thing and
          leave four borders between figures that belong on one line. */}
      <FigureRow min="10rem">
        <Figure label="Published" value={stats.published} note={`${stats.expired} expired`} />
        <Figure
          label="Hit rate"
          value={stats.hitRate == null ? NO_VALUE : `${(stats.hitRate * 100).toFixed(0)}%`}
          note={`${stats.wins} won, ${stats.losses} lost`}
          tone={
            stats.hitRate == null
              ? undefined
              : stats.hitRate >= 0.5
                ? 'text-positive'
                : 'text-danger'
          }
        />
        <Figure
          label="Total R"
          value={stats.triggered ? formatR(stats.totalR) : NO_VALUE}
          note={`${stats.triggered} of ${stats.published} reached entry`}
          tone={stats.totalR >= 0 ? 'text-positive' : 'text-danger'}
        />
        <Figure
          label="Standing"
          value={stats.live + stats.open}
          note={lastSweep ? `Swept ${formatCt(lastSweep)}` : 'Not swept yet'}
        />
      </FigureRow>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="panel-static overflow-hidden">
          <header className="flex items-center gap-3 border-b border-border px-4 py-2.5">
            <h2 className="font-mono text-[10px] uppercase tracking-label text-text-faint">
              Standing Calls
            </h2>
            <div className="min-w-2 flex-1" />
            <span className="text-[11px] text-text-faint">{standing.length} standing</span>
          </header>
          <div className="p-4">
            {sweeping && standing.length === 0 ? (
              <SkeletonRegion label="Reading structure across the desk" className="space-y-3">
                <Skeleton className="h-28 rounded-card" />
                <Skeleton className="h-28 rounded-card" />
              </SkeletonRegion>
            ) : (
              <div className="grid gap-4 2xl:grid-cols-2">
                {PUBLISHED_INSTRUMENTS.map((meta) => {
                  const read = reads[meta.symbol]
                  return (
                    <TradeCallCard
                      key={meta.symbol}
                      symbol={meta.symbol}
                      call={read?.call ?? null}
                      standDown={
                        read?.standDown ?? 'No structure read yet. The feed has not answered.'
                      }
                      timeframe={meta.primaryTimeframe}
                    />
                  )
                })}
              </div>
            )}
          </div>
        </section>

        <section className="panel-static h-fit overflow-hidden">
          <header className="border-b border-border px-4 py-2.5">
            <h2 className="font-mono text-[10px] uppercase tracking-label text-text-faint">
              Alerts
            </h2>
          </header>
          <div className="p-4">
            <AlertToggle />
          </div>
        </section>
      </div>

      {/* The tabs sit on the table they filter rather than floating above the
          page, so what they act on is not a matter of inference. */}
      <section className="panel-static overflow-hidden">
        <header className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-2.5">
          <h2 className="font-mono text-[10px] uppercase tracking-label text-text-faint">
            Settled Record
          </h2>
          <div className="min-w-2 flex-1" />
          <SegmentedTabs
            options={HISTORY_TABS}
            value={tab}
            onChange={setTab}
            ariaLabel="Signal outcome"
          />
        </header>
        <Table
          columns={columns}
          rows={history}
          rowKey={(row) => row.id}
          animate={false}
          caption="Settled signals"
          empty="No settled signals yet. The record fills as calls resolve."
        />
      </section>
    </div>
  )
}
