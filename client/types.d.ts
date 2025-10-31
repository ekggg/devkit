declare module 'ekg:devkit' {
  export function loadWidget(
    el: HTMLElement,
    data: {
      template: string
      js: string
      css: string
      assets: EKG.WidgetAssets
      settings: EKG.WidgetSettings
    },
  ): Promise<[Worker, () => void]>
}

declare module 'ekg:widget' {
  export const widget: Record<string, string>
  export const state: string
}
