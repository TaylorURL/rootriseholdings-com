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
        'min-w-[10rem] rounded-tile border border-border-strong bg-surface-2 px-3 py-2 text-xs text-text shadow-lg',
        className
      )}
    >
      {children}
    </div>
  )
}

/**
 * One named figure in a tooltip: the name left, the value right, so a column
 * of them reads as a small table rather than a run of bare numbers.
 *
 * @param {object} props
 * @param {React.ReactNode} props.label
 * @param {React.ReactNode} props.value
 * @param {string} [props.tone] - a text colour class for the value
 */
export function TooltipRow({ label, value, tone }) {
  return (
    <p className="mt-1 flex items-baseline justify-between gap-4">
      <span className="text-text-muted">{label}</span>
      <span className={cn('font-semibold tabular-nums text-text', tone)}>{value}</span>
    </p>
  )
}

/**
 * @param {object} props
 * @param {boolean} props.active
 * @param {Array<object>} props.payload
 * @param {string} props.labelKey - payload field used as the caption
 * @param {string} props.valueKey - payload field used as the value
 * @param {string} [props.valueLabel='Value'] - what the value is
 * @param {(value:number) => React.ReactNode} props.format
 */
export function ChartTooltip({
  active,
  payload,
  labelKey,
  valueKey,
  valueLabel = 'Value',
  format,
}) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <ChartTooltipShell>
      <p className="font-medium tabular-nums text-text-faint">{point[labelKey]}</p>
      <TooltipRow label={valueLabel} value={format(point[valueKey])} />
    </ChartTooltipShell>
  )
}
