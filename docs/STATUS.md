# Sqush Status

Last updated: 2026-05-31.

Read this first. Sqush is a local-first image optimizer: image work stays in the
browser, the build is static, and offline reload must work after load.

## Current State

- The launch candidate is the `svelte` branch in `../Sqush-svelte`.
- The SvelteKit 2 / Svelte 5 app now lives at the repo root, not in
  `prototypes/sveltekit/`.
- The old Preact/Rollup app shell, Rollup build helpers, old service-worker
  adapters, and Preact option UI have been removed from this branch.
- `main` remains the historical Preact/Rollup safety net until the Svelte branch
  is accepted and merged.
- Bulk UI is not part of migration closeout. Bulk and other product additions
  are tracked in [road-map.md](road-map.md).

## Product Scope For Launch

The root app preserves the existing single-image optimizer:

- import by file picker or drag/drop;
- local decode, preprocess, resize, quantize, encode, preview, and download;
- two-up before/after output with zoom, pan, split, backgrounds, and rotate;
- per-side output format and option panels;
- saved per-side encoder settings;
- static output through SvelteKit adapter-static;
- SvelteKit-native service worker and codec/WASM precache;
- WebP, WebP 2, AVIF, JPEG XL, MozJPEG, OxiPNG, QOI, and browser encoders.

WebP remains the first production focus, AVIF second, JPEG XL advanced, and WebP
2 experimental but included for parity until maintainer testing proves whether
it should stay.

## Active Architecture

- `src/routes/+page.svelte` — single-image optimizer route.
- `src/routes/diagnostics/+page.svelte` — runtime diagnostics for generated
  workers, WASM assets, pipeline probes, and shared helpers.
- `src/lib/editor/editor-session.svelte.ts` — rune-backed editor state and
  encode orchestration.
- `src/lib/editor/options/` — Svelte option controls and per-format panels.
- `src/lib/editor/output/` — two-up output view and local pointer/zoom helpers.
- `src/lib/compress.ts` — Svelte adapter over the shared image pipeline.
- `src/lib/sveltekit-worker-bridge.ts` — SvelteKit worker bridge over generated
  worker metadata.
- `src/client/lazy-app/image-pipeline*` — framework-neutral single-image engine.
- `src/client/lazy-app/bulk/` — framework-neutral bulk helpers for future work.
- `src/features/**` — codec metadata, client runtimes, and worker runtimes.
- `src/shared/codec-assets.ts` — build-tool-neutral codec asset records.
- `scripts/sync-sveltekit-app.mjs` — generates
  `.svelte-kit/sqush-generated/*`.
- `scripts/audit-static-output.mjs` — verifies emitted worker/WASM output.
- `src/service-worker.ts` — SvelteKit service worker.

Generated files live under `.svelte-kit/sqush-generated/` and are not
committed. Run `npm run sync` or `npm run check` to regenerate them.

## Commands

From the repo root:

```sh
npm install
npm run dev
npm run build
npm run preview
npm run check
npm run audit
```

`npm run check` is the standard gate: formatting check, generator sync,
SvelteKit sync, `svelte-check`, production build, and static-output audit.

## Verification State

Current local verification:

- `npm install` pruned the old Rollup/Preact graph and produced a clean audit.
- `npm run sync` regenerates the SvelteKit metadata and codec wrapper copies.
- `svelte-check --tsconfig ./tsconfig.json` is green after the root move.
- `npm run check` passes: formatting, generator sync, SvelteKit sync,
  `svelte-check`, production build, and static-output audit.
- `npm run audit` reports 0 vulnerabilities.
- Production preview smoke on `http://127.0.0.1:5189/` passes with Playwright:
  PNG to WebP, PNG to WebP 2, JPEG/SVG/WebP inputs to WebP, desktop load,
  `390 x 844` mobile viewport with no horizontal overflow, controlled service
  worker, offline reload, and no console/page errors.
- Svelte MCP docs were consulted for project structure, adapter-static,
  service workers, `$service-worker`, config, `.svelte.ts` modules, and Svelte 5
  best practices.
- Svelte MCP autofixer reports no hard issues for the edited route/editor
  components. Remaining suggestions are DOM/canvas effects that are intentional
  side effects.

Still required before launch acceptance:

- maintainer acceptance with real daily-use images, especially large photos and
  any edge formats they care about;
- targeted fixes for regressions found during that acceptance pass;
- final merge/ship decision for the `svelte` branch.

## Next Actions

1. Have the maintainer do real-use acceptance on the Svelte branch.
2. Fix only migration regressions found by that acceptance pass.
3. Merge/ship the Svelte branch when accepted.
4. Start roadmap work after migration is closed, beginning with design decisions
   for bulk optimization.

## Gotchas

- Do not add bulk UI as part of migration cleanup.
- Do not prune WebP 2 yet; it remains included as experimental parity.
- Do not touch `codecs/**` without codec provenance, build, service-worker, and
  browser verification.
- Preview browsers can keep old service workers. If behavior looks stale, clear
  site data or use a fresh context.
