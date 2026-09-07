import { Container } from '../Section'
import Eyebrow from '../Eyebrow'
import Reveal from '../../motion/Reveal'
import { cn } from '../../../lib/cn'

/**
 * What every interior page opens with. It is the navy slab the bar rides
 * transparent over, so the bar has one ground it can count on at the top of
 * any route rather than having to sample whatever is behind it.
 */
export default function PageMasthead({ eyebrow, title, description, breadcrumb, className }) {
  return (
    <section
      data-ground="dark"
      className={cn('relative overflow-hidden bg-bg pb-16 pt-24 text-text sm:pb-20', className)}
    >
      <div className="grid-blueprint grid-fade absolute inset-0" aria-hidden="true" />
      <div
        className="accent-glow absolute -top-40 left-1/2 h-[30rem] w-[52rem] -translate-x-1/2 opacity-60"
        aria-hidden="true"
      />

      <Container className="relative">
        {breadcrumb}
        <Reveal>
          {eyebrow ? <Eyebrow accent>{eyebrow}</Eyebrow> : null}
          <h1 className="t-h1 mt-5 max-w-[16ch] text-text">{title}</h1>
          {description ? (
            <p className="t-lede mt-6 max-w-[54ch] text-text-muted">{description}</p>
          ) : null}
        </Reveal>
      </Container>
    </section>
  )
}
