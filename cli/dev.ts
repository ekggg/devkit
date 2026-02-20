import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import chalk from 'chalk'
import { createLogger, createServer, normalizePath } from 'vite'
import { downloadDevkit, getPaths, regenerateTypes } from './utils'

export async function dev(dir: string, dev: boolean) {
  const paths = await getPaths(dir, dev)
  const importPath = (...args: string[]) => `/@fs${pathToFileURL(path.join(...args)).pathname}`
  await downloadDevkit(paths.ekg)

  const customLogger = createLogger('silent')
  const server = await createServer({
    customLogger,
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
          server.ws.on('ekg:log', (data: { level: string; content: unknown[] }) => {
            const color = data.level === 'error' ? chalk.red
              : data.level === 'warn' ? chalk.yellow
              : data.level === 'debug' ? chalk.gray
              : chalk.cyan
            const label = color(`[${data.level}]`)
            const content = data.content.map((v) => typeof v === 'string' ? v : JSON.stringify(v)).join(' ')
            console.log(`${label} ${content}`)
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
  server.watcher.on('change', (file) => {
    const normalized = normalizePath(file)
    if (normalized === paths.manifest) {
      regenerateTypes(paths.root, paths.manifest)
    }
    if (normalized.startsWith(paths.widget)) {
      console.log(`${chalk.dim('changed')} ${path.relative(paths.widget, file)}`)
    }
  })
  server.watcher.on('add', (file) => {
    if (normalizePath(file).startsWith(paths.widget)) {
      console.log(`${chalk.green('added')} ${path.relative(paths.widget, file)}`)
    }
  })
  server.watcher.on('unlink', (file) => {
    if (normalizePath(file).startsWith(paths.widget)) {
      console.log(`${chalk.red('removed')} ${path.relative(paths.widget, file)}`)
    }
  })
  await regenerateTypes(paths.root, paths.manifest)

  // Discover widget files
  const widgetFiles = await fs.readdir(paths.widget, { recursive: true })
  const files = widgetFiles.filter((f) => !f.startsWith('.'))

  await server.listen()

  const address = server.resolvedUrls?.local[0] ?? server.resolvedUrls?.network[0]
  console.log(`\n  ${chalk.cyan('EKG Dev Kit')} ${chalk.dim('→')} ${chalk.cyan(address)}`)
  console.log(`  ${chalk.dim('widget')}  ${chalk.dim('→')} ${chalk.dim(paths.widget)}`)
  console.log(`  ${chalk.dim('files')}   ${chalk.dim('→')} ${files.map((f) => chalk.dim(f)).join(chalk.dim(', '))}\n`)
  server.bindCLIShortcuts({ print: true })
}
