import fs from 'node:fs'
import path from 'node:path'
import { ORIGIN, DEFAULT_META, ROUTE_META, PRERENDERED_ROUTES } from '../src/lib/routeMeta.data.js'
import { FAQ } from '../src/lib/faq.data.js'
import { render } from '../dist-ssr/entry-server.js'

/**
 * Writes each public route as a finished document: its own head, and its own
 * markup already in the body.
 *
 * A single-page app serves one empty shell for every path. Nothing renders
 * until the bundle has been fetched, parsed and run, which is seconds on a
 * phone, and a crawler that runs no bundle sees a page with no content and the
 * home page's title on every route. Both are answered here, at build time, by
 * rendering the same component tree the browser renders and shipping the result
 * inside the shell the app hydrates.
 */
const OUT = path.resolve('dist')

function escapeAttribute(value) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

/**
 * Replaces the content of a head tag matched by attribute, e.g. property="og:title".
 * The formatter breaks a long meta across several lines, so the tag is matched
 * without assuming the attribute and its content sit on the same one.
 */
function setContent(html, attribute, value) {
  const pattern = new RegExp(`(<meta[^>]*?${attribute}[^>]*?content=")[^"]*(")`, 's')
  // Whether the tag was found, asked separately from whether the value moved:
  // on the home route every value already equals the shell's.
  if (!pattern.test(html)) throw new Error(`prerender: no head tag matched ${attribute}`)
  return html.replace(pattern, `$1${escapeAttribute(value)}$2`)
}

function head(html, route) {
  const meta = ROUTE_META[route] ?? DEFAULT_META
  const description = meta.description ?? DEFAULT_META.description
  const url = `${ORIGIN}${route}`
  let next = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeAttribute(meta.title)}</title>`)
  next = next.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${escapeAttribute(url)}$2`)
  next = setContent(next, 'name="description"', description)
  next = setContent(next, 'property="og:title"', meta.title)
  next = setContent(next, 'property="og:description"', description)
  next = setContent(next, 'property="og:url"', url)
  next = setContent(next, 'name="twitter:title"', meta.title)
  next = setContent(next, 'name="twitter:description"', description)
  return next
}

/** The home document alone carries the questions and preloads its own chunk. */
function homeExtras(html) {
  const chunks = JSON.parse(fs.readFileSync(path.join(OUT, '.home-chunks.json'), 'utf8'))
  // A preload the host answers with a 404 costs a request, logs an error and
  // fetches nothing, and it is invisible until someone opens the console on the
  // deployed page. The build refuses to write one instead.
  for (const file of chunks) {
    if (!fs.existsSync(path.join(OUT, file))) {
      throw new Error(
        `prerender: the home document would preload ${file}, which the build did not emit`
      )
    }
  }
  const preloads = chunks
    .filter((file) => !html.includes(file))
    .map((file) => `    <link rel="modulepreload" crossorigin href="/${file}" />`)
    .join('\n')
  const faq = JSON.stringify(
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ.map((entry) => ({
        '@type': 'Question',
        name: entry.question,
        acceptedAnswer: { '@type': 'Answer', text: entry.answer },
      })),
    },
    null,
    2
  )
  return html.replace(
    '</head>',
    `${preloads}\n    <script type="application/ld+json">\n${faq}\n    </script>\n  </head>`
  )
}

const shell = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8')
if (!shell.includes('<div id="root"></div>')) {
  throw new Error('prerender: the shell no longer has an empty #root to render into')
}

// The gated routes are not written out - nothing about them is public - so they
// are served the empty shell and mount into it. Handing them a document that
// holds another route's markup would have the app adopt the wrong page and then
// rebuild it, which is the one thing hydrating is meant to avoid.
fs.writeFileSync(path.join(OUT, 'shell.html'), shell)
console.log('wrote     shell.html for the routes that mount rather than hydrate')

for (const route of PRERENDERED_ROUTES) {
  const markup = await render(route)
  let html = head(shell, route).replace('<div id="root"></div>', `<div id="root">${markup}</div>`)
  if (route === '/') html = homeExtras(html)

  const dir = route === '/' ? OUT : path.join(OUT, route.replace(/^\//, ''))
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'index.html'), html)
  const words = markup
    .replace(/<[^>]*>/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length
  console.log(`prerendered ${route.padEnd(9)} ${words} words`)
}

fs.rmSync(path.join(OUT, '.home-chunks.json'), { force: true })
