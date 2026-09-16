/**
 * Alert delivery.
 *
 * A setup that fires while the reader is driving is a setup they never see, so
 * a call has to be able to leave the tab it was found in. The browser's own
 * notification channel is what does that: it reaches the desktop and the phone
 * home screen, it costs nothing, and it needs no account anywhere - which
 * matters, because a mail provider would put a signup between the desk and its
 * own alerts.
 *
 * Permission is asked for on a click and never on load. A page that demands
 * notification rights before it has shown anything gets refused once and
 * permanently, and there is no second ask.
 */

/** Where the tab is when a notification is worth sending at all. */
function canNotify() {
  return typeof window !== 'undefined' && 'Notification' in window
}

/** @returns {'granted'|'denied'|'default'|'unsupported'} */
export function notificationState() {
  if (!canNotify()) return 'unsupported'
  return Notification.permission
}

/**
 * Asks for permission, from a user gesture.
 *
 * @returns {Promise<'granted'|'denied'|'default'|'unsupported'>}
 */
export async function requestNotificationAccess() {
  if (!canNotify()) return 'unsupported'
  if (Notification.permission !== 'default') return Notification.permission
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

/**
 * Sends one notification, if the reader has allowed them.
 *
 * The tag is the signal's own id, so a re-render or a second tab cannot stack
 * duplicates of the same call on the lock screen.
 *
 * @param {object} args
 * @param {string} args.title
 * @param {string} args.body
 * @param {string} args.tag
 * @returns {boolean} whether it went out
 */
export function sendNotification({ title, body, tag }) {
  if (!canNotify() || Notification.permission !== 'granted') return false
  try {
    const notification = new Notification(title, { body, tag, icon: '/favicon.svg' })
    notification.onclick = () => {
      window.focus()
      notification.close()
    }
    return true
  } catch {
    return false
  }
}

/** The one-line summary a signal reads as on a lock screen. */
export function describeSignal(signal, displaySymbol, formatPrice) {
  const price = (value) => (formatPrice ? formatPrice(value) : String(value))
  return {
    title: `${signal.side} ${displaySymbol} · ${signal.grade} ${signal.setup}`,
    body: `Entry ${price(signal.entry)} · Stop ${price(signal.stop)} · Target ${price(signal.target)} · ${signal.rewardToRisk.toFixed(2)}:1`,
    tag: signal.id,
  }
}
