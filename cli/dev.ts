import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createServer, normalizePath } from 'vite'
import { downloadDevkit, getPaths, regenerateTypes } from './utils'

export async function dev(dir: string, dev: boolean) {
  const paths = await getPaths(dir, dev)
  const importPath = (...args: string[]) => `/@fs${pathToFileURL(path.join(...args)).pathname}`
  await downloadDevkit(paths.ekg)

  const server = await createServer({
    configFile: dev ? 'vite.config.ts' : false,
    root: paths.server,
    define: { 'import.meta.hot': false },
    server: {
      fs: { allow: [paths.node_modules, paths.widget] },
      watch: { ignored: [`!${paths.ekg}/**`] },
    },
    plugins: [
      {
        name: 'EKG Dev Kit',
        configureServer(server) {
          server.ws.on('ekg:state', (data) => {
            fs.writeFile(paths.state, JSON.stringify(data, null, 2)).catch((r) => console.error('Failed to write state file.', r))
          })
          server.ws.on('ekg:manifest', (data) => {
            fs.writeFile(paths.manifest, JSON.stringify(data, null, 2)).catch((r) => console.error('Failed to write manifest file.', r))
          })
        },
        resolveId(id) {
          if (id.startsWith('ekg:')) {
            return `\0${id}`
          }
        },
        load(id) {
          const skipProcessingExts = ['json', 'css', 'hbs'].join('|')
          switch (id) {
            case '\0ekg:devkit':
              return `
                export { manager } from '${importPath(paths.ekg, 'devkit.js')}'
                export { default as EventSchema } from '${importPath(paths.ekg, 'events.json')}'
                export { default as Fonts } from '${importPath(paths.ekg, 'fonts.json')}'
              `
            case '\0ekg:widget':
              return `
                export { default as state } from '${importPath(paths.state)}?raw'

                const inline = import.meta.glob(['./**', '!./**/*.(${skipProcessingExts})'], {
                  base: '${paths.relative(paths.widget)}',
                  query: '?inline',
                  import: 'default',
                  exhaustive: true,
                  eager: true,
                })

                const raw = import.meta.glob(['./**/*.(${skipProcessingExts})'], {
                  base: '${paths.relative(paths.widget)}',
                  query: '?raw',
                  import: 'default',
                  exhaustive: true,
                  eager: true,
                })

                export const widget = { ...inline, ...raw }
              `
          }
        },
        transform(src, id) {
          // Turn widget js/ts files into an exported string so it can be loaded into QuickJS
          // also any unknown files are transformed into an exported string
          if (id.startsWith(paths.widget) && !id.startsWith(paths.ekg)) {
            if (!src.startsWith('export default ')) {
              return { code: `export default ${JSON.stringify(src)}` }
            }
          }
        },
      },
    ],
  })

  server.watcher.add(paths.manifest)
  server.watcher.on('change', (path) => {
    if (normalizePath(path) === paths.manifest) {
      regenerateTypes(paths.root, paths.manifest)
    }
  })
  await regenerateTypes(paths.root, paths.manifest)

  await server.listen()

  server.printUrls()
  server.bindCLIShortcuts({ print: true })
}
