import fs from 'node:fs'
import path from 'node:path'
import Beasties from 'beasties'
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

/**
 * Puts the stylesheet ahead of the bundle in the head.
 *
 * Nothing is painted until the stylesheet has arrived, and the bundle is more
 * than an order of magnitude larger than it is. Written in the order the
 * bundler emits them, the entry script and its module preloads are queued
 * first and the twelve kilobytes the first screen actually waits on are queued
 * behind two hundred that it does not.
 */
function stylesheetFirst(html) {
  const sheets = html.match(/^[ \t]*<link rel="stylesheet"[^>]*>\n/gm)
  if (!sheets) throw new Error('prerender: the shell head carries no stylesheet')
  let next = html
  for (const sheet of sheets) next = next.replace(sheet, '')
  const anchor = next.match(/^[ \t]*<(?:script type="module"|link rel="modulepreload")[^>]*>/m)
  if (!anchor) throw new Error('prerender: the shell head carries no module script')
  return next.replace(anchor[0], `${sheets.join('')}${anchor[0]}`)
}

/**
 * Runs the bundle after the first frame rather than before it.
 *
 * Every route written here is a finished document, so its first frame owes
 * the bundle nothing. A module script is deferred, which only means it waits
 * for the parser: it runs the moment parsing ends, and on a slow phone that
 * moment arrives before the browser has found a frame to paint the document
 * in. The page then sits blank while the bundle adopts markup nobody has been
 * shown, and the whole download is charged to the first paint.
 *
 * The entry loses its script tag. An inline module in its place asks for the
 * bundle one frame after the first, which is the first frame the document can
 * have been painted in and the earliest the bundle can no longer hold it back.
 *
 * The chunk graph travels with it rather than ahead of it. A module preload is
 * a high-priority fetch the browser starts the moment it parses the tag, so
 * two hundred kilobytes of route code declared in the head shares a phone's
 * connection with the document the first screen is actually waiting on, and
 * the paint is charged for all of it. Written out by the frame that imports
 * the entry, the same files are still fetched in parallel and still arrive
 * before anything asks for them; they simply stop queueing in front of the
 * paint.
 */
function paintFirst(html, extra = []) {
  const entry = html.match(/^[ \t]*<script type="module" crossorigin src="([^"]+)"><\/script>\n/m)
  if (!entry) throw new Error('prerender: the shell head carries no module entry')
  const [tag, src] = entry
  let next = html
  const graph = []
  for (const link of html.match(/^[ \t]*<link rel="modulepreload"[^>]*>\n/gm) ?? []) {
    graph.push(link.match(/href="([^"]+)"/)[1])
    next = next.replace(link, '')
  }
  const chunks = [src, ...graph, ...extra.map((file) => `/${file}`)].filter(
    (href, index, all) => all.indexOf(href) === index
  )
  const boot = `    <script type="module">
      const chunks = ${JSON.stringify(chunks)}
      const start = () => {
        for (const href of chunks) {
          const link = document.createElement('link')
          link.rel = 'modulepreload'
          link.crossOrigin = 'anonymous'
          link.href = href
          document.head.appendChild(link)
        }
        import(${JSON.stringify(src)})
      }
      requestAnimationFrame(() => requestAnimationFrame(start))
    </script>\n`
  return next.replace(tag, boot)
}

/**
 * The chunks the home route's own markup will need, which are not reachable
 * from the entry and would otherwise be discovered only once it has run.
 */
function homeChunks() {
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
  return chunks
}

/** The home document alone carries the questions. */
function homeExtras(html) {
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
    `    <script type="application/ld+json">\n${faq}\n    </script>\n  </head>`
  )
}

/**
 * Writes the rules the route's own markup needs into the document itself.
 *
 * A stylesheet blocks the paint: the browser draws nothing while the link in
 * the head is still in flight, and on a phone that link is a round trip and a
 * download standing in front of markup that is already in hand. Every route
 * here is rendered whole at build time, so the rules its first screen needs
 * are knowable at build time too. They go into a style element in the head,
 * and the sheet is asked for on a media query that matches nothing - fetched
 * without holding the paint, switched on when it lands. What arrives late is
 * only what the page has no element for yet.
 *
 * The exceptions are the states the page takes on after it is served. The
 * theme is an attribute the inline script stamps on the root before the first
 * paint, the bar takes one when it is scrolled under, a menu takes one when it
 * is open, and none of them is on any element at build time - so every rule
 * keyed on a data- or aria- attribute rides along regardless.
 *
 * The font faces ride along too. The head preloads both files, and a preloaded
 * file that no font-face names is text set in the fallback and then reset when
 * the sheet lands.
 */
function inliner() {
  return new Beasties({
    path: OUT,
    publicPath: '/',
    preload: 'media',
    pruneSource: false,
    inlineFonts: true,
    preloadFonts: false,
    allowRules: [/\[(data|aria)-/],
    reduceInlineStyles: false,
    mergeStylesheets: false,
    logLevel: 'silent',
  })
}

// Beasties stamps the element it treated as the document; the page does not
// need to carry that.
const CONTAINER_STAMP = ' data-beasties-container'

const ENTITIES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#x27;': "'",
}

/*
 * A style element holds raw text: the parser reads everything between the tags
 * literally and decodes no entity in it, so an apostrophe written as `&#x27;`
 * stays six characters wide in the document forever. The render that attaches
 * to that document produces the apostrophe, finds a stylesheet that does not
 * match the one in front of it, and throws every node on the page away to draw
 * them all again, which is the whole prerender spent.
 *
 * The renderer escapes a text child wherever it finds one, having no way to
 * know this element will not decode it. Putting the text back belongs to the
 * step writing the file.
 */
const rawText = (markup) =>
  markup.replace(
    /(<style\b[^>]*>)([\s\S]*?)(<\/style>)/g,
    (whole, open, body, close) =>
      open + body.replace(/&(?:amp|lt|gt|quot|#x27);/g, (e) => ENTITIES[e]) + close
  )

const shell = stylesheetFirst(fs.readFileSync(path.join(OUT, 'index.html'), 'utf8'))
if (!shell.includes('<div id="root"></div>')) {
  throw new Error('prerender: the shell no longer has an empty #root to render into')
}

// The gated routes are not written out - nothing about them is public - so they
// are served the empty shell and mount into it. Handing them a document that
// holds another route's markup would have the app adopt the wrong page and then
// rebuild it, which is the one thing hydrating is meant to avoid.
fs.writeFileSync(path.join(OUT, 'shell.html'), shell)
console.log('wrote     shell.html for the routes that mount rather than hydrate')

const inline = inliner()
const home = homeChunks()

for (const route of PRERENDERED_ROUTES) {
  const markup = await render(route)
  let html = paintFirst(head(shell, route), route === '/' ? home : []).replace(
    '<div id="root"></div>',
    `<div id="root">${rawText(markup)}</div>`
  )
  if (route === '/') html = homeExtras(html)
  html = (await inline.process(html)).replace(CONTAINER_STAMP, '')

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
