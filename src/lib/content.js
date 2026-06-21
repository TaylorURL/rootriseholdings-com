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
    title: 'Scripts watch the market',
    summary: 'Our algorithms read every tracked pair around the clock.',
    detail:
      'Purpose-built scripts ingest live and historical price action across majors, minors and exotics — scanning momentum, structure, volatility and session context on every candle, on every timeframe, without fatigue or bias.',
  },
  {
    id: '02',
    icon: Crosshair,
    title: 'Signals are generated',
    summary: 'When conditions align, the system flags a buy or sell.',
    detail:
      'Each setup is scored for confidence and paired with a suggested entry, target and stop. You see the reasoning — the catalysts behind the call — not just an arrow. No black boxes you can’t interrogate.',
  },
  {
    id: '03',
    icon: ListChecks,
    title: 'You decide and act',
    summary: 'You place the trade on your own broker. Always your call.',
    detail:
      'Rise & Root never touches your funds or your broker. Signals are decision-support — you weigh them, size them, and execute on your own terms. Optional automated execution via third-party brokers is on our roadmap.',
  },
]

/** Platform capability cards. */
export const PLATFORM_FEATURES = [
  {
    icon: Brain,
    title: 'Algorithmic signal engine',
    body: 'A library of scripts evaluates structure, momentum and volatility to surface high-conviction buy/sell setups as they form.',
  },
  {
    icon: LineChart,
    title: 'Live charts, 14 pairs',
    body: 'Streaming charts across majors, minors and exotics — annotated with the levels and signals that matter right now.',
  },
  {
    icon: GaugeCircle,
    title: 'Confidence scoring',
    body: 'Every signal carries a confidence score and a clear risk/reward, so you can triage by conviction at a glance.',
  },
  {
    icon: Bell,
    title: 'Real-time alerts',
    body: 'Get notified the moment a setup triggers, so you never miss the window between signal and move.',
  },
  {
    icon: Activity,
    title: 'Market context',
    body: 'Session state, liquidity, sentiment and catalysts framed alongside each signal — the why behind the what.',
  },
  {
    icon: Workflow,
    title: 'Built to integrate',
    body: 'A clean, swappable data layer today; optional broker-execution hookups on the roadmap for the traders who want them.',
  },
]

/** Pricing plan feature list ($99/mo single plan). */
export const PRICING_FEATURES = [
  'Live buy/sell signals across all 14 pairs',
  'Algorithmic scripts running 24/5',
  'Confidence scores and risk/reward on every signal',
  'Streaming charts with annotated levels',
  'Real-time signal alerts',
  'Market sentiment and session context',
  'Full signal history and performance breakdown',
  'Cancel anytime — no lock-in',
]

/** Platform metrics for the count-up strip. Operational, never return promises. */
export const PLATFORM_STATS = [
  { value: 14, suffix: '', label: 'Currency pairs monitored' },
  { value: 24, suffix: '/5', label: 'Market coverage', raw: true },
  { value: 99.9, suffix: '%', decimals: 1, label: 'Signal feed uptime' },
  { value: 60, prefix: '<', suffix: 's', label: 'Signal to alert' },
]

/** Pricing & product FAQs. */
export const FAQS = [
  {
    question: 'Does Rise & Root trade for me or manage my money?',
    answer:
      'No. Rise & Root is a decision-support tool. Our scripts analyze the market and generate buy and sell signals — you place every trade yourself, on your own broker. We never execute trades, hold your funds, or manage money on your behalf.',
  },
  {
    question: 'What exactly do I get for $99/month?',
    answer:
      'Full access to the signal terminal: live algorithmic buy/sell signals across all 14 pairs, confidence scores and risk/reward on every setup, streaming annotated charts, real-time alerts, market context, and your complete signal history. One plan, everything included.',
  },
  {
    question: 'Will you ever place trades automatically?',
    answer:
      'Automated execution through optional third-party broker integrations is on our roadmap. It is not part of the platform today, and it will always be opt-in. Rise & Root’s core remains decision-support — the signal is ours, the decision is yours.',
  },
  {
    question: 'Do you guarantee profits?',
    answer:
      'No, and we never will. No honest tool can. Forex trading carries substantial risk of loss. Our signals are designed to support better-informed decisions — not to promise returns.',
  },
  {
    question: 'Can I cancel anytime?',
    answer:
      'Yes. The plan is month-to-month with no lock-in. Cancel whenever you like and you keep access through the end of your billing period.',
  },
  {
    question: 'Which currency pairs are covered?',
    answer:
      'Fourteen pairs spanning majors (EUR/USD, GBP/USD, USD/JPY and more), minors, and select exotics — with live charts and signals for each.',
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
