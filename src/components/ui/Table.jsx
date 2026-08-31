import { motion } from 'framer-motion'
import { cn } from '../../lib/cn'
import { EASE_OUT } from '../../lib/marketingMotion'

const ALIGN_CLASSES = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
}

/* A flat per-row delay is fine over ten rows and absurd over two hundred: at
   30ms each the last row of a full journal arrives six seconds after the first.
   The delay decays instead, so a long table still opens as one movement. */
const BASE_ROW_DELAY = 0.03
const MIN_ROW_DELAY = 0.006
const DELAY_DECAY = 0.88

function rowDelay(index) {
  return Math.max(MIN_ROW_DELAY, BASE_ROW_DELAY * DELAY_DECAY ** index) * index
}

/**
 * @typedef {object} TableColumn
 * @property {string} key - unique column key / row field accessor
 * @property {React.ReactNode} header - column header label
 * @property {'left'|'right'|'center'} [align='left']
 * @property {(row:object, index:number) => React.ReactNode} [render] - custom cell renderer
 * @property {string} [className] - extra cell className
 * @property {string} [headerClassName] - extra header className
 */

/**
 * The shared data grid.
 *
 * The head sticks, because from the second screen of a long table every column
 * is otherwise unlabelled. Rows answer the pointer through their cells rather
 * than through the row: a cell background paints over a row background, so a
 * row-level hover half-applies wherever a cell carries a tint of its own.
 *
 * @param {object} props
 * @param {TableColumn[]} props.columns
 * @param {object[]} props.rows
 * @param {(row:object) => string|number} [props.rowKey] - stable key accessor (defaults to row.id)
 * @param {React.ReactNode} [props.footer] - optional footer row content
 * @param {React.ReactNode} [props.empty] - rendered when there are no rows
 * @param {boolean} [props.animate=true] - stagger row entrance
 * @param {string} [props.caption] - accessible name for the grid
 */
export default function Table({ columns, rows, rowKey, footer, empty, animate = true, caption }) {
  const getKey = rowKey ?? ((row) => row.id)

  return (
    <div className="ds-scroll overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  'sticky top-0 z-raised whitespace-nowrap border-b border-border bg-surface px-4 py-2.5 font-mono text-[10px] font-medium uppercase tracking-label text-text-faint',
                  ALIGN_CLASSES[column.align ?? 'left'],
                  column.headerClassName
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-10 text-center text-sm text-text-faint"
              >
                {empty ?? 'No records to display.'}
              </td>
            </tr>
          )}
          {rows.map((row, index) => (
            <motion.tr
              key={getKey(row)}
              initial={animate ? { opacity: 0, transform: 'translateY(6px)' } : false}
              animate={{ opacity: 1, transform: 'translateY(0px)' }}
              transition={{
                duration: 0.22,
                delay: animate ? rowDelay(index) : 0,
                ease: EASE_OUT,
              }}
              className="group border-b border-border last:border-b-0"
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    'whitespace-nowrap px-4 py-2.5 text-text transition-colors duration-200 ease-out group-hover:bg-surface-2',
                    ALIGN_CLASSES[column.align ?? 'left'],
                    column.align === 'right' && 'font-mono tabular-nums',
                    column.className
                  )}
                >
                  {column.render ? column.render(row, index) : row[column.key]}
                </td>
              ))}
            </motion.tr>
          ))}
        </tbody>
        {footer && (
          <tfoot>
            <tr className="border-t border-border-strong bg-surface-2 font-medium">{footer}</tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}
