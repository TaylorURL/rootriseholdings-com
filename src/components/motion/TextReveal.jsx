import { motion, useReducedMotion } from 'framer-motion'
import { DURATION, EASE_OUT, REVEAL_VIEWPORT } from '../../lib/marketingMotion'
import { cn } from '../../lib/cn'

const container = (stagger) => ({
  hidden: {},
  visible: { transition: { staggerChildren: stagger, delayChildren: 0.05 } },
})

const word = {
  hidden: { y: '110%' },
  visible: { y: '0%', transition: { duration: DURATION.cinematic, ease: EASE_OUT } },
}

/**
 * Headline reveal that wipes words up from a clipped baseline — the signature
 * marketing display-text motion. Each word lives in an overflow-hidden mask so
 * it reads like type being set. Reduced-motion renders the text statically.
 *
 * @param {object} props
 * @param {string} props.text - plain text to animate per word
 * @param {React.ElementType} [props.as='span']
 * @param {number} [props.stagger=0.08]
 * @param {string} [props.className]
 */
export default function TextReveal({ text, as: Tag = 'span', stagger = 0.08, className }) {
  const reduce = useReducedMotion()
  const words = text.split(' ')

  if (reduce) return <Tag className={className}>{text}</Tag>

  return (
    <motion.span
      variants={container(stagger)}
      initial="hidden"
      whileInView="visible"
      viewport={REVEAL_VIEWPORT}
      className={cn('inline-flex flex-wrap', className)}
      aria-label={text}
    >
      {words.map((token, index) => (
        <span key={`${token}-${index}`} className="mr-[0.28em] inline-block overflow-hidden pb-[0.12em]">
          <motion.span variants={word} className="inline-block" aria-hidden="true">
            {token}
          </motion.span>
        </span>
      ))}
    </motion.span>
  )
}
