/** Shared marketing copy for the brand site. */

import {
  Crosshair,
  GaugeCircle,
  LineChart,
  ListChecks,
  Newspaper,
  NotebookPen,
  Radar,
  ShieldCheck,
  Lock,
} from 'lucide-react'

/** The desk's three-step process, from bias to risk. */
export const METHOD_STEPS = [
  {
    id: '01',
    icon: Radar,
    title: 'Bias from higher timeframes',
    summary: 'Direction is set on the Daily and 4H before any entry is hunted.',
    detail:
      'Market structure decides the bias, and structure is only the sequence of highs and lows. Higher highs and higher lows mean longs only; the mirror means shorts. No trade fights the higher-timeframe read.',
  },
  {
    id: '02',
    icon: Crosshair,
    title: 'Entries at structure, in the zone',
    summary: 'BOS confirms continuation, CHoCH flags reversal, OTE times the entry.',
    detail:
      'On the 1H and 15m the desk waits for a Break of Structure or a Change of Character, then for the pullback into the 62–79% retracement of the leg. That band is the Optimal Trade Entry, and a ticket is written inside it or not at all.',
  },
  {
    id: '03',
    icon: ListChecks,
    title: 'Risk under hard rules',
    summary: 'One percent per trade, half a percent per day, two losses and done.',
    detail:
      'Every trade risks at most 1% of equity and targets at least 2R. A 0.5% down day, two consecutive losses, or two A+ executions closes the desk, and the platform enforces all of it at entry.',
  },
]

/** The platform's real surfaces. */
export const PLATFORM_FEATURES = [
  {
    icon: NotebookPen,
    title: 'A journal that says no',
    body: 'Trades log in seconds with R:R, risk, setup, and session attached, and the rule book gates every entry. Tickets that break the 1% cap, the 2R minimum, or a locked day are refused, not flagged.',
  },
  {
    icon: Newspaper,
    title: 'The nine-section briefing',
    body: 'Economic calendar, DXY, gold and index structure, FX watch, sentiment, day plan, and rules, composed twice a day from live feeds with every level computed rather than typed.',
  },
  {
    icon: LineChart,
    title: 'Structure, computed',
    body: 'The same swing engine that annotates the charts writes the analysis: BOS and CHoCH events, per-leg retracement, OTE zones, and premium versus discount on every traded instrument.',
  },
  {
    icon: GaugeCircle,
    title: 'Performance that answers questions',
    body: 'Win rate, expectancy, and R-multiples cut by instrument, setup, session, and grade, plus prop-firm tracking with trailing drawdown, target progress, and the consistency rule.',
  },
]

/** The desk's standing principles. */
export const TRUST_PILLARS = [
  {
    icon: ShieldCheck,
    title: 'A desk, not a fund',
    body: 'No outside money is managed and no signals are sold. The platform exists to run one desk well.',
  },
  {
    icon: Lock,
    title: 'Numbers before narrative',
    body: 'Every analysis line restates a computed value. If the math did not produce a level, the text cannot claim it.',
  },
  {
    icon: ListChecks,
    title: 'Rules over feelings',
    body: 'The risk rules are enforced by software at the moment of entry, not remembered under pressure.',
  },
]
