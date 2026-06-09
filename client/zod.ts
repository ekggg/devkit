import { z } from 'zod/v4'
import { GOAL_TYPES, generateDefaultGoals, generateDefaultScheduleEvents, getDefaultWeekStart } from './fixtures'

let _nextId = 0
export const calendarEventSchema = z.object({
  id: z.string().catch(() => `_${_nextId++}`),
  date: z.string(),
  time: z.string().optional(),
  title: z.string(),
  subtitle: z.string().optional(),
})
export type CalendarEvent = z.infer<typeof calendarEventSchema>

export const goalSchema = z.object({
  id: z.string().catch(() => `goal_${_nextId++}`),
  type: z.enum(GOAL_TYPES).catch('new_followers'),
  name: z.string().catch('New Goal'),
  status: z.enum(['active', 'archived']).catch('active'),
  start: z.number().catch(0),
  current: z.number().catch(0),
  target: z.number().catch(100),
  currency: z.string().nullable().catch(null),
})
export type Goal = z.infer<typeof goalSchema>

export const stateSchema = z.object({
  width: z.number().min(0).catch(1920),
  height: z.number().min(0).catch(1080),
  settings: z.record(z.string(), z.unknown()).catch({}),
  events: z.record(z.string(), z.unknown()).catch({}),
  persistedState: z.unknown().optional(),
  scheduleWeekStart: z.string().catch(getDefaultWeekStart()),
  scheduleEvents: z.array(calendarEventSchema).catch(generateDefaultScheduleEvents(getDefaultWeekStart())),
  goals: z.array(goalSchema).catch(generateDefaultGoals()),
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
  size: z
    .object({
      width: z.number().int().min(1),
      height: z.number().int().min(1),
    })
    .optional(),
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
        group: z.string().optional(),
      }),
    )
    .optional(),
})
export type Manifest = z.infer<typeof manifestSchema>
