import { cn } from '../../lib/cn'

/**
 * The drawn art. Three plates on one 400x280 viewBox, sharing a ground and one
 * ink set, kept as files under public/art so they stay out of the bundle and
 * cache on their own.
 *
 * Each plate draws its own ground, so nothing behind one has to supply a card
 * for it to sit on, and each is sized off the column it lands in rather than
 * pinned to a height - a plate matched to the height of a heading beside it
 * reads as a mark above that heading and the eye skips it.
 */
const PLATES = {
  structure: {
    file: 'structure.svg',
    alt: 'A gold 1H candle chart with the change of character marked below the last swing high, the break of structure above it, and the 62 to 79 percent retracement band shaded between them.',
  },
  ticket: {
    file: 'ticket.svg',
    alt: 'A logged trade ticket showing entry, stop, target and a 2.0R ratio, graded A plus, with the daily risk budget at 0.9 of 1 percent and a warning that two losses lock the day.',
  },
  briefing: {
    file: 'briefing.svg',
    alt: 'The London edition of the daily briefing: a high-impact CPI release, the dollar index down a third of a percent, a long-only bias, the 1H structure line with its break marked, and the remaining sections listed beneath.',
  },
}

export default function Plate({ name, className, loading = 'lazy' }) {
  const plate = PLATES[name]
  if (!plate) return null

  return (
    <img
      src={`/art/${plate.file}`}
      alt={plate.alt}
      width={400}
      height={280}
      loading={loading}
      decoding="async"
      className={cn('block h-auto w-full rounded-card', className)}
    />
  )
}
