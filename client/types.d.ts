declare module 'ekg:devkit' {
  export type ManagedWidget = {
    init(opts: {
      template: string
      js: string
      css: string
      cdnDomain: string
      fonts: string
      assets: EKG.WidgetAssets
      settings: EKG.WidgetSettings
      persistedState: unknown
    }): void
    persist(): Promise<unknown>
    stop(): void
  }

  export const manager: {
    setInitialData(data: EKG.InitialData): void
    fireEvent(e: EKG.Event): void
    createManagedWidget(el: HTMLElement, logHandler?: (level: string, content: unknown[]) => void): ManagedWidget
  }

  export const EventSchema: {
    $defs: Record<string, any>
    oneOf: { $ref: string }[]
  }

  export const Fonts: {
    name: string
    value: string
    font_face: string
  }[]
}

declare module 'ekg:widget' {
  export const widget: Record<string, string>
  export const state: string
}
