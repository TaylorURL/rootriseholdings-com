/**
 * The bridge between the design tokens and the chart engine.
 *
 * Every colour on this site is a CSS custom property, which is what lets one
 * token change repaint three themes at once. The chart engine draws to a canvas
 * and takes concrete colours, so it cannot read a variable - it has to be told
 * `#4ade80`, not `var(--ds-positive)`. Resolving them here keeps that
 * translation in one place rather than hard-coding a palette next to the chart
 * and letting it drift away from the rest of the page the first time a token
 * moves.
 *
 * The values are read off a live element rather than off `:root`, because the
 * shells carry their own `data-theme` and a chart inside one resolves against
 * that shell rather than against the document. Reading the document would paint
 * every chart in the app in whatever theme the marketing pages were using.
 */

/** Tokens a chart needs, and what to fall back to when one cannot be read. */
const FALLBACKS = {
  '--ds-positive': '#22c55e',
  '--ds-danger': '#ef4444',
  '--ds-accent-bright': '#6366f1',
  '--ds-border': '#1e293b',
  '--ds-border-strong': '#334155',
  '--ds-text-faint': '#64748b',
  '--ds-text-muted': '#94a3b8',
  '--ds-surface': '#0f172a',
  '--ds-bg': '#020617',
}

/**
 * @param {Element|null} element - anything inside the shell the chart lives in
 * @returns {Record<string, string>} token name to a concrete colour
 */
export function resolveTokens(element) {
  const target = element ?? (typeof document === 'undefined' ? null : document.documentElement)
  if (!target || typeof window === 'undefined') return { ...FALLBACKS }
  const styles = window.getComputedStyle(target)
  const resolved = {}
  for (const [token, fallback] of Object.entries(FALLBACKS)) {
    const value = styles.getPropertyValue(token).trim()
    resolved[token] = value || fallback
  }
  return resolved
}

/**
 * The chart engine's own options, built from the tokens.
 *
 * Two decisions here are about touch rather than colour, and they are the ones
 * that make the difference on a phone. `handleScroll.vertTouchDrag` is off so a
 * finger dragged up the page scrolls the page: left on, the chart swallows the
 * gesture and the reader is stuck on it, which is the single most common way a
 * chart makes a page feel broken on mobile. Horizontal drag and pinch stay on,
 * because panning and zooming the series is the whole point of putting a chart
 * in front of somebody.
 *
 * @param {Record<string,string>} tokens - from {@link resolveTokens}
 * @param {object} [options]
 * @param {boolean} [options.timeAxis=true] - draw the time scale
 * @param {boolean} [options.priceAxis=true] - draw the price scale
 * @param {boolean} [options.grid=true]
 * @param {boolean} [options.interactive=true] - allow pan and zoom
 */
export function chartOptions(
  tokens,
  { timeAxis = true, priceAxis = true, grid = true, interactive = true } = {}
) {
  return {
    layout: {
      background: { color: 'transparent' },
      textColor: tokens['--ds-text-faint'],
      fontFamily:
        'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
      fontSize: 11,
    },
    grid: {
      vertLines: { visible: false },
      horzLines: { visible: grid, color: tokens['--ds-border'], style: 1 },
    },
    rightPriceScale: {
      visible: priceAxis,
      borderVisible: false,
      scaleMargins: { top: 0.12, bottom: 0.12 },
    },
    timeScale: {
      visible: timeAxis,
      borderVisible: false,
      timeVisible: true,
      secondsVisible: false,
      rightOffset: 2,
      barSpacing: 8,
      lockVisibleTimeRangeOnResize: true,
    },
    crosshair: {
      mode: 1,
      vertLine: {
        color: tokens['--ds-border-strong'],
        width: 1,
        style: 3,
        labelBackgroundColor: tokens['--ds-surface'],
      },
      horzLine: {
        color: tokens['--ds-border-strong'],
        width: 1,
        style: 3,
        labelBackgroundColor: tokens['--ds-surface'],
      },
    },
    // Vertical touch drag stays with the page, so a chart never traps a scroll.
    handleScroll: {
      mouseWheel: interactive,
      pressedMouseMove: interactive,
      horzTouchDrag: interactive,
      vertTouchDrag: false,
    },
    handleScale: {
      axisPressedMouseMove: interactive,
      mouseWheel: interactive,
      pinch: interactive,
    },
  }
}
