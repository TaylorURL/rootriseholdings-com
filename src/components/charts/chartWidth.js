/**
 * Keeps a chart engine's width on the column it sits in, without observing
 * that column.
 *
 * The width used to be read through a `ResizeObserver` on the holder, and the
 * callback wrote the width it read straight back into the engine inside the
 * same observation pass. Resizing a chart resizes its canvases, which changes
 * how much document there is to scroll, so the page's vertical scrollbar can
 * arrive or leave on that write - and that narrows or widens every column on
 * the page, the measured one included. The observer is handed a second size
 * for the same element, writes again, and the browser abandons the pass with
 * `ResizeObserver loop limit exceeded`. Four charts on the home page each
 * holding one observer is four writes per pass, so the pass settles rarely.
 *
 * Nothing on these pages changes a chart's column except the viewport and the
 * webfonts landing - the reveals are opacity alone - so those are the two
 * things the width is read off instead. Each read is taken on the frame after
 * its event, once layout has settled, and none of them runs inside a layout
 * callback, so there is no pass left to loop.
 *
 * @param {HTMLElement} element - the holder whose width the engine follows
 * @param {(width: number) => void} apply - hands the engine a whole-pixel width
 * @returns {() => void} teardown
 */
export function followChartWidth(element, apply) {
  let live = true
  let frame = 0

  const read = () => {
    frame = 0
    if (!live) return
    const width = element.clientWidth
    if (width) apply(Math.floor(width))
  }

  const schedule = () => {
    if (!live || frame) return
    frame = window.requestAnimationFrame(read)
  }

  read()
  window.addEventListener('resize', schedule)
  window.addEventListener('orientationchange', schedule)
  // A column that rewraps when the webfonts land changes width once, after
  // first paint, with no event of its own to carry it.
  document.fonts?.ready.then(schedule, () => {})

  return () => {
    live = false
    if (frame) window.cancelAnimationFrame(frame)
    window.removeEventListener('resize', schedule)
    window.removeEventListener('orientationchange', schedule)
  }
}
