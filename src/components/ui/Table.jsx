import { motion } from 'framer-motion'
import { cn } from '../../lib/cn'

const ALIGN_CLASSES = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
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
 * Reusable, animated data table styled on the design tokens.
 *
 * @param {object} props
 * @param {TableColumn[]} props.columns
 * @param {object[]} props.rows
 * @param {(row:object) => string|number} [props.rowKey] - stable key accessor (defaults to row.id)
 * @param {React.ReactNode} [props.footer] - optional footer row content
 * @param {React.ReactNode} [props.empty] - rendered when there are no rows
 * @param {boolean} [props.animate=true] - stagger row entrance
 */
export default function Table({ columns, rows, rowKey, footer, empty, animate = true }) {
  const getKey = rowKey ?? ((row) => row.id)

  return (
    <div className="ds-scroll overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  'whitespace-nowrap px-4 py-3 text-xs font-medium uppercase tracking-wide text-text-faint',
                  ALIGN_CLASSES[column.align ?? 'left'],
                  column.headerClassName,
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
              <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-text-faint">
                {empty ?? 'No records to display.'}
              </td>
            </tr>
          )}
          {rows.map((row, index) => (
            <motion.tr
              key={getKey(row)}
              initial={animate ? { opacity: 0, y: 6 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: animate ? index * 0.03 : 0, ease: [0.23, 1, 0.32, 1] }}
              className="group border-b border-border/60 transition-colors last:border-b-0 hover:bg-surface-2"
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    'whitespace-nowrap px-4 py-3 text-text',
                    ALIGN_CLASSES[column.align ?? 'left'],
                    column.className,
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
            <tr className="border-t border-border-strong bg-surface-2/40 font-medium">{footer}</tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}
