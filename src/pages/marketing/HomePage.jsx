import Hero from '../../components/marketing/home/Hero'
import ProblemSection from '../../components/marketing/home/ProblemSection'
import HowItWorksSection from '../../components/marketing/home/HowItWorksSection'
import FeaturesSection from '../../components/marketing/home/FeaturesSection'
import LiveMarketSection from '../../components/marketing/home/LiveMarketSection'
import StatsStrip from '../../components/marketing/home/StatsStrip'
import TrustSection from '../../components/marketing/home/TrustSection'
import ClosingCta from '../../components/marketing/ClosingCta'

/**
 * Cinematic landing page assembling the scroll-driven marketing sections.
 *
 * Rhythm: dark hero anchors the brand, then bands alternate down the page —
 * light "problem" → dark "how it works" → light "features" → dark "live charts"
 * → light "stats" → dark "trust" → light "closing CTA" → dark footer bookend.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <ProblemSection tone="light" />
      <HowItWorksSection tone="dark" />
      <FeaturesSection tone="light" />
      <LiveMarketSection tone="dark" />
      <StatsStrip tone="light" />
      <TrustSection tone="dark" />
      <ClosingCta tone="light" />
    </>
  )
}
