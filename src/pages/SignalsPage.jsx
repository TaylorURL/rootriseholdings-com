import { useMemo, useState } from 'react'
import { Bell, BellOff, RefreshCw } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Table from '../components/ui/Table'
import Badge, { SideBadge } from '../components/ui/Badge'
import { Figure, FigureRow, RuleLabel } from '../components/ui/Figures'
import SegmentedTabs from '../components/ui/SegmentedTabs'
import MarketingButton from '../components/marketing/MarketingButton'
import TradeCallCard from '../components/signals/TradeCallCard'
import StandingCalls from '../components/signals/StandingCalls'
import { Skeleton, SkeletonRegion } from '../components/ui/Skeleton'
import { useSignals } from '../context/SignalsContext'
import { PUBLISHED_INSTRUMENTS } from '../lib/signals/engine.js'
import { SETTLED } from '../lib/signals/model.js'
import { requestNotificationAccess } from '../lib/alerts/notify.js'
import { INSTRUMENT_META, decimalsForInstrument } from '../data/instruments'
import { SETUP_NAMES } from '../data/riskRules'
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
          ? 'Waiting on the browser.'
          : permission === 'denied'
            ? 'Notifications are blocked for this site in your browser settings.'
            : on
              ? 'A new call reaches you outside this tab.'
              : 'Alerts are off in this browser. Calls appear on this page.'}
      </span>
    </div>
  )
}

export default function SignalsPage() {
  const { signals, recordError, deskSweep, reads, unread, stats, sweeping, lastSweep, refresh } =
    useSignals()
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
    numeric: true,
    render: (row) => (
      <span className="tabular-nums text-text-muted">
        {formatInstrumentPrice(row[key], row.symbol, decimalsForInstrument(row.symbol))}
      </span>
    ),
  })

  const columns = [
    {
      key: 'emittedAt',
      header: 'Published',
      numeric: true,
      render: (row) => (
        <span className="whitespace-nowrap text-xs tabular-nums text-text-muted">
          {formatCt(row.emittedAt)}
        </span>
      ),
    },
    {
      key: 'symbol',
      header: 'Instrument',
      render: (row) => (
        <span className="font-medium tabular-nums text-text">
          {INSTRUMENT_META[row.symbol]?.displaySymbol ?? row.symbol}
        </span>
      ),
    },
    { key: 'side', header: 'Side', render: (row) => <SideBadge side={row.side} /> },
    {
      key: 'setup',
      header: 'Setup',
      render: (row) => (
        <span className="text-text-muted" title={SETUP_NAMES[row.setup]}>
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
      header: <span title="Booked in units of the risk taken">R</span>,
      align: 'right',
      numeric: true,
      render: (row) => (
        <span
          className={cn(
            'tabular-nums',
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
    <div className="space-y-6">
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

      {/* An unreachable record is said out loud rather than drawn as an empty
          one. A desk showing no calls because it cannot read the record looks
          exactly like a desk showing no calls because there were none, and the
          reader has no way to tell them apart unless it says so. */}
      {recordError ? (
        <div
          role="status"
          className="border-danger/40 bg-danger/5 rounded-lg border px-4 py-3 text-sm text-text"
        >
          <span className="font-medium">The published record is unreachable.</span>{' '}
          <span className="text-text-muted">
            Nothing below is the desk&rsquo;s history. It is what this page could load, which is
            nothing. {recordError}
          </span>
        </div>
      ) : null}

      {/* The record, as one strip. Four boxed tiles say the same thing and
          leave four borders between figures that belong on one line. */}
      <FigureRow min="10rem">
        <Figure label="Published" value={stats.published} note={`${stats.expired} expired`} />
        <Figure
          label="Hit Rate"
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
          title="Net result in units of the risk taken, across every call that reached entry"
          value={stats.triggered ? formatR(stats.totalR) : NO_VALUE}
          note={`${stats.triggered} of ${stats.published} reached entry`}
          tone={stats.totalR >= 0 ? 'text-positive' : 'text-danger'}
        />
        <Figure
          label="Standing"
          value={stats.live + stats.open}
          note={lastSweep ? `Read ${formatCt(lastSweep)}` : 'Not read yet'}
        />
      </FigureRow>

      {/* The three panels are placed rather than nested, so one column reads in
          the order the questions are asked - what is standing, whether it can
          reach me, what the desk is looking at - while two columns keep the
          switch in the rail beside the calls it acts on. */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        {/* What the record says is open: the calls a reader could be in, or
            could still take. These are the host's, published and scored on its
            clock, and the same on every device. */}
        <StandingCalls
          signals={standing}
          sweep={deskSweep}
          recordError={recordError}
          className="xl:col-start-1 xl:row-start-1"
        />

        <section className="panel-static h-fit overflow-hidden xl:col-start-2 xl:row-start-1">
          <header className="px-5 pb-2 pt-5">
            <RuleLabel as="h2">Alerts</RuleLabel>
          </header>
          <div className="p-4">
            <AlertToggle />
          </div>
        </section>

        <div className="xl:col-start-1 xl:row-start-2">
          {/* What structure says this minute, instrument by instrument. This is
              a view rather than a claim: the record above is what the desk is
              judged by, and this is what the next sweep will be reading. */}
          <section className="panel-static overflow-hidden">
            <header className="flex flex-wrap items-center gap-3 px-5 pb-2 pt-5">
              <RuleLabel as="h2">Live Read</RuleLabel>
              <div className="min-w-2 flex-1" />
              <span className="text-xs text-text-faint">
                {sweeping
                  ? 'Reading structure'
                  : lastSweep
                    ? `Read ${formatCt(lastSweep)} CT, every two minutes`
                    : 'Not read yet'}
              </span>
            </header>
            <div className="p-4">
              {sweeping && Object.keys(reads).length === 0 ? (
                <SkeletonRegion label="Reading structure across the desk" className="space-y-3">
                  <Skeleton className="h-16 rounded-card" />
                  <Skeleton className="h-16 rounded-card" />
                  <Skeleton className="h-16 rounded-card" />
                </SkeletonRegion>
              ) : (
                <div className="grid gap-3 2xl:grid-cols-2">
                  {PUBLISHED_INSTRUMENTS.map((meta) => {
                    const read = reads[meta.symbol]
                    return (
                      <TradeCallCard
                        key={meta.symbol}
                        symbol={meta.symbol}
                        call={read?.call ?? null}
                        standDown={
                          read?.standDown ??
                          unread[meta.symbol] ??
                          'No structure read yet. The feed has not answered.'
                        }
                        timeframe={meta.primaryTimeframe}
                        compact
                      />
                    )
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* The tabs sit on the table they filter rather than floating above the
          page, so what they act on is not a matter of inference. */}
      <section className="panel-static overflow-hidden">
        <header className="flex flex-wrap items-center gap-3 px-5 pb-2 pt-5">
          <RuleLabel as="h2">Settled Record</RuleLabel>
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
          empty={
            tab === 'All'
              ? 'No settled signals yet. The record fills as calls resolve.'
              : `No ${tab.toLowerCase()} signals on the record yet.`
          }
        />
      </section>
    </div>
  )
}
