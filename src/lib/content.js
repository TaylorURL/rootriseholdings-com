/** Shared marketing copy, reused across Home and the dedicated detail pages. */

import {
  Activity,
  Bell,
  Brain,
  Crosshair,
  GaugeCircle,
  LineChart,
  ListChecks,
  Lock,
  Radar,
  ShieldCheck,
  Workflow,
} from 'lucide-react'

/** The three-step decision-support loop. Compliance-safe: the user decides/acts. */
export const HOW_IT_WORKS_STEPS = [
  {
    id: '01',
    icon: Radar,
    title: 'Scripts map market structure',
    summary: 'Algorithms read structure across timeframes, around the clock.',
    detail:
      'Purpose-built scripts track market structure on gold, the indices and a focused FX watch list — higher-highs and higher-lows, swing points, session context. Bias is set from the Daily and 4H; entries are hunted on the 1H and 15m. No fatigue, no bias.',
  },
  {
    id: '02',
    icon: Crosshair,
    title: 'BOS / CHoCH / OTE signals fire',
    summary: 'When structure breaks and price taps the OTE, a setup is flagged.',
    detail:
      'The engine flags a Break of Structure (continuation) or Change of Character (reversal), waits for the pullback into the Optimal Trade Entry (62–79%), then scores the setup with entry, stop and target — every call clears a 1:2 minimum. You see the catalysts, not just an arrow.',
  },
  {
    id: '03',
    icon: ListChecks,
    title: 'You decide and act',
    summary: 'You place the trade on your own broker. Always your call.',
    detail:
      'Root & Rise never touches your funds or your broker. Signals are decision-support — you weigh them, size them, and execute on your own terms. Optional automated execution via third-party brokers is on our roadmap.',
  },
]

/** Platform capability cards. */
export const PLATFORM_FEATURES = [
  {
    icon: Brain,
    title: 'Smart Money structure engine',
    body: 'Scripts built on the Gemini Market Structure Pro indicator auto-detect BOS and CHoCH, mark the OTE zone, and session-filter to surface only high-conviction setups.',
  },
  {
    icon: LineChart,
    title: 'A focused instrument set',
    body: 'Gold (XAUUSD), the indices (NAS100, US30, SP500) and an FX watch list (USDJPY, NZDUSD, NZDJPY) — streaming charts annotated with structure and the levels that matter now.',
  },
  {
    icon: GaugeCircle,
    title: 'Confidence and R:R scoring',
    body: 'Every signal carries a confidence score and a clear reward-to-risk that already clears the 1:2 minimum, so you can triage by conviction at a glance.',
  },
  {
    icon: Bell,
    title: 'Real-time alerts',
    body: 'Get notified the moment a setup triggers, so you never miss the window between signal and move.',
  },
  {
    icon: Activity,
    title: 'Daily briefing & context',
    body: 'A nine-section daily read — economic events, DXY, gold and index structure, FX watch, sentiment and the day plan — framing the why behind each setup.',
  },
  {
    icon: Workflow,
    title: 'Risk discipline, built in',
    body: 'The journal enforces the playbook visually: 1% max risk, a 0.5% daily loss limit, a hard stop after two losses, and a two A+ setups per day cap.',
  },
]

/** Pricing plan feature list ($99/mo single plan). */
export const PRICING_FEATURES = [
  'Live SMC signals on gold, the indices and the FX watch list',
  'Structure scripts running 24/5',
  'Confidence scores and 1:2-minimum R:R on every setup',
  'Streaming charts annotated with BOS / CHoCH / OTE',
  'Real-time signal alerts',
  'Nine-section daily briefing and market context',
  'Full trade journal with R-multiple performance breakdown',
  'Cancel anytime — no lock-in',
]

/** Platform metrics for the count-up strip. Operational, never return promises. */
export const PLATFORM_STATS = [
  { value: 7, suffix: '', label: 'Instruments tracked' },
  { value: 24, suffix: '/5', label: 'Market coverage', raw: true },
  { value: 99.9, suffix: '%', decimals: 1, label: 'Signal feed uptime' },
  { value: 60, prefix: '<', suffix: 's', label: 'Signal to alert' },
]

/** Pricing & product FAQs. */
export const FAQS = [
  {
    question: 'Does Rise & Root trade for me or manage my money?',
    answer:
      'No. Rise & Root is a decision-support tool. Our scripts analyze market structure and generate buy and sell signals — you place every trade yourself, on your own broker. We never execute trades, hold your funds, or manage money on your behalf.',
  },
  {
    question: 'What exactly do I get for $99/month?',
    answer:
      'Full access to the signal terminal: live SMC signals on gold, the indices and the FX watch list, confidence scores and R:R on every setup, streaming charts annotated with structure, real-time alerts, the nine-section daily briefing, and a full trade journal. One plan, everything included.',
  },
  {
    question: 'Will you ever place trades automatically?',
    answer:
      'Automated execution through optional third-party broker integrations is on our roadmap. It is not part of the platform today, and it will always be opt-in. Rise & Root’s core remains decision-support — the signal is ours, the decision is yours.',
  },
  {
    question: 'Do you guarantee profits?',
    answer:
      'No, and we never will. No honest tool can. Trading carries substantial risk of loss. Our signals are designed to support better-informed decisions — not to promise returns.',
  },
  {
    question: 'Can I cancel anytime?',
    answer:
      'Yes. The plan is month-to-month with no lock-in. Cancel whenever you like and you keep access through the end of your billing period.',
  },
  {
    question: 'Which instruments are covered?',
    answer:
      'A deliberately focused set: gold (XAUUSD), the indices (NAS100, US30, SP500), and an FX watch list (USDJPY, NZDUSD, NZDJPY) read for context — with live charts and structure-based signals for each.',
  },
]

/** Trust pillars used on About / feature surfaces. */
export const TRUST_PILLARS = [
  {
    icon: ShieldCheck,
    title: 'Decision-support, not a fund',
    body: 'We don’t custody funds or execute trades. You stay in full control of your capital and your broker.',
  },
  {
    icon: Lock,
    title: 'Transparent by design',
    body: 'Every signal shows its reasoning. No black boxes, no “trust us” — you see the catalysts behind each call.',
  },
  {
    icon: ShieldCheck,
    title: 'Compliance-first language',
    body: 'No guaranteed returns, no performance promises. Honest framing about risk, always.',
  },
]
