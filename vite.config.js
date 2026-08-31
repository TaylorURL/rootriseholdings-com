import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { routeDocuments } from './scripts/routeDocuments.js'

// The two upstreams the browser reads through this site's own origin, since
// neither sends CORS headers. Production serves both paths from functions -
// api/calendar caching the weekly JSON, api/market answering from OANDA when
// the site holds a data key and from the public chart feed otherwise. Dev and
// preview have no functions, so this proxy reaches the public upstreams
// directly, adding a browser user-agent since the market feed refuses a
// request that carries none.
const proxy = {
  '/data/calendar': {
    target: 'https://nfs.faireconomy.media',
    changeOrigin: true,
    rewrite: () => '/ff_calendar_thisweek.json',
  },
  '/data/market': {
    target: 'https://query1.finance.yahoo.com',
    changeOrigin: true,
    headers: { 'User-Agent': 'Mozilla/5.0' },
    rewrite: (path) => path.replace(/^\/data\/market/, '/v8/finance/chart'),
  },
}

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react(), routeDocuments()],
  preview: { proxy },
  server: { proxy },
  build: {
    rollupOptions: {
      // Chunking is the client bundle's concern. The server build has one
      // consumer, runs once, and resolves its dependencies from node_modules.
      output: isSsrBuild
        ? {}
        : {
            // clsx and tailwind-merge are named here because the chart engine
            // depends on them too. Left unnamed they land in the chart chunk, and
            // the entry - which builds every className through them - has to load
            // the whole engine before it can paint.
            manualChunks: {
              charts: ['recharts'],
              vendor: [
                'react',
                'react-dom',
                'react-router-dom',
                'framer-motion',
                'motion-dom',
                'motion-utils',
                'tslib',
                'clsx',
                'tailwind-merge',
              ],
            },
          },
    },
  },
}))
