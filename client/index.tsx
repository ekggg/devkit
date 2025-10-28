import { StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { ErrorBoundary } from 'react-error-boundary'
import { App } from './app'
import { widget } from './widget'

import '@fontsource-variable/inter'
import './index.css'

if (import.meta.hot) {
  render((import.meta.hot.data.root ??= createRoot(document.body)), widget)
  import.meta.hot.accept('./widget', (m) => {
    render(import.meta.hot!.data.root, m!.widget)
  })
} else {
  render(createRoot(document.body), widget)
}

function render(root: Root, widget: Record<string, string>) {
  root.render(
    <StrictMode>
      <ErrorBoundary fallbackRender={renderError}>
        <App widget={widget} />
      </ErrorBoundary>
    </StrictMode>,
  )
}

function renderError({ error }: { error: Error }) {
  return <div className="text-2xl text-red-500">{error.message}</div>
}
