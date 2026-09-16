import { cn } from '../../lib/cn'

/**
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 */
export function ChartTooltipShell({ children, className }) {
  return (
    <div
      className={cn(
        'relative min-w-[8rem] overflow-hidden rounded-card bg-[var(--ds-bg-elevated)] px-3 py-2 text-xs text-text shadow-lg',
        "before:accent-face before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:content-['']",
        className
      )}
    >
      {children}
    </div>
  )
}

/**
 * @param {object} props
 * @param {boolean} props.active
 * @param {Array<object>} props.payload
 * @param {string} props.labelKey - payload field used as the caption
 * @param {string} props.valueKey - payload field used as the value
 * @param {(value:number) => React.ReactNode} props.format
 */
export function ChartTooltip({ active, payload, labelKey, valueKey, format }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <ChartTooltipShell>
      <p className="tabular-nums text-text-faint">{point[labelKey]}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-text">
        {format(point[valueKey])}
      </p>
    </ChartTooltipShell>
  )
}
