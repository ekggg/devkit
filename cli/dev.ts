import fs from 'node:fs/promises'
import path from 'node:path'
import { createServer } from 'vite'
import { downloadDevkit, getPaths, regenerateTypes } from './utils'

export async function dev(dir: string, dev: boolean) {
  const paths = await getPaths(dir, dev)
  await downloadDevkit(paths.ekg)

  const server = await createServer({
    configFile: dev ? 'vite.config.ts' : false,
    root: paths.server,
    server: { fs: { allow: [paths.node_modules, paths.widget] } },
    plugins: [
      {
        name: 'EKG Dev Kit',
        configureServer(server) {
          server.ws.on('ekg:state', (data) => {
            fs.writeFile(paths.state, JSON.stringify(data, null, 2))
          })
          server.ws.on('ekg:manifest', (data) => {
            fs.writeFile(paths.manifest, JSON.stringify(data, null, 2))
          })
        },
        resolveId(id) {
          if (id.startsWith('ekg:')) {
            return `\0${id}`
          }
        },
        load(id) {
          switch (id) {
            case '\0ekg:devkit':
              return `export { loadWidget } from '/@fs${paths.ekg}/devkit.js'`
            case '\0ekg:widget':
              return `
                export { default as state } from '/@fs${paths.state}?raw'

                export const widget = import.meta.glob('./**', {
                  base: '${paths.relative(paths.widget)}',
                  query: '?inline',
                  import: 'default',
                  exhaustive: true,
                  eager: true,
                })
              `
          }
        },
        transform(src, id) {
          if (id.startsWith(paths.widget) && !id.startsWith(paths.ekg)) {
            switch (path.extname(id.replace(/\?inline$/, ''))) {
              case '.json':
              case '.hbs':
              case '.js':
              case '.ts':
                return { code: `export default ${JSON.stringify(src)}` }
            }
          }
        },
      },
    ],
  })

  server.watcher.add(paths.manifest)
  server.watcher.on('change', (path) => path === paths.manifest && regenerateTypes(paths.root, paths.manifest))
  await regenerateTypes(paths.root, paths.manifest)

  await server.listen()

  server.printUrls()
  server.bindCLIShortcuts({ print: true })
}
