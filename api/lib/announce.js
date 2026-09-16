/**
 * Getting a call off the host and onto a phone.
 *
 * The browser's own notification channel only fires while a tab is open, which
 * makes it useless for the case it exists for: a setup that prints while the
 * reader is driving is exactly the one they never see. The sweep runs whether
 * or not anyone is looking, so it is the right place to push from.
 *
 * A webhook was the first answer and it is still posted, because receivers are
 * already pointed at it. What it never was is a channel that reaches a person:
 * it posts into whatever is listening, and for weeks nothing was. Email is,
 * and the studio already runs one, so a call now goes to the notifications
 * endpoint on taylorurl.com as well. That endpoint holds the sending domain,
 * the recipient list and the brand this desk is drawn in; this side holds a
 * bearer secret and a project name, and neither the addresses nor the mail
 * credentials are anywhere in this repository.
 *
 * Two rules did not change, and they are why this module is shaped the way it
 * is. Announcing happens after the record is written, never before, because a
 * call that reached a phone but not the record is the one failure nothing can
 * be checked against afterwards. And a failure to announce never fails the
 * pass that found the call: the record is the product and the message is a
 * convenience on top of it.
 *
 * What did change is that a lost message is no longer lost. The sweep hands
 * this every standing call the record has not yet marked as announced, rather
 * than only the ones the current pass happened to mint, so a minute in which
 * the endpoint is unreachable costs a two-minute delay instead of a call
 * nobody ever hears about. The cap on how many one pass sends stays, and with
 * a queue behind it the calls it holds back become the next pass's work rather
 * than being dropped on the floor.
 *
 * That queue belongs to the email path alone, and the reason is that only the
 * email path can be retried. Every post to the endpoint carries an idempotency
 * key and lands against a ledger row, so the same call offered on twenty
 * consecutive passes reaches a phone once. The webhook has neither: it posts
 * into a room, and a room told the same thing every two minutes until the call
 * expires - five days, at the longest timeframe the desk publishes - is a room
 * nobody reads any more. So the webhook carries what a pass found, and the
 * queue's retries are not its to carry. Where email is not configured at all
 * the webhook is the channel of record, the record's own stamp is what retires
 * a call, and the queue is exactly its to drain.
 */

import { INSTRUMENT_META, decimalsForInstrument } from '../../src/data/instruments.js'
import { ORIGIN } from '../../src/lib/routing/routeMeta.data.js'

/** Where the notifications endpoint lives when the host does not name one. */
const DEFAULT_NOTIFY_URL = 'https://www.taylorurl.com/api/notify'

/** Which of the studio's projects the endpoint should send as. */
const DEFAULT_NOTIFY_PROJECT = 'root-rise'

/**
 * How long each channel may take before the sweep stops waiting on it.
 *
 * The notifications endpoint fans out to its recipients in parallel behind a
 * shorter cap of its own, so a healthy call answers well inside eight seconds;
 * the webhook is one post to whatever is listening and gets less.
 */
const NOTIFY_TIMEOUT_MS = 8000
const WEBHOOK_TIMEOUT_MS = 4000

/**
 * How long the credential check gets.
 *
 * Less than a send, because it carries nothing and asks the endpoint only to
 * look one row up. A pass should never lose a call it found because the check
 * that no call was owed took too long.
 */
const PROBE_TIMEOUT_MS = 4000

/**
 * How long to wait before the single retry.
 *
 * One retry, and only one. A post that timed out may well have landed - the
 * answer is what was lost, not the message - so it goes again under the same
 * idempotency key, which the endpoint refuses rather than delivering twice.
 * Anything the far end refused on its own terms is not retried at all: a
 * malformed request or a wrong credential fails the same way the second time
 * and the pass has a market to get back to.
 */
const RETRY_MS = 1500

/**
 * The most calls one pass will announce.
 *
 * A sweep that finds a dozen at once is either a genuinely rare morning or a
 * fault, and both are better served by a phone that buzzes a few times and
 * says how many were held back than by one that buzzes twelve times. What is
 * held back is no longer lost - it is still unannounced on the record, so the
 * next pass picks it up.
 */
const MAX_PER_SWEEP = 4

/**
 * The endpoint's own limits, kept on this side too.
 *
 * It cuts anything longer itself, so this is not what enforces them. It is
 * what stops a value that ran long from arriving silently truncated in the
 * middle of a price.
 */
const SUBJECT_LIMIT = 140
const VALUE_LIMIT = 160
const BODY_LIMIT = 4000

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const oneLine = (value, limit) =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit)

function price(value, symbol) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-'
  return value.toFixed(decimalsForInstrument(symbol))
}

function displayName(signal) {
  return INSTRUMENT_META[signal.symbol]?.displaySymbol ?? signal.symbol
}

function rewardToRisk(signal) {
  return Number.isFinite(signal.rewardToRisk) ? `${signal.rewardToRisk.toFixed(2)}:1` : '-'
}

/** The four numbers an order is written from, at the instrument's own precision. */
function levels(signal) {
  return [
    ['Entry', price(signal.entry, signal.symbol)],
    ['Stop', price(signal.stop, signal.symbol)],
    ['Target', price(signal.target, signal.symbol)],
    ['R:R', rewardToRisk(signal)],
  ]
}

/**
 * One call as the pairs a reader fills a ticket in from.
 *
 * Two channels carry the same call and they take it in different shapes - a
 * line of text for a webhook, a two-column reading for an email - so the
 * values are produced once here and rendered twice, rather than being
 * formatted separately and drifting to the cent.
 *
 * @param {object} signal
 * @returns {[string, string][]}
 */
function ticketFor(signal) {
  return [
    ['Instrument', displayName(signal)],
    ['Side', signal.side],
    ['Grade', signal.grade],
    ['Setup', signal.setup],
    ['Timeframe', signal.timeframe],
    ...levels(signal),
  ].map(([label, value]) => [label, oneLine(value, VALUE_LIMIT)])
}

/**
 * One call as a line someone can act on without opening anything.
 *
 * Everything an order needs is here and in the order a ticket is filled in,
 * because the point is that the reader does not have to go and look.
 *
 * @param {object} signal
 * @returns {string}
 */
export function describeForPush(signal) {
  const head = `${signal.side} ${displayName(signal)} · ${signal.grade} ${signal.setup} · ${signal.timeframe}`
  return [head, ...levels(signal).map(([label, value]) => `${label} ${value}`)].join(' | ')
}

/**
 * How loudly a call asks to be read.
 *
 * The ladder decides which recipients are reached and whether the message
 * carries the headers a phone treats as urgent, so an A+ - the grade the desk
 * exists to catch - is the one that breaks through a quiet mode, and the rest
 * arrive without one. Nothing published is ever `info`: a call is a thing to
 * act on within the hour, and the bottom of the ladder is where the daily
 * briefing sits.
 */
function severityFor(signal) {
  return signal.grade === 'A+' ? 'urgent' : 'warning'
}

/**
 * The key that makes a retry a retry rather than a second alert.
 *
 * It is the record's own id, so the same call posted twice - by the retry
 * below, or by two passes racing each other - is refused the second time
 * instead of buzzing a phone again. The fingerprint stands in where a call has
 * not been read back from the table yet, because it is the structural identity
 * of the setup and does not move while the setup is publishable.
 */
function keyFor(signal) {
  const identity = String(signal.id ?? signal.fingerprint ?? '')
  return `signal:${identity.replace(/[^A-Za-z0-9:_.-]/g, '-').slice(0, 180)}`
}

/**
 * One call in the shape the notifications endpoint reads.
 *
 * @param {object} signal
 * @param {object} [options]
 * @param {string} [options.link] - where the message points back to
 * @returns {object} the exact JSON body posted
 */
export function notificationFor(signal, { link = `${ORIGIN}/app/signals` } = {}) {
  const reasons = Array.isArray(signal.reasons) ? signal.reasons.filter(Boolean) : []
  const notification = {
    subject: oneLine(`${signal.grade} ${signal.side} on ${displayName(signal)}`, SUBJECT_LIMIT),
    severity: severityFor(signal),
    lines: ticketFor(signal),
    idempotency_key: keyFor(signal),
  }
  if (reasons.length > 0) notification.body = reasons.join('\n').slice(0, BODY_LIMIT)
  if (link) notification.link = { url: link }
  return notification
}

async function readJson(response) {
  if (typeof response?.json !== 'function') return null
  try {
    return await response.json()
  } catch {
    return null
  }
}

/**
 * One post to the notifications endpoint.
 *
 * A two hundred that delivered to nobody is reported as a failure even though
 * the far end is content, because a message the desk believes it sent and
 * nobody received is the precise shape of the complaint this whole path exists
 * to answer. It is not retried - an empty recipient list is a setting, not a
 * blip - but it is named, and the call stays unannounced on the record so the
 * next pass says so again.
 */
async function post(notification, { url, secret, project, fetcher }) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), NOTIFY_TIMEOUT_MS)
  try {
    const response = await fetcher(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
        'X-Notify-Project': project,
      },
      body: JSON.stringify(notification),
      signal: controller.signal,
    })
    if (!response.ok) {
      return {
        ok: false,
        retry: response.status >= 500,
        error: `the notifications endpoint answered ${response.status}`,
      }
    }
    const answer = await readJson(response)
    if (answer?.duplicate === true) return { ok: true, duplicate: true }
    if (Number(answer?.delivered ?? 0) > 0) return { ok: true, duplicate: false }
    const said = answer?.reason ? `: ${answer.reason}` : ''
    return { ok: false, retry: false, error: `the notification reached nobody${said}` }
  } catch (error) {
    return { ok: false, retry: true, error: String(error?.message ?? error) }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Whether the credential this deployment holds still opens the door, asked
 * without sending anything.
 *
 * The credential is the one part of the alert path that can go wrong while
 * every surface keeps reading healthy. The endpoint holds the digest of the
 * secret and the deployment holds the secret, and the two live in different
 * places that are changed by different hands: the digest is a row in a
 * database, and the secret is an environment variable Vercel snapshots at
 * deploy time. Set a new secret without redeploying and the running deployment
 * keeps the old one; change the row without setting a new secret and the same
 * gap opens from the other side. Either way the desk goes on sweeping, the
 * record goes on filling, and the first thing that says so is a call that
 * nobody hears about.
 *
 * So this asks. The endpoint answers a GET with the project's own record and
 * mails nobody doing it, which makes it the one question that can be put every
 * two minutes without cost. A refusal is the stale-secret case and the caller
 * is expected to treat it as a failed pass; anything else that went wrong on
 * the way is reported as unreachable, because a studio endpoint having a bad
 * minute is not this desk being broken and must not be allowed to look like it.
 *
 * The recipient count comes back with it, since it arrives in the same answer.
 * A project whose list is empty delivers every alert to nobody, which is a
 * different fault with the same silence on it.
 *
 * @param {object} [options]
 * @param {string} [options.url] - the notifications endpoint
 * @param {string} [options.project] - which project it sends as
 * @param {string} [options.secret] - the bearer secret to test
 * @param {typeof fetch} [options.fetcher]
 * @returns {Promise<{state:'ok'|'refused'|'unreachable'|'unconfigured',
 *   status:number|null, recipients:number|null, error:string|null}>}
 */
export async function verifyNotifyCredential(options = {}) {
  const {
    url = process.env.NOTIFY_URL || DEFAULT_NOTIFY_URL,
    project = process.env.NOTIFY_PROJECT || DEFAULT_NOTIFY_PROJECT,
    secret = process.env.NOTIFY_SECRET,
    fetcher = fetch,
  } = options

  const answer = { state: 'unconfigured', status: null, recipients: null, error: null }
  if (!secret || !url) return answer

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
  try {
    const response = await fetcher(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${secret}`, 'X-Notify-Project': project },
      signal: controller.signal,
    })
    if (response.ok) {
      const record = await readJson(response)
      const recipients = Number(record?.recipients ?? 0)
      return {
        state: 'ok',
        status: response.status,
        recipients: Number.isFinite(recipients) ? recipients : null,
        error: null,
      }
    }
    // The endpoint answers a missing header, an unrecognised secret and a slug
    // that does not belong to it with the same sentence, deliberately, so this
    // cannot say which of the three it was - only that what this deployment
    // holds is not what the endpoint expects, which is the whole of what a
    // reader needs to go and look.
    if (response.status === 401 || response.status === 403) {
      return {
        state: 'refused',
        status: response.status,
        recipients: null,
        error: `the notifications endpoint refused this deployment's credential for ${project}, so an alert would not be delivered`,
      }
    }
    return {
      state: 'unreachable',
      status: response.status,
      recipients: null,
      error: `the notifications endpoint answered ${response.status} to a credential check`,
    }
  } catch (error) {
    return {
      state: 'unreachable',
      status: null,
      recipients: null,
      error: String(error?.message ?? error),
    }
  } finally {
    clearTimeout(timer)
  }
}

async function deliver(signal, context) {
  const notification = notificationFor(signal, { link: context.link })
  let outcome = await post(notification, context)
  if (!outcome.ok && outcome.retry) {
    await context.wait(RETRY_MS)
    outcome = await post(notification, context)
  }
  return {
    id: signal.id,
    key: notification.idempotency_key,
    subject: notification.subject,
    ...outcome,
  }
}

/**
 * Every call this pass is sending, each as its own message.
 *
 * One post per call rather than a digest, because the endpoint's idempotency
 * is per notification: a digest that failed halfway could not be retried
 * without re-sending the calls that had already landed.
 */
async function sendAll(going, context) {
  const settled = await Promise.allSettled(going.map((signal) => deliver(signal, context)))
  const results = settled.map((entry, index) =>
    entry.status === 'fulfilled'
      ? entry.value
      : { id: going[index].id, ok: false, error: String(entry.reason?.message ?? entry.reason) }
  )
  const refused = results.filter((result) => !result.ok)
  return {
    delivered: results.filter((result) => result.ok && result.id).map((result) => result.id),
    failed: refused.length,
    error: refused[0]?.error ?? null,
    // Named rather than counted, because the only reader of a failed
    // announcement is somebody asking afterwards why a call they can see on
    // the record never reached them, and a count cannot answer that.
    unsent: refused.map(({ key, subject, error }) => ({ key, subject, error })),
  }
}

async function postWebhook(going, held, { url, fetcher }) {
  const lines = going.map((signal) => describeForPush(signal))
  if (held > 0) lines.push(`(${held} more not shown. The desk has the full record.)`)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS)
  try {
    const response = await fetcher(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // `content` is what a Discord webhook reads and is ignored elsewhere;
      // `text` is what most other receivers read. Sending both means the same
      // URL works against either without the host being told which it is.
      body: JSON.stringify({ content: lines.join('\n'), text: lines.join('\n') }),
      signal: controller.signal,
    })
    if (!response.ok) return { ok: false, error: `webhook answered ${response.status}` }
    return { ok: true, error: null }
  } catch (error) {
    return { ok: false, error: String(error?.message ?? error) }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Announces the calls the record has not announced yet.
 *
 * A host with nowhere to announce to and a pass with nothing to announce are
 * told apart on the way out. Both send nothing and both are fine, but only one
 * of them means the desk cannot reach anybody, and reporting them as the same
 * empty success is how a delivery path comes to be switched off for weeks with
 * every pass reporting that it worked.
 *
 * `delivered` is what the record stamps, and it follows the channel that
 * matters rather than whichever answered first: email is what reaches a phone
 * with every tab closed, so where it is configured it decides whether a call
 * has been announced, and a host that has only a webhook falls back to that.
 * A call nothing carried stays unstamped and is offered again next pass.
 *
 * @param {object[]} calls - standing calls the record has not marked announced
 * @param {object} [options]
 * @param {object[]} [options.fresh] - the calls this pass itself minted, which
 *   is what the webhook carries where email is configured to carry the rest.
 *   Omitting it says every call handed over is new, which is what a caller
 *   whose record cannot answer the question is handing over anyway
 * @param {string} [options.url] - the generic webhook to post to
 * @param {string} [options.notifyUrl] - the notifications endpoint
 * @param {string} [options.notifyProject] - which project it sends as
 * @param {string} [options.notifySecret] - the project's bearer secret
 * @param {string} [options.link] - where the message points back to
 * @param {typeof fetch} [options.fetcher]
 * @param {(ms:number)=>Promise<void>} [options.wait]
 * @returns {Promise<{sent:number, held:number, delivered:string[], configured:boolean,
 *   error:string|null, email:object, webhook:object}>} `delivered` is the ids
 *   the record may now mark as told; `email.unsent` names the ones it may not
 */
export async function announce(calls, options = {}) {
  const {
    fresh = null,
    url = process.env.SIGNAL_WEBHOOK_URL,
    notifyUrl = process.env.NOTIFY_URL || DEFAULT_NOTIFY_URL,
    notifyProject = process.env.NOTIFY_PROJECT || DEFAULT_NOTIFY_PROJECT,
    notifySecret = process.env.NOTIFY_SECRET,
    link = `${ORIGIN}/app/signals`,
    fetcher = fetch,
    wait = pause,
  } = options

  const email = {
    configured: Boolean(notifySecret && notifyUrl),
    sent: 0,
    failed: 0,
    error: null,
    unsent: [],
  }
  const webhook = { configured: Boolean(url), sent: 0, error: null }
  const quiet = { sent: 0, held: 0, delivered: [], error: null, email, webhook }

  if (!email.configured && !webhook.configured) return { ...quiet, configured: false }
  if (!calls.length) return { ...quiet, configured: true }

  const going = calls.slice(0, MAX_PER_SWEEP)
  const held = calls.length - going.length

  // What the webhook carries, which is not always what the email path carries.
  // A call the queue is still retrying has already been posted to the webhook
  // on the pass that found it, and posting it again every two minutes for as
  // long as email cannot deliver it turns one setup into an alarm. Where email
  // is not configured there is no queue to speak of - the record stamps on the
  // webhook instead - so it carries the whole slice.
  const minted = fresh ? new Set(fresh.map((signal) => signal.id)) : null
  const carrying =
    email.configured && minted ? going.filter((signal) => minted.has(signal.id)) : going

  const [mailed, posted] = await Promise.all([
    email.configured
      ? sendAll(going, {
          url: notifyUrl,
          secret: notifySecret,
          project: notifyProject,
          link,
          fetcher,
          wait,
        })
      : null,
    webhook.configured && carrying.length > 0
      ? postWebhook(carrying, held, { url, fetcher })
      : null,
  ])

  email.sent = mailed?.delivered.length ?? 0
  email.failed = mailed?.failed ?? 0
  email.error = mailed?.error ?? null
  email.unsent = mailed?.unsent ?? []
  webhook.sent = posted?.ok ? carrying.length : 0
  webhook.error = posted?.error ?? null

  const reached = new Set(mailed?.delivered ?? [])
  if (posted?.ok) for (const signal of carrying) reached.add(signal.id)

  const stamps = email.configured
    ? (mailed?.delivered ?? [])
    : posted?.ok
      ? carrying.map((signal) => signal.id)
      : []

  return {
    sent: reached.size,
    held,
    delivered: stamps.filter(Boolean),
    configured: true,
    error: email.error ?? webhook.error,
    email,
    webhook,
  }
}
