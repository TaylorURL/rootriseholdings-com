# Rise & Root

Grow & ground your wealth. A cinematic, mission-led demo dashboard — built around a single
purple accent on pure black and white, in the spirit of high-contrast brands like Anduril and
SpaceX. The surface is a wealth-growth platform; the data is static/mock and there is no
backend.

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # production build
npm run preview  # preview the production build
```

## Stack

- **Vite + React** — fast ES-module dev server and build
- **React Router v6** — client-side routing across Dashboard, Markets, Positions, History, Insights, Account
- **Tailwind CSS** — utility styling wired to the inlined Rise & Root design-system tokens
- **Recharts** — equity, sparkline, and price charts
- **Framer Motion** — staggered page entrances and micro-interactions
- **lucide-react** — icons

## Design tokens

The Rise & Root design system is inlined in `src/styles/tokens.css` (dark + light themes) and
exposed to Tailwind as utility colors in `tailwind.config.js`. The system is monochrome —
pure black, pure white, generous negative space — with a single purple accent and lightly
desaturated gain/loss colors so the wealth signal still reads at a glance. Toggle the theme
from the header.
