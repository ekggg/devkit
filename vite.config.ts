import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  root: './client',
  mode: 'development',
  plugins: [tailwindcss(), react()],
  build: {
    outDir: '../dist',
    target: 'esnext',
    rolldownOptions: {
      external: ['ekg:widget', 'ekg:devkit', '@fontsource-variable/inter'],
    },
  },
})
