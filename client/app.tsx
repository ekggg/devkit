import { EventSchema, Fonts, manager, type ManagedWidget } from 'ekg:devkit'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { EventModal } from './event_modal'
import { Button } from './ui/button'
import { Checkbox } from './ui/checkbox'
import { FileInput } from './ui/file_input'
import { FontSelector } from './ui/font_selector'
import { ColorInput, DecimalInput, Input, IntegerInput } from './ui/input'
import { InputArray } from './ui/input_array'
import { Select } from './ui/select'
import { manifestSchema, stateSchema, type Manifest, type State } from './zod'

type Setting = NonNullable<Manifest['settings']>[string]

const assetDefaults = ['audio', 'image']

export function App(props: { widget: Record<string, string>; state: string }) {
  const state = stateSchema.parse(JSON.parse(props.state))
  const manifest = manifestSchema.parse(JSON.parse(props.widget['manifest.json']!))

  const updateState = (v: Partial<State>) => import.meta.hot?.send('ekg:state', { ...state, ...v })
  const updateManifest = (v: Partial<Manifest>) => import.meta.hot?.send('ekg:manifest', { ...manifest, ...v })

  const setWidth = (width: number) => updateState({ width })
  const setHeight = (height: number) => updateState({ height })

  const setName = (name: string) => updateManifest({ name })
  const setVersion = (version: string) => updateManifest({ version })
  const setDescription = (description: string) => updateManifest({ description })

  const settings = Object.entries(manifest.settings ?? {}).map(([key, value]) => ({
    setting: { ...value, key },
    value: state.settings[key] ?? defaultSetting(props.widget, value),
    update: (v: unknown) => updateState({ settings: { ...state.settings, [key]: v } }),
  }))

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

  const [events, setEvents] = useState(
    EventSchema.oneOf.map((o) => {
      const name = o.$ref.split('/').at(-1)!
      const type = EventSchema.$defs[name].properties.type.const
      const schema = {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $defs: EventSchema.$defs,
        ...EventSchema.$defs[name].properties.data,
      }
      const data = defaultEventData(schema.properties, state.events[type])
      return { name, type, schema, data }
    }),
  )
  useEffect(() => {
    updateState({ events: Object.fromEntries(events.map((v) => [v.type, v.data])) })
  }, [events])
  const publishEvent = (name: string) => {
    const e = events.find((e) => e.name === name)!
    manager.fireEvent({
      id: randString(60),
      timestamp: Date.now(),
      type: e.type,
      data: e.data,
    } as EKG.Event)
  }

  return (
    <div className="flex h-screen dark:text-slate-100 dark:bg-slate-900">
      <div className="bg-black/10 border-r border-white/10 w-72 contain-strict overflow-auto">
        <div className="px-6 flex flex-col gap-4 pb-8">
          <h1 className="text-xl font-bold py-4">Widget Dev Kit</h1>
          <div className="flex gap-4">
            <IntegerInput label="Width:" name="width" value={state.width} update={setWidth} />
            <IntegerInput label="Height:" name="height" value={state.height} update={setHeight} />
          </div>
          <Input type="text" label="Name:" name="name" value={manifest.name ?? ''} update={setName} />
          <Input type="text" label="Version:" name="version" value={manifest.version ?? ''} update={setVersion} />
          <Input type="textarea" label="Description:" name="description" value={manifest.description ?? ''} update={setDescription} />

          <h1 className="text-lg font-bold pt-4">Settings</h1>
          {settings.map((s) => (
            <Setting key={s.setting.key} {...s} />
          ))}
        </div>
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
              <Widget state={state} manifest={manifest} widget={props.widget} updateState={updateState} />
            </div>
          </div>
        </div>
      </div>
      <div className="bg-black/10 border-l border-white/10 w-72 contain-strict overflow-auto">
        <div className="px-6 flex flex-col gap-4 pb-8">
          <h1 className="text-xl font-bold py-4">Test Events</h1>
          {events.map((o) => (
            <div key={o.name} className="flex gap-2">
              <Button variant="secondary" size="md" className="grow" onClick={() => publishEvent(o.name)}>
                {o.name}
              </Button>
              <Button variant="secondary" size="md" commandfor={`${o.name}-modal`} command="show-modal">
                S
              </Button>
              <EventModal
                id={`${o.name}-modal`}
                name={o.name}
                schema={o.schema}
                data={o.data}
                setData={(data) => setEvents((old) => old.map((i) => (i.name === o.name ? { ...i, data } : i)))}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function defaultEventData(properties: any, state: any) {
  const saved = (name: string, t: string) =>
    !!state?.[name] && (t === 'array' ? Array.isArray(state[name]) : typeof state[name] === t) ? state[name] : null

  return Object.fromEntries(
    Object.entries(properties).map(([name, schema]) => {
      if (name === 'raw') return [name, saved(name, 'object') ?? {}]
      if (name === 'currency') return [name, saved(name, 'string') ?? 'USD']
      if (typeof schema !== 'object' || !schema) return [name, null]
      if ('const' in schema) return [name, schema.const]
      if ('enum' in schema && Array.isArray(schema.enum)) return [name, schema.enum.includes(state?.[name]) ? state[name] : schema.enum[0]]
      if (!('type' in schema)) return [name, null]
      if (name.endsWith('At') && schema.type === 'integer') return [name, saved(name, 'number') ?? Date.now()]
      if (name.endsWith('Cents') && schema.type === 'integer') return [name, saved(name, 'number') ?? 500]
      if (schema.type === 'string') return [name, saved(name, 'string') ?? randString(12)]
      if (schema.type === 'boolean') return [name, saved(name, 'boolean') ?? false]
      if (schema.type === 'integer') return [name, saved(name, 'number') ?? 2]
      if (
        schema.type === 'array' &&
        'items' in schema &&
        typeof schema.items === 'object' &&
        schema.items &&
        '$ref' in schema.items &&
        schema.items.$ref === '#/$defs/ChatNode'
      )
        return [name, saved(name, 'array') ?? [{ type: 'text', text: randString(40) }]]
      if (schema.type === 'array') return [name, saved(name, 'array') ?? []]
      return [name, null]
    }),
  )
}

function randString(len: number) {
  const buf = new Uint8Array(len)
  crypto.getRandomValues(buf)
  return Array.from(buf, (v) => v.toString(36).slice(-1)).join('')
}

const externalWidget = (() => {
  setInterval(() => {
    manager.fireEvent({ type: 'TICK' })
  }, 100)

  let nextID = BigInt(Math.floor(0xffffff * Math.random()))
  let el: HTMLDivElement | null = null
  let widget: ManagedWidget | null = null
  const subs = new Map<string, () => void>()

  return {
    subscribe(fn: () => void) {
      const id = (nextID++).toString()
      subs.set(id, fn)
      return () => {
        subs.delete(id)
      }
    },
    getSnapshot() {
      return widget
    },
    register(nel: HTMLDivElement | null) {
      if (nel === el) return
      if (widget) widget.stop()
      el = nel
      widget = el ? manager.createManagedWidget(el) : null
      subs.forEach((fn) => fn())
    },
  }
})()

function Widget({
  state,
  manifest,
  widget,
  updateState,
}: {
  state: State
  manifest: Manifest
  widget: Record<string, string>
  updateState: (v: Partial<State>) => void
}) {
  const template = widget[manifest.template]
  const css = widget[manifest.css]
  const js = widget[manifest.js]
  const assets: any = Object.fromEntries(
    Object.entries(manifest.assets ?? {}).map(([key, { file, type }]) => {
      let v = widget[file]!
      if (type === 'font') v = simpleHash(v)
      return [key, v]
    }),
  )
  const settings: any = Object.fromEntries(
    Object.entries(manifest.settings ?? {}).map(([key, setting]) => {
      let v = (state.settings[key] ?? defaultSetting(widget, setting)) as string
      if (setting.type === 'font') {
        const [k, _css] = fontSetting(widget, v)
        v = k
      }
      return [key, v]
    }),
  )
  const fonts =
    Object.values(manifest.assets ?? {})
      .map(({ file, type }) => {
        if (type !== 'font') return ''
        const [_k, css] = fontSetting(widget, file)
        return css
      })
      .join('') +
    Object.entries(manifest.settings ?? {})
      .map(([key, setting]) => {
        if (setting.type !== 'font') return ''
        let v = (state.settings[key] ?? defaultSetting(widget, setting)) as string
        const [_k, css] = fontSetting(widget, v)
        return css
      })
      .join('')

  const widgetComponent = useSyncExternalStore(externalWidget.subscribe, externalWidget.getSnapshot)

  // Track the latest persistedState in a ref to avoid stale closures
  const persistedStateRef = useRef(state.persistedState)
  persistedStateRef.current = state.persistedState

  // Track updateState in a ref to avoid stale closures
  const updateStateRef = useRef(updateState)
  updateStateRef.current = updateState

  // Initialize widget and handle persistence
  useEffect(() => {
    if (!widgetComponent || !template || !js || !css) return
    widgetComponent.init({
      template,
      js,
      css,
      cdnDomain: '', // All local assets in the devkit are data URIs, which are already allowed
      fonts,
      assets,
      settings,
      persistedState: persistedStateRef.current,
    })

    const persist = async () => {
      const persistedState = await widgetComponent.persist()
      if (JSON.stringify(persistedState) === JSON.stringify(persistedStateRef.current)) return
      updateStateRef.current({ persistedState })
    }
    const timer = setInterval(persist, 1000)
    return () => {
      persist()
      clearInterval(timer)
    }
  }, [widgetComponent, template, css, js, fonts, JSON.stringify(assets), JSON.stringify(settings)])

  return <div ref={externalWidget.register} className="size-full" />
}

function defaultSetting(widget: Record<string, string>, setting: Setting) {
  if (setting.type === 'font') {
    if (!setting.default) return null
    const v =
      // The default might be the name of a built-in font
      Fonts.find((f) => f.name === setting.default)?.value ||
      // Or it might be the name of a custom font (which is stored as value => key)
      Object.entries(setting.custom || {}).find((v) => v[1] === setting.default)?.[0]
    if (v) return v
    throw new Error(`Invalid default value for setting "${setting.name}". Expected a font name, either built-in or from the custom array.`)
  }
  if (assetDefaults.includes(setting.type)) return widget[setting.default as string]
  return setting.default
}
function fontSetting(widget: Record<string, string>, value: string) {
  const font = Fonts.find((f) => f.value === value)
  if (font) return [font.value, font.font_face] as const
  const v = widget[value]
  if (!v) throw new Error(`Missing font file: ${value}`)
  return [
    simpleHash(v),
    `
      @font-face {
        font-family: "${simpleHash(v)}";
        font-style: normal;
        font-display: swap;
        src: url("${v}");
      }
    `,
  ] as const
}

function Setting({ setting, value, update }: { setting: { key: string } & Setting; value: any; update: (v: any) => void }) {
  if (setting.choices) {
    const choices = Object.entries(setting.choices).map(([value, label]) => ({ label, value }))
    const up = ['decimal', 'integer'].includes(setting.type) ? (v: string) => update(parseFloat(v)) : update
    return (
      <Select
        label={setting.name}
        description={setting.description}
        name={setting.key}
        value={value.toString()}
        update={up}
        options={choices}
      />
    )
  }

  const commonProps = {
    label: setting.name,
    description: setting.description,
    name: setting.key,
    value: value,
    update: update,
  } as const
  switch (setting.type) {
    case 'audio':
      return <FileInput kind="audio" {...commonProps} />
    case 'boolean':
      return <Checkbox {...commonProps} />
    case 'color':
      return <ColorInput {...commonProps} />
    case 'color_array':
      return <InputArray<string> {...commonProps} render={(i) => <ColorInput {...i} />} />
    case 'decimal':
      return <DecimalInput {...commonProps} />
    case 'decimal_array':
      return <InputArray<number> {...commonProps} render={(i) => <DecimalInput {...i} />} />
    case 'font':
      const options = [{ label: 'Built-in Fonts', options: Fonts.map(({ name, value }) => ({ name, value })) }]
      if (setting.custom) {
        options.unshift({
          label: "Artist's Fonts",
          options: Object.entries(setting.custom).map(([value, name]: [string, string]) => ({ name, value })),
        })
      }
      return <FontSelector options={options} {...commonProps} />
    case 'image':
      return <FileInput kind="image" {...commonProps} />
    case 'integer':
      return <IntegerInput {...commonProps} />
    case 'integer_array':
      return <InputArray<number> {...commonProps} render={(i) => <IntegerInput {...i} />} />
    case 'string':
      return <Input type="text" {...commonProps} />
    case 'string_array':
      return <InputArray<string> {...commonProps} render={(i) => <Input type="text" {...i} />} />
  }
  return null
}

function simpleHash(str: string) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
  }
  // Convert to 32bit unsigned integer in base 36 and pad with "0" to ensure length is 7.
  return 'h' + (hash >>> 0).toString(36).padStart(7, '0')
}
