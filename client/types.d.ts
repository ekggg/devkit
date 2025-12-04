declare module 'ekg:devkit' {
  export type ManagedWidget = {
    init(template: string, js: string, css: string, assets: EKG.WidgetAssets, settings: EKG.WidgetSettings): void
    stop(): void
  }

  export const manager: {
    setInitialData(data: EKG.InitialData): void
    fireEvent(e: EKG.Event): void
    createManagedWidget(el: HTMLElement): ManagedWidget
  }

  export const EventSchema: {
    $defs: Record<string, any>
    oneOf: { $ref: string }[]
  }
}

declare module 'ekg:widget' {
  export const widget: Record<string, string>
  export const state: string
}
