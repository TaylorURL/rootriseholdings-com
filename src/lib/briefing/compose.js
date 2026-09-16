import { RISK_RULES, RISK_RULES_DESCRIPTIONS } from '../../data/riskRules.js'
import {
  WATCH_ONLY_INSTRUMENTS,
  INSTRUMENT_META,
  decimalsForInstrument,
} from '../../data/instruments.js'
import { narrateInstrument } from '../smc/narrate.js'
import { NO_VALUE } from '../format.js'
import { ctMinutesOfDay, formatCt, sessionForMoment } from '../time.js'

/**
 * The nine-section briefing, assembled from live resources. Section text is
 * either computed (structure reads, DXY, sentiment), fetched (calendar), or
 * the desk's own inputs (day plan, rules) — a section with no real data says
 * so instead of filling the space.
 */
const BRIEFING_EDITIONS = [
  { id: 'morning', label: 'Morning Open', timeLabel: '06:00 CT', icon: 'sunrise' },
  { id: 'pm', label: 'NY Afternoon', timeLabel: '15:00 CT', icon: 'sunset' },
]

const PM_SWITCH_MINUTES = 15 * 60

/**
 * @param {Date | string | number} now
 * @returns {{current:object, next:object}} the edition this moment belongs to
 *   and the one after it
 */
export function editionForMoment(now) {
  const minutes = ctMinutesOfDay(now)
  const isPm = minutes >= PM_SWITCH_MINUTES
  return {
    current: BRIEFING_EDITIONS[isPm ? 1 : 0],
    next: BRIEFING_EDITIONS[isPm ? 0 : 1],
  }
}

/** The quote for one instrument, or null where the feed served none. */
function realQuote(quotes, symbol) {
  return quotes?.[symbol] ?? null
}

function formatLevel(value, symbol) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return NO_VALUE
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimalsForInstrument(symbol),
    maximumFractionDigits: decimalsForInstrument(symbol),
  })
}

/**
 * Narrates one structure read.
 *
 * The dollar index is read alongside the traded instruments but is not one of
 * them, so the label and precision fall back to the symbol itself where the
 * registry has no entry.
 */
function narratedSection(symbol, reads) {
  const read = reads?.[symbol]
  if (!read) return null
  const meta = INSTRUMENT_META[symbol]
  const narration = narrateInstrument({
    label: meta?.displaySymbol ?? symbol,
    execution: read.execution,
    executionTimeframe: read.executionTimeframe,
    htf: read.htf,
    htfTimeframe: read.htfTimeframe,
    decimals: decimalsForInstrument(symbol),
    sideConstraint: meta?.sideConstraint ?? null,
  })
  if (read.exchange) narration.bullets.push(`${read.providerSymbol} on ${read.exchange}`)
  return narration
}

const NO_FEED_BODY = 'Candle feed unreachable right now.'

/**
 * @param {object} args
 * @param {Date} args.now
 * @param {object} args.resources - {calendar, dxy, reads, quotes}
 * @param {object} args.dayState - journal day state (rules.js)
 * @param {object | null} args.plan - the day plan for today, when written
 * @returns {object} the composed briefing
 */
export function composeBriefing({ now, resources, dayState, plan }) {
  const { calendar, dxy, reads, quotes } = resources
  const sections = []

  const highImpact = (calendar ?? []).filter((event) => event.isHighImpact)
  sections.push({
    id: 'economic-events',
    number: 1,
    title: 'Economic Events',
    subtitle: 'High-impact data for the session',
    unavailable: calendar == null,
    body:
      calendar == null
        ? 'Calendar feed unreachable right now.'
        : highImpact.length === 0
          ? 'No high-impact releases on the calendar today.'
          : `${highImpact.length} high-impact ${highImpact.length === 1 ? 'release' : 'releases'} today. Stand aside through each print and let the reaction candle close before re-engaging.`,
    bullets: highImpact.map(
      (event) =>
        `${event.timeCt} CT: ${event.country} ${event.title}${event.forecast ? ` · cons. ${event.forecast}` : ''}`
    ),
    tone: highImpact.length > 0 ? 'mixed' : 'neutral',
  })

  const dxyRead = narratedSection('DXY', reads)
  sections.push({
    id: 'dxy',
    number: 2,
    title: 'DXY',
    subtitle: 'Dollar index read',
    unavailable: dxy == null && !dxyRead,
    body: [
      dxy != null
        ? `Dollar index at ${dxy.value.toFixed(2)}${
            dxy.changePct == null
              ? ''
              : `, ${dxy.changePct >= 0 ? '+' : ''}${dxy.changePct.toFixed(2)}% on the session`
          }.`
        : 'Dollar index feed unreachable right now.',
      dxyRead?.body,
    ]
      .filter(Boolean)
      .join(' '),
    bullets: dxyRead?.bullets ?? [],
    tone: dxyRead?.tone ?? 'neutral',
  })

  const gold = narratedSection('XAUUSD', reads)
  const goldQuote = realQuote(quotes, 'XAUUSD')
  sections.push({
    id: 'xauusd',
    number: 3,
    title: 'XAUUSD',
    subtitle: 'Gold spot · primary instrument · 1H',
    unavailable: !gold,
    body: gold?.body ?? NO_FEED_BODY,
    bullets: [
      ...(goldQuote ? [`Last ${formatLevel(goldQuote.price, 'XAUUSD')}`] : []),
      ...(gold?.bullets ?? []),
    ],
    tone: gold?.tone ?? 'neutral',
  })

  const indexNarrations = ['NAS100', 'US30', 'SP500']
    .map((symbol) => ({ symbol, narration: narratedSection(symbol, reads) }))
    .filter((entry) => entry.narration)
  sections.push({
    id: 'indices',
    number: 4,
    title: 'Indices',
    subtitle: 'NAS100 · US30 · SP500',
    unavailable: indexNarrations.length === 0,
    body:
      indexNarrations.length === 0
        ? NO_FEED_BODY
        : indexNarrations
            .map((entry) => `${entry.narration.label}: ${entry.narration.body}`)
            .join(' '),
    bullets: indexNarrations.flatMap((entry) =>
      entry.narration.bullets.slice(0, 2).map((bullet) => `${entry.narration.label} ${bullet}`)
    ),
    tone: indexNarrations.every((entry) => entry.narration.tone === 'bearish')
      ? 'bearish'
      : indexNarrations.every((entry) => entry.narration.tone === 'bullish')
        ? 'bullish'
        : 'mixed',
  })

  const fxQuotes = WATCH_ONLY_INSTRUMENTS.map((meta) => realQuote(quotes, meta.symbol)).filter(
    Boolean
  )
  sections.push({
    id: 'fx-watch',
    number: 5,
    title: 'FX Watch',
    subtitle: 'USDJPY · NZDUSD · NZDJPY, read for context and never traded',
    unavailable: fxQuotes.length === 0,
    body:
      fxQuotes.length === 0
        ? 'FX feed unreachable right now.'
        : fxQuotes
            .map(
              (quote) =>
                `${quote.displaySymbol} ${formatLevel(quote.price, quote.symbol)} (${quote.changePct >= 0 ? '+' : ''}${quote.changePct.toFixed(2)}% on the prior close)`
            )
            .join(' · '),
    bullets:
      fxQuotes.length === 0
        ? []
        : WATCH_ONLY_INSTRUMENTS.map((meta) => `${meta.displaySymbol}: ${meta.note}`),
    tone: 'neutral',
  })

  const upcomingHigh = highImpact.filter((event) => !event.isPast)
  sections.push({
    id: 'catalysts',
    number: 6,
    title: 'Catalysts',
    subtitle: 'Scheduled market-moving events still ahead',
    unavailable: calendar == null,
    body:
      calendar == null
        ? 'Calendar feed unreachable right now.'
        : upcomingHigh.length === 0
          ? 'No high-impact catalysts left on the clock today.'
          : `${upcomingHigh.length} high-impact ${upcomingHigh.length === 1 ? 'event' : 'events'} still ahead. The levels above can be repriced through each one.`,
    bullets: upcomingHigh.map((event) => `${event.timeCt} CT: ${event.country} ${event.title}`),
    tone: upcomingHigh.length > 0 ? 'mixed' : 'neutral',
  })

  const sentimentGauges = []
  if (goldQuote)
    sentimentGauges.push({
      label: 'Gold Flow',
      value: goldQuote.changePct >= 0 ? 'Bid' : 'Offered',
      tone: goldQuote.changePct >= 0 ? 'buy' : 'sell',
    })
  const indexQuotes = ['NAS100', 'US30', 'SP500']
    .map((symbol) => realQuote(quotes, symbol))
    .filter(Boolean)
  if (indexQuotes.length > 0) {
    const avgChange =
      indexQuotes.reduce((sum, quote) => sum + quote.changePct, 0) / indexQuotes.length
    sentimentGauges.push({
      label: 'Index Composite',
      value: avgChange >= 0 ? 'Risk-On' : 'Risk-Off',
      tone: avgChange >= 0 ? 'buy' : 'sell',
    })
  }
  const nzdJpy = realQuote(quotes, 'NZDJPY')
  if (nzdJpy)
    sentimentGauges.push({
      label: 'NZD/JPY Barometer',
      value: nzdJpy.changePct >= 0 ? 'Risk-On' : 'Risk-Off',
      tone: nzdJpy.changePct >= 0 ? 'buy' : 'sell',
    })
  sections.push({
    id: 'sentiment',
    number: 7,
    title: 'Sentiment',
    subtitle: 'Derived from live quote changes',
    unavailable: sentimentGauges.length === 0,
    body:
      sentimentGauges.length === 0
        ? 'No live quotes to derive sentiment from right now.'
        : sentimentGauges.map((gauge) => `${gauge.label}: ${gauge.value}`).join(' · '),
    bullets: [],
    tone:
      sentimentGauges.length === 0
        ? 'neutral'
        : sentimentGauges.every((gauge) => gauge.tone === 'buy')
          ? 'bullish'
          : sentimentGauges.every((gauge) => gauge.tone === 'sell')
            ? 'bearish'
            : 'mixed',
    gauges: sentimentGauges,
  })

  sections.push({
    id: 'day-plan',
    number: 8,
    title: 'Day Plan',
    subtitle: 'Which setups the desk is hunting',
    unavailable: false,
    editable: true,
    body: plan?.focus?.trim() || 'No plan written for today yet.',
    bullets: plan?.notes?.filter((note) => note.trim()) ?? [],
    tone: 'neutral',
  })

  const session = sessionForMoment(now)
  const summaryParts = []
  if (gold) summaryParts.push(`Gold: ${gold.tone}, ${shortRead(reads?.XAUUSD)}`)
  for (const entry of indexNarrations) {
    summaryParts.push(
      `${entry.narration.label}: ${entry.narration.tone}, ${shortRead(reads?.[entry.symbol])}`
    )
  }
  if (dxy != null) summaryParts.push(`DXY ${dxy.value.toFixed(2)}`)
  const deskLine = dayState.locked
    ? `Desk locked: ${dayState.lockouts.map((lockout) => lockout.label.toLowerCase()).join(', ')}.`
    : `Desk open: ${dayState.aPlusLeft} A+ ${dayState.aPlusLeft === 1 ? 'slot' : 'slots'} and ${dayState.dailyLossBudgetLeftPct.toFixed(2)}% loss budget left.`
  sections.push({
    id: 'rules',
    number: 9,
    title: 'Rules',
    subtitle: 'The non-negotiables, live against today',
    unavailable: false,
    body: deskLine,
    bullets: RISK_RULES_DESCRIPTIONS.map((rule) => rule.label),
    tone: dayState.locked ? 'bearish' : 'neutral',
  })

  const executiveSummary = [
    summaryParts.length > 0 ? summaryParts.join('. ') + '.' : 'No live structure reads available.',
    session ? `Current session: ${session}.` : 'Between sessions.',
    deskLine,
  ].join(' ')

  const { current, next } = editionForMoment(now)
  return {
    edition: current.id,
    editionLabel: current.label,
    generatedAt: now.toISOString(),
    generatedAtLabel: `${formatCt(now)} CT`,
    nextEditionLabel: `${next.label} · ${next.timeLabel}`,
    executiveSummary,
    ruleState: {
      aPlusUsed: dayState.aPlusUsed,
      aPlusCap: RISK_RULES.maxAPlusSetupsPerDay,
      locked: dayState.locked,
    },
    sections,
  }
}

function shortRead(read) {
  if (!read?.execution) return 'no read'
  const { retracementPct, lastEvent } = read.execution
  const eventText = lastEvent ? lastEvent.type : 'no break'
  if (retracementPct == null || retracementPct < 0) return eventText
  return `${eventText}, ${Math.round(Math.min(retracementPct, 100))}% pullback`
}
