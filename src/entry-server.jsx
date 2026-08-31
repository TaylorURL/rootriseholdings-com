import { StaticRouter } from 'react-router-dom'
import { renderToPipeableStream } from 'react-dom/server'
import { Buffer } from 'node:buffer'
import { Writable } from 'node:stream'
import { AppRoutes } from './App.jsx'

/**
 * Renders a route to the markup its document ships with.
 *
 * The app mounts over this markup rather than replacing it, so what is rendered
 * here is exactly what the client renders on its first pass: the scroll-reveal
 * primitives emit their opening state as inline style on both sides, and the
 * animations run from there once the bundle is live. A reader sees the page it
 * always saw, arriving before the bundle rather than after it, and a crawler
 * that never runs the bundle reads the page at all.
 *
 * The stream is drained on `onAllReady` rather than `onShellReady` because every
 * route below the brand page is code-split: the shell alone is the pending
 * state, and the point of this is to ship the page.
 */
export function render(path) {
  return new Promise((resolve, reject) => {
    const chunks = []
    const sink = new Writable({
      write(chunk, encoding, done) {
        chunks.push(Buffer.from(chunk))
        done()
      },
    })
    sink.on('finish', () => resolve(Buffer.concat(chunks).toString('utf8')))

    const stream = renderToPipeableStream(
      <StaticRouter location={path}>
        <AppRoutes />
      </StaticRouter>,
      {
        onAllReady() {
          stream.pipe(sink)
        },
        onError: reject,
      }
    )
  })
}
