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
      head: { appendChild() {} },
      createElement: () => ({ setAttribute() {} }),
      // What the page has fetched from elsewhere, which is what the reporter
      // reads to say where a muted throw could have come from.
      getElementsByTagName: () => scriptTags || [],
    },
    console: { error() {}, warn() {}, trace() {}, assert() {}, log() {} },
    setTimeout() {},
  }
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
    held() {
      return sandbox.window.__reporter.replay()
    },
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
