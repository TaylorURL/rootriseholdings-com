<p align="center">
  <img src="docs/logo.svg" width="200" alt="Root & Rise" />
</p>

<h1 align="center">Root &amp; Rise</h1>

<p align="center">
  <b>A Smart Money Concepts trading desk, and the platform it runs on.</b>
</p>
<p align="center">
  A rule-enforced trade journal and a nine-section daily briefing,<br />
  behind a brand page. Structure is computed, never typed.
</p>
<p align="center">
  <sub>Published for reading. Proprietary — see <a href="LICENSE.md">LICENSE.md</a>. Outside contributions are not accepted.</sub>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-2026.36.23-8b5cf6?style=for-the-badge" alt="Version 2026.36.23" />
  <a href="https://www.rootriseholdings.com"><img src="https://img.shields.io/badge/Live-Vercel-8b5cf6?style=for-the-badge&logo=vercel&logoColor=white" alt="Live site" /></a>
  <img src="https://img.shields.io/badge/React-18-8b5cf6?style=for-the-badge&logo=react&logoColor=white" alt="React 18" />
  <img src="https://img.shields.io/badge/Vite-6-7c3aed?style=for-the-badge&logo=vite&logoColor=white" alt="Vite 6" />
  <img src="https://img.shields.io/badge/React_Router-7-a78bfa?style=for-the-badge&logo=reactrouter&logoColor=white" alt="React Router 7" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3-8b5cf6?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS 3" />
  <img src="https://img.shields.io/badge/Recharts-2-7c3aed?style=for-the-badge" alt="Recharts 2" />
  <img src="https://img.shields.io/badge/Framer_Motion-11-a78bfa?style=for-the-badge&logo=framer&logoColor=white" alt="Framer Motion 11" />
</p>

<br />

## What this is

One trader's operating platform. The desk trades Smart Money Concepts — market structure (BOS, CHoCH), Optimal Trade Entry pullbacks, multi-timeframe bias — on XAUUSD, NAS100, US30, and SP500, under a hard rule book. Those four are the primaries: the instruments the sweep reads and the only ones a published call can be about. Around them the registry carries the rest of the book — 27 FX pairs, silver, WTI crude and two crypto pairs — priced live on the markets screen, charted, and available to the journal. The site is two things:

- **A gated terminal at `/app`** with the tools the desk runs on: a trade journal held to the rule book, a published signal record scored against the tape, and a daily briefing composed from live data.
- **A public brand page at `/`** that states the method and the principles. No pricing, no signup — nothing is sold here.

### The rule book, held

The five rules live in `src/data/riskRules.js` and are applied at the data boundary (`src/lib/journal/rules.js`), not just displayed. They come in two strengths — a rule that protects the account blocks, a rule that describes setup quality is a departure the ticket carries:

| Rule                                 | Strength  | Effect                                                         |
| :----------------------------------- | :-------- | :------------------------------------------------------------- |
| Max 1% risk per trade                | Blocks    | Entry refused above the cap                                    |
| 0.5% daily loss limit                | Blocks    | Day locks when realized loss reaches it                        |
| Hard stop after 2 consecutive losses | Blocks    | Day locks; breakeven exits neither extend nor reset the streak |
| Max 2 A+ setups per day              | Blocks    | Third A+ entry refused                                         |
| Minimum 1:2 reward-to-risk           | Departure | Logs once acknowledged, marked Off-Book on the trade           |

A journal is only worth reading if it holds every trade the desk actually took, so a setup outside the book still gets logged — it gets logged as one, and the mark travels with it into the stats. Locked days render as a full-width banner and the trade form refuses to submit. Trading days are Central Time calendar days (`src/lib/time.js`).

### The instruments

`src/data/instruments.js` is the one list every surface reads, and each entry carries four things that decide how it behaves: whether it is a primary, whether the playbook executes it at all, whether the sweep publishes calls against it, and the ticker each feed knows it by. Primary and swept are separate flags because they answer different questions — the first is what the marketing pages and briefing lead with, the second is what the engine reads and pays for. They were the same flag once, which meant the desk published nothing on the FX majors it trades every day: structure was read, setups formed, and no call was ever written down. Nine instruments are swept now — the four primaries and the five tradeable majors — at three feed reads each per pass, which is what keeps a two-minute sweep under the upstreams' throttles. Three FX pairs — USDJPY, NZDUSD, NZDJPY — are watch-only, read for dollar and risk-sentiment context and never executed; the briefing's FX Watch section is exactly that set. Precision comes off each entry's tick size rather than a second list, so a yen cross prints to three decimals, every other pair to five, and silver to three, wherever the price appears.

### The signals

`src/lib/smc/signal.js` turns a structure read into an order ticket: side from the trend, entry at the midpoint of the OTE band, stop past the leg's origin, target at its extreme, with the reward-to-risk computed and the per-instrument side constraint obeyed — SP500 never returns a long. Where the levels do not describe a trade there is no call, and the panel says why.

Each call records the venue it was read off, and is only ever scored against that venue again. The desk prices gold three ways — a broker's spot CFD, a COMEX future shifted onto spot, and a second venue's native spot print — and they do not agree to the dollar, or in the futures case to sixty-five of them. A call's target is the leg's extreme, a level price is already hovering at, while its stop sits an ATR buffer beyond a swing price has not traded through, so a scale error of a few cents reaches the target and not the stop: comparing frozen levels against a feed that changed underneath them manufactures wins specifically. When the venue has changed, the call stands until its own is answering again or until it expires.

Every call is written down before the answer arrives and scored against the bars that follow (`src/lib/signals/model.js`): price must reach the entry before anything counts, then whichever of the stop and target the tape touches first is the result. A bar spanning both is read as the stop, because the order they printed inside it is not knowable — and the bar that fills a call cannot also pay it out, for the same reason and resolved the same way. A call price never reached expires and sits outside the hit rate rather than counting either way.

The sweep runs on the host, not in the tab. `api/sweep` runs the same engine on a two-minute schedule, reads the calls still standing from `public.signals`, publishes what structure has newly produced, scores what the tape has answered, and writes both back — so a setup that fires at three in the morning is found, and every device reads one history rather than the one its own browser happened to record. The endpoint is idempotent: publishing is gated on the fingerprints already standing, scoring only moves a call forward, and a partial unique index makes that true even if two sweeps overlap. It answers nothing without `CRON_SECRET`, because one sweep costs a feed read of every swept instrument at every timeframe.

The browser reads that record (`src/lib/signals/remote.js`) and separately re-reads structure every two minutes for the live panels, which is a view of this minute rather than a claim anyone is asked to trust later. A call new to the record reaches the reader through the browser's own notification channel when they have switched alerts on — no mail provider, no account, no key — and the record as it already stood on load is never announced, so opening the tab does not replay everything published while they were away.

That channel only fires while a tab is open, which is the one case it is needed for, so the sweep announces from the host as well: set `SIGNAL_WEBHOOK_URL` and each newly published call is posted as an order ticket — side, instrument, grade, setup, timeframe, entry, stop, target, reward-to-risk — to anything that takes a JSON post, a Discord webhook included. It posts after the record is written, never before: a call that reached a phone but not the record is the one failure that cannot be recovered from. A pass announces at most four and says how many it held back, and a webhook that refuses or times out is reported in the sweep's own response rather than failing the pass that found the call.

### The journal

R-based: each trade stores the dollar risk its stop represents, and realized P&L is `realizedR × riskAmount`, so the math is broker-agnostic. Logging captures instrument, side, entry/stop/target, risk %, setup type (BOS / CHoCH / OTE), grade (A+/A/B), session (auto-detected from CT time), and an optional note. Closing a trade previews the exact R and dollars it will book, and the target and the stop are one press each since those are how most trades end. A deleted trade, open or closed, is offered back until the page moves on. Insights aggregates win rate, expectancy, profit factor, and R totals by instrument, setup, session, and grade, plus prop-firm tracking (trailing or static drawdown, profit target, daily loss limit, consistency cap, minimum trading days) against configurable firm parameters; a firm can carry a start date, so trades closed before the evaluation began do not count toward it.

### The briefing

Nine sections, morning (06:00 CT) and NY-afternoon (15:00 CT) editions: economic events, DXY, XAUUSD, indices, FX watch, catalysts, sentiment, day plan, rules. Every analysis sentence restates a computed value — the structure engine (`src/lib/smc/structure.js`) mirrors the desk's TradingView indicator (ATR-thresholded swings, close-confirmed BOS/CHoCH, per-leg 62–79% OTE band, premium/discount), and `narrate.js` renders its output as prose. Sections without live data say so instead of filling the space.

## Data sources

| Feed               | Source                                                                                                                                            | Key                                   |
| :----------------- | :------------------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------ |
| Economic calendar  | ForexFactory's weekly JSON, served and cached by `api/calendar` through `/data/calendar`                                                          | none                                  |
| Quotes and candles | OANDA v20 candles when the site holds a token, Yahoo's chart endpoint otherwise — both through `/data/market` (`src/lib/marketData/chartFeed.js`) | one optional token for the whole site |
| Spot metals        | `api.gold-api.com`, anchoring the COMEX series when the fallback feed is serving                                                                  | none                                  |
| Quote fallback     | CNBC's quote service, one request covering every instrument it carries, when the chart feed is refusing                                           | none                                  |
| Candle fallback    | CNBC's chart service, five-minute and daily bars folded to the interval asked for, when the chart feed is refusing                                | none                                  |
| DXY                | Yahoo's chart endpoint (OANDA lists no dollar index)                                                                                              | none                                  |

No upstream sends CORS headers, so all of them are served from the site's own origin. In production each path is a function: `api/calendar` caches the weekly JSON at the edge so every briefing reads one stored copy instead of drawing the upstream's per-address throttle, and `api/market` answers each ticker from OANDA when `OANDA_API_TOKEN` is set — real-time CFD pricing, translated into the same chart shape — and from Yahoo's endpoint when it is not. The Vite proxy reaches the public upstreams directly in development and preview.

Yahoo turns away a datacentre address in stretches, and a crumb minted against one address and replayed from another is refused where the same request carrying none is served — so the bare request goes first at each host and the session is only taken when the refusal was about credentials. A throttle ends the read rather than starting another round of it, and leaves the upstream alone for a minute afterwards; retrying through one is what earns the next, and a book of dozens retrying at two hosts turns a throttle into a storm. The shared quote poll reads the registry in bounded groups for the same reason: the whole book asked for at one instant reads to the upstream as a flood from one address. Each interval is held at the edge for roughly the clock its bars print on — a minute at five, five at fifteen, fifteen at hourly, an hour at daily — because a bar that has not closed has nothing new to say.

An answer that lands is then held two ways: the edge keeps serving it for a day while re-trying underneath, and the function holds the last payload each query answered with. When there is no stored copy either, a second keyless venue answers in its place. Its quote service prices in one request every instrument it carries, both metals quoted as spot outright, so the ticker, the instrument table, the dollar index and the FX watch keep real prices; its chart service carries bars at two granularities — five-minute over the last handful of sessions, daily over the last year or two — which are folded up to the interval the request asked for, so the charts and the structure engine keep drawing too. What the desk gets from it at the coarser timeframes is a shorter chart rather than an empty one: an hourly read spans days rather than a month. Where the venue has no bars to fold, a quote still answers the price query, and its candle arrays come back empty rather than carrying the single point it knows — a surface asking for structure is told there is none rather than handed a chart with one bar on it.

One response serves both jobs: `meta` carries the price, the prior close and the session range, and the same payload's `timestamp` and `quote` arrays become the candles the structure engine reads. On the keyed feed the metals are spot `XAU_USD` and `XAG_USD`, the numbers a prop platform quotes, with the session rolled at OANDA's 17:00 New York day, and every FX pair translates from the public feed's six-letter ticker to OANDA's two-leg name without a list to keep in step. Yahoo carries no spot metal series at all — it prices them off their COMEX front months, which trade above spot on the carry, tens of dollars on gold, and that gap lands on every level the structure engine reads. So `api/lib/spotMetal.js` measures the basis and subtracts it (`meta.spotBasis` records the figure actually applied, `meta.spotAnchor` the spot print it was measured against). The measurement is anchored on the last bar that has finished printing rather than the one still forming, whose close is just the live tick, and the resulting figure is held per metal for ten minutes rather than recomputed per request — so the five-minute quote a reader watches and the hourly series a signal is scored against are shifted by the same number. Recomputing it per request is what used to make them differ: a call's levels are frozen at publication and the series under them was re-anchored on every read, so the record booked targets that never traded. A measurement is eased in at a quarter weight, because the futures leg is a closed bar and the spot leg a print from another venue up to a minute old and the gap between them is noise against a quantity that moves on the cost of carry; a jump past half a percent of spot is a front-month roll rather than noise and is taken whole. Where no honest spot anchor exists the rebasing refuses outright rather than serving the raw future as though it were spot — the request falls through to the stored copy and then to the keyless venue, whose metals are quoted spot natively. A constant shift leaves swings, breaks and retracement percentages identical while the prices attached to them become the ones a spot platform quotes. The venue badge names which of the three answered. No shape carries a four-hour interval, so 4H bars are folded from hourly ones.

The keyed feed is real-time; the fallback's index and FX quotes carry the usual exchange fifteen-minute delay, which the token exists to remove, and the Account screen says so. An instrument no feed can price is absent rather than approximated, and every surface renders that as unavailable. Nothing generates a number.

## Storage

Accounts are Supabase auth (`src/lib/supabase.js`, `src/context/AuthContext.jsx`). Sign-up takes an email and a password and returns a session straight away — there is no confirmation mail, magic link or recovery flow. The client persists and refreshes the session, so a reload keeps the reader signed in, and `RequireAuth` holds the frame until the stored session has been read rather than bouncing them to `/login`.

The published signal record lives in Postgres. `public.signals` is written by the sweep alone, under the service role: row-level security lets a signed-in reader select, and the grants are stated from zero rather than trimmed — nothing at all for `anon`, select alone for `authenticated` — so the record a subscriber is asked to judge the desk by is one none of its readers can edit. Stated from zero because a new table in this schema inherits default privileges granting both roles everything, and truncate is among them: it is not a row operation, so no policy stands in front of it, and revoking the three obvious writes would have left a reader able to empty the record. A partial unique index on the fingerprint of every call still standing is what makes publishing idempotent across overlapping sweeps.

The contact form is the only thing a reader's own browser writes to Postgres. `public.contact_messages` takes an insert from an anonymous reader and nothing else: row-level security carries an insert-only policy, and select, update, delete and truncate are revoked outright from `anon` and `authenticated`, so the publishable key in the browser bundle can add a message and never read one back. The table, its policy and its grants are in `supabase/migrations/`.

Journal data (trades, settings, prop firms, day plans) persists as one versioned record in browser `localStorage` via `src/lib/journal/store.js`. That record lives in one browser and nowhere else, so the Account page can write it out as a file and read one back, confirmed before it replaces anything. What `src/lib/signals/store.js` still keeps there is the reader's alert preference and nothing else — that is genuinely about this device, where the record was not. Both take the store as a parameter rather than reaching for `localStorage` themselves, which is how the tests run them against a plain object and what any other `getItem`/`setItem` backend would slot into.

## Getting started

```bash
npm install
npm run dev      # Vite dev server (carries the calendar and market proxies)
npm test         # node:test suite over the journal, SMC, and market-data math
npm run build    # browser build, then the SSR pass, then scripts/prerender.js
npm run preview  # preview the production build
```

No secret is required to build or run: market data works keyless on the public feed, and the Supabase project the app ships against is compiled in. To point a build at a different project, copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. To serve real-time OANDA pricing, set `OANDA_API_TOKEN` (a free practice-account token) in the hosting environment — it is read by the market function, never compiled into the browser bundle.

The sweep needs three more, set in the hosting environment and never in the bundle: `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_URL` for the record it writes, and `CRON_SECRET` for the scheduler to prove itself with. `SIGNAL_WEBHOOK_URL` is optional and turns host-side alerts on. Without them `/api/sweep` answers 503 and 401 respectively rather than half-running, and the desk renders an empty record with the reason stated instead of a broken one.

## Routes

| Group      | Paths                                                                                                    | Notes                                    |
| :--------- | :------------------------------------------------------------------------------------------------------- | :--------------------------------------- |
| Brand page | `/`                                                                                                      | Public one-pager (`MarketingLayout`)     |
| Legal      | `/privacy`, `/terms`                                                                                     | Inside `MarketingLayout`                 |
| Contact    | `/contact`                                                                                               | Inside `MarketingLayout`                 |
| Auth       | `/login`                                                                                                 | Standalone; sign in or create an account |
| Terminal   | `/app`, `/app/briefing`, `/app/journal`, `/app/markets`, `/app/signals`, `/app/insights`, `/app/account` | Behind `RequireAuth` + `AppShell`        |
| Redirects  | `/app/positions`, `/app/history` → `/app/journal`                                                        | Former split pages                       |

`vercel.json` names each of these in production — the public routes to their own prerendered document, `/app` and everything under it to the terminal shell — so an unknown path gets a real 404 from `public/404.html`; the dev server still redirects unknown paths to `/`.

## Project structure

```
rootriseholdings-com/
├── public/                    favicon + touch icon, OG card, robots.txt, sitemap.xml, llms.txt, web manifest, 404 page, self-hosted fonts, the brand page's drawn plates under art/
├── docs/logo.svg              README mark — purple R, transparent
├── api/market.js              Function serving quotes and candles — OANDA when keyed, Yahoo otherwise
├── api/lib/spotMetal.js       Spot prints, and the basis that puts the COMEX series onto them
├── api/lib/quoteFallback.js   A second keyless venue, for the price when the chart feed refuses
├── api/lib/seriesFallback.js  The same venue's candle history, folded to the interval asked for
├── api/calendar.js            Function serving and caching the weekly economic calendar
├── api/version.js             Function reporting the commit the deployment was built from
├── vercel.json                SPA rewrites + the calendar and market paths
├── scripts/prerender.js       Writes a real document for each public route after the SSR build
├── scripts/routeDocuments.js  Names the chunks the home document preloads, and makes preview resolve paths as the host does
├── supabase/migrations/       The contact table, its row-level security, and its grants
├── tests/                     node:test suites (journal, smc, signals, instruments, spotMetal, quoteFallback, seriesFallback, marketData, briefing)
└── src/
    ├── App.jsx                Route groups — brand page, login, gated /app
    ├── routes.jsx             The route components, split so the build and the browser share one list
    ├── entry-server.jsx       SSR entry the prerender build renders through
    ├── components/            journal, layout, charts, ui, motion, marketing, auth
    ├── context/               JournalContext, SignalsContext, AuthContext, ThemeContext
    ├── data/                  Instrument registry, risk rules, sessions
    ├── layouts/               MarketingLayout — the public shell
    ├── pages/                 Dashboard, Briefing, Journal, Markets, Signals, Insights, Account + marketing/
    ├── styles/                tokens.css (design system) + index.css
    └── lib/
        ├── journal/           Trade model, rule gate, stats, prop-firm math, store
        ├── smc/               Structure engine, narration, trade-call derivation
        ├── signals/           Signal record, outcome scoring, persistence, the sweep
        ├── alerts/            Browser notification delivery
        ├── marketData/        Feed client, OANDA translation, quotes, candles, calendar, DXY
        ├── briefing/          Nine-section composer + fetch hook
        ├── supabase.js        Auth client for the project
        ├── time.js            Central Time helpers (trading days, sessions)
        ├── brand.js           Brand facts + nav — single source of truth
        ├── content.js         Brand-page copy
        ├── routeMeta.js       Per-route titles, descriptions, canonicals
        ├── routeMeta.data.js  The values themselves, read by the build as well as the hook
        ├── faq.data.js        The brand page's questions, and the FAQPage markup they source
        ├── lazyRoute.jsx      A lazy route that renders straight from a preloaded module
        ├── preloadRoute.js    What each written-out document needs in hand before hydration
        ├── format.js          Price / currency / R formatting
        ├── marketingMotion.js The durations, easings and reveal variants every surface animates on
        ├── useRouteFocus.js   Moves focus to main on a route change
        └── cn.js              clsx + tailwind-merge helper
```

## Testing

`npm test` runs `node --test` over the pure library layer: trade math on both sides, the rule gate (what blocks, what is a departure, that an acknowledgement never unlocks a blocking rule, and that the mark lands on the saved trade), stats and equity-curve bucketing by CT day, trailing versus static prop-firm drawdown, a firm's start date and daily loss limit, the backup file round trip, the feed parser against a response carrying a bar that never printed, hourly bars folding into four-hour ones, the OANDA translation (ticker map, query sizing, and a candle response folding into the chart shape), the gold basis (that it anchors the last close to spot, shifts every price equally so the session change is unchanged, leaves the structure read identical, and declines to shift without an honest anchor), trade-call derivation on both sides including the shorts-only constraint, signal scoring through fill, target, stop, the both-sides bar and expiry, the fallback venue (grouped prices, a row with no price, a missing extreme, one request for the whole desk, and that its payload prices a quote without passing as a series), the fallback venue's candles (New York stamps read on either side of a clock change, a holed bar dropped, folding to a bucket the clock prints, one bar refused as a series, a refusing venue, and the folded payload read back through the feed parser), calendar normalization, session windows, and the structure engine against synthetic uptrends, downtrends, and flat tape. CI runs the same suite before every merge.

## License

Proprietary — all rights reserved. Built by [TaylorURL](https://www.taylorurl.com).

<br />

<p align="center">
  <sub>Read the structure. Respect the rules. Keep the ledger.</sub>
</p>
