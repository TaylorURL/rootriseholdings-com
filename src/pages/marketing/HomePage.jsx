import Hero from '../../components/marketing/home/Hero'
import FxTicker from '../../components/marketing/FxTicker'
import MethodSection from '../../components/marketing/home/MethodSection'
import PlatformSection from '../../components/marketing/home/PlatformSection'
import LiveMarketSection from '../../components/marketing/home/LiveMarketSection'
import TrustSection from '../../components/marketing/home/TrustSection'
import FaqSection from '../../components/marketing/home/FaqSection'
import ClosingCta from '../../components/marketing/ClosingCta'

/**
 * The ground each band sits on is decided here rather than inside the sections,
 * so the rhythm the page reads as - slab, sheet, slab, sheet - is visible in
 * one place and cannot drift as sections are moved.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <FxTicker />
      <MethodSection ground="page" />
      <PlatformSection ground="band" />
      <LiveMarketSection ground="page" />
      <TrustSection ground="band" />
      <FaqSection ground="page" />
      <ClosingCta />
    </>
  )
}
