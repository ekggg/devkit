import { EventSchema, manager, type ManagedWidget } from 'ekg:devkit'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { EventModal } from './event_modal'
import { Button } from './ui/button'
import { Checkbox } from './ui/checkbox'
import { ImageInput } from './ui/image_input'
import { ColorInput, DecimalInput, Input, IntegerInput } from './ui/input'
import { InputArray } from './ui/input_array'
import { Select } from './ui/select'
import { manifestSchema, stateSchema, type Manifest, type State } from './zod'

type Setting = NonNullable<Manifest['settings']>[string]

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
    value: state.settings[key] ?? (value.type === 'image' ? props.widget[value.default as string] : value.default),
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
              <Widget state={state} manifest={manifest} widget={props.widget} />
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

function Widget({ state, manifest, widget }: { state: State; manifest: Manifest; widget: Record<string, string> }) {
  const template = widget[manifest.template]
  const css = widget[manifest.css]
  const js = widget[manifest.js]
  const assets: any = Object.fromEntries(Object.entries(manifest.assets ?? {}).map(([key, { file }]) => [key, widget[file]]))
  const settings: any = Object.fromEntries(
    Object.entries(manifest.settings ?? {}).map(([key, { type, default: d }]) => {
      return [key, state.settings[key] ?? (type === 'image' ? widget[d as string] : d)]
    }),
  )

  const widgetComponent = useSyncExternalStore(externalWidget.subscribe, externalWidget.getSnapshot)
  useEffect(() => {
    if (!widgetComponent || !template || !js || !css) return
    console.log('reloading widget')
    widgetComponent.init(template, js, css, assets, settings)
  }, [widgetComponent, template, css, js, JSON.stringify(assets), JSON.stringify(settings)])

  return <div ref={externalWidget.register} className="size-full" />
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
    case 'image':
      return <ImageInput {...commonProps} />
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
