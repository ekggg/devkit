import Ajv2020 from 'ajv/dist/2020.js'
import chalk from 'chalk'
import fs from 'node:fs/promises'
import path from 'node:path'
import { build as tsdown } from 'tsdown'
import { downloadDevkit, getPaths } from './utils'

export async function build(dir: string, dev: boolean) {
  const paths = await getPaths(dir, dev)
  await downloadDevkit(paths.ekg)

  // Build a manifest.json validator from our server supplied manifest JSON schema
  const ajv = new Ajv2020({ allErrors: true, discriminator: true })
  const manifestSchema = JSON.parse(await fs.readFile(path.join(paths.ekg, 'manifest.json'), { encoding: 'utf8' }))
  // AJV has a bug with how `discriminator` and `unevaluatedProperties` interact
  // so we remove `unevaluatedProperties` just for this validation step
  manifestSchema.properties.settings.additionalProperties.unevaluatedProperties = true
  const validateManifest = ajv.compile(manifestSchema)

  // Load the user's widget manifest.json and validate it
  const manifest = await readManifest(paths.manifest)
  if (!validateManifest(manifest) && validateManifest.errors) {
    console.log(chalk.red(`Invalid manifest.json`))
    for (const err of validateManifest.errors) {
      console.log(chalk.red(`${chalk.bold(err.instancePath.slice(1))}: ${err.message}`))
    }
    process.exit(1)
  }

  // Discover all files that need to be copied
  const assets = new Set<string>(['manifest.json', manifest.css, manifest.template])
  for (const a of Object.values(manifest.assets ?? {})) {
    assets.add(a.file)
  }
  for (const s of Object.values(manifest.settings ?? {})) {
    if (['image'].includes(s.type) && s.default) assets.add(s.default)
  }

  // Ensure all the files exist
  const failedAssets = (
    await Promise.all(
      assets.values().map(async (f) => {
        try {
          const s = await fs.stat(path.join(paths.widget, f))
          if (s.isFile()) return null
        } catch (_err) {}
        return f
      }),
    )
  ).filter((v) => v !== null)
  if (failedAssets.length) {
    for (const f of failedAssets) {
      console.log(chalk.red(`Missing file: ${chalk.bold(f)}`))
    }
    process.exit(1)
  }

  // Compile their widget script to JS & copy assets
  const ext = path.extname(manifest.js)
  try {
    await tsdown({
      // Don't use any external config, and don't print anything unless there's a huge problem
      config: false,
      tsconfig: false,
      logLevel: 'error',
      // Hardcode the output as a 'dist' folder. Makes our life easier if this isn't configurable
      outDir: path.join(paths.root, 'dist'),
      // Copy non-script files as-is
      copy: assets
        .values()
        .map((v) => ({ from: path.join(paths.widget, v), to: path.join(paths.root, 'dist', v) }))
        .toArray(),
      // Load our script, ensuring it's always treated as typescript and keeps the same extension it started with
      entry: path.join(paths.widget, manifest.js),
      loader: { [ext]: 'ts' },
      outExtensions: () => ({ js: ext }),
      // Use very basic settings for the output. Should work fine in QuickJS
      format: 'esm',
      platform: 'neutral',
      target: 'es2023',
      dts: false,
    })
  } catch (e) {
    // If something goes wrong we try to print out the errors in a pretty way
    // falls back to just console.error if it doesn't match the format we expect
    if (typeof e === 'object' && e && 'errors' in e && Array.isArray(e.errors)) {
      for (const err of e.errors) {
        if (err instanceof Error) {
          console.log(err.message)
        } else {
          console.error(err)
        }
      }
    } else {
      console.error(e)
    }
    process.exit(1)
  }

  console.log(chalk.green(`${chalk.bold(`Success!`)} Widget files were written to ${path.join(paths.root, 'dist')}`))
}

async function readManifest(path: string) {
  try {
    return JSON.parse(await fs.readFile(path, { encoding: 'utf8' }))
  } catch (err) {
    console.log(chalk.red(`Failed to read widget's manifest.json`))
    console.error(err)
    process.exit(1)
  }
}
