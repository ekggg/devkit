import { QuickJSContext } from 'quickjs-emscripten'
import { Arena } from 'quickjs-emscripten-sync'
import seedrandom from 'seedrandom'
import { load as loadQuickJS } from './quickjs'
import type { ChatNode, EKGPublicSDK, Widget, WidgetContext } from './types'

let widget: Widget | undefined
let state: unknown
let assets: WidgetContext['assets']
let settings: WidgetContext['settings']
let size: WidgetContext['size']
let machineStarted = false

export type IncomingMessage =
  | {
      type: 'init'
      init: {
        jsSource: string
        size: WidgetContext['size']
        assets: WidgetContext['assets']
        settings: WidgetContext['settings']
      }
    }
  | {
      type: 'resize'
      size: { width: number; height: number }
    }
  | {
      type: 'event'
      event: unknown
    }

export type OutgoingMessage =
  | {
      type: 'log'
      level: 'error' | 'warn' | 'info' | 'debug' | 'log'
      content: unknown[]
    }
  | {
      type: 'state'
      state: unknown
    }

// This is where messages arrive into the WebWorker from the host system
self.onmessage = (msg: MessageEvent<IncomingMessage>) => {
  console.log('worker.onmessage', msg)
  switch (msg.data.type) {
    case 'init':
      startVirtualMachine(msg.data.init)
      break
    case 'resize': {
      // Update to ensure context objects have latest sizes
      size = msg.data.size
      handleEvent({
        type: 'RESIZE',
        data: msg.data.size,
        timestamp: Date.now(),
      })
      break
    }
    case 'event':
      handleEvent(msg.data.event)
      break
    default:
      msg.data satisfies never
  }
}

function handleEvent(event: unknown) {
  try {
    const eventId = (event as { id: string }).id

    const newState = widget?.handleEvent?.(event, state, createContext(eventId))

    if (newState && newState !== state) {
      state = newState
      sendNewState(newState)
    }
  } catch (err) {
    if (err instanceof Error) {
      sendLog('error', err.stack)
    } else {
      sendLog('error', err)
    }
  }
}

/**
 * Starts the virtual machine that runs the third party widget code
 *
 * @remarks
 * For security reasons rather than running `eval` on third party code we instead use a
 * "Virtual Machine" to run third party Javascript written by widget developers. QuickJS
 * is a simple JS runtime written in C++ and compiled down to WASM. We run the third party
 * JS in this QuickJS VM which is completely disconnected from the host browser's runtime.
 *
 * This way malicious developers cannot do things like
 * - prototype polution
 * - external API calls (fetch, XMLHttpRequest)
 */
async function startVirtualMachine(init: Extract<IncomingMessage, { type: 'init' }>['init']) {
  if (machineStarted) {
    throw new Error('Cannot start the virual machine until you shut it down')
  }
  machineStarted = true
  size = init.size
  assets = init.assets
  settings = init.settings

  try {
    const QuickJS = await loadQuickJS()

    const ctx = QuickJS.newContext({
      // Only expose these basic globals in the VirtualMachine
      // This forces widget developers to keep their widgets simple
      // and limits the chance of adverse security threats
      intrinsics: {
        // BaseObjects & Eval is required for the machine to run
        BaseObjects: true,
        Eval: true,
        // Proxy is required by the marshaller
        Proxy: true,
        // Allow
        MapSet: true,
      },
    })

    const SDK: EKGPublicSDK = {
      registerWidget: (proxyWidget: Widget) => {
        // This is not a "real" widget, but instead of JS Proxy object
        // to the real widget running in the VM. We cannot manipulate any
        // of its properties, but we can call it's functions and the arguments
        // will be marshalled into the VM and run by the widget
        widget = proxyWidget
        const context = createContext(widget.name ?? '[unknown name]')

        if (typeof widget.initialState === 'function') {
          state = widget.initialState(context)
        } else if (widget.initialState !== undefined) {
          state = widget.initialState
        }

        sendNewState(state)
      },
      utils: { chatToText },
    }

    // The arena controls how objects are marshalled in/out of the running VM
    // Objects going into the VM are wrapped in a JS Proxy so the underlying
    // cannot be manipulated. And objects coming out get the same treatment.
    // If we would would like to do custom marshaling this is where we would
    // do it
    const arena = new Arena(ctx, { isMarshalable: true })
    // `area.expose` further controls what globals are exposed to the JS VM
    // This is where we can override or add additional globals we want widget
    // developers to have access to
    arena.expose({
      // The primary EKG SDK global where our helpers / API live
      EKG: SDK,
      // A version of Math that no longer has the `random()` function
      // Developers will be expected to use ctx.random() instead
      // Unfortunately because Math is a special object, couldn't find a way of traversing
      // its properties so needed to list them all by hand like this :-(
      // @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math
      Math: {
        abs: Math.abs,
        acos: Math.acos,
        acosh: Math.acosh,
        asin: Math.asin,
        asinh: Math.asinh,
        atan: Math.atan,
        atan2: Math.atan2,
        atanh: Math.atanh,
        cbrt: Math.cbrt,
        ceil: Math.ceil,
        clz32: Math.clz32,
        cos: Math.cos,
        cosh: Math.cosh,
        exp: Math.exp,
        expm1: Math.expm1,
        f16round: Math.f16round,
        floor: Math.floor,
        fround: Math.fround,
        hypot: Math.hypot,
        imul: Math.imul,
        log: Math.log,
        log1p: Math.log1p,
        log2: Math.log2,
        log10: Math.log10,
        max: Math.max,
        min: Math.min,
        pow: Math.pow,
        round: Math.round,
        sign: Math.sign,
        sin: Math.sin,
        sinh: Math.sinh,
        sqrt: Math.sqrt,
        tan: Math.tan,
        tanh: Math.tanh,
        trunc: Math.trunc,
        // Static properties of Math
        E: Math.E,
        LN2: Math.LN2,
        LN10: Math.LN10,
        LOG2E: Math.LOG2E,
        LOG10E: Math.LOG10E,
        PI: Math.PI,
        SQRT1_2: Math.SQRT1_2,
        SQRT2: Math.SQRT2,
      },
      // A version of console that we can add debug info to
      console: {
        log: (...values: unknown[]) => {
          sendLog('log', ...values)
        },
        info: (...values: unknown[]) => {
          sendLog('info', ...values)
        },
        warn: (...values: unknown[]) => {
          sendLog('warn', ...values)
        },
        debug: (...values: unknown[]) => {
          sendLog('debug', ...values)
        },
        error: (...values: unknown[]) => {
          sendLog('error', ...values)
        },
      },
    })

    arena.evalCode(init.jsSource)
  } catch (err) {
    // If we failed to boot the machine for some reason,
    // we're not started
    machineStarted = false
    sendLog('error', 'Failed to start VM', err)
    throw err
  }
}

function sendNewState(state: unknown) {
  self.postMessage({
    type: 'state',
    state: safeSerialize(state),
  } satisfies OutgoingMessage)
}

function sendLog(level: Extract<OutgoingMessage, { type: 'log' }>['level'], ...content: unknown[]) {
  self.postMessage({
    type: 'log',
    level,
    content: [`Widget (${widget?.name ?? 'uninitialized'})`, ...content.map(safeSerialize)],
  } satisfies OutgoingMessage)
}

function createContext(seed: string) {
  return {
    assets,
    settings,
    now: Date.now(),
    random: seedrandom.alea(seed),
    size,
  }
}

/**
 * Helper function to convert a standard chat message into its string representation
 */
function chatToText(nodes: ChatNode[]): string {
  function nodeToString(node: ChatNode): string {
    switch (node.type) {
      case 'link':
        return node.nodes.reduce((acc, node) => acc + nodeToString(node), '')
      case 'mention':
        return `@${node.mentionedDisplayName}`
      case 'emoji':
        return node.code
      case 'text':
        return node.text
      default:
        node satisfies never
        return ''
    }
  }

  return nodes.reduce((acc, node) => acc + nodeToString(node), '')
}

function safeSerialize<T>(obj: T): T {
  // This in an unfortunate side-effect of web-worker + QuickJS
  // Because the Arena wraps values coming out of the VM as a Proxy
  // object, we cannot send the value raw via `postMessage`. This is
  // because Proxy objects are not postMessage serializable. To get
  // around this we throw the state through a stringify -> parse pass
  // to ensure the value is real object again and all of it's fields
  // are `postMessage`able
  try {
    return JSON.parse(JSON.stringify(obj ?? null, serializer))
  } catch (_) {
    debugger
  }
}

function serializer(_key: string, value: any) {
  if (value instanceof QuickJSContext) {
    return
  }

  return value
}
function _serializer() {
  const stack: any[] = []
  const keys: string[] = []

  return function (this: any, key: string, value: any) {
    if (!stack.length) {
      stack.push(value)
    } else {
      const thisPos = stack.indexOf(this)
      if (this.pos !== -1) {
        stack.splice(thisPos + 1)
        keys.splice(thisPos, Infinity, key)
      } else {
        stack.push(this)
        keys.push(key)
      }

      const valuePos = stack.indexOf(value)
      if (valuePos === 0) {
        return '[Circular ~]'
      } else if (valuePos > 0) {
        return `[Circular ~.${keys.slice(0, valuePos).join('.')}]`
      }
    }

    return value
  }
}
