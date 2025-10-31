import { state, widget } from 'ekg:widget'
import { StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { ErrorBoundary } from 'react-error-boundary'
import { App } from './app'

import '@fontsource-variable/inter'
import './index.css'

if (import.meta.hot) {
  render((import.meta.hot.data.root ??= createRoot(document.body)), widget, state)
  import.meta.hot.accept('ekg:widget', (m) => {
    render(import.meta.hot!.data.root, m!.widget, m!.state)
  })
} else {
  render(createRoot(document.body), widget, state)
}

function render(root: Root, widget: Record<string, string>, state: string) {
  // Remove `./` prefix from widget entries
  const w = Object.fromEntries(Object.entries(widget).map(([k, v]) => [k.slice(2), v]))
  root.render(
    <StrictMode>
      <ErrorBoundary fallbackRender={renderError}>
        <App widget={w} state={state} />
      </ErrorBoundary>
    </StrictMode>,
  )
}

function renderError({ error }: { error: Error }) {
  return <div className="text-2xl text-red-500">{error.message}</div>
}
