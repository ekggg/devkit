import { z } from 'zod/v4'

export const stateSchema = z.object({
  width: z.number().min(0).catch(1000),
  height: z.number().min(0).catch(1000),
  settings: z.record(z.string(), z.unknown()).catch({}),
  events: z.record(z.string(), z.unknown()).catch({}),
  persistedState: z.unknown().optional(),
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
        file: z.string().default(''),
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
