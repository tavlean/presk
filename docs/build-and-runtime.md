# Build And Runtime Map

This branch uses SvelteKit and Vite at the repo root. The old Rollup build has
been removed from the `svelte` branch.

## Commands

`npm run dev` starts the SvelteKit dev server.

`npm run build` runs:

1. `npm run sync`
2. `vite build`

`npm run check` runs:

1. `prettier --check`
2. `npm run sync`
3. `svelte-kit sync`
4. `svelte-check --tsconfig ./tsconfig.json`
5. `npm run build`
6. `npm run audit:static-output`

`npm run preview` serves the generated `build/` folder with Vite preview.

## SvelteKit Config

- `src/routes/+layout.ts` exports `ssr = false` and `prerender = true`.
- `svelte.config.js` uses `@sveltejs/adapter-static` with `fallback: '200.html'`.
- Service-worker auto-registration is disabled so `src/lib/service-worker-registration.ts`
  can handle dev cleanup and production registration explicitly.
- `vite.config.ts` and `svelte.config.js` define aliases for `client`,
  `features`, `shared`, `sw`, `codecs`, `worker-shared`, and generated
  `sqush-generated` modules.

## Generated Runtime Files

`scripts/sync-sveltekit-app.mjs` writes generated files under
`.svelte-kit/sqush-generated/`. The important generated groups are:

- `feature-meta/`: encoder/processor/preprocessor metadata.
- `features-worker/webp.ts`: generated Comlink worker entry covering active
  codecs and processors.
- `worker-bridge/meta.ts`: method names and worker API type.
- `worker-surface/ready.ts`: ready and intentionally blocked worker methods.
- `codec-assets/`: Vite URL imports and logical codec asset manifests.
- `codecs/`: patched wrapper copies that avoid duplicate WASM emissions.
- `service-worker/cache-plan.ts`: generated worker/cache records for the
  service worker.

Generated files are ignored and can be deleted; `npm run sync` recreates them.

## Service Worker

`src/service-worker.ts` imports `{ build, files, prerendered, version }` from
`$service-worker` and adds generated codec cache URLs from
`src/lib/service-worker-codec-assets.ts`.

Behavior:

- install: precache app, static assets, prerendered paths, generated worker
  entry, and codec WASM assets;
- activate: delete old Sqush caches and claim clients;
- fetch: serve known assets cache-first, otherwise network-first with cache
  fallback.

Production preview is required for realistic service-worker testing.

## Codec Assets

Codec JS/WASM artifacts are committed under `codecs/`. Do not edit or delete
them during ordinary migration cleanup. The SvelteKit generator imports these
assets through Vite `?url` modules and passes explicit URLs into worker runtimes
or Emscripten `locateFile`.

`npm run audit:static-output` verifies the build emits one physical WASM copy
per logical asset and that the service worker references the expected assets.

## Formatting

Prettier is the formatter (`.prettierrc.json`). Run it manually:

- `npm run format` — write fixes across `**/*.{js,css,json,ts,tsx,svelte}`.
- `npm run format:check` — the read-only check that `npm run check` runs first.

There is intentionally **no pre-commit hook**. Husky/lint-staged were removed on
2026-06-02 (solo project; the auto-`prettier --write` interrupted commits and
reflowed Markdown). `*.md` is intentionally excluded from the Prettier globs —
Prettier's Markdown formatter reflows prose and mangles hand-written docs, so
format Markdown by hand. See [STATUS.md](STATUS.md).
