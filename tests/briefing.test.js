import test from 'node:test'
import assert from 'node:assert/strict'
import { composeBriefing, editionForMoment } from '../src/lib/briefing/compose.js'
import { computeDayState } from '../src/lib/journal/rules.js'
import { analyzeStructure } from '../src/lib/smc/structure.js'

const NOW = new Date('2026-08-21T19:30:00Z') // 14:30 CT

function emptyDayState() {
  return computeDayState({ trades: [], equity: 100000, now: NOW })
}

function lockedDayState() {
  const loser = {
    status: 'closed',
    grade: 'A',
    riskPct: 0.4,
    realizedR: -1,
    pnl: -400,
    openedAt: NOW.toISOString(),
    closedAt: NOW.toISOString(),
  }
  return computeDayState({ trades: [loser, { ...loser }], equity: 100000, now: NOW })
}

const NO_RESOURCES = { calendar: null, dxy: null, reads: {}, quotes: {} }

test('a briefing always carries nine numbered sections', () => {
  const briefing = composeBriefing({
    now: NOW,
    resources: NO_RESOURCES,
    dayState: emptyDayState(),
    plan: null,
  })
  assert.equal(briefing.sections.length, 9)
  assert.deepEqual(
    briefing.sections.map((section) => section.number),
    [1, 2, 3, 4, 5, 6, 7, 8, 9]
  )
})

test('sections without data are flagged rather than filled with invented text', () => {
  const briefing = composeBriefing({
    now: NOW,
    resources: NO_RESOURCES,
    dayState: emptyDayState(),
    plan: null,
  })
  const dataSections = briefing.sections.filter((section) =>
    ['dxy', 'xauusd', 'indices', 'fx-watch'].includes(section.id)
  )
  assert.ok(dataSections.every((section) => section.unavailable))
  assert.ok(dataSections.every((section) => section.bullets.length === 0))
  // The rules and day-plan sections come from the desk itself, so they always render.
  assert.equal(briefing.sections.find((section) => section.id === 'rules').unavailable, false)
  assert.equal(
    briefing.sections.find((section) => section.id === 'day-plan').body,
    'No plan written for today yet.'
  )
})

test('the rules section and summary follow the live day state', () => {
  const open = composeBriefing({
    now: NOW,
    resources: NO_RESOURCES,
    dayState: emptyDayState(),
    plan: null,
  })
  assert.match(open.sections.find((section) => section.id === 'rules').body, /Desk open/)
  assert.match(open.executiveSummary, /Desk open/)

  const locked = composeBriefing({
    now: NOW,
    resources: NO_RESOURCES,
    dayState: lockedDayState(),
    plan: null,
  })
  const rules = locked.sections.find((section) => section.id === 'rules')
  assert.match(rules.body, /Desk locked/)
  assert.equal(rules.tone, 'bearish')
  assert.match(locked.executiveSummary, /Desk locked/)
})

test('the day plan renders what the desk wrote', () => {
  const briefing = composeBriefing({
    now: NOW,
    resources: NO_RESOURCES,
    dayState: emptyDayState(),
    plan: {
      focus: 'Gold longs off the 1H OTE only.',
      notes: ['Skip NAS until after the 08:30 print', ''],
    },
  })
  const plan = briefing.sections.find((section) => section.id === 'day-plan')
  assert.equal(plan.body, 'Gold longs off the 1H OTE only.')
  assert.deepEqual(plan.bullets, ['Skip NAS until after the 08:30 print'])
})

test('a calendar feed produces event bullets and a catalyst split', () => {
  const calendar = [
    {
      title: 'CPI m/m',
      country: 'USD',
      impact: 'High',
      isHighImpact: true,
      timeCt: '07:30',
      isPast: true,
      forecast: '0.2%',
    },
    {
      title: 'FOMC speaks',
      country: 'USD',
      impact: 'High',
      isHighImpact: true,
      timeCt: '15:00',
      isPast: false,
      forecast: null,
    },
    {
      title: 'Minor print',
      country: 'EUR',
      impact: 'Low',
      isHighImpact: false,
      timeCt: '09:00',
      isPast: true,
      forecast: null,
    },
  ]
  const briefing = composeBriefing({
    now: NOW,
    resources: { ...NO_RESOURCES, calendar },
    dayState: emptyDayState(),
    plan: null,
  })
  const events = briefing.sections.find((section) => section.id === 'economic-events')
  assert.equal(events.unavailable, false)
  assert.equal(events.bullets.length, 2)
  assert.match(events.bullets[0], /07:30 CT: USD CPI m\/m · cons\. 0\.2%/)

  // Catalysts only carry what is still ahead on the clock.
  const catalysts = briefing.sections.find((section) => section.id === 'catalysts')
  assert.equal(catalysts.bullets.length, 1)
  assert.match(catalysts.bullets[0], /FOMC speaks/)
})

test('a structure read reaches the instrument section as prose and levels', () => {
  const candles = []
  let price = 100
  const step = (steps, direction) => {
    for (let i = 0; i < steps; i++) {
      const open = price
      const close = price + direction
      candles.push({
        open,
        close,
        high: Math.max(open, close) + 0.4,
        low: Math.min(open, close) - 0.4,
      })
      price = close
    }
  }
  step(10, 1)
  step(4, -1)
  step(8, 1)
  step(4, -1)
  step(8, 1)
  step(4, -1)

  const execution = analyzeStructure(candles, { atrLength: 5, atrMult: 2.0 })
  const briefing = composeBriefing({
    now: NOW,
    resources: {
      ...NO_RESOURCES,
      reads: {
        XAUUSD: {
          execution,
          htf: execution,
          executionTimeframe: '1H',
          htfTimeframe: 'Daily',
          viaProxy: false,
        },
      },
    },
    dayState: emptyDayState(),
    plan: null,
  })
  const gold = briefing.sections.find((section) => section.id === 'xauusd')
  assert.equal(gold.unavailable, false)
  assert.match(gold.body, /structure event/)
  assert.ok(gold.bullets.some((bullet) => bullet.startsWith('OTE long zone')))
  assert.ok(gold.bullets.includes('Timeframes aligned'))
  assert.match(briefing.executiveSummary, /Gold:/)
})

test('the edition label and next edition follow the clock', () => {
  const morning = composeBriefing({
    now: new Date('2026-08-21T13:00:00Z'), // 08:00 CT
    resources: NO_RESOURCES,
    dayState: emptyDayState(),
    plan: null,
  })
  assert.equal(morning.edition, 'morning')
  assert.match(morning.nextEditionLabel, /NY Afternoon/)
  assert.equal(editionForMoment(NOW).current.id, 'morning')
})
