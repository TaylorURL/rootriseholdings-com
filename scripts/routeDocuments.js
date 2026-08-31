import fs from 'node:fs'
import path from 'node:path'
/**
 * Names the chunks the home document preloads, and makes preview resolve a path
 * the way the host does.
 *
 * Which chunks belong to the home route is only knowable while the bundle is
 * being written, so it is recorded here and read by the prerender step that
 * writes the documents.
 */
/** The route whose chunk the home document preloads. */
const HOME_MODULE = 'pages/marketing/HomePage'

export function routeDocuments() {
  let homeChunks = []
  let isServerBuild = false
  return {
    name: 'route-documents',
    configResolved(config) {
      // The server build splits the same routes into its own chunks under its
      // own names. Recording those would have the browser preload filenames
      // that exist only on the server side, so only the client build writes
      // the manifest.
      isServerBuild = Boolean(config.build?.ssr)
    },
    generateBundle(options, bundle) {
      if (isServerBuild) return
      // The home page is the landing route, so its chunk is fetched alongside
      // the entry rather than discovered after the entry has run. Every other
      // route is spared it, which is why it is not in the entry to begin with.
      const seen = new Set()
      const collect = (fileName) => {
        if (!fileName || seen.has(fileName)) return
        seen.add(fileName)
        for (const dependency of bundle[fileName]?.imports ?? []) collect(dependency)
      }
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk' && chunk.facadeModuleId?.includes(HOME_MODULE)) {
          collect(fileName)
        }
      }
      const entry = Object.values(bundle).find((c) => c.type === 'chunk' && c.isEntry)
      for (const fileName of entry?.imports ?? []) seen.delete(fileName)
      seen.delete(entry?.fileName)
      homeChunks = [...seen]
    },
    /**
     * Preview resolves a path the way the host does: a route written out as its
     * own document is served from that document, and the gated routes get the
     * empty shell. Without this the preview server answers every path with the
     * home document, so the app adopts the home page's markup on a route that
     * is not the home page - which is the failure this build exists to remove,
     * hidden behind the one server nobody deploys.
     */
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url || '/').split('?')[0]
        const outDir = path.resolve('dist')
        if (url.startsWith('/app')) {
          req.url = '/shell.html'
          return next()
        }
        const candidate = path.join(outDir, url, 'index.html')
        if (url !== '/' && fs.existsSync(candidate)) {
          req.url = `${url.replace(/\/$/, '')}/index.html`
        }
        next()
      })
    },

    closeBundle() {
      if (isServerBuild) return
      // Rollup runs this hook after a failed build as well, and the output
      // directory only exists once a build has written one. Without this the
      // manifest write throws ENOENT and replaces the error that stopped the
      // build with one that did not.
      if (!fs.existsSync(path.resolve('dist'))) return
      fs.writeFileSync(
        path.join(path.resolve('dist'), '.home-chunks.json'),
        JSON.stringify(homeChunks, null, 2)
      )
    },
  }
}
