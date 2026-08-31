import { motion } from 'framer-motion'
import { cn } from '../../lib/cn'
import ChangeIndicator from './ChangeIndicator'

/**
 * @param {object} props
 * @param {string} props.label
 * @param {string|number} props.value - pre-formatted display value
 * @param {number} [props.changePct] - percentage change for the indicator
 * @param {string} [props.changeLabel] - secondary caption next to the indicator
 * @param {React.ComponentType} [props.icon] - lucide icon component
 * @param {boolean} [props.active=false] - highlight with a top accent line
 * @param {string} [props.valueClassName] - color override for the value text
 */
export default function KpiCard({
  label,
  value,
  changePct,
  changeLabel,
  icon: Icon,
  active = false,
  valueClassName,
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
      className={cn(
        'panel group relative overflow-hidden p-5',
        'transition-colors hover:border-border-hover',
        // The highlight rule is drawn, not stacked: as a pseudo-element it stays
        // out of the card's flow, so the gap under the label is the one the
        // stack sets rather than one the rule leaves behind.
        active &&
          "before:accent-face before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:content-['']"
      )}
    >
      <div className="flex items-start justify-between">
        <p className="font-mono text-[10px] font-medium uppercase tracking-label text-text-faint">
          {label}
        </p>
        {Icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-control bg-surface-2 text-text-muted transition-colors duration-200 ease-out group-hover:text-accent">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
      </div>
      {/* One gap through the stack — label, value, and change all sit 12px
          apart, so a row of these reads as one rhythm rather than three. */}
      <p
        className={cn(
          'mt-3 font-mono text-[1.6rem] font-semibold tabular-nums leading-none tracking-tighter',
          valueClassName
        )}
      >
        {value}
      </p>
      {(changePct !== undefined || changeLabel) && (
        <div className="mt-3 flex items-center gap-2">
          {changePct !== undefined && <ChangeIndicator value={changePct} size="sm" />}
          {changeLabel && <span className="text-xs text-text-faint">{changeLabel}</span>}
        </div>
      )}
    </motion.div>
  )
}
