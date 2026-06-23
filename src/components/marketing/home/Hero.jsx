import { useRef } from 'react'
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'
import { ArrowRight, Signal } from 'lucide-react'
import { EASE_OUT, SPRING_CURSOR } from '../../../lib/marketingMotion'
import { PRODUCT } from '../../../lib/brand'
import Eyebrow from '../Eyebrow'
import MarketingButton from '../MarketingButton'
import LivePairChart from '../../ui/LivePairChart'
import FxTicker from '../FxTicker'
import HeroSignalField from './HeroSignalField'

const ENTER = {
  hidden: { opacity: 0, y: 28 },
  visible: (custom) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE_OUT, delay: custom * 0.08 },
  }),
}

/** The cinematic landing hero: cursor-reactive signal field, mission, live panel. */
export default function Hero() {
  const sectionRef = useRef(null)
  const reduceMotion = useReducedMotion()
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  })
  const panelY = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : -60])
  const copyY = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : 40])
  const glowOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.2])

  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const offsetX = useSpring(rawX, SPRING_CURSOR)
  const offsetY = useSpring(rawY, SPRING_CURSOR)

  const handleMove = (event) => {
    const node = sectionRef.current
    if (reduceMotion || !node || event.pointerType === 'touch') return
    const rect = node.getBoundingClientRect()
    const px = (event.clientX - rect.left) / rect.width
    const py = (event.clientY - rect.top) / rect.height
    rawX.set(px - 0.5)
    rawY.set(py - 0.5)
    node.style.setProperty('--mx', `${px * 100}%`)
    node.style.setProperty('--my', `${py * 100}%`)
  }

  const handleLeave = () => {
    rawX.set(0)
    rawY.set(0)
  }

  return (
    <section
      ref={sectionRef}
      data-theme="dark"
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className="relative overflow-hidden bg-bg pt-32 text-text sm:pt-40"
    >
      {/* Technical grid + reactive signal field + purple key light */}
      <div className="pointer-events-none absolute inset-0 bg-grid bg-grid-fade opacity-60" aria-hidden="true" />
      <HeroSignalField offsetX={offsetX} offsetY={offsetY} />
      <motion.div
        style={{ opacity: glowOpacity }}
        className="accent-glow-strong pointer-events-none absolute -top-44 left-1/2 h-[680px] w-[680px] -translate-x-1/2"
        aria-hidden="true"
      />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 px-6 pb-24 lg:grid-cols-[1.05fr_0.95fr] lg:px-10">
        <motion.div style={{ y: copyY }}>
          <div>
            <motion.div initial="hidden" animate="visible" custom={0} variants={ENTER}>
              <Eyebrow>Smart Money Concepts Signal Intelligence</Eyebrow>
            </motion.div>

            <motion.h1
              initial="hidden"
              animate="visible"
              custom={1}
              variants={ENTER}
              className="mt-6 text-balance text-5xl font-semibold leading-[1.02] tracking-tight text-text sm:text-6xl lg:text-7xl"
            >
              Trade on <span className="text-gradient-accent">signal</span>,
              <br />
              not on instinct.
            </motion.h1>

            <motion.p
              initial="hidden"
              animate="visible"
              custom={2}
              variants={ENTER}
              className="mt-7 max-w-xl text-pretty text-lg leading-relaxed text-text-muted"
            >
              {PRODUCT.valueProp}
            </motion.p>

            <motion.div
              initial="hidden"
              animate="visible"
              custom={3}
              variants={ENTER}
              className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <MarketingButton to="/signup" size="lg">
                Get Access — ${PRODUCT.monthlyPrice}/mo
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </MarketingButton>
              <MarketingButton to="/how-it-works" variant="secondary" size="lg">
                See how it works
              </MarketingButton>
            </motion.div>

            <motion.p
              initial="hidden"
              animate="visible"
              custom={4}
              variants={ENTER}
              className="mt-6 font-mono text-xs uppercase tracking-[0.18em] text-text-faint"
            >
              You hold the trigger · We never trade your money
            </motion.p>
          </div>
        </motion.div>

        <motion.div style={{ y: panelY }} className="relative">
          <motion.div
            initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.96, y: reduceMotion ? 0 : 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.2 }}
            className="accent-ring relative rounded-2xl border border-border-strong bg-surface/70 p-5 shadow-lg backdrop-blur-xl"
          >
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <Signal className="h-4 w-4 text-accent-bright" aria-hidden="true" />
                <span className="font-mono text-xs uppercase tracking-[0.18em] text-text-muted">
                  Live Signal Feed
                </span>
              </div>
              <span className="flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1 font-mono text-[11px] text-positive">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-positive opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-positive" />
                </span>
                LIVE
              </span>
            </div>

            <div className="pt-5">
              <LivePairChart symbol="XAUUSD" height={200} />
            </div>

            {/* Signal callout — the product's core output */}
            <div className="mt-4 flex items-center justify-between rounded-xl border border-[var(--ds-accent-soft)] bg-[var(--ds-accent-softer)] p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--ds-accent-soft)] font-mono text-xs font-bold text-accent-bright">
                  BUY
                </span>
                <div className="leading-tight">
                  <p className="font-mono text-sm font-semibold text-text">XAU/USD · 1H</p>
                  <p className="text-xs text-text-faint">OTE long · bullish CHoCH</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-lg font-semibold tabular-nums text-accent-bright">91%</p>
                <p className="text-xs text-text-faint">confidence</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      <FxTicker />
    </section>
  )
}
