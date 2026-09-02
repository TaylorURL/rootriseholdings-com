import test from 'node:test'
import assert from 'node:assert/strict'
import handler from '../api/sweep.js'

/** A response object that records what the handler said, rather than sending it. */
function recorder() {
  return {
    statusCode: null,
    body: null,
    headers: {},
    status(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      this.body = payload
      return this
    },
    setHeader(key, value) {
      this.headers[key] = value
    },
  }
}

const request = (headers = {}) => ({ headers })

/**
 * A sweep costs a feed read of every swept instrument at every timeframe. Left
 * open, the endpoint hands anyone a way to spend the upstreams' rate limit on
 * the desk's behalf and get the whole book read as unpriced - so the closed
 * case is the one worth pinning down.
 */
test('a sweep without the scheduler’s secret is refused', async (t) => {
  const previous = process.env.CRON_SECRET
  process.env.CRON_SECRET = 'shibboleth'
  t.after(() => {
    process.env.CRON_SECRET = previous
  })

  const response = recorder()
  await handler(request(), response)
  assert.equal(response.statusCode, 401)

  const wrong = recorder()
  await handler(request({ authorization: 'Bearer wrong' }), wrong)
  assert.equal(wrong.statusCode, 401)
})

/**
 * A host that has not been given a secret cannot tell the scheduler from
 * anyone else, so it refuses everyone rather than serving everyone.
 */
test('a host with no secret configured refuses rather than opens', async (t) => {
  const previous = process.env.CRON_SECRET
  delete process.env.CRON_SECRET
  t.after(() => {
    if (previous === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = previous
  })

  const response = recorder()
  await handler(request({ authorization: 'Bearer anything' }), response)
  assert.equal(response.statusCode, 401)
})

/**
 * A deploy missing its database credentials should read as a deploy missing
 * its credentials, not as a broken sweep.
 */
test('a sweep with no record to write to says so', async (t) => {
  const previousSecret = process.env.CRON_SECRET
  const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  process.env.CRON_SECRET = 'shibboleth'
  delete process.env.SUPABASE_SERVICE_ROLE_KEY
  t.after(() => {
    process.env.CRON_SECRET = previousSecret
    if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey
  })

  const response = recorder()
  await handler(request({ authorization: 'Bearer shibboleth' }), response)
  assert.equal(response.statusCode, 503)
  assert.match(response.body.detail, /SUPABASE_SERVICE_ROLE_KEY/)
})
