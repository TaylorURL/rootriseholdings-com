# Miranda FX

Professional FX trading dashboard — a polished client demo built with Vite, React, Tailwind CSS,
Recharts, and Framer Motion. All data is static/mock; there is no backend.

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # production build
npm run preview  # preview the production build
```

## Stack

- **Vite + React** — fast ES-module dev server and build
- **React Router v6** — client-side routing across Dashboard, Markets, Positions, History, Account
- **Tailwind CSS** — utility styling wired to the inlined Miranda design-system tokens
- **Recharts** — price, sparkline, and equity-curve charts
- **Framer Motion** — staggered page entrances and micro-interactions
- **lucide-react** — icons

## Design tokens

The lime-green design system is inlined in `src/styles/tokens.css` (dark + light themes) and
exposed to Tailwind as utility colors in `tailwind.config.js`. Toggle the theme from the header.
