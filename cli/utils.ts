import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { manifestSchema } from '../client/zod'

export async function getPaths(dir: string, dev: boolean) {
  const root = path.resolve(dir)

  const widget = await getManifestPath(root)
  const manifest = `${widget}/manifest.json`

  const devkit = fileURLToPath(new URL('..', import.meta.url))
  const node_modules = dev ? devkit : `${devkit}/../..`
  const server = dev ? `${devkit}/client` : `${devkit}/dist`
  const relative = (dir: string) => path.relative(server, dir)

  const ekg = `${devkit}/.runtime`
  const state = `${ekg}/state.json`

  return {
    root,
    ekg,
    state,
    widget,
    manifest,
    node_modules,
    server,
    relative,
  }
}

async function getManifestPath(dir: string) {
  for await (const filepath of fs.glob(`${dir}/**/manifest.json`)) {
    return path.dirname(filepath)
  }
  throw `No manifest.json found in ${dir}`
}

export async function downloadDevkit(dir: string, force?: boolean) {
  const files = ['devkit.d.ts', 'devkit.js', 'widget-worker.js', 'emscripten-module.wasm']

  await fs.mkdir(dir, { recursive: true })

  try {
    await fs.writeFile(`${dir}/state.json`, '{}', { flag: 'wx' })
  } catch (_) {
    // Ignore failures, the state file probably already exists
  }

  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000
  const stats = await Promise.allSettled(files.map((f) => fs.stat(`${dir}/${f}`)))
  const allExist = stats.every((s) => s.status === 'fulfilled' && s.value.isFile())
  const allNew = stats.every((s) => s.status === 'fulfilled' && s.value.isFile() && s.value.mtimeMs > Date.now() - ONE_WEEK_MS)
  if (allNew && !force) return

  try {
    await Promise.all(files.map((f) => download(dir, f)))
  } catch (e) {
    if (allExist && !force) {
      console.log('Failed to update EKG types and devkit binary. Continuing with existing files.')
    } else {
      throw `Failed to download devkit: ${e}`
    }
  }
}

async function download(dir: string, file: string) {
  const r = await fetch(`https://ekg.gg/assets/js/${file}`)
  const d = await r.bytes()
  await fs.writeFile(`${dir}/${file}`, d)
}

export async function regenerateTypes(dir: string, file: string) {
  const types = (assets: string, settings: string) =>
    `/// <reference types="@ekg_gg/devkit" />

declare namespace EKG {
  interface WidgetAssets ${assets}
  interface WidgetSettings ${settings}
}
`
  const objType = <T>(o: Record<string, T>, process: (v: T) => string) => {
    const lines = Object.entries(o)
      .map(([key, value]) => `    ${key}: ${process(value)}\n`)
      .join('')
    return lines ? `{\n${lines}  }` : '{}'
  }
  const settingType = (v: { type: string; choices?: Record<string | number, unknown> }) => {
    if (v.choices) {
      return Object.keys(v.choices)
        .map((k) => JSON.stringify(k))
        .join(' | ')
    }

    switch (v.type) {
      case 'string':
      case 'color':
      case 'image':
      case 'decimal':
        return 'string'

      case 'string_array':
      case 'color_array':
      case 'decimal_array':
        return 'string[]'

      case 'integer':
        return 'number'

      case 'integer_array':
        return 'number[]'

      case 'boolean':
        return 'boolean'

      default:
        return 'any'
    }
  }

  try {
    const buf = await fs.readFile(file)
    const data = manifestSchema.parse(JSON.parse(buf.toString('utf8')))
    const assets = objType(data.assets ?? {}, () => 'string')
    const settings = objType(data.settings ?? {}, settingType)
    await fs.writeFile(`${dir}/ekg.d.ts`, types(assets, settings))
  } catch (_) {
    try {
      await fs.writeFile(`${dir}/ekg.d.ts`, types('{}', '{}'), { flag: 'wx' })
    } catch (_) {
      // Ignore failures, the types file probably already exists
    }
  }
}
