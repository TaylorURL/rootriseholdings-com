import { useState } from 'react'
import { Sunrise, Sunset, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import Card from './Card'
import Badge from './Badge'
import SegmentedTabs from './SegmentedTabs'
import { cn } from '../../lib/cn'
import { BRIEFING_EDITIONS, MOCK_BRIEFING } from '../../data/briefing'

const TONE_TO_VARIANT = {
  bullish: 'buy',
  bearish: 'sell',
  mixed: 'warning',
  neutral: 'neutral',
}

const EDITION_ICON = { sunrise: Sunrise, sunset: Sunset }

function ToneBadge({ tone }) {
  const variant = TONE_TO_VARIANT[tone] ?? 'neutral'
  const label = tone[0].toUpperCase() + tone.slice(1)
  return <Badge variant={variant}>{label}</Badge>
}

/**
 * Single section of the 9-section briefing. Header shows the number, title, and
 * tone; body opens to the full SMC commentary + bullet rundown.
 */
function BriefingSection({ section, expanded, onToggle }) {
  return (
    <li className="overflow-hidden rounded-lg border border-border bg-surface-2/40 transition-colors hover:border-border-hover">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-3 font-mono text-xs font-semibold text-text-muted">
            {String(section.number).padStart(2, '0')}
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-text">{section.title}</p>
            <p className="text-xs text-text-faint">{section.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ToneBadge tone={section.tone} />
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-text-faint" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4 text-text-faint" aria-hidden="true" />
          )}
        </div>
      </button>
      {expanded && (
        <div className="border-t border-border bg-surface px-4 py-3 space-y-3">
          <p className="text-sm leading-relaxed text-text-muted">{section.body}</p>
          <ul className="space-y-1.5">
            {section.bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-2 text-sm text-text">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-accent-bright" aria-hidden="true" />
                <span className="font-mono text-xs leading-relaxed">{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  )
}

/**
 * Nine-section daily briefing — the morning/PM read the desk publishes each
 * day. Renders the executive summary up top with a collapsible list of all
 * nine sections beneath. Compact mode trims to the summary + the first three
 * sections for the Dashboard.
 *
 * @param {object} props
 * @param {'full'|'compact'} [props.variant='full']
 */
export default function DailyBriefing({ variant = 'full' }) {
  const [edition, setEdition] = useState(MOCK_BRIEFING.edition)
  const [expanded, setExpanded] = useState(() => new Set(['xauusd', 'indices', 'day-plan']))

  const editionMeta = BRIEFING_EDITIONS.find((entry) => entry.id === edition) ?? BRIEFING_EDITIONS[0]
  const EditionIcon = EDITION_ICON[editionMeta.icon] ?? Sunrise

  const sections =
    variant === 'compact' ? MOCK_BRIEFING.sections.slice(0, 3) : MOCK_BRIEFING.sections

  const toggle = (id) =>
    setExpanded((previous) => {
      const next = new Set(previous)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  return (
    <Card
      title={
        <div className="flex items-center gap-2.5">
          <EditionIcon className="h-4 w-4 text-accent-bright" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-text">Daily briefing</h2>
          <span className="rounded-md bg-surface-2 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-text-faint">
            9 sections
          </span>
        </div>
      }
      action={
        variant === 'full' ? (
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 text-xs text-text-faint sm:inline-flex">
              <Clock className="h-3 w-3" aria-hidden="true" />
              Next: {MOCK_BRIEFING.nextEditionAt}
            </span>
            <SegmentedTabs
              options={BRIEFING_EDITIONS.map((entry) => entry.label)}
              value={editionMeta.label}
              onChange={(label) => {
                const match = BRIEFING_EDITIONS.find((entry) => entry.label === label)
                if (match) setEdition(match.id)
              }}
              ariaLabel="Briefing edition"
            />
          </div>
        ) : (
          <span className="text-xs text-text-faint">{editionMeta.label} · {editionMeta.timeLabel}</span>
        )
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-surface-2/40 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-text-faint">30-second take</p>
          <p className="mt-2 text-sm leading-relaxed text-text">{MOCK_BRIEFING.executiveSummary}</p>
        </div>
        <ul className={cn('space-y-2', variant === 'compact' && 'space-y-1.5')}>
          {sections.map((section) => (
            <BriefingSection
              key={section.id}
              section={section}
              expanded={expanded.has(section.id)}
              onToggle={() => toggle(section.id)}
            />
          ))}
        </ul>
        {variant === 'compact' && (
          <p className="text-xs text-text-faint">
            Showing 3 of 9 sections · open Insights for the full briefing.
          </p>
        )}
      </div>
    </Card>
  )
}
