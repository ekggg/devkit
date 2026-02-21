import chalk from 'chalk'
import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createServer, normalizePath } from 'vite'
import { downloadDevkit, getPaths, regenerateTypes } from './utils'

export async function dev(dir: string, dev: boolean) {
  const paths = await getPaths(dir, dev)
  const importPath = (...args: string[]) => `/@fs${pathToFileURL(path.join(...args)).pathname}`
  const isWidgetFile = (file: string) => file.startsWith(paths.widget) && !file.startsWith(paths.ekg)
  await downloadDevkit(paths.ekg)

  const server = await createServer({
    logLevel: 'silent',
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
          if (isWidgetFile(id) && !src.startsWith('export default ')) {
            return { code: `export default ${JSON.stringify(src)}` }
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

  const address = server.resolvedUrls?.local[0] ?? server.resolvedUrls?.network[0]
  console.log(`\n  EKG Dev Kit ${chalk.dim('→')} ${chalk.cyan(address)}`)
  console.log(chalk.dim(`  widget      → ${paths.widget}\n`))

  const dfmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: 'numeric', second: 'numeric' })
  const log = (...args: unknown[]) => console.log(chalk.dim(dfmt.format(new Date())), ...args)

  server.watcher.add(paths.widget)
  server.watcher.on('change', (file) => {
    if (isWidgetFile(normalizePath(file))) {
      log(chalk.cyan('Changed'), path.relative(paths.widget, file))
    }
  })
  server.watcher.on('add', (file) => {
    if (isWidgetFile(normalizePath(file))) {
      log(chalk.green('Added'), path.relative(paths.widget, file))
    }
  })
  server.watcher.on('unlink', (file) => {
    if (isWidgetFile(normalizePath(file))) {
      log(chalk.red('Removed'), path.relative(paths.widget, file))
    }
  })
  server.ws.on('ekg:log', (data: { level: string; content: unknown[] }) => {
    const color = {
      error: chalk.red,
      warn: chalk.yellow,
      info: chalk.cyan,
      log: chalk.white,
      debug: chalk.gray,
    }[data.level]!
    log(color(`Widget ${data.level}:`), ...data.content.slice(1))
  })
}
