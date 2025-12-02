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
                export { loadWidget } from '/@fs${paths.ekg}/devkit.js'
                export { default as EventSchema } from '/@fs${paths.ekg}/events.json'
              `
            case '\0ekg:widget':
              return `
                export { default as state } from '/@fs${paths.state}?raw'

                const inline = import.meta.glob(['./**', '!**/*.(${skipProcessingExts})'], {
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
          if (id.startsWith(paths.widget) && !id.startsWith(paths.ekg)) {
            const ext = path.extname(id.replace(/\?inline$/, ''))
            if (/\.[mc]?[tj]s$/.test(ext)) {
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
