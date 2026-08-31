import { cn } from '../../lib/cn'
import Reveal from '../motion/Reveal'
import Eyebrow from './Eyebrow'

/**
 * The page rail. One width and one gutter ramp, held in CSS so a section that
 * wants the rail cannot quietly set its own.
 */
export function Container({ children, className }) {
  return <div className={cn('container-rail', className)}>{children}</div>
}

/**
 * What a slab declares itself to be.
 *
 * `page` takes whatever the reader's setting paints and is the default, so a
 * section only names a ground when it means to break the page's own. `band` is
 * the contrasting slab that gives the stack its rhythm, and it stands down on a
 * dark page because banding an already-dark ground reads as stripes rather than
 * as structure. `dark` and `paper` pin their ground whatever the setting.
 */
const GROUND_ATTR = {
  page: undefined,
  band: 'band',
  dark: 'dark',
  paper: 'paper',
}

/**
 * A full-bleed ruled slab: hairline at the top, blueprint grid beneath the
 * content, and the ground it declares. Sections stack edge to edge with no
 * margin between them - the rule and the change of ground are the separation.
 */
export function Section({
  id,
  children,
  className,
  ground = 'page',
  grid = true,
  rule = true,
  defer = true,
}) {
  return (
    <section
      id={id}
      data-ground={GROUND_ATTR[ground]}
      className={cn(
        'relative overflow-hidden bg-bg py-20 text-text sm:py-28',
        rule && 'border-t border-border',
        defer && 'section-defer',
        className
      )}
    >
      {grid ? (
        <div className="grid-blueprint grid-fade absolute inset-0" aria-hidden="true" />
      ) : null}
      {rule ? (
        <div className="rule-accent absolute inset-x-0 top-0 h-px" aria-hidden="true" />
      ) : null}
      <Container className="relative">{children}</Container>
    </section>
  )
}

/**
 * The ruled header a section opens with: an optional label, the heading, and
 * whatever the section wants to say beside it, sitting on one hairline that
 * separates the head from the body.
 */
export function SectionHeading({ eyebrow, title, description, meta, id, className }) {
  return (
    <Reveal>
      <header className={cn('mb-12 border-b border-border pb-8', className)}>
        {eyebrow ? <Eyebrow className="mb-4">{eyebrow}</Eyebrow> : null}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <h2 id={id} className="t-h2 max-w-[18ch] text-text">
            {title}
          </h2>
          {meta ? <div className="shrink-0">{meta}</div> : null}
        </div>
        {description ? (
          <p className="t-lede mt-6 max-w-[58ch] text-text-muted">{description}</p>
        ) : null}
      </header>
    </Reveal>
  )
}
