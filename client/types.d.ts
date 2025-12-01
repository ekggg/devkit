declare module 'ekg:devkit' {
  export function loadWidget(
    el: HTMLElement,
    data: {
      template: string
      js: string
      css: string
      assets: EKG.WidgetAssets
      settings: EKG.WidgetSettings
      initialData: EKG.InitialData
    },
  ): Promise<[Worker, () => void]>

  export const EventSchema: {
    $defs: Record<string, any>
    oneOf: { $ref: string }[]
  }
}

declare module 'ekg:widget' {
  export const widget: Record<string, string>
  export const state: string
}
