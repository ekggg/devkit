import { loadWidget } from 'ekg:devkit'
import { useEffect, useRef, useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { Input as UiInput } from './ui/input'
import { Label } from './ui/label'
import { manifestSchema, stateSchema, type Manifest, type State } from './zod'

export function App(props: { widget: Record<string, string>; state: string }) {
  const state = stateSchema.parse(JSON.parse(props.state))
  const manifest = manifestSchema.parse(JSON.parse(props.widget['manifest.json']!))

  const updateStateStore = (v: Partial<State>) => import.meta.hot?.send('ekg:state', { ...state, ...v })
  const updateManifestStore = (v: Partial<Manifest>) => import.meta.hot?.send('ekg:manifest', { ...manifest, ...v })

  const setWidth = (width: number) => updateStateStore({ width })
  const setHeight = (height: number) => updateStateStore({ height })

  const setName = (name: string) => updateManifestStore({ name })
  const setVersion = (version: string) => updateManifestStore({ version })
  const setDescription = (description: string) => updateManifestStore({ description })

  const sceneRef = useRef(null)
  const [sceneSize, setSceneSize] = useState({ width: 1, height: 1 })
  useEffect(() => {
    const el = sceneRef.current as HTMLDivElement | null
    if (!el) return

    const update = () => {
      const { width, height } = el.getBoundingClientRect()
      setSceneSize({ width, height })
    }

    const sizeObserver = new ResizeObserver(update)
    sizeObserver.observe(el)
    update()
    return () => sizeObserver.disconnect()
  }, [sceneRef.current])
  const scale = Math.min(sceneSize.width / state.width, sceneSize.height / state.height)

  return (
    <div className="flex h-screen dark:text-slate-100 dark:bg-slate-900">
      <div className="bg-black/10 border-r border-white/10 w-65 contain-strict overflow-auto px-6 flex flex-col gap-4">
        <h1 className="text-xl font-bold py-4">Widget Dev Kit</h1>
        <div className="flex gap-4">
          <Input label="Width:" type="text" field={[state.width, setWidth]} inputMode="numeric" pattern="\d*" />
          <Input label="Height:" type="text" field={[state.height, setHeight]} inputMode="numeric" pattern="\d*" />
        </div>
        <Input label="Name:" type="text" field={[manifest.name ?? '', setName]} />
        <Input label="Version:" type="text" field={[manifest.version ?? '', setVersion]} />
        <Input label="Description:" type="text" field={[manifest.description ?? '', setDescription]} />
      </div>
      <div className="p-4 sm:p-16 flex-1 contain-strict">
        <div className="@container-[size] h-full grid auto-cols-fr place-items-center">
          <div
            ref={sceneRef}
            className="max-w-full"
            style={{
              aspectRatio: `${state.width}/${state.height}`,
              width: `${(100.0 * state.width) / state.height}cqh`,
            }}
          >
            <div
              className="relative origin-top-left bg-white dark:bg-black"
              style={{
                width: `${state.width}px`,
                height: `${state.height}px`,
                transform: `scale(${scale})`,
              }}
            >
              <Widget state={state} manifest={manifest} widget={props.widget} />
            </div>
          </div>
        </div>
      </div>
      <div className="bg-black/10 border-l border-white/10 w-65 contain-strict overflow-auto p-6"></div>
    </div>
  )
}

function Widget({ state, manifest, widget }: { state: State; manifest: Manifest; widget: Record<string, string> }) {
  const template = widget[manifest.template]
  const css = widget[manifest.css]
  const js = widget[manifest.js]
  const assets = Object.fromEntries(Object.entries(manifest.assets ?? {}).map(([key, { file }]) => [key, widget[file]]))
  const settings = Object.fromEntries(
    Object.entries(manifest.settings ?? {}).map(([key, { default: d }]) => {
      return [key, state.settings[key] ?? d]
    }),
  )

  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current as HTMLDivElement | null
    if (!el || !template || !css || !js) return

    console.log('reloading widget')
    const p = loadWidget(el, { template, js, css, assets, settings })

    return () => {
      p.then(([_worker, cleanup]) => cleanup())
    }
  }, [ref.current, template, css, js, JSON.stringify(assets), JSON.stringify(settings)])

  return <div ref={ref} className="size-full"></div>
}

type InputProps<T> = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  field: [T, (v: T) => void]
}
function Input<T extends string | number>({ label, field, ...props }: InputProps<T>) {
  const [value, setValue] = useState(field[0])
  useEffect(() => {
    setValue(field[0])
  }, [field[0]])

  const onChange = (e: FormEvent<HTMLInputElement>) => {
    const up = (v: T) => {
      setValue(v)
      field[1](v)
    }
    switch (typeof field[0]) {
      case 'string':
        return up(e.currentTarget.value as T)
      case 'number':
        return up(parseFloat(e.currentTarget.value) as T)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {label && <Label>{label}</Label>}
      <UiInput {...props} value={value} onChange={onChange} />
    </div>
  )
}
