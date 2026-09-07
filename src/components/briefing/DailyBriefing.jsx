import { useState } from 'react'
import { Sunrise, Sunset, Clock, ChevronDown, ChevronUp, RefreshCw, PencilLine } from 'lucide-react'
import Badge from '../ui/Badge'
import { PANEL_TITLE, RuleLabel } from '../ui/Figures'
import { cn } from '../../lib/cn'
import { Skeleton, SkeletonText, SkeletonRegion } from '../ui/Skeleton'

const TONE_TO_VARIANT = {
  bullish: 'buy',
  bearish: 'sell',
  mixed: 'warning',
  neutral: 'neutral',
}

const EDITION_ICON = { morning: Sunrise, pm: Sunset }

const CONTROL =
  'press focus-ring inline-flex items-center gap-1.5 rounded-control bg-surface-2 px-2.5 py-1.5 text-[11px] font-medium text-text-muted shadow-[var(--ds-edge)] transition-colors duration-200 ease-out [@media(hover:hover)]:hover:text-text disabled:opacity-60'

function ToneBadge({ tone }) {
  const variant = TONE_TO_VARIANT[tone] ?? 'neutral'
  return <Badge variant={variant}>{tone[0].toUpperCase() + tone.slice(1)}</Badge>
}

/**
 * One section, closed or open.
 *
 * The row is ruled rather than boxed: nine bordered cards stacked inside a
 * bordered panel draw twenty-seven edges for nine readings. Closed, it carries
 * the opening of its own body in the space between the title and the tone, so
 * the list can be scanned without opening anything.
 */
function BriefingSection({ section, expanded, onToggle, onEditPlan }) {
  return (
    <li
      className={cn('border-b border-border last:border-b-0', section.unavailable && 'opacity-70')}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={cn(
          'focus-ring-inset flex w-full items-center gap-4 px-4 py-3 text-left transition-colors duration-200 ease-out',
          expanded ? 'bg-surface-2' : '[@media(hover:hover)]:hover:bg-surface-2'
        )}
      >
        <span className="w-6 shrink-0 font-mono text-[11px] tabular-nums text-text-faint">
          {String(section.number).padStart(2, '0')}
        </span>
        <span className="min-w-0 flex-1 leading-tight lg:w-[13rem] lg:flex-none">
          <span className="block truncate text-[13px] font-medium text-text">{section.title}</span>
          <span className="block truncate text-[11px] text-text-faint">{section.subtitle}</span>
          {/* Under the three-column width the reading has nowhere to sit beside
              the title, and nine rows of headings with the words hidden is a
              list nobody can scan. It moves under the title instead. */}
          {/* Taken out of the flow rather than made transparent. Above the
              three-column width this sits under the title in a column, so an
              invisible copy of the line still holds its own height and an
              opened section carries a blank gap under its heading. The reading
              beside the title keeps its opacity, because that one is in a row
              and removing it would let the title column widen underneath. */}
          <span
            className={cn(
              'mt-0.5 block truncate text-[11px] text-text-muted lg:hidden',
              expanded && 'hidden'
            )}
          >
            {section.body}
          </span>
        </span>
        <span
          className={cn(
            'hidden min-w-0 flex-1 truncate text-[13px] text-text-muted transition-opacity duration-200 lg:block',
            expanded && 'opacity-0'
          )}
        >
          {section.body}
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-2 lg:ml-0">
          {section.unavailable ? (
            <Badge variant="neutral">No Data</Badge>
          ) : (
            <ToneBadge tone={section.tone} />
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-text-faint" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4 text-text-faint" aria-hidden="true" />
          )}
        </span>
      </button>
      {expanded ? (
        <div className="space-y-3 border-t border-border px-4 py-4 pl-4 lg:pl-14">
          <p className="max-w-[78ch] text-[13px] leading-relaxed text-text-muted">{section.body}</p>
          {section.bullets.length > 0 ? (
            <ul className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
              {section.bullets.map((bullet) => (
                <li
                  key={bullet}
                  className="flex items-start gap-2 rounded-sm bg-surface-2 px-2.5 py-1.5 font-mono text-[11px] leading-relaxed text-text"
                >
                  <span
                    className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--ds-accent-fill)]"
                    aria-hidden="true"
                  />
                  {bullet}
                </li>
              ))}
            </ul>
          ) : null}
          {section.editable && onEditPlan ? (
            <button type="button" onClick={onEditPlan} className={CONTROL}>
              <PencilLine className="h-3.5 w-3.5" aria-hidden="true" />
              Edit Day Plan
            </button>
          ) : null}
        </div>
      ) : null}
    </li>
  )
}

/**
 * The pending twin of a closed BriefingSection.
 *
 * Same rule, same row padding, same badge box. The two bars stand in for the
 * title and subtitle line boxes and are sized to match them: 16px and 14px with
 * the stack's 6px between, so the row measures what the real row measures and
 * the list below it does not move when the edition lands.
 */
function BriefingSectionSkeleton() {
  return (
    <li className="border-b border-border last:border-b-0">
      <div className="flex items-center gap-4 px-4 py-3">
        <Skeleton className="h-3.5 w-6 rounded-sm" />
        <div className="min-w-0 flex-1 space-y-1.5 lg:w-[13rem] lg:flex-none">
          <Skeleton className="h-4 w-32 rounded-sm" />
          <Skeleton className="h-3.5 w-40 rounded-sm" />
        </div>
        <Skeleton className="hidden h-4 flex-1 rounded-sm lg:block" />
        <Skeleton className="ml-auto h-[18px] w-16 rounded-sm lg:ml-0" />
      </div>
    </li>
  )
}

/**
 * The composed briefing (see lib/briefing/compose.js), or its pending state
 * while the first edition is being fetched.
 *
 * Both states render from this one component and share the panel, the take, and
 * the section list, so the frame is identical and only the contents of each box
 * swap when the data lands.
 *
 * @param {object} props
 * @param {object} [props.briefing] - composed briefing; omit while loading
 * @param {boolean} [props.loading=false] - render the pending state
 * @param {'full'|'compact'} [props.variant='full']
 * @param {boolean} [props.refreshing]
 * @param {() => void} [props.onRefresh]
 * @param {() => void} [props.onEditPlan]
 */
export default function DailyBriefing({
  briefing,
  loading = false,
  variant = 'full',
  refreshing = false,
  onRefresh,
  onEditPlan,
}) {
  // Every section starts closed, which is the shape the pending state can hold
  // exactly: nine placeholder rows for nine rows of content. Expand All opens
  // the whole read in one press for anyone who wants it top to bottom.
  const [expanded, setExpanded] = useState(() => new Set())

  const sectionCount = variant === 'compact' ? 4 : 9

  if (loading || !briefing) {
    return (
      <section className="panel-static overflow-hidden">
        <header className="flex items-center gap-3 border-b border-border bg-surface-2 px-4 py-2.5">
          <Sunrise className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
          <h2 className={PANEL_TITLE}>Daily Briefing</h2>
          <Skeleton className="h-[18px] w-20 rounded-sm" />
          <div className="min-w-2 flex-1" />
          <Skeleton className="h-[30px] w-24 rounded-control" />
        </header>
        <SkeletonRegion label="Composing the current briefing edition">
          <div className="border-b border-border px-4 py-4">
            <div className="flex h-4 items-center justify-between gap-3">
              <RuleLabel>30-Second Take</RuleLabel>
              <Skeleton className="hidden h-3.5 w-28 rounded-sm sm:block" />
            </div>
            <SkeletonText lines={2} className="mt-2 min-h-[46px] max-w-[78ch]" />
          </div>
          <ul>
            {Array.from({ length: sectionCount }, (_, index) => (
              <BriefingSectionSkeleton key={index} />
            ))}
          </ul>
        </SkeletonRegion>
      </section>
    )
  }

  const EditionIcon = EDITION_ICON[briefing.edition] ?? Sunrise
  const sections = variant === 'compact' ? briefing.sections.slice(0, 4) : briefing.sections
  const allOpen = sections.length > 0 && sections.every((section) => expanded.has(section.id))

  const toggle = (id) =>
    setExpanded((previous) => {
      const next = new Set(previous)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const toggleAll = () =>
    setExpanded(allOpen ? new Set() : new Set(sections.map((section) => section.id)))

  return (
    <section className="panel-static overflow-hidden">
      <header className="content-enter flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-surface-2 px-4 py-2.5">
        <EditionIcon className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
        <h2 className={PANEL_TITLE}>Daily Briefing</h2>
        <span className="chip-static">{briefing.editionLabel}</span>
        <div className="min-w-2 flex-1" />
        <span className="hidden items-center gap-1.5 text-[11px] text-text-faint sm:inline-flex">
          <Clock className="h-3 w-3" aria-hidden="true" />
          Next: {briefing.nextEditionLabel}
        </span>
        {/* Below the sm breakpoint the header has room for icons only, so the
            labels drop out and the accessible name carries the action. The two
            controls travel as one group, so a narrow header wraps the pair
            onto the next line together rather than stranding one of them. */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={toggleAll}
            aria-expanded={allOpen}
            aria-label={allOpen ? 'Collapse all sections' : 'Expand all sections'}
            className={CONTROL}
          >
            {allOpen ? (
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">{allOpen ? 'Collapse All' : 'Expand All'}</span>
          </button>
          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              aria-label={refreshing ? 'Refreshing the briefing' : 'Refresh the briefing'}
              className={CONTROL}
            >
              <RefreshCw
                className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')}
                aria-hidden="true"
              />
              <span className="hidden sm:inline">{refreshing ? 'Refreshing' : 'Refresh'}</span>
            </button>
          ) : null}
        </div>
      </header>

      <div className="content-enter border-b border-border px-4 py-4">
        {/* Fixed at one line so the take below it starts in the same place
            whether the header carries a timestamp or not. The timestamp is
            supplementary and drops out where there is no room for it. */}
        <div className="flex h-4 items-center justify-between gap-3">
          <RuleLabel>30-Second Take</RuleLabel>
          <span className="hidden whitespace-nowrap font-mono text-[11px] text-text-faint sm:inline">
            Generated {briefing.generatedAtLabel}
          </span>
        </div>
        {/* Two lines are held whether the take runs to one or two, so the list
            below starts at the same place in either edition. */}
        <p className="mt-2 min-h-[46px] max-w-[78ch] text-[13px] leading-relaxed text-text">
          {briefing.executiveSummary}
        </p>
      </div>

      <ul className="content-enter">
        {sections.map((section) => (
          <BriefingSection
            key={section.id}
            section={section}
            expanded={expanded.has(section.id)}
            onToggle={() => toggle(section.id)}
            onEditPlan={section.editable ? onEditPlan : undefined}
          />
        ))}
      </ul>

      {variant === 'compact' ? (
        <p className="border-t border-border px-4 py-2.5 text-[11px] text-text-faint">
          Showing 4 of 9 sections. The Briefing tab carries the full read.
        </p>
      ) : null}
    </section>
  )
}
