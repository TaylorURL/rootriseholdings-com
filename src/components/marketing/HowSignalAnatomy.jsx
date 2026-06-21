import { motion, useReducedMotion } from 'framer-motion'
import { Crosshair, Flag, GaugeCircle, ShieldAlert, Target } from 'lucide-react'
import { cn } from '../../lib/cn'
import { EASE_OUT } from '../../lib/marketingMotion'
import CountUp from './CountUp'

/** Illustrative sample signal — clearly labelled, not live or real. */
const SAMPLE = {
  pair: 'GBP/USD',
  side: 'BUY',
  confidence: 84,
  rows: [
    { icon: Crosshair, label: 'Entry', value: '1.2734', note: 'on retest of broken structure' },
    { icon: Target, label: 'Target', value: '1.2862', note: '+128 pips · prior swing high' },
    { icon: ShieldAlert, label: 'Stop', value: '1.2698', note: '−36 pips · below the bounce' },
    { icon: GaugeCircle, label: 'Risk / reward', value: '1 : 3.5', note: 'before fees and slippage' },
  ],
  catalysts: ['Bullish momentum divergence', 'London session liquidity sweep', 'Hold above daily support'],
}

/**
 * A hand-built, clearly-illustrative signal card breaking down what each signal
 * carries: side, confidence, entry/target/stop, R:R and the catalysts behind it.
 *
 * @param {object} props
 * @param {string} [props.className]
 */
export default function HowSignalAnatomy({ className }) {
  const reduce = useReducedMotion()
  return (
    <div
      className={cn(
        'accent-ring relative overflow-hidden rounded-2xl border border-border-strong bg-surface/60 p-6 backdrop-blur-xl sm:p-8',
        className,
      )}
    >
      <div className="border-b border-border pb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--ds-accent-soft)] font-mono text-xs font-bold text-accent-bright">
              {SAMPLE.side}
            </span>
            <div className="leading-tight">
              <p className="font-mono text-base font-semibold text-text">{SAMPLE.pair}</p>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-text-faint">
                Illustrative sample
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-mono text-2xl font-semibold tabular-nums text-accent-bright">
              <CountUp value={SAMPLE.confidence} suffix="%" />
            </p>
            <p className="text-xs text-text-faint">confidence</p>
          </div>
        </div>
        {/* Confidence meter — draws in on scroll into view */}
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
          <motion.div
            className="h-full origin-left rounded-full bg-[var(--ds-accent-face)]"
            initial={{ scaleX: reduce ? SAMPLE.confidence / 100 : 0 }}
            whileInView={{ scaleX: SAMPLE.confidence / 100 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.9, ease: EASE_OUT }}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
        {SAMPLE.rows.map((row) => (
          <div key={row.label} className="bg-bg p-4">
            <dt className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-faint">
              <row.icon className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
              {row.label}
            </dt>
            <dd className="mt-1.5 font-mono text-lg font-semibold tabular-nums text-text">
              {row.value}
            </dd>
            <p className="mt-0.5 text-xs text-text-muted">{row.note}</p>
          </div>
        ))}
      </dl>

      <div className="mt-5">
        <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-faint">
          <Flag className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
          Catalysts
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {SAMPLE.catalysts.map((catalyst) => (
            <li
              key={catalyst}
              className="rounded-full border border-border bg-surface-2 px-3 py-1.5 text-xs text-text-muted"
            >
              {catalyst}
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-6 border-t border-border pt-4 text-xs leading-relaxed text-text-faint">
        Sample values for illustration only. Not a live signal, a recommendation, or a prediction of
        results. You weigh every signal and place every trade yourself.
      </p>
    </div>
  )
}
