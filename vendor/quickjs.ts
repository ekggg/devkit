import RELEASE_SYNC from '@jitl/quickjs-wasmfile-release-sync'
import wasmLocation from '@jitl/quickjs-wasmfile-release-sync/wasm?url'
import { newQuickJSWASMModuleFromVariant, newVariant } from 'quickjs-emscripten-core'

export const load = memoize0(async function load() {
  return await newQuickJSWASMModuleFromVariant(
    newVariant(RELEASE_SYNC, {
      wasmLocation,
    }),
  )
})

// TODO: Extract to util?
function memoize0<R>(callback: () => R): () => R {
  let value: R
  return () => {
    if (value) return value
    value = callback()
    return value
  }
}
