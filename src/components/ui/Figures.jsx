import { cn } from '../../lib/cn'

/**
 * The treatment every label in the terminal takes.
 *
 * A label is the word that says what a number is, so it is the last thing on a
 * trading screen that should be hard to read. It is set the way the dashboard
 * kit sets one: the body face at twelve pixels, in the quieter ink, in the
 * Title Case the copy is already written in. One constant keeps a dozen files
 * from drifting apart.
 *
 * Both forms are exported. The class is for the places that already own their
 * element - a table head, a definition term - and the component is for the rest.
 */
export const RULE_LABEL = 'text-xs leading-4 text-text-muted'

/**
 * What a panel calls itself, which is not what a figure calls itself.
 *
 * A heading that reads quieter than the numbers underneath it is the opposite
 * of legible, so a panel is named at the kit's title step - twenty pixels,
 * medium weight, full-strength ink - and a figure's label stays at twelve.
 */
export const PANEL_TITLE = 'text-lg font-medium leading-7 text-text sm:text-xl'

/**
 * @param {object} props
 * @param {React.ReactNode} props.children - the label, in Title Case
 * @param {string} [props.title] - what an abbreviation stands for, on hover
 * @param {'p'|'h2'|'h3'|'dt'|'span'} [props.as='p']
 * @param {string} [props.className]
 */
export function RuleLabel({ children, title, as: Tag = 'p', className }) {
  return (
    <Tag className={cn(RULE_LABEL, className)} title={title}>
      {children}
    </Tag>
  )
}

/**
 * A run of labelled figures, ruled rather than boxed.
 *
 * The count comes from the space, not from a breakpoint: a viewport query knows
 * how wide the window is and nothing about the column the figures landed in, so
 * four tiles forced into a three-hundred-pixel rail overlap each other while the
 * page around them reads as roomy. auto-fit against a minimum width asks the
 * column instead, and the row reflows wherever it is put.
 *
 * Boxing each figure would draw a grid of small cards; one hairline between
 * them says the same thing and leaves the numbers as the loudest part.
 *
 * The hairline is cast by each figure rather than shown through a gap in this
 * element's own background. A gap only has a colour where a figure is next to
 * it, and the row asks the column how many fit rather than being told, so five
 * figures in a three-column row leave a sixth cell nothing ever fills - which
 * painted a raw block of border colour on exactly the narrow screens the row
 * reflows for. A ring around each figure draws the same line and an empty cell
 * draws nothing, whatever the arithmetic comes out at.
 */
export function FigureRow({ children, min = '6.5rem', className }) {
  return (
    <dl
      className={cn('grid overflow-hidden rounded-card', className)}
      style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${min}, 1fr))` }}
    >
      {children}
    </dl>
  )
}

/**
 * One figure. The label is set small and quiet above a tabular value, so a
 * column of them lines up on the decimal and does not jitter as it updates.
 *
 * @param {object} props
 * @param {React.ReactNode} props.label - in Title Case
 * @param {React.ReactNode} props.value
 * @param {string} [props.tone] - a text colour class for the value
 * @param {React.ReactNode} [props.note] - what the value is measured against
 * @param {string} [props.title] - what an abbreviated label stands for, on hover
 * @param {string} [props.className]
 */
export function Figure({ label, value, tone, note, title, className }) {
  return (
    <div className={cn('bg-surface px-4 py-3 shadow-[0_0_0_1px_var(--ds-border)]', className)}>
      <dt className={cn(RULE_LABEL, 'truncate')} title={title}>
        {label}
      </dt>
      <dd
        className={cn('mt-1 truncate text-base font-medium tabular-nums leading-6 text-text', tone)}
      >
        {value}
      </dd>
      {note ? <dd className="truncate text-xs text-text-faint">{note}</dd> : null}
    </div>
  )
}
