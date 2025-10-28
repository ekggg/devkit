import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { writeFile } from 'node:fs/promises'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
    {
      name: 'EKG Dev Kit',
      configureServer(server) {
        server.ws.on('ekg:state', (data) => {
          writeFile('widget/.state.json', JSON.stringify(data, null, 2))
        })
        server.ws.on('ekg:manifest', (data) => {
          writeFile('widget/manifest.json', JSON.stringify(data, null, 2))
        })
      },
    },
  ],
})
