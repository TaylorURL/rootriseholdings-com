import { Container } from '../Section'
import Eyebrow from '../Eyebrow'
import MarketingButton from '../MarketingButton'
import LivePairChart from '../../charts/LivePairChartAsync'
import { PRODUCT } from '../../../lib/brand'
import { RISK_RULES } from '../../../data/riskRules'

/** The four figures the rule book is, shown as the desk states them. */
const RULE_CHIPS = [
  { label: 'Risk / Trade', value: `${RISK_RULES.maxRiskPerTradePct}%` },
  { label: 'Daily Stop', value: `${RISK_RULES.dailyLossLimitPct}%` },
  { label: 'Min R:R', value: `${RISK_RULES.minRewardToRisk}R` },
  { label: 'A+ / Day', value: `${RISK_RULES.maxAPlusSetupsPerDay}` },
]

/**
 * The masthead. Always the navy slab, whatever the reader's setting, because
 * the bar rides transparent over it and needs one ground it can count on.
 */
export default function Hero() {
  return (
    <section
      data-ground="dark"
      className="relative overflow-hidden bg-bg pb-16 pt-24 text-text sm:pb-20"
    >
      <div className="grid-blueprint grid-fade absolute inset-0" aria-hidden="true" />
      <div
        className="accent-glow absolute -top-40 left-1/2 h-[36rem] w-[62rem] -translate-x-1/2 opacity-70"
        aria-hidden="true"
      />

      <Container className="relative">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div>
            <div className="hero-rise">
              <Eyebrow accent>Smart Money Concepts</Eyebrow>
            </div>
            <div className="hero-rise">
              <h1 className="t-display mt-5 max-w-[13ch] text-text">
                Trade on structure, not on instinct.
              </h1>
            </div>
            <div className="hero-rise">
              <p className="t-lede mt-6 max-w-[48ch] text-text-muted">{PRODUCT.heroLine}</p>
            </div>
            <div className="hero-rise">
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <MarketingButton to="/login" size="lg">
                  Sign In
                </MarketingButton>
                <MarketingButton to="/#method" variant="secondary" size="lg">
                  The Method
                </MarketingButton>
              </div>
            </div>
          </div>

          <div className="card-lift accent-ring relative p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-label text-text-faint">
                Primary Chart
              </span>
              <span className="font-mono text-[11px] uppercase tracking-label text-text-faint">
                XAU/USD · 1H
              </span>
            </div>
            <LivePairChart symbol="XAUUSD" height={240} />
            <dl className="mt-4 grid grid-cols-4 gap-px overflow-hidden rounded-card bg-border">
              {RULE_CHIPS.map((chip) => (
                <div key={chip.label} className="bg-surface px-2 py-3 text-center">
                  <dt className="font-mono text-[10px] uppercase tracking-label text-text-faint">
                    {chip.label}
                  </dt>
                  <dd className="mt-1 font-mono text-base font-semibold tabular-nums text-text">
                    {chip.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Container>
    </section>
  )
}
