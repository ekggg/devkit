import { z } from 'zod/v4'
import { generateDefaultScheduleEvents, getDefaultWeekStart } from './fixtures'

let _nextId = 0
export const calendarEventSchema = z.object({
  id: z.string().catch(() => `_${_nextId++}`),
  date: z.string(),
  time: z.string().optional(),
  title: z.string(),
  subtitle: z.string().optional(),
})
export type CalendarEvent = z.infer<typeof calendarEventSchema>

export const stateSchema = z.object({
  width: z.number().min(0).catch(1920),
  height: z.number().min(0).catch(1080),
  settings: z.record(z.string(), z.unknown()).catch({}),
  events: z.record(z.string(), z.unknown()).catch({}),
  persistedState: z.unknown().optional(),
  scheduleWeekStart: z.string().catch(getDefaultWeekStart()),
  scheduleEvents: z.array(calendarEventSchema).catch(generateDefaultScheduleEvents(getDefaultWeekStart())),
  canvasBg: z.string().catch('#FFFFFF88'),
})
export type State = z.infer<typeof stateSchema>

export function parseState(state: string): State {
  try {
    return stateSchema.parse(JSON.parse(state))
  } catch {
    return stateSchema.parse({})
  }
}

export const manifestSchema = z.object({
  $schema: z.literal('https://ekg.gg/schemas/manifest.json').default('https://ekg.gg/schemas/manifest.json'),
  type: z.enum(['overlay', 'schedule']).default('overlay'),
  name: z.string().optional(),
  version: z.string().optional(),
  description: z.string().optional(),
  template: z.string().default(''),
  css: z.string().default(''),
  js: z.string().default(''),
  assets: z
    .record(
      z.string(),
      z.object({
        type: z.string().default(''),
        file: z.string().optional(),
        builtin: z.string().optional(),
      }),
    )
    .optional(),
  settings: z
    .record(
      z.string(),
      z.looseObject({
        type: z.string().default(''),
        name: z.string().default(''),
        description: z.string().optional(),
      }),
    )
    .optional(),
})
export type Manifest = z.infer<typeof manifestSchema>
