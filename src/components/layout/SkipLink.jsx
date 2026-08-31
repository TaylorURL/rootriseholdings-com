/**
 * First stop in the tab order, so a keyboard reader reaches the page's content
 * without walking the navigation on every route. Off-screen until it takes
 * focus, then it sits over the header where it can be read and pressed.
 *
 * @param {object} props
 * @param {string} [props.targetId] - id of the main region it jumps to
 */
export default function SkipLink({ targetId = 'main-content' }) {
  return (
    <a
      href={`#${targetId}`}
      className="focus-ring sr-only rounded-control border border-border bg-surface-2 px-4 py-2 text-sm font-medium text-text focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
    >
      Skip to Content
    </a>
  )
}
