import { motion } from 'framer-motion'
import { cn } from '../../lib/cn'
import ChangeIndicator from './ChangeIndicator'

/**
 * Stat card with a label, large value, optional icon, and a change badge.
 *
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
        'group relative overflow-hidden rounded-lg border border-border bg-surface p-5 shadow-sm',
        'transition-colors hover:border-border-hover',
      )}
    >
      {active && (
        <span
          className="absolute inset-x-0 top-0 h-0.5 bg-[var(--ds-accent-face)]"
          aria-hidden="true"
        />
      )}
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-text-faint">{label}</p>
        {Icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-surface-2 text-text-muted transition-colors group-hover:text-accent-bright">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
      </div>
      <p className={cn('mt-3 font-mono text-2xl font-semibold tabular-nums tracking-tight', valueClassName)}>
        {value}
      </p>
      {(changePct !== undefined || changeLabel) && (
        <div className="mt-2 flex items-center gap-2">
          {changePct !== undefined && <ChangeIndicator value={changePct} size="sm" />}
          {changeLabel && <span className="text-xs text-text-faint">{changeLabel}</span>}
        </div>
      )}
    </motion.div>
  )
}
