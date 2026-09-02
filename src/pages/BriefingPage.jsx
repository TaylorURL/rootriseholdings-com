import { useId, useState } from 'react'
import { PencilLine, X } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import DailyBriefing from '../components/ui/DailyBriefing'
import DayStateBanner from '../components/journal/DayStateBanner'
import { useJournal } from '../context/JournalContext'
import { useBriefing } from '../lib/briefing/useBriefing.js'

/**
 * The plan, edited in place.
 *
 * It opens above the briefing rather than beside it: the plan is what the nine
 * sections are read against, and a form in a side column is read after them.
 */
function PlanEditor({ plan, onSave, onClose }) {
  const [focus, setFocus] = useState(plan?.focus ?? '')
  const [notes, setNotes] = useState((plan?.notes ?? []).join('\n'))
  const focusId = useId()
  const notesId = useId()

  const handleSubmit = (event) => {
    event.preventDefault()
    onSave({
      focus: focus.trim(),
      notes: notes
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
    })
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="panel-static p-4" aria-label="Day plan">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="font-mono text-[10px] uppercase tracking-label text-text-faint">Day Plan</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close the plan editor"
          className="press focus-ring rounded-control p-1.5 text-text-muted transition-colors duration-200 ease-out [@media(hover:hover)]:hover:text-text"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={focusId} className="text-[13px] font-medium text-text">
            Focus
          </label>
          <input
            id={focusId}
            value={focus}
            onChange={(event) => setFocus(event.target.value)}
            placeholder="Which setups are on the hunt list today"
            autoFocus
            className="field"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={notesId} className="text-[13px] font-medium text-text">
            Notes, one per line
          </label>
          <textarea
            id={notesId}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={4}
            className="field ds-scroll h-auto resize-y py-2.5"
          />
        </div>
        <button type="submit" className="btn btn-primary press focus-ring h-10 min-h-0">
          Save Plan
        </button>
      </div>
    </form>
  )
}

/**
 * The briefing is a document rather than a dashboard: the nine sections running
 * down one column in order, with the desk's standing state held beside them.
 * Nothing here is a tile, because none of it is a figure to be scanned - it is
 * written to be read once, at the open.
 */
export default function BriefingPage() {
  const { dayState, todayPlan, savePlan } = useJournal()
  const { briefing, loading, refreshing, refresh } = useBriefing({ dayState, plan: todayPlan })
  const [editingPlan, setEditingPlan] = useState(false)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Briefing"
        subtitle="Nine sections, composed from live feeds at the morning and New York afternoon opens."
      />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="min-w-0 space-y-5">
          {editingPlan ? (
            <PlanEditor plan={todayPlan} onSave={savePlan} onClose={() => setEditingPlan(false)} />
          ) : null}

          <DailyBriefing
            briefing={briefing}
            loading={loading}
            refreshing={refreshing}
            onRefresh={refresh}
            onEditPlan={() => setEditingPlan(true)}
          />
        </div>

        {/* The desk's standing state, held beside the read rather than stacked
            above it, so what the rule book allows today stays on screen while
            the sections are worked through. */}
        <aside className="space-y-5 xl:sticky xl:top-0">
          <DayStateBanner />

          <section className="panel-static overflow-hidden">
            <header className="flex items-center gap-3 border-b border-border px-4 py-2.5">
              <h2 className="font-mono text-[10px] uppercase tracking-label text-text-faint">
                Day Plan
              </h2>
              <div className="min-w-2 flex-1" />
              <button
                type="button"
                onClick={() => setEditingPlan(true)}
                className="press focus-ring inline-flex items-center gap-1.5 rounded-control bg-surface-2 px-2.5 py-1.5 text-[11px] font-medium text-text-muted shadow-[var(--ds-edge)] transition-colors duration-200 ease-out [@media(hover:hover)]:hover:text-text"
              >
                <PencilLine className="h-3.5 w-3.5" aria-hidden="true" />
                Edit
              </button>
            </header>
            <div className="px-4 py-3.5">
              {todayPlan?.focus ? (
                <p className="text-[13px] leading-relaxed text-text">{todayPlan.focus}</p>
              ) : (
                <p className="text-[13px] text-text-faint">No focus set for today.</p>
              )}
              {todayPlan?.notes?.length ? (
                <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
                  {todayPlan.notes.map((note) => (
                    <li key={note} className="flex items-start gap-2 text-[13px] text-text-muted">
                      <span
                        className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[var(--ds-accent-fill)]"
                        aria-hidden="true"
                      />
                      {note}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
