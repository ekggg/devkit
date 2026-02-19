# @ekg_gg/devkit

The official development toolkit for building [EKG.gg](https://ekg.gg) streaming widgets. Provides a local dev server with live preview, hot reloading, test events, and a build pipeline for publishing widgets to the EKG.gg marketplace.

## Quick Start

```bash
npm create ekg@latest my-widget
cd my-widget
npm run dev
```

This scaffolds a new widget project and starts the dev server at `http://localhost:5173`.

For a full guide on building widgets, see the [Getting Started](https://github.com/ekggg/getting-started) documentation.

## CLI Commands

### `ekg dev [dir]`

Starts the local development server with:

- Live widget preview at configurable dimensions
- Hot reloading on file changes
- Settings panel for testing widget configuration
- Test event buttons for every supported event type
- Auto-generated TypeScript types from your manifest

### `ekg build [dir]`

Validates your manifest, compiles TypeScript, and outputs a `dist/` folder ready to upload to the [EKG.gg artist portal](https://ekg.gg/app/artist/widgets).

### `ekg sync [dir]`

Re-downloads the EKG runtime files and regenerates TypeScript types without starting the dev server. Use `--force` to bypass the cache.

## Type Safety

The devkit auto-generates an `ekg.d.ts` file from your `manifest.json`, providing full TypeScript autocomplete for `ctx.settings` and `ctx.assets` specific to your widget. Types update automatically as you edit the manifest.

## How It Works

The dev server downloads the EKG widget runtime (QuickJS WASM, event schemas, and type definitions) from the EKG.gg servers and caches them locally. Your widget script is compiled with [tsdown](https://tsdown.dev/) and runs inside the same sandboxed environment used in production — so what you see locally is what streamers will see in OBS.
