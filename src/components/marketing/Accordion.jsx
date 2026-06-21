import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { cn } from '../../lib/cn'
import { EASE_OUT } from '../../lib/marketingMotion'

/** Single expandable row. */
function AccordionItem({ item, isOpen, onToggle, reduceMotion }) {
  return (
    <div className="border-b border-border">
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          className="flex w-full items-center justify-between gap-6 py-6 text-left transition-colors hover:text-text"
        >
          <span className="text-base font-medium text-text sm:text-lg">{item.question}</span>
          <Plus
            className={cn(
              'h-5 w-5 shrink-0 text-text-muted transition-transform duration-300 ease-out',
              isOpen && 'rotate-45 text-accent-bright',
            )}
            aria-hidden="true"
          />
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduceMotion ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <p className="max-w-2xl pb-6 text-pretty leading-relaxed text-text-muted">{item.answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Accessible single-open FAQ accordion with animated height.
 *
 * @param {object} props
 * @param {Array<{question:string, answer:React.ReactNode}>} props.items
 * @param {string} [props.className]
 */
export default function Accordion({ items, className }) {
  const [openIndex, setOpenIndex] = useState(0)
  const reduceMotion = useReducedMotion()

  return (
    <div className={cn('border-t border-border', className)}>
      {items.map((item, index) => (
        <AccordionItem
          key={item.question}
          item={item}
          isOpen={openIndex === index}
          onToggle={() => setOpenIndex(openIndex === index ? -1 : index)}
          reduceMotion={reduceMotion}
        />
      ))}
    </div>
  )
}
