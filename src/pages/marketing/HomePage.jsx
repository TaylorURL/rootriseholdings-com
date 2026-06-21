import Hero from '../../components/marketing/home/Hero'
import ProblemSection from '../../components/marketing/home/ProblemSection'
import HowItWorksSection from '../../components/marketing/home/HowItWorksSection'
import FeaturesSection from '../../components/marketing/home/FeaturesSection'
import LiveMarketSection from '../../components/marketing/home/LiveMarketSection'
import StatsStrip from '../../components/marketing/home/StatsStrip'
import TrustSection from '../../components/marketing/home/TrustSection'
import ClosingCta from '../../components/marketing/ClosingCta'

/** Cinematic landing page assembling the scroll-driven marketing sections. */
export default function HomePage() {
  return (
    <>
      <Hero />
      <ProblemSection />
      <HowItWorksSection />
      <FeaturesSection />
      <LiveMarketSection />
      <StatsStrip />
      <TrustSection />
      <ClosingCta />
    </>
  )
}
