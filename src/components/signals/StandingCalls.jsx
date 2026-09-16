import TradeCallCard from './TradeCallCard'
import { PANEL_TITLE } from '../ui/Figures'
import { cn } from '../../lib/cn'
import { formatCt } from '../../lib/time'

/**
 * What the desk is calling right now.
 *
 * This is the first question a trader asks and the only one that is time
 * critical, so it is drawn the same way wherever it appears and it opens the
 * screen it is on. Both surfaces render this one panel rather than each keeping
 * a copy: a standing call that reads one way on the dashboard and another way
 * on the record is two answers to a question that has one.
 *
 * An empty panel is never left to speak for itself. Nothing standing and
 * nothing read are different facts, and a reader cannot tell them apart from an
 * empty box, so the panel says which one it is looking at.
 */

/**
 * How long ago a pass has to be before it stops describing the present.
 *
 * The desk sweeps every two minutes, so a heartbeat older than a few of those
 * is not a slow morning, it is a sweep that has stopped. A pass that dies
 * before it can answer writes nothing, which leaves the last good row standing
 * as the most recent thing that happened - and a row with no age beside it
 * reads as current however old it is. That is the same silence the heartbeat
 * was added to break, moved from no row at all to a row nobody looks twice at.
 */
const SWEEP_STALE_MS = 10 * 60 * 1000

function sweepIsCurrent(run, now) {
  const ran = run?.ranAt ? new Date(run.ranAt).getTime() : NaN
  if (!Number.isFinite(ran)) return false
  return now - ran < SWEEP_STALE_MS
}

/**
 * What the desk's last pass did, in one clause.
 *
 * An empty record answers two questions at once and a reader cannot tell which
 * one they are looking at: the desk read the market and called nothing, or the
 * desk never reached the market. The pass says which, and it says when, because
 * a pass that ran an hour ago is not a reading of this hour.
 */
function describeDeskSweep(run, now) {
  const at = `${formatCt(run.ranAt)} CT`
  if (!sweepIsCurrent(run, now)) return `last swept the market at ${at}`
  if (!run.ok) return `could not read the market at ${at}`
  const held = run.withheld?.length ?? 0
  const reading =
    run.read < run.instruments
      ? `swept ${run.read} of ${run.instruments} instruments at ${at}`
      : `swept ${run.instruments} instruments at ${at}`
  return held > 0 ? `${reading}, ${held} too thin to call` : reading
}

/**
 * @param {object} props
 * @param {object[]} props.signals - the calls that have not settled, newest first
 * @param {object|null} [props.sweep] - the desk's sweep heartbeat
 * @param {string|null} [props.recordError] - why the record could not be read
 * @param {boolean} [props.compact] - drop the reasons under each call
 * @param {React.ReactNode} [props.action] - a control that belongs to this panel
 * @param {string} [props.className]
 * @param {number} [props.now] - epoch ms, so the sweep's age can be told
 */
export default function StandingCalls({
  signals,
  sweep = null,
  recordError = null,
  compact = false,
  action,
  className,
  now = Date.now(),
}) {
  return (
    <section className={cn('panel-static overflow-hidden', className)}>
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-5 pb-2 pt-5">
        <h2 className={PANEL_TITLE}>Standing Calls</h2>
        <div className="min-w-2 flex-1" />
        <span className="text-xs text-text-faint">
          {signals.length} standing on the record
          {sweep ? ` · ${describeDeskSweep(sweep, now)}` : ''}
        </span>
        {action}
      </header>
      <div className="p-4">
        {signals.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-text-faint">
            {recordError
              ? 'The record could not be read.'
              : sweep && !sweepIsCurrent(sweep, now)
                ? `Nothing is standing. The desk last read the market at ${formatCt(sweep.ranAt)} CT.`
                : sweep && !sweep.ok
                  ? 'Nothing is standing, and the desk could not read the market on its last pass.'
                  : 'No call is standing. The sweep publishes one when structure produces it.'}
          </p>
        ) : (
          <div className={cn('grid gap-4', signals.length > 1 && 'xl:grid-cols-2')}>
            {signals.map((signal) => (
              <TradeCallCard
                key={signal.id}
                symbol={signal.symbol}
                call={signal}
                timeframe={signal.timeframe}
                status={signal.status}
                publishedAt={signal.emittedAt}
                compact={compact}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
