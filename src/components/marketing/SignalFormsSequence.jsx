import { useRef, useState } from 'react'
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { Crosshair, Radar, Sparkles, Target } from 'lucide-react'
import { Container } from './Section'
import Eyebrow from './Eyebrow'
import CandlestickChart from '../charts/CandlestickChart'
import { generateCandles } from '../../data/mockData'
import { cn } from '../../lib/cn'

const CANDLES = generateCandles(2348, 44, 0.0022, 91)
const MIN_VISIBLE = 8

/** The three narrated phases of a forming SMC signal. */
const PHASES = [
  { icon: Radar, label: 'Mapping structure', body: 'Scripts track market structure across timeframes — Daily/4H bias, swing highs and lows, session context.' },
  { icon: Crosshair, label: 'BOS / CHoCH detected', body: 'Price breaks structure in line with the higher-timeframe bias, then pulls back into the OTE zone (62–79%).' },
  { icon: Sparkles, label: 'Signal fired', body: 'Conditions converge at the OTE. A scored entry is issued with stop and target — your call from here.' },
]

/** The signal card that resolves at the end of the scrub. */
function ResolvedSignal({ visible }) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 12 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="absolute inset-x-4 bottom-4 flex items-center justify-between rounded-xl border border-[var(--ds-accent-soft)] bg-[var(--ds-backdrop)] p-4 backdrop-blur-xl sm:inset-x-6"
      aria-hidden={!visible}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--ds-accent-soft)] font-mono text-xs font-bold text-accent-bright">
          BUY
        </span>
        <div className="leading-tight">
          <p className="font-mono text-sm font-semibold text-text">XAU/USD</p>
          <p className="text-xs text-text-faint">OTE long · bullish CHoCH</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden text-right sm:block">
          <p className="font-mono text-xs text-text-faint">R / R</p>
          <p className="font-mono text-sm font-semibold tabular-nums text-text">1 : 3.3</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-lg font-semibold tabular-nums text-accent-bright">91%</p>
          <p className="text-xs text-text-faint">confidence</p>
        </div>
      </div>
    </motion.div>
  )
}

/**
 * HowItWorks signature section: a pinned, scroll-scrubbed candlestick sequence
 * that builds a signal candle-by-candle as the user scrolls, narrating the three
 * phases beside it. Reduced-motion renders the finished state statically.
 */
export default function SignalFormsSequence() {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const [count, setCount] = useState(reduce ? CANDLES.length : MIN_VISIBLE)
  const [phase, setPhase] = useState(reduce ? 2 : 0)

  useMotionValueEvent(scrollYProgress, 'change', (value) => {
    if (reduce) return
    const next = Math.max(MIN_VISIBLE, Math.round(MIN_VISIBLE + value * (CANDLES.length - MIN_VISIBLE)))
    setCount((current) => (current === next ? current : next))
    setPhase(value < 0.4 ? 0 : value < 0.78 ? 1 : 2)
  })

  const lineScale = useTransform(scrollYProgress, [0, 1], [0, 1])
  const visible = reduce ? CANDLES : CANDLES.slice(0, count)
  const signalLive = phase === 2

  return (
    <section ref={ref} className="relative border-t border-border" style={{ height: reduce ? 'auto' : '320vh' }}>
      <div className={cn('top-0 flex min-h-screen items-center py-20', reduce ? '' : 'sticky')}>
        <Container>
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
            {/* Narration rail */}
            <div>
              <Eyebrow>Anatomy in motion</Eyebrow>
              <h2 className="mt-5 text-balance text-3xl font-semibold tracking-tight text-text sm:text-4xl lg:text-5xl">
                Watch a signal form.
              </h2>
              <p className="mt-4 max-w-md text-pretty leading-relaxed text-text-muted">
                Scroll to replay how the engine moves from raw price action to a scored, explainable
                call — the same loop that runs on every pair, every session.
              </p>

              <ol className="mt-9 space-y-2">
                {PHASES.map((item, index) => {
                  const active = index === phase
                  const done = index < phase
                  return (
                    <li
                      key={item.label}
                      className={cn(
                        'flex gap-4 rounded-xl border p-4 transition-colors duration-300',
                        active
                          ? 'border-[var(--ds-accent-soft)] bg-[var(--ds-accent-softer)]'
                          : 'border-border bg-surface/30',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors duration-300',
                          active || done
                            ? 'border-[var(--ds-accent-soft)] bg-[var(--ds-accent-soft)] text-accent-bright'
                            : 'border-border bg-surface-2 text-text-faint',
                        )}
                      >
                        <item.icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div>
                        <p className={cn('font-mono text-xs uppercase tracking-[0.16em]', active ? 'text-accent-bright' : 'text-text-faint')}>
                          0{index + 1} · {item.label}
                        </p>
                        <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{item.body}</p>
                      </div>
                    </li>
                  )
                })}
              </ol>

              {/* Scroll-linked progress rail */}
              <div className="mt-6 h-1 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                <motion.div className="h-full origin-left rounded-full bg-[var(--ds-accent-face)]" style={{ scaleX: reduce ? 1 : lineScale }} />
              </div>
            </div>

            {/* Pinned chart */}
            <div className="accent-ring relative overflow-hidden rounded-2xl border border-border-strong bg-surface/50 p-5 backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-muted">
                  <Target className="h-3.5 w-3.5 text-accent-bright" aria-hidden="true" />
                  XAU/USD · 1H
                </span>
                <span className={cn('font-mono text-[11px] uppercase tracking-[0.16em] transition-colors', signalLive ? 'text-accent-bright' : 'text-text-faint')}>
                  {signalLive ? 'Signal live' : 'Analyzing…'}
                </span>
              </div>
              <CandlestickChart data={visible} height={300} decimals={2} animate={false} />
              <ResolvedSignal visible={signalLive} />
            </div>
          </div>
        </Container>
      </div>
    </section>
  )
}
