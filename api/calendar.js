/**
 * Serves the weekly economic calendar from this site's own origin.
 *
 * The upstream publishes one JSON file for the whole week and meters requests
 * per address. A plain rewrite forwards every briefing's read from the same
 * shared egress, which is exactly the shape it throttles - so a function reads
 * it once and lets the edge serve the stored copy, and the desk keeps its
 * calendar even while the upstream is refusing.
 */
const CALENDAR_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json'

/** Sent so the upstream serves the request rather than throttling it. */
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

/**
 * A week's calendar changes only as its figures print, so the edge may serve a
 * stored copy for fifteen minutes - and keep serving it for a day while the
 * upstream refuses, because last hour's calendar still names today's events.
 */
const CACHE_CONTROL = 'public, s-maxage=900, stale-while-revalidate=86400'

export default async function handler(request, response) {
  try {
    const upstream = await fetch(CALENDAR_URL, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    })
    const body = await upstream.text()
    response.status(upstream.status)
    response.setHeader('Content-Type', 'application/json; charset=utf-8')
    response.setHeader('Cache-Control', upstream.ok ? CACHE_CONTROL : 'no-store')
    response.send(body)
  } catch (error) {
    // The briefing renders an unreachable calendar as unavailable, so the
    // status is what matters here rather than the shape of the body.
    response.status(502).json({ error: String(error) })
  }
}
