/**
 * Dark, design-token-styled shell for Recharts custom tooltips.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 */
export function ChartTooltipShell({ children }) {
  return (
    <div className="rounded-md border border-border bg-surface-2 px-3 py-2 text-xs text-text shadow-lg">
      {children}
    </div>
  )
}

/**
 * Generic single-series tooltip rendering a label and a formatted value.
 *
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
      <p className="font-mono text-text-faint">{point[labelKey]}</p>
      <p className="font-mono font-semibold tabular-nums text-text">{format(point[valueKey])}</p>
    </ChartTooltipShell>
  )
}
