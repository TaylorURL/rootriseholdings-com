<img src="docs/logo.svg" width="160" alt="Root & Rise" />

# Root &amp; Rise

A trading desk's journal, signal record and daily market briefing, behind a public brand page.

[rootriseholdings.com](https://www.rootriseholdings.com)

<img src="https://img.shields.io/badge/version-2026.44.3-8b5cf6?style=for-the-badge" alt="Version 2026.44.3" />

Root & Rise is a private desk trading gold, NAS100, US30 and SP500 with Smart Money Concepts. It doesn't manage outside money or sell signals. The home page explains the method. The desk's tools are at `/app`, behind sign-in.

The main tool is a trade journal that enforces the desk's risk rules at entry. It refuses a trade over 1% risk, locks the day after a 0.5% loss or two losses in a row, and marks anything under 2R as off-book. Those numbers live in `src/data/riskRules.js`, which drives both the gate and the copy explaining it. Around it are a signal record, morning and afternoon briefings from live data, charts, stats by setup and session, prop-firm challenge tracking, and a demo account that plays the signal record forward as a balance.

## The sweep

A Vercel cron calls `api/sweep.js` every two minutes. It reads the feed, publishes new calls and scores open ones into a single `signals` table everyone reads. Calls are posted before the outcome and scored against price afterward, with email or webhook alerts on publish.

This used to run in the browser tab. Two devices disagreed and nothing fired once every tab was closed, which is why it moved.

A partial unique index on `fingerprint`, scoped to live and filled calls, stops two overlapping sweeps from publishing the same call. A setup that forms again after settling counts as new.

Every pass writes a row to `sweep_runs`, whether or not it found anything. A pass where no feed answered returns an error naming each instrument that failed. It once returned `ok: true` for three days while reaching nothing.

## Market data

`api/market.js` serves prices from our own origin and tries upstreams in order: OANDA when a token is set, then the public chart feed with metals rebased onto spot prints, then a second keyless venue. It's a function and not a rewrite because the public feed needs a user-agent a rewrite can't set.

The economic calendar upstream throttles per address. `api/calendar.js` reads it once and the edge serves it for fifteen minutes, or up to a day while the upstream is refusing.

## The journal's storage

Each account's journal is one jsonb row. The app already treats it as one versioned document, and the downloadable backup is that same document. Two devices editing at once is last-writer-wins on the whole thing, but the client merges when it finds records on both sides, so a phone and a laptop a few minutes apart keep both sets of trades. Row level security limits each journal to its owner, and only the service role writes signals.

<details>
<summary>Running it locally</summary>

```bash
npm install
npm run dev
```

No `.env` is needed. Market data works without a key and the Supabase project is built in. There's also `npm test`, `npm run build`, `npm run preview` and `npm run lint`.

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

React 18, Vite, React Router 7, Tailwind CSS, Recharts, Lightweight Charts and Supabase, on Vercel. Proprietary, see [LICENSE.md](LICENSE.md).

Built and maintained by [TaylorURL](https://www.taylorurl.com).
