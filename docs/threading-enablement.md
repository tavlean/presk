# Threading Enablement (COOP/COEP) — Plan

Last updated: 2026-06-02. Status: **cross-origin isolation DONE — verified in the
production preview and now e2e-test-protected. The threaded MT runtime is a
deliberately-disabled subsystem (deferred; exact re-enablement plan below).**
Owner: solo. Priority: **high (performance), but its own focused session.**

Read [STATUS.md](STATUS.md) for live state. This finishes a **parked migration
item**, it is not new greenfield work.

> **What landed & is VERIFIED (branch `codec-cleanup-and-threading`):**
> cross-origin isolation now actually activates. `static/_headers` carries
> COOP `same-origin` + COEP `require-corp` into the static output, and
> `svelte.config.js` excludes `static/_headers` from the SW precache manifest so
> `cache.addAll` won't 404 (commit `27ae8b88`). **The first attempt's
> `server.headers`/`preview.headers` did NOT work** — SvelteKit renders the page
> document itself and bypasses Vite's header config, so the document never became
> isolated. **Fixed in commit `09f08f22`** with a Vite plugin
> (`sqush-cross-origin-isolation`) that injects the pair via
> `configureServer`/`configurePreviewServer` middleware on every response.
> **Verified in the dev preview:** `self.crossOriginIsolated === true`,
> `SharedArrayBuffer` available, a shared `WebAssembly.Memory` constructs, no
> COEP-blocked resources, clean console, `npm run check` green. So
> `checkThreadsSupport()` will now return true.
>
> **Two seams still remain before threading is real in PRODUCTION:**
> 1. **Threaded helper-asset emission.** `audit:static-output` reports *"JPEG XL
>    threaded worker helper assets: 0"* and *"OxiPNG parallel worker helper
>    assets: 0"* — the production build does not yet emit the `_mt` /
>    `pkg-parallel` `.worker.js` + threaded `.wasm` helper assets, so when threads
>    engage the dynamic import of those builds may 404 in the static build (dev
>    resolves them on the fly; prod won't). This is the real remaining work.
> 2. **Cross-browser + encode confirmation.** Confirm each codec actually loads
>    its `_mt` module and a real encode uses multiple cores, across Chromium,
>    Safari (nested-worker gotcha), and Firefox.

## The finding (why this exists)

The app **already ships multithreaded codec variants** and already detects
thread support — AVIF, JPEG XL, and OxiPNG each call
`worker-shared/supports-wasm-threads` and load a `_mt` / `_mt_simd` /
`pkg-parallel` build when threads are available
(e.g. `src/features/encoders/oxiPNG/worker/oxipngEncode.ts` calls
`initThreadPool(navigator.hardwareConcurrency)`). (WebP 2 also shipped a `_mt`
build but was removed from the codec surface — see
[codec-surface-cleanup.md](codec-surface-cleanup.md).)

WASM threads require `SharedArrayBuffer`, which requires the page to be
**cross-origin isolated** via two response headers:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Upstream Squoosh sets these in `serve.json` (Jake Archibald, commit `58c09ff7`,
May 2021). The fork inherited it, then commit **`b6abdea0` "Promote SvelteKit
app to root" deleted `serve.json`** (−22 lines). The current build sets the
headers nowhere (`adapter-static`, no `_headers`, no Vite dev headers), so
`checkThreadsSupport()` returns false everywhere and every codec silently runs
its **single-threaded** build.

The migration team knew and deferred this on purpose — it is tracked as
*unproven* in `history/dashboard.html`, `history/road-map` notes, and the
seams audits. This plan closes it out.

## Why it matters

- **Biggest available performance win**, and free of any codec upgrade — AVIF /
  JXL / WebP 2 / OxiPNG go multi-core.
- This is how the app "uses Apple Silicon" properly: a browser app can't ship
  native ARM/NEON, but portable WASM SIMD + worker threads put an M-series
  machine's many cores to work. (Native-tier performance would require a
  Tauri/native wrapper — a separate product, not this plan.)
- **Prerequisite for the "encode to every format at once, compare sizes"
  feature** (see [road-map.md](road-map.md) → Multi-Format Compare).

## Plan

1. **Set the headers. — DONE (commit `27ae8b88`).**
   - Dev/preview: `vite.config.ts` sets `Cross-Origin-Opener-Policy: same-origin`
     + `Cross-Origin-Embedder-Policy: require-corp` on both the dev `server` and
     `preview`.
   - Production: `adapter-static` emits files, so headers are set at the **host**.
     `static/_headers` carries the same pair into the static output for
     Netlify/Cloudflare-style hosts (`svelte.config.js` excludes it from the SW
     precache manifest so it does not 404 in `cache.addAll`). If a host cannot set
     headers, fall back to the `coi-serviceworker` shim, but prefer real headers
     since the app already runs its own service worker.
2. **Verify isolation. — ✅ DONE & TEST-PROTECTED.** Verified in the production
   preview: `self.crossOriginIsolated === true`, `SharedArrayBuffer` available,
   shared `WebAssembly.Memory` constructs. The e2e suite
   (`tests/e2e/app-shell.spec.ts`) now **asserts `crossOriginIsolated === true`**,
   so a future regression (e.g. someone dropping the headers again) fails CI.
3. **Wire the multithread runtime. — DEFERRED (the real work; see below).**

## How multithreading is currently disabled (exact, code-grounded)

Re-reading the actual pipeline: this is **not** a missing-asset bug — the
SvelteKit code generator **deliberately disables** the threaded runtime. In
`scripts/sync-sveltekit-app.mjs` the generated worker hardcodes:

- AVIF: `createAvifEncoderRuntime({ supportsThreads: async () => false, … })`
- JPEG XL: `createJxlEncoderRuntime({ supportsThreads: async () => false,
  supportsSimd: async () => false, loadSingleThread: …, async loadMultiThread()
  { throw new Error('JPEG XL multithread runtime is unavailable in the SvelteKit
  app.') }, async loadMultiThreadSimd() { throw … } })`
- OxiPNG: `createOxiPngEncoderRuntime({ supportsThreads: async () => false, … })`

So even though `crossOriginIsolated` is now true, every encoder reports
`supportsThreads → false` and runs single-thread; the `_mt` / `pkg-parallel`
modules are never imported, so the build emits **only** single-thread assets
(confirmed: `build/` has `jxl_enc.wasm`, `avif_enc.wasm`,
`squoosh_oxipng_bg.wasm` — no `*_mt*`, no `workerHelpers`). `audit:static-output`
**asserts** these threaded assets are absent (e.g. "Expected no JPEG XL threaded
worker helper assets when the SvelteKit app injects the single-thread runtime").

This was a deliberate migration decision, almost certainly because Emscripten
pthreads + wasm-bindgen-rayon spawn **nested** workers (the codec already runs
inside a worker), and Safari historically can't do nested workers (see
`worker-shared/supports-wasm-threads.ts`), and the threaded `.worker.js` + wasm
URL resolution under SvelteKit static output was unproven.

## Re-enablement plan (per codec: avif, jxl, oxipng)

The data contract already supports it — `src/shared/codec-assets.ts` already has
the `multi-thread` variant, `worker-helper` role, and `threaded-only` cache. The
work is:

1. **Emit + map the threaded assets.** In the generator, add `?url` imports +
   `CodecAssetRecord`s (variant `multi-thread`, role `worker-helper`, cache
   `threaded-only`) for: `jxl_enc_mt(.worker).js` + `jxl_enc_mt_simd`, `avif_enc_mt(.worker)`,
   and oxipng `pkg-parallel` + its `snippets/.../workerHelpers.js`. Extend the
   generated `locateCodecWasm` map to resolve the threaded `.wasm`.
2. **Generate a threaded worker.** Replace the `supportsThreads: () => false`
   stubs with real detection (`worker-shared/supports-wasm-threads`) and implement
   `loadMultiThread`/`loadMultiThreadSimd` to instantiate the `_mt` modules with
   the injected threaded wasm URL **and** the `.worker.js`/`workerHelpers` URL
   (Emscripten `mainScriptUrlOrBlob` / wasm-bindgen-rayon `initThreadPool`).
3. **Service worker.** Cache the `threaded-only` assets at runtime (the cache type
   exists for exactly this) so offline still works once threads are used.
4. **Flip the audit.** Change the three `=== 0` asserts in
   `scripts/audit-static-output.mjs` to expect the threaded assets, and add their
   logical records to `expectedLogicalAssetRecords`.
5. **Verify.** `npm run test:e2e` must stay green (single-thread fallback intact),
   then confirm in an isolated browser that the `_mt` modules actually load (200,
   not 404) and a real encode runs threaded.

## Risks / watch-list

- **Nested workers + Safari — RESOLVED (2026-06-02).** This was THE make-or-break
  unknown and the reason the runtime was deferred. It is now **verified false**:
  `tests/e2e/threads-support.spec.ts` runs against **Playwright WebKit (Safari's
  exact engine, JavaScriptCore) as well as Chromium** and confirms that, inside a
  worker in the app's cross-origin-isolated context, both engines support
  `SharedArrayBuffer` + spawning a **nested** `Worker` + sharing that SAB via
  `Atomics` — exactly what wasm-bindgen-rayon / Emscripten pthreads need. (The
  historical Safari-16 nested-worker gap is gone in current Safari/WebKit.) So the
  engine capability is no longer a blocker; the remaining risk is purely the Vite
  pthread-URL resolution below. Still keep single-thread as the automatic fallback.
- **Emscripten pthread URL resolution under Vite static output** — the empirical
  hard part; expect iteration on the `.worker.js` / wasm URLs.
- `COEP: require-corp` rejects cross-origin subresources without CORP. Sqush is
  self-contained, so low risk — but audit any external asset before shipping.

## Effort

**Medium now — the scary part is gone.** The isolation foundation is done,
verified, and test-protected; and the **nested-worker-in-Safari make-or-break is
now verified working** (via Playwright WebKit — see Risks above), which was the
reason this was sized "Large / its own session." What remains is the mechanical
multi-file wiring (generator worker + asset records + `OxipngWasmUrls.multiThread`
in the bridge + audit flip + SW cache) and the one empirical unknown left: whether
wasm-bindgen-rayon's `new Worker(new URL('./workerHelpers.js', import.meta.url))`
resolves correctly under Vite's static output — testable in CI now that WebKit is
in the e2e matrix. Keep single-thread as the automatic fallback throughout.

## Related

- [codec-upgrade-audit.md](codec-upgrade-audit.md) — WASM framing; threading note.
- [road-map.md](road-map.md) — Multi-Format Compare feature (depends on this).
- Archived context: `history/sveltekit-migration-seams-exit-audit.md`,
  `history/dashboard.html`.
