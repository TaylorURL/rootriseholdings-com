import { ctDateKey, formatCt } from '../time.js'

/**
 * Economic calendar. The weekly feed is fetched through the site's own
 * `/data/calendar` path — api/calendar serves and caches the upstream JSON in
 * production and the Vite dev server proxies it directly, because the
 * upstream host sends no CORS headers for direct browser use.
 */
const CALENDAR_PATH = '/data/calendar'

/**
 * @param {object[]} rawEvents - upstream rows {title, country, date, impact, forecast, previous}
 * @param {Date | string | number} now
 * @returns {object[]} today's events in CT, oldest first
 */
export function normalizeCalendar(rawEvents, now = new Date()) {
  const todayKey = ctDateKey(now)
  return rawEvents
    .filter((event) => event?.date && ctDateKey(event.date) === todayKey)
    .map((event) => ({
      title: event.title ?? 'Untitled event',
      country: event.country ?? '',
      impact: event.impact ?? 'Low',
      isHighImpact: event.impact === 'High',
      forecast: event.forecast || null,
      previous: event.previous || null,
      at: new Date(event.date).getTime(),
      timeCt: formatCt(event.date, { month: undefined, day: undefined }),
      isPast: new Date(event.date).getTime() < new Date(now).getTime(),
    }))
    .sort((a, b) => a.at - b.at)
}

/**
 * @param {object} [options]
 * @param {AbortSignal} [options.signal]
 * @param {Date} [options.now]
 * @returns {Promise<object[] | null>} today's normalized events, or null when
 *   the feed is unreachable
 */
export async function fetchTodayCalendar({ signal, now = new Date() } = {}) {
  try {
    const response = await fetch(CALENDAR_PATH, { signal })
    if (!response.ok) return null
    const payload = await response.json()
    if (!Array.isArray(payload)) return null
    return normalizeCalendar(payload, now)
  } catch {
    return null
  }
}
