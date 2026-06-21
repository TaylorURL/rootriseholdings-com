# Rise & Root

**Forex signal intelligence.** Rise & Root is a decision-support SaaS for the FX markets: a
system of live charts and algorithmic scripts that watch the market around the clock and
signal when to buy and when to sell. It is **not** a fund and **not** an auto-trader — it does
not manage money or execute trades. The signal is ours; the decision is yours.

The product is one flat plan at **$99/month**. Optional automated execution via third-party
broker integrations is on the roadmap — a future, opt-in capability, not part of the platform
today.

This repo contains both halves of the product:

- **Public marketing site** (unauthenticated) — Home, How It Works, Features, Pricing, About,
  plus design-only Login / Signup.
- **Gated terminal** (`/app`) — the Dashboard, Markets, Positions, History, Insights and
  Account surfaces behind a stubbed sign-in.

The visual language is stark black/white with a single purple accent, cinematic and
technical, in the spirit of high-contrast defense-tech/fintech brands like Anduril.

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # production build
npm run preview  # preview the production build
```

No secrets are required to build or run — see **Live FX data** below.

## Routes

| Group | Path | Notes |
| --- | --- | --- |
| Marketing | `/`, `/how-it-works`, `/features`, `/pricing`, `/about` | Public, dark cinematic theme |
| Auth (design-only) | `/login`, `/signup` | Stubbed — no real backend |
| Gated terminal | `/app`, `/app/markets`, `/app/positions`, `/app/history`, `/app/insights`, `/app/account` | Behind a stubbed session |

## Live FX data

Real/near-real foreign-exchange quotes flow through a single swappable data layer in
`src/lib/fxData`. The provider is chosen automatically:

| Mode | When | Source |
| --- | --- | --- |
| `live` | `VITE_FX_API_KEY` is set | [Twelve Data](https://twelvedata.com) near-realtime quotes |
| `anchored` | no key | Free ECB reference rates from [Frankfurter](https://www.frankfurter.app) (no key), with realistic simulated intraday ticks |
| `simulated` | provider unreachable | Fully synthetic ticks from seed anchors |

**It builds and runs with no key.** Without `VITE_FX_API_KEY`, the app anchors to real ECB
rates and simulates intraday motion, logging a clear notice to the console. To enable the
keyed live provider, copy `.env.example` to `.env` and set:

```bash
VITE_FX_API_KEY=your_twelve_data_key
```

Live quotes power the marketing-site ticker and the gated Markets/Dashboard charts. To swap
providers, implement a fetcher alongside `frankfurterProvider.js` / `twelveDataProvider.js`
and wire it into `createFxService.js` — nothing else changes.

## Auth (design-only)

Login and Signup are **UI only**. They validate client-side and route into the terminal via a
stubbed session in `src/context/AuthContext.jsx` (persisted to `localStorage`). There is no
real auth and no Supabase. Search for `TODO(auth)` to find every seam where a real provider
(Supabase) plugs in.

## Stack

- **Vite + React 18** — fast ES-module dev server and build
- **React Router v6** — separate marketing and gated `/app` route groups with their own layouts
- **Tailwind CSS** — utility styling wired to the Rise & Root design-system tokens
- **Framer Motion** — scroll-driven reveals, parallax, count-ups, and micro-interactions
  (GPU-friendly transform/opacity; respects `prefers-reduced-motion`)
- **Recharts** — live FX area charts, equity curves, and sparklines
- **lucide-react** — icons

## Design tokens

The design system is inlined in `src/styles/tokens.css` (dark + light themes) and exposed to
Tailwind as utility colors in `tailwind.config.js`: pure black/white base, a single purple
accent, and lightly desaturated gain/loss colors. The marketing site renders in the dark
theme; the gated terminal additionally supports a light theme via the header toggle. Keep this
file in sync with the sibling `rootriseholdings-design-system` repo.
