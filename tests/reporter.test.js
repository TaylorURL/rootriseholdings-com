import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

/**
 * What the page's own error reporter does with a throw the browser refused to
 * describe.
 *
 * A script from another origin that was not fetched in CORS mode is muted when
 * it throws: the message becomes "Script error.", the file is blanked, the line
 * and column zeroed, the error object withheld. There is nothing in it to act
 * on and there never will be, so it is held for a live console rather than
 * filed as a fault against this site.
 *
 * Both directions are asked, and the second matters more. `muted` decides what
 * never reaches the collector, so one that widened onto the site's own errors
 * would be the reporter going quiet on real faults - and nothing announces a
 * filter that has started swallowing too much. The question is put to the
 * reporter itself rather than to the source, so a rule that stops firing fails
 * here whatever the file looks like.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PAGE = readFileSync(path.join(ROOT, 'index.html'), 'utf8')

const inline = [...PAGE.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1])
const reporter = inline.find((source) => source.includes('/report'))

/**
 * Stands the reporter up on its own and hands back what it posted and what it
 * held. Nothing here offers a `Worker`, so reports fall through to
 * `sendBeacon`, which is the one transport a test can read.
 */
function collector(scriptTags) {
  const posted = []
  const listeners = {}
  // The recovery a stylesheet gets is spread over seconds, so the clock is
  // driven by hand here. Nothing runs until `tick` is asked for it, which is
  // what lets a test say when the file came back and when it never did.
  const pending = []
  const sheets = []
  const reloads = []
  const clock = { now: 0 }
  const sandbox = {
    JSON,
    URL,
    Error,
    Promise,
    Date,
    location: {
      href: 'https://www.rootriseholdings.com/app',
      search: '',
      origin: 'https://www.rootriseholdings.com',
      hostname: 'www.rootriseholdings.com',
    },
    navigator: {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) Safari/604.1',
      sendBeacon(endpoint, body) {
        posted.push(JSON.parse(body))
        return true
      },
    },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    sessionStorage: { getItem: () => null, setItem() {} },
    addEventListener(type, handler) {
      ;(listeners[type] = listeners[type] || []).push(handler)
    },
    document: {
      addEventListener() {},
      head: {
        appendChild(node) {
          sheets.push(node)
        },
      },
      createElement: (tagName) => {
        const attributes = {}
        return {
          tagName: String(tagName).toUpperCase(),
          getAttribute: (name) => (name in attributes ? attributes[name] : null),
          setAttribute(name, value) {
            attributes[name] = String(value)
          },
        }
      },
      // What the page has fetched from elsewhere, which is what the reporter
      // reads to say where a muted throw could have come from.
      getElementsByTagName: () => scriptTags || [],
    },
    console: { error() {}, warn() {}, trace() {}, assert() {}, log() {} },
    setTimeout(run, after) {
      pending.push({ run, due: clock.now + (Number(after) || 0) })
      return pending.length
    },
    clearTimeout(handle) {
      if (pending[handle - 1]) pending[handle - 1].run = null
    },
  }
  sandbox.location.reload = () => reloads.push(true)
  sandbox.window = sandbox
  sandbox.self = sandbox
  const context = vm.createContext(sandbox)
  new vm.Script(reporter, { filename: 'https://www.rootriseholdings.com/app' }).runInContext(
    context
  )
  return {
    posted,
    /**
     * Hands the page's own `error` listener an event, which is the only way to
     * ask what it does with one. Reading the source instead is how a filter
     * gets to be documented, correct and never reached.
     */
    throws(event) {
      for (const handler of listeners.error || []) handler({ preventDefault() {}, ...event })
    },
    /**
     * The same question on the other handler. A rejection is where an
     * extension's own messaging failure lands, and it is the path that has no
     * filename and often no stack, so it has to be driven separately.
     */
    rejects(reason) {
      for (const handler of listeners.unhandledrejection || [])
        handler({ preventDefault() {}, reason })
    },
    held() {
      return sandbox.window.__reporter.replay()
    },
    /** Moves the clock on and runs whatever the page had waiting by then. */
    tick(ms) {
      clock.now += Number(ms) || 0
      for (const task of pending.slice()) {
        if (task.run && task.due <= clock.now) {
          const run = task.run
          task.run = null
          run()
        }
      }
    },
    /** Every link the page appended to the head, in the order it asked. */
    sheets: () => sheets,
    reloads: () => reloads.length,
  }
}

/** The two words, and everything the browser blanked around them. */
const MUTED = { message: 'Script error.', filename: '', lineno: 0, colno: 0, error: null }

/** The page as it is served: its own bundle, and the tracker with the attribute. */
const PAGE_SCRIPTS = [
  {
    src: 'https://www.rootriseholdings.com/assets/index-abcd1234.js',
    crossOrigin: 'anonymous',
  },
  {
    src: 'https://gujgtjqqurildqurpffh.supabase.co/functions/v1/analytics-tracker',
    crossOrigin: 'anonymous',
  },
]

test('the page still carries the reporter this file is about', () => {
  assert.ok(reporter, 'no inline script on the page names the collector any more')
})

test('a throw the browser withheld is held rather than filed', () => {
  const opaque = collector(PAGE_SCRIPTS)
  opaque.throws(MUTED)
  assert.equal(
    opaque.posted.length,
    0,
    'a throw the browser refused to describe was filed as a fault, so the queue is carrying a ticket whose message is two words and cannot ever carry more'
  )
  assert.equal(
    opaque.held().filter((entry) => entry.kind === 'opaque').length,
    1,
    'a muted throw was dropped rather than held, so a live console can no longer see that anything threw at all'
  )
})

test('a muted throw nothing on the page explains says exactly that', () => {
  const opaque = collector(PAGE_SCRIPTS)
  opaque.throws(MUTED)
  const entry = opaque.held().find((held) => held.kind === 'opaque') || {}
  // Every script this page fetches carries the attribute, so the honest answer
  // here is that none of them accounts for the throw.
  assert.match(
    entry.message || '',
    /No script on the page accounts for it/,
    'a script fetched with `crossorigin` was named as a suspect, so the reporter is no longer reading the attribute that rules it out'
  )
})

test('a tag reaching the page without the attribute is named', () => {
  const opaque = collector([
    ...PAGE_SCRIPTS,
    { src: 'https://cdn.example.com/widget.js', crossOrigin: null },
  ])
  opaque.throws(MUTED)
  const entry = opaque.held().find((held) => held.kind === 'opaque') || {}
  assert.match(
    entry.message || '',
    /cdn\.example\.com/,
    'a muted throw was held without naming what the page fetched without CORS, which is the only lead there is on one'
  )
  assert.doesNotMatch(
    entry.message || '',
    /rootriseholdings\.com|supabase\.co/,
    'a script the page fetched in CORS mode was named as a suspect in a throw it cannot have muted'
  )
})

test('a rejection naming an extension API is held rather than filed', () => {
  const injected = collector(PAGE_SCRIPTS)
  // Exactly as Safari on iOS hands it over: the extension's own words, and no
  // stack behind them for the scheme test to read.
  injected.rejects({ message: 'Invalid call to runtime.sendMessage(). Tab not found.' })
  assert.equal(
    injected.posted.length,
    0,
    'a failure inside an extension’s messaging call was filed as this site’s fault, so the queue is carrying a ticket about software the site does not ship and cannot change'
  )
  assert.equal(
    injected.held().filter((entry) => entry.kind === 'rejection').length,
    1,
    'an extension’s rejection was dropped rather than held, so a live console can no longer see that anything rejected at all'
  )
})

test('the other messages only an extension can raise are held too', () => {
  for (const message of [
    'Could not establish connection. Receiving end does not exist.',
    'Extension context invalidated.',
    'The message port closed before a response was received.',
    'Error in event handler: tabs.connect is not a function',
  ]) {
    const injected = collector(PAGE_SCRIPTS)
    injected.rejects({ message })
    assert.equal(
      injected.posted.length,
      0,
      `"${message}" was filed as this site’s fault, and nothing on a page can raise it`
    )
  }
})

test('the site’s own rejections are still filed', () => {
  for (const reason of [
    {
      message: 'Failed to fetch',
      stack: 'at https://www.rootriseholdings.com/assets/i-abcd.js:1:1',
    },
    { message: 'e.session is undefined' },
    // Near the rule without being it: the site's own code sending a message
    // through a channel of its own would read like this, and it is the site's.
    { message: 'channel.sendMessage is not a function' },
  ]) {
    const real = collector(PAGE_SCRIPTS)
    real.rejects(reason)
    assert.equal(
      real.posted.length,
      1,
      `"${reason.message}" was not filed, so the extension rule has widened onto the site’s own failures and the reporter has gone quiet on them`
    )
  }
})

test('an error naming its own file is still filed', () => {
  const real = collector(PAGE_SCRIPTS)
  real.throws({
    message: 'Uncaught TypeError: e.session is undefined',
    filename: 'https://www.rootriseholdings.com/assets/index-abcd1234.js',
    lineno: 412,
    colno: 9,
    error: {
      stack:
        'TypeError: e.session is undefined\n  at https://www.rootriseholdings.com/assets/index-abcd1234.js:412:9',
    },
  })
  assert.equal(
    real.posted.length,
    1,
    'an uncaught error naming its own file was not filed, so `muted` has widened onto the site’s own faults and the reporter has gone quiet on them'
  )
})

/**
 * An `<img>` the browser could not fetch, as the page's own handler receives
 * one: the element itself, carrying whatever attributes a previous pass left
 * on it.
 */
function image(src) {
  const attributes = {}
  return {
    tagName: 'IMG',
    src,
    getAttribute: (name) => (name in attributes ? attributes[name] : null),
    setAttribute(name, value) {
      attributes[name] = String(value)
    },
  }
}

test('a picture that failed once is asked for again', () => {
  const page = collector(PAGE_SCRIPTS)
  const plate = image('https://www.rootriseholdings.com/art/briefing.svg')
  page.throws({ target: plate })
  assert.match(
    plate.src,
    /\/art\/briefing\.svg\?retry=1$/,
    'a first-party image that failed was left holding its failed request, so a reader who lost one packet sees a broken frame for the life of the tab and nothing on the page ever asks again'
  )
  assert.equal(
    page.posted.length,
    1,
    'the retry swallowed the report, so an asset that is genuinely gone now goes unnoticed'
  )
})

test('the retry is not filed a second time', () => {
  const page = collector(PAGE_SCRIPTS)
  const plate = image('https://www.rootriseholdings.com/art/briefing.svg')
  page.throws({ target: plate })
  const asked = plate.src
  page.throws({ target: plate })
  assert.equal(
    page.posted.length,
    1,
    'the handler’s own retry was filed as a second fault, so one missing file now opens two tickets'
  )
  assert.equal(
    plate.src,
    asked,
    'a retry that failed was retried again, which asks the same edge for the same missing file forever'
  )
})

test('an image from another origin is still filed', () => {
  const page = collector(PAGE_SCRIPTS)
  const elsewhere = image('https://cdn.example.com/badge.png')
  page.throws({ target: elsewhere })
  assert.equal(
    page.posted.length,
    1,
    'an image from another origin was dropped, so the reporter has gone quiet on a request the page makes and can see fail'
  )
  assert.equal(
    elsewhere.src,
    'https://cdn.example.com/badge.png',
    'a file another origin serves was re-requested by this page, which is not this page’s to ask for again'
  )
})

/** A link the page was served with, holding the file it asked for. */
function sheet(href) {
  return {
    tagName: 'LINK',
    rel: 'stylesheet',
    getAttribute: (name) => (name === 'href' ? href : null),
  }
}

const SHEET = 'https://www.rootriseholdings.com/assets/index-K5IrCnlB.css'

test('a stylesheet that comes back on a retry is not filed', () => {
  const page = collector(PAGE_SCRIPTS)
  page.throws({ target: sheet(SHEET) })
  page.tick(0)
  const retry = page.sheets()[0]
  assert.match(
    retry.href,
    /index-K5IrCnlB\.css\?retry=1$/,
    'the sheet that failed was not asked for again, so every route the reader opens after this one is drawn without its rules'
  )
  retry.onload()
  page.tick(10000)
  assert.equal(
    page.posted.length,
    0,
    'a sheet that arrived on the retry was filed as a fault anyway, so a page the reader saw whole opens a ticket that can never be closed by fixing anything'
  )
  assert.equal(
    page.reloads(),
    0,
    'the page reloaded under a reader whose stylesheet had already come back'
  )
})

test('the retries are spread out rather than spent in one moment', () => {
  const page = collector(PAGE_SCRIPTS)
  page.throws({ target: sheet(SHEET) })
  page.tick(0)
  assert.equal(page.sheets().length, 1, 'the first retry was not asked for straight away')
  page.throws({ target: page.sheets()[0] })
  page.tick(0)
  assert.equal(
    page.sheets().length,
    1,
    'the second retry went out in the same moment as the first, so both land inside the same outage and both fail for the reason the first one did'
  )
  page.tick(1200)
  assert.match(
    page.sheets()[1].href,
    /index-K5IrCnlB\.css\?retry=2$/,
    'the sheet was given up on after one retry'
  )
  page.throws({ target: page.sheets()[1] })
  page.tick(1400)
  assert.match(
    page.sheets()[2].href,
    /index-K5IrCnlB\.css\?retry=3$/,
    'the asking stopped inside the first three seconds, which is shorter than the outages this is for'
  )
  page.throws({ target: page.sheets()[2] })
  page.tick(0)
  assert.equal(
    page.reloads(),
    0,
    'the page reloaded while the file it wanted might still have been on its way'
  )
})

test('a stylesheet that never comes back is filed, once, and the page starts over', () => {
  const page = collector(PAGE_SCRIPTS)
  page.throws({ target: sheet(SHEET) })
  page.tick(0)
  page.throws({ target: page.sheets()[0] })
  page.tick(1200)
  page.throws({ target: page.sheets()[1] })
  page.tick(1400)
  page.throws({ target: page.sheets()[2] })
  page.tick(2400)
  assert.equal(
    page.posted.length,
    1,
    'a stylesheet that never arrived went unreported, so a site serving every reader a bare page says nothing about it'
  )
  assert.equal(
    page.posted[0].message,
    'Failed to load link: ' + SHEET,
    'the report names something other than the file that never arrived'
  )
  assert.equal(
    page.reloads(),
    1,
    'the document was left holding a stylesheet that is gone, when only a fresh one knows the name that replaced it'
  )
  page.tick(10000)
  assert.equal(page.posted.length, 1, 'one missing stylesheet filed more than one report')
})
