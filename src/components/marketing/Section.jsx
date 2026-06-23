import { cn } from '../../lib/cn'
import Reveal from './Reveal'
import Eyebrow from './Eyebrow'

/** Max-width content wrapper for marketing sections. */
export function Container({ children, className }) {
  return <div className={cn('mx-auto w-full max-w-7xl px-6 lg:px-10', className)}>{children}</div>
}

/**
 * Vertical section rhythm wrapper. Pins its own theme tone so each section paints
 * a deliberate dark or light band — consumed by the adaptive marketing navbar via
 * `data-theme` hit-testing.
 *
 * @param {object} props
 * @param {string} [props.id]
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 * @param {'dark'|'light'} [props.tone='dark']
 */
export function Section({ id, children, className, tone = 'dark' }) {
  return (
    <section
      id={id}
      data-theme={tone}
      className={cn('relative bg-bg py-24 text-text sm:py-32', className)}
    >
      {children}
    </section>
  )
}

/**
 * Standard section heading block: eyebrow, large display title, supporting copy.
 *
 * @param {object} props
 * @param {string} props.eyebrow
 * @param {React.ReactNode} props.title
 * @param {React.ReactNode} [props.description]
 * @param {boolean} [props.center=false]
 * @param {string} [props.className]
 */
export function SectionHeading({ eyebrow, title, description, center = false, className }) {
  return (
    <Reveal className={cn('max-w-3xl', center && 'mx-auto text-center', className)}>
      <Eyebrow className={center ? 'justify-center' : ''}>{eyebrow}</Eyebrow>
      <h2 className="mt-5 text-balance text-3xl font-semibold tracking-tight text-text sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      {description && (
        <p className="mt-5 text-pretty text-base leading-relaxed text-text-muted sm:text-lg">
          {description}
        </p>
      )}
    </Reveal>
  )
}
