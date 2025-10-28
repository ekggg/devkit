import morphdom from 'morphdom'
import { EkgBus } from './event-bus'
import { Handlebars, renderWidgetFactory } from './renderWidget'
import type { WidgetContext } from './types'
import type { IncomingMessage, OutgoingMessage } from './widget-worker'

const PROP_NAMES = {
  path: 'data-path',
  assets: 'data-assets',
  settings: 'data-settings',
}

export async function loadAsset(path: string | null, signal?: AbortSignal): Promise<string> {
  if (!path) {
    throw new Error('Missing asset path: ' + path)
  }

  const res = await fetch(path, { signal })
  if (!res.ok) throw new Error('Failed to load: ' + path)
  return (await res.text()).trim()
}

export function setupWidget(el: HTMLElement) {
  let abortController = new AbortController()
  let cleanupFunctions: (() => void)[] = []
  let currentRect = el.getBoundingClientRect()
  let size = { width: currentRect.width, height: currentRect.height }
  let worker: Worker | undefined
  let widgetAssets: WidgetContext['assets'] = {}
  let widgetSettings: WidgetContext['settings'] = {}

  const sizeObserver = new ResizeObserver(() => {
    const currentRect = el.getBoundingClientRect()
    if (size?.width !== currentRect.width || size?.height !== currentRect.height) {
      size = { width: currentRect.width, height: currentRect.height }
      worker?.postMessage({
        type: 'resize',
        size,
      } satisfies IncomingMessage)
    }
  })
  sizeObserver.observe(el)

  const attributeFilter = Object.values(PROP_NAMES)
  const attributeObserver = new MutationObserver((mutations) => {
    for (const mut of mutations) {
      if (mut.type == 'attributes' && attributeFilter.includes(mut.attributeName!)) {
        cleanup()
        restart()
        break
      }
    }
  })
  attributeObserver.observe(el, { attributeFilter })

  async function restart() {
    const path = el.getAttribute(PROP_NAMES.path)
    const assetsData = el.getAttribute(PROP_NAMES.assets)
    const settingsData = el.getAttribute(PROP_NAMES.settings)

    // Parse assets if provided
    try {
      widgetAssets = assetsData ? JSON.parse(assetsData) : {}
    } catch (e) {
      console.warn('Failed to parse widget assets:', e)
      widgetAssets = {}
    }

    // Parse settings if provided
    try {
      widgetSettings = settingsData ? JSON.parse(settingsData) : {}
    } catch (e) {
      console.warn('Failed to parse widget settings:', e)
      widgetSettings = {}
    }

    const dataData = await loadAsset(path, abortController.signal)
    const data = JSON.parse(dataData)

    let cleanup
    ;[worker, cleanup] = await loadWidget(el, {
      template: data.template,
      js: data.js,
      css: data.css,
      assets: widgetAssets,
      settings: widgetSettings,
    })

    cleanupFunctions.push(cleanup)
  }

  function cleanup() {
    // Cancel any in-progress fetch requests
    abortController.abort()
    abortController = new AbortController()

    // Run all cleanups
    cleanupFunctions.forEach((fn) => fn())
    cleanupFunctions = []
  }

  restart()

  return cleanup
}

export async function loadWidget(
  el: HTMLElement,
  data: {
    template: string
    js: string
    css: string
    assets: Record<string, unknown>
    settings: Record<string, unknown>
  },
): Promise<[Worker, () => void]> {
  const currentRect = el.getBoundingClientRect()
  const size = { width: currentRect.width, height: currentRect.height }
  el.style.position = 'absolute'
  el.style.overflow = 'hidden'
  const iframe = document.createElement('iframe')
  iframe.frameBorder = '0'
  iframe.style.width = '100%'
  iframe.style.height = '100%'
  iframe.style.border = 'none'
  el.appendChild(iframe)

  const frameDoc = (iframe.contentDocument ?? iframe.contentWindow?.document) as Document
  const root = frameDoc.createElement('div')
  frameDoc.body.appendChild(root)

  // Apply CSS
  // Allow css to use handlebars to inject settings
  // preventIndent: true avoids a few bugs in how partials work
  const style = frameDoc.createElement('style')
  style.textContent = Handlebars.compile(data.css, { preventIndent: true })({
    assets: data.assets,
    settings: data.settings,
  })
  frameDoc.head.appendChild(style)

  // Setup render loop
  const renderer = renderWidgetFactory(data.template, data.assets, data.settings)
  // We use morphdom here to ensure we keep around as many DOM nodes as possible.
  // The problem with using .innerHTML = is that any CSS animations or other stateful
  // bits will be interrupted. By using morphdom we will preserve these as much as possible
  const render = (state: unknown) =>
    morphdom(root, renderer(state), {
      onBeforeNodeDiscarded: (el) => {
        if (!(el instanceof HTMLElement)) return true
        if (!el.hasAttribute('ekg-removed')) return true
        if (el.dataset.isRemoving) return false
        el.dataset.isRemoving = 'true'

        const onEnd = () => {
          el.remove()
        }
        // Start timer to remove of no transition starts
        const timerId = setTimeout(onEnd, 100)
        el.addEventListener('transitionrun', () => {
          // Cancel no transition timer as a transition started
          clearTimeout(timerId)
        })
        el.addEventListener('transitionend', onEnd)
        el.addEventListener('transitioncancel', onEnd)

        // Add the removal class(es) and hopefully start transition
        el.classList.add(...(el.getAttribute('ekg-removed') ?? '').split(' '))

        return false
      },
    })

  // Setup sandboxed JS VirtualMachine to run third party code
  const worker = new Worker(new URL('widget-worker.js', import.meta.url), {
    type: 'module',
  })
  worker.onmessage = (msg: MessageEvent<OutgoingMessage>) => {
    switch (msg.data.type) {
      case 'log':
        console[msg.data.level](...msg.data.content)
        break
      case 'state':
        render(msg.data.state)
        break
      default:
        msg.data satisfies never
    }
  }

  // Tell the widget worker to start the virtual machine
  worker.postMessage({
    type: 'init',
    init: {
      jsSource: data.js,
      assets: data.assets,
      settings: data.settings,
      size,
    },
  } satisfies IncomingMessage)

  // Start passing the events from the event bus to the widget worker
  const unsubscribeMainBus = EkgBus.subscribe((event) => {
    worker.postMessage({ type: 'event', event } satisfies IncomingMessage)
  })

  return [
    worker,
    () => {
      el.removeChild(iframe)
      unsubscribeMainBus()
      worker.terminate()
    },
  ]
}
