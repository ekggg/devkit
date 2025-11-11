import { defineConfig } from 'tsdown'

export default defineConfig({
  dts: false,
  minify: true,
  entry: ['./cli/index.ts'],
  format: ['esm'],
  outDir: 'dist',
})
