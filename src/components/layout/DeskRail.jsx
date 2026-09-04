import { useEffect, useState } from 'react'
import { DESK_TIME_ZONE, sessionForMoment } from '../../lib/time.js'
import { COMPLIANCE } from '../../lib/brand'
import { RULE_LABEL } from '../ui/Figures'
import { cn } from '../../lib/cn'

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const intervalId = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(intervalId)
  }, [])
  return now
}

/**
 * The strip above the terminal's bar.
 *
 * What is on it is the state of the desk rather than the state of the page:
 * which session is open, what the clock says in the desk's own time zone, and
 * the standing line about whose money this is. None of that belongs among the
 * controls in the bar below, and all of it is true on every route.
 */
export default function DeskRail() {
  const now = useClock()
  const session = sessionForMoment(now)

  return (
    <div className="flex h-[var(--ds-rail-height)] shrink-0 items-center gap-3 border-b border-border bg-bg px-4 sm:px-6">
      <span className={cn('flex items-center gap-1.5', RULE_LABEL)}>
        <span className="relative flex h-1.5 w-1.5">
          {session && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-positive opacity-75" />
          )}
          <span
            className={`relative inline-flex h-1.5 w-1.5 rounded-full ${session ? 'bg-positive' : 'bg-surface-3'}`}
          />
        </span>
        {session ?? 'Between Sessions'}
      </span>

      <time className="font-mono text-[11px] tabular-nums text-text-faint">
        {now.toLocaleTimeString('en-US', { hour12: false, timeZone: DESK_TIME_ZONE })} CT
      </time>

      <div className="min-w-2 flex-1" />

      <p className="hidden truncate font-mono text-[11px] text-text-faint lg:block">
        {COMPLIANCE.short}
      </p>
    </div>
  )
}
