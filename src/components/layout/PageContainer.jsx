import { motion } from 'framer-motion'
import { cn } from '../../lib/cn'
import { fadeUpVariants, pageContainerVariants } from '../../lib/motion'

/**
 * Page wrapper that orchestrates a staggered fade-up entrance for its sections.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 */
export function PageContainer({ children, className }) {
  return (
    <motion.div
      variants={pageContainerVariants}
      initial="hidden"
      animate="visible"
      className={cn('mx-auto w-full max-w-[1400px] space-y-6', className)}
    >
      {children}
    </motion.div>
  )
}

/**
 * Animated child block participating in the page stagger.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 */
export function PageSection({ children, className }) {
  return (
    <motion.div variants={fadeUpVariants} className={className}>
      {children}
    </motion.div>
  )
}
