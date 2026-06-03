# Sqush

Sqush is a local-first image optimizer derived from [Squoosh]. Images are
decoded, processed, encoded, previewed, and exported in the browser. There is no
upload path and no server-side image processing.

Website: [sqush.app](https://sqush.app)

## Current App

The SvelteKit 2 / Svelte 5 migration is complete. `main` is the production app,
living at the repo root as a static SPA:

- `src/routes/+page.svelte` is the single-image optimizer.
- `src/lib/editor/` contains the Svelte editor shell, controls, output view, and
  rune-backed editor session.
- `src/lib/compress.ts` adapts the Svelte editor to the shared image pipeline.
- `src/client/lazy-app/image-pipeline*` and `src/client/lazy-app/bulk/` remain
  framework-neutral engine code.
- `src/features/**`, `src/shared/codec-assets.ts`, and `codecs/**` remain the
  codec/runtime foundation.
- `src/service-worker.ts` is the SvelteKit-native offline service worker.

The original Preact/Rollup app is preserved on the `preact` branch (tag
`preact-final`) for reference only; it is no longer a fallback for `main`.

All seven WASM codecs have been rebuilt from source on current upstreams (closing
14 CVEs, including a CVSS 9.8), and multi-threaded codec encoding is enabled and
verified across browser engines, with a single-thread fallback — see
[docs/codec-build-notes.md](docs/codec-build-notes.md) and
[docs/threading-enablement.md](docs/threading-enablement.md). Post-migration
Svelte hardening is essentially complete
([docs/svelte-hardening-plan.md](docs/svelte-hardening-plan.md)).

## Developing

Use the Node version in [.nvmrc](.nvmrc). The package metadata expects Node
`>=24.12.0 <25` and npm `>=11`.

```sh
npm install
npm run dev
npm run build
npm run preview
npm run check
```

Useful maintenance commands:

```sh
npm run sync                 # regenerate .svelte-kit/sqush-generated/*
npm run audit:static-output  # verify emitted worker/WASM assets
npm run audit                # npm audit --audit-level=low
npm run format:check
```

`npm run check` is the normal local gate. It runs formatting, generator sync,
SvelteKit sync, `svelte-check`, production build, and the static-output audit.

## Local-First Contract

A working build must preserve:

- local import, decode, process, encode, preview, and export;
- WebP, AVIF, JPEG XL, MozJPEG, OxiPNG, QOI, and the browser encoders (WebP 2 was
  deliberately removed — no browser can decode it);
- object URL cleanup and downloadable outputs;
- static output with no image-processing server;
- service-worker/offline reload after the app has loaded.

Regressions in single-image optimization, codec workers/WASM, exports, or
offline behavior are release blockers.

## Docs

[docs/README.md](docs/README.md) is the index and map of the full doc set; start
there. Key entries:

- [Agent guide](AGENTS.md)
- [Current status](docs/STATUS.md)
- [Project overview](docs/overview.md)
- [Build and runtime map](docs/build-and-runtime.md)
- [Codec build notes](docs/codec-build-notes.md) — building each WASM codec from source
- [Codec provenance](docs/codec-provenance.md)
- [Multithreading](docs/threading-enablement.md)
- [Browser support policy](docs/browser-support.md)
- [Product roadmap](docs/road-map.md)
- [User guide](docs/user-guide/index.md)
- [Manual QA checklist](docs/manual-qa.md)
- [Cleanup & Svelte hardening plan](docs/svelte-hardening-plan.md)
- [Migration plan (archived)](docs/history/MIGRATION-PLAN.md)

## Attribution

Sqush is derived from GoogleChromeLabs' Squoosh project and continues under the
Apache 2.0 license.

[squoosh]: https://github.com/GoogleChromeLabs/squoosh
