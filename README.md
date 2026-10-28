<img src="docs/logo.svg" width="160" alt="Root & Rise" />

# Root &amp; Rise

A trading desk's journal, signal record and daily market briefing, behind a public brand page.

[rootriseholdings.com](https://www.rootriseholdings.com)

<img src="https://img.shields.io/badge/version-2026.44.1-8b5cf6?style=for-the-badge" alt="Version 2026.44.1" />

Root & Rise is a private desk trading gold, NAS100, US30 and SP500 with Smart Money Concepts. It doesn't manage outside money or sell signals. The home page explains the method. The desk's tools are at `/app`, behind sign-in.

## What's in it

- A trade journal that holds the desk's risk rules at entry. It refuses a trade over 1% risk, locks the day after a 0.5% loss or two losses in a row, and marks trades under 2R as off-book.
- A signal record. Each call is posted before the outcome and scored against price afterward.
- A morning and afternoon briefing from live data: economic calendar, the dollar index, gold, indices and an FX watch list.
- Live prices and charts, stats by instrument, setup, session and grade, and prop-firm challenge tracking.
- A demo account that plays the signal record forward as a balance.
- Email or webhook alerts when a new call is published.

## How it's built

- **The sweep runs on the server.** A Vercel cron hits `api/sweep.js` every two minutes. It reads the feed, publishes new calls and scores open ones into one `signals` table everyone reads. It used to run in the browser tab, so two devices disagreed and nothing fired with every tab closed.
- **A call publishes once.** A partial unique index on `fingerprint`, scoped to live and filled calls, stops two overlapping sweeps from both publishing. A setup that re-forms after settling is a new call.
- **The sweep can't be quiet.** Every pass writes a row to `sweep_runs`, call or no call. A pass where no feed answered returns an error and names each instrument that failed. It once returned `ok: true` for three days while reaching nothing.
- **The feed is served from our own origin.** `api/market.js` tries upstreams in order: OANDA when a token is set, then the public chart feed with metals rebased onto spot prints, then a second keyless venue. A rewrite can't set the user-agent the public feed requires, a function can. An unknown ticker is a 404, an unpriced one says so.
- **The calendar is cached at the edge.** The upstream throttles per address, so `api/calendar.js` reads it once and the edge serves it for fifteen minutes, and up to a day while the upstream refuses.
- **The journal is one jsonb row per account.** It's already one versioned document in the app, and the downloadable backup is that same document. Two devices editing at once is last-writer-wins on the whole thing. The client merges when it finds records on both sides, so a phone and a laptop a few minutes apart keep both sets of trades.
- **Risk rules are constants.** `src/data/riskRules.js` drives both the journal's gate and the copy that explains it.

<details>
<summary>Decisions and tradeoffs</summary>

- Public routes are prerendered (`scripts/prerender.js`) from the same component tree the browser renders, each with its own head. `/app` is a separate shell.
- Row level security limits each journal to its owner. Only the service role writes signals.
- `middleware.js` checks a TaylorURL status endpoint and shows a holding page if the site is paused. Fails open. `api/version.js` returns the deployed commit, uncached.

</details>

<details>
<summary>Running it locally</summary>

```bash
npm install
npm run dev
```

No `.env` is needed. Market data works without a key, and the app's Supabase project is built in. Other scripts: `npm test`, `npm run build`, `npm run preview` and `npm run lint`.

Everything in `.env.example` is optional:

| Variable                                             | What it's for                                        |
| :--------------------------------------------------- | :--------------------------------------------------- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Point the app at a different Supabase project        |
| `OANDA_API_TOKEN`, `OANDA_ENV`                       | Real-time prices from OANDA instead of the free feed |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`          | Let the scheduled job write the signal record        |
| `CRON_SECRET`                                        | Protect the scheduled job's endpoint                 |
| `NOTIFY_SECRET`, `SIGNAL_WEBHOOK_URL`                | Turn on email alerts and a webhook (Discord works)   |

The server-side ones go in the hosting environment, not the browser build.

</details>

## Built with

React 18, Vite, React Router 7, Tailwind CSS, Recharts, Lightweight Charts, Supabase. Hosted on Vercel.

<details>
<summary>License</summary>

Proprietary. See [LICENSE.md](LICENSE.md).

</details>

Built and maintained by [TaylorURL](https://www.taylorurl.com).
