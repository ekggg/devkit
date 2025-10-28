import { create } from 'handlebars'
import { getDecimalAmount } from './currency-utils'
import type { ChatNode, WidgetContext } from './types'

export const Handlebars = create()

// Global conditional helpers
Handlebars.registerHelper('eq', function (this: unknown, a: unknown, b: unknown, options: Handlebars.HelperOptions) {
  if (arguments.length !== 3) {
    throw new Handlebars.Exception('#if requires exactly two arguments')
  }

  return a == b ? options.fn(this) : options.inverse(this)
})

Handlebars.registerHelper('in', function (this: unknown, value: unknown, ...args: unknown[]) {
  const options = args.pop() as Handlebars.HelperOptions
  const values = args

  if (values.length === 0) {
    throw new Handlebars.Exception('#in requires at least one option')
  }

  return values.includes(value) ? options.fn(this) : options.inverse(this)
})

// Gobal utility helpers
Handlebars.registerHelper('repeat', function (this: unknown, rawCount: unknown, options: Handlebars.HelperOptions) {
  const num = parseInt(String(rawCount), 10)
  if (isNaN(num)) {
    throw new Handlebars.Exception('#repeat received an invalid number')
  } else if (num <= 0) {
    return ''
  }

  let result = ''
  for (let i = 0; i < num; i++) {
    result += options.fn(this)
  }
  return result
})

// Global partials
Handlebars.registerPartial('renderChat', function (context: ChatNode[], _opts) {
  function renderNode(node: ChatNode): string {
    switch (node.type) {
      case 'link':
        return `<a data-type="link" href="${node.href}">${node.nodes.reduce((acc, node) => acc + renderNode(node), '')}</a>`
      case 'emoji':
        return `<img data-type="emoji" data-emojiid="${node.id}" src="${node.src}" srcset="${node.srcSet}" />`
      case 'mention':
        return `<span data-type="mention" data-userid="${node.mentionedId}">${Handlebars.escapeExpression(node.mentionedDisplayName)}</span>`
      case 'text':
        return Handlebars.escapeExpression(node.text)
      default:
        node satisfies never
        return ''
    }
  }

  return new Handlebars.SafeString(context.reduce((acc, node) => acc + renderNode(node), '')) as unknown as string
})

const TEMPLATE_CACHE: Record<string, ReturnType<typeof Handlebars.compile>> = {}

type Formatters = Intl.DateTimeFormat | Intl.NumberFormat | Intl.RelativeTimeFormat
const FORMATTERS_CACHE: Record<`${string}:${string}`, Formatters> = {}
function getFormatter<T extends Formatters>(locale: string, key: string, fn: () => T): T {
  const cacheKey = `${locale}:${key}` as const
  if (FORMATTERS_CACHE[cacheKey]) return FORMATTERS_CACHE[cacheKey] as T
  FORMATTERS_CACHE[cacheKey] = fn()
  return FORMATTERS_CACHE[cacheKey] as T
}

const helpersForLocale = (locale: string): Record<string, Handlebars.HelperDelegate> => {
  const formatAgo: {
    (date: unknown, options: Handlebars.HelperOptions): string
    (date: unknown, format: unknown, options: Handlebars.HelperOptions): string
  } = function (rawDate: unknown, format: unknown, rawOptions?: Handlebars.HelperOptions) {
    if (arguments.length > 3) {
      throw new Handlebars.Exception('formatAgo only takes one or two arguments')
    }
    const date = new Date(rawDate as string | number | Date)
    if (isNaN(date.getTime())) {
      throw new Handlebars.Exception('formatAgo received an invaid date')
    }

    let options: Handlebars.HelperOptions
    let formatter: Intl.RelativeTimeFormat
    switch (format) {
      case 'short':
      case 'long':
      case 'narrow':
        formatter = getFormatter(locale, `formatTime:${format}`, () => new Intl.RelativeTimeFormat(locale, { style: format }))
        options = rawOptions!
      default:
        formatter = getFormatter(locale, 'formatAgo:short', () => new Intl.RelativeTimeFormat(locale, { style: 'short' }))
        options = format as Handlebars.HelperOptions
    }
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)
    const diffMonths = Math.floor(diffDays / 30)

    if (Math.abs(diffSeconds) < 60) {
      return formatter.format(diffSeconds, 'seconds')
    }
    if (Math.abs(diffHours) < 24) return formatter.format(diffHours, 'hours')
    if (Math.abs(diffDays) < 30) return formatter.format(diffDays, 'days')
    return formatter.format(diffMonths, 'months')
  }

  const formatTime: {
    (date: unknown, options: Handlebars.HelperOptions): string
    (date: unknown, format: unknown, options: Handlebars.HelperOptions): string
  } = function (rawDate: unknown, format: unknown, rawOptions?: Handlebars.HelperOptions): string {
    if (arguments.length > 3) {
      throw new Handlebars.Exception('formatTime only takes one or two arguments')
    }

    const date = new Date(rawDate as string | number | Date)
    if (isNaN(date.getTime())) {
      throw new Handlebars.Exception('formatTime received an invaid date')
    }

    let options: Handlebars.HelperOptions
    let formatter: Intl.DateTimeFormat
    switch (format) {
      case 'short':
      case 'medium':
      case 'long':
      case 'full':
        formatter = getFormatter(locale, `formatTime:${format}`, () => new Intl.DateTimeFormat(locale, { timeStyle: format }))
        options = rawOptions!
      default:
        formatter = getFormatter(locale, 'formatTime:short', () => new Intl.DateTimeFormat(locale, { timeStyle: 'short' }))
        options = format as Handlebars.HelperOptions
    }

    return formatter.format(date)
  }

  const formatDate: {
    (date: unknown, options: Handlebars.HelperOptions): string
    (date: unknown, format: unknown, options: Handlebars.HelperOptions): string
  } = function (rawDate: unknown, format: unknown, rawOptions?: Handlebars.HelperOptions): string {
    if (arguments.length > 3) {
      throw new Handlebars.Exception('formatDate only takes one or two arguments')
    }

    const date = new Date(rawDate as string | number | Date)
    if (isNaN(date.getTime())) {
      throw new Handlebars.Exception('formatDate received an invaid date')
    }

    let options: Handlebars.HelperOptions
    let formatter: Intl.DateTimeFormat
    switch (format) {
      case 'short':
      case 'medium':
      case 'long':
      case 'full':
        formatter = getFormatter(locale, `formatTime:${format}`, () => new Intl.DateTimeFormat(locale, { dateStyle: format }))
        options = rawOptions!
      default:
        formatter = getFormatter(locale, 'formatTime:short', () => new Intl.DateTimeFormat(locale, { dateStyle: 'short' }))
        options = format as Handlebars.HelperOptions
    }

    return formatter.format(date)
  }

  const formatNumber: {
    (num: unknown, options: Handlebars.HelperOptions): string
    (num: unknown, format: unknown, options: Handlebars.HelperOptions): string
  } = function (rawNum: unknown, format: unknown, rawOptions?: Handlebars.HelperOptions): string {
    if (arguments.length > 3) {
      throw new Handlebars.Exception('formatNumber only takes one or two arguments')
    }

    const num = parseInt(String(rawNum), 10)
    if (isNaN(num)) {
      throw new Handlebars.Exception('formatNumber received an invalid number')
    }

    let options: Handlebars.HelperOptions
    let formatter: Intl.NumberFormat
    switch (format) {
      case 'standard':
      case 'scientific':
      case 'engineering':
        formatter = getFormatter(locale, `formatTime:${format}`, () => new Intl.NumberFormat(locale, { notation: format }))
        options = rawOptions!
      case 'compact':
        formatter = getFormatter(
          locale,
          `formatTime:${format}`,
          () =>
            new Intl.NumberFormat(locale, {
              notation: format,
              compactDisplay: 'short',
            }),
        )
        options = rawOptions!
      default:
        formatter = getFormatter(locale, 'formatTime:standard', () => new Intl.NumberFormat(locale, { notation: 'standard' }))
        options = format as Handlebars.HelperOptions
    }

    return formatter.format(num)
  }

  const formatCurrency = function (rawNum: unknown, currency: unknown, _options: Handlebars.HelperOptions): string {
    if (arguments.length !== 3) {
      throw new Handlebars.Exception('formatCurrency takes two arguments')
    }

    let num = parseInt(String(rawNum), 10)
    if (isNaN(num)) {
      throw new Handlebars.Exception('formatCurrency received an invalid number')
    }
    if (typeof currency !== 'string' || currency.length !== 3) {
      throw new Handlebars.Exception('formatCurrency received an invalid currency')
    }

    // Currencies in events are store as integers, but when displaying
    // we want to show in native amount
    num = getDecimalAmount(num, currency)

    if (currency.toLowerCase() === 'bits') {
      // Payments in bits are rendered as a number, not currency
      return `${formatNumber(num, _options)} bits`
    }

    const isWholeNumber = Number.isInteger(num)
    const formatter = getFormatter(locale, `formatCurrency:${currency}:${isWholeNumber}`, () => {
      const options: Intl.NumberFormatOptions = {
        style: 'currency',
        currency,
      }
      if (isWholeNumber) {
        // If the amount is a whole number, set min and max fraction digits to 0
        options.minimumFractionDigits = 0
        options.maximumFractionDigits = 0
      }
      return new Intl.NumberFormat(locale, options)
    })

    return formatter.format(num)
  }

  return {
    formatAgo,
    formatCurrency,
    formatDate,
    formatNumber,
    formatTime,
  }
}

export function renderWidgetFactory(
  template: string,
  assets: WidgetContext['assets'] = {},
  settings: WidgetContext['settings'] = {},
): (state: unknown) => string {
  const locale = typeof settings.locale === 'string' ? settings.locale : navigator.language
  const localHelpers = { ...helpersForLocale(locale) }

  // preventIndent: true avoids a few bugs in how partials work.
  // Specifically renderChat returns a SafeString which can't be split
  // https://github.com/handlebars-lang/handlebars.js/issues/1695
  const renderer = (TEMPLATE_CACHE[template] = TEMPLATE_CACHE[template] || Handlebars.compile(template, { preventIndent: true }))

  return (state) => {
    const context = Object.assign({}, state, { assets, settings })
    const contents = renderer(context, { helpers: localHelpers })
    // We wrap the result in a div since morphdom wants a single root element
    // and we can't expect widget devs to always return a single element
    return `<div>${contents}</div>`
  }
}
