<p align="center">
  <img src="docs/logo.svg" width="160" alt="Root & Rise" />
</p>

<h1 align="center">Root &amp; Rise</h1>

<p align="center">A trading desk's journal, signal record and daily market briefing, behind a public brand page.</p>

<p align="center"><a href="https://www.rootriseholdings.com">rootriseholdings.com</a></p>

<p align="center">
  <img src="https://img.shields.io/badge/version-2026.44.0-8b5cf6?style=for-the-badge" alt="Version 2026.44.0" />
</p>

Root & Rise is a private trading desk that trades gold, NAS100, US30 and SP500 using Smart Money Concepts (market structure and pullback entries). It doesn't manage outside money or sell signals. The home page explains the method. The tools the desk works in are at `/app`, behind a sign-in.

## What's in it

- A trade journal that enforces the desk's risk rules: it refuses a trade over 1% risk, locks the day after a 0.5% loss or two losses in a row, and marks trades under 2R as off-book
- A signal record where each call is posted before the outcome and scored against price afterward
- A daily briefing, morning and afternoon, built from live data: economic calendar, the dollar index, gold, indices and an FX watch list
- Live prices and charts for the four main instruments, plus FX pairs, silver, oil and crypto
- Stats by instrument, setup, session and grade, and tracking for prop-firm challenges
- A demo account that plays the signal record forward as an account balance
- Email or webhook alerts when a new call is published

A scheduled job on Vercel checks the markets every two minutes, publishes new calls and scores the open ones.

## Running it locally

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

## Built with

React 18, Vite, React Router 7, Tailwind CSS, Recharts, Lightweight Charts, Supabase. Hosted on Vercel.

## License

Proprietary. See [LICENSE.md](LICENSE.md).

Built and maintained by [TaylorURL](https://www.taylorurl.com).
