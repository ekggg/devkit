import { downloadDevkit, getPaths, regenerateTypes } from './utils'

export async function sync(dir: string, force?: boolean) {
  const paths = await getPaths(dir)
  await downloadDevkit(paths.ekg, force)
  await regenerateTypes(paths.ekg, paths.manifest)
}
