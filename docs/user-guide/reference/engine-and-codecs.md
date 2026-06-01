# Engine & codecs reference

Code-derived inventory of the Sqush processing engine, processors/preprocessors,
and image codecs. Source of truth: `src/features/**` and `codecs/**`. Versions
and provenance come from `docs/codec-provenance.md` and the codec build recipes.

## Engine model

- **The image pipeline runs locally in the browser.** No server, no upload.
  The WASM decode/preprocess/process/encode paths run through the generated
  SvelteKit worker surface. Browser-native JPEG / PNG / GIF encode through
  `canvas.toBlob()` on the main thread because they use browser APIs.
- **Single-thread is the SvelteKit launch baseline.** The generated worker
  surface currently forces single-thread encode for AVIF, JPEG XL, WebP 2, and
  OxiPNG. WebP has a generated SIMD asset path. Threaded artifacts still exist
  under `codecs/`, but threaded runtime enablement is post-launch
  performance/platform work, not current launch behavior.

## Processors & preprocessors

### Resize (`src/features/processors/resize`)

Options panel: `src/lib/editor/options/ResizeOptions.svelte`.
Shapes: `src/features/processors/resize/shared/meta.ts`,
`src/lib/editor/options/processor-types.ts`.

| Field            | Values / range                                                                                                                                | Notes                                                                 |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `method`         | `lanczos3` (default), `mitchell`, `catrom`, `triangle`, `hqx`, `browser-pixelated`, `browser-low`, `browser-medium`, `browser-high`, `vector` | Three families: worker (Rust `resize`/`hqx`), browser-canvas, vector. |
| `width`/`height` | int >= 1                                                                                                                                      | Defaults to source size; aspect lock in UI (`maintainAspect`).        |
| `fitMethod`      | `stretch` (default), `contain`                                                                                                                | Only surfaced when aspect lock is off.                                |
| `premultiply`    | bool (default true)                                                                                                                           | Worker methods only (premultiply alpha).                              |
| `linearRGB`      | bool (default true)                                                                                                                           | Worker methods only (resize in linear light).                         |

- **Worker methods** (`triangle`, `catrom`, `mitchell`, `lanczos3`, `hqx`) run
  in WASM and expose `premultiply` + `linearRGB`.
- **`hqx`** is the pixel-art scaler (Rust `hqx` crate / `squooshhqx`).
- **`browser-*`** map to canvas `imageSmoothingQuality` (pixelated/low/medium/high).
- **`vector`** rasterises an SVG source at the target size; only offered when the
  input is SVG (`isVector`).
- **Presets** (`resize/client/preset-state.ts`): `0.25, 0.3333, 0.5, 1, 2, 3, 4`
  (shown as 25%-400%), plus `custom`.

### Quantize / "Reduce palette" (`src/features/processors/quantize`)

Options panel: `src/lib/editor/options/QuantizeOptions.svelte`.
Shapes: `quantize/shared/meta.ts`, `processor-types.ts`.
Codec: imagequant (`codecs/imagequant/imagequant.*`).

| Field          | Range                | UI? | Notes                                |
| -------------- | -------------------- | --- | ------------------------------------ |
| `maxNumColors` | 2-256 (default 256)  | yes | "Colors" slider.                     |
| `dither`       | 0-1, step 0.01 (1.0) | yes | "Dithering" slider.                  |
| `zx`           | number (default 0)   | NO  | Hidden Konami/easter-egg; see below. |

- **Hidden `zx` (ZX Spectrum) easter-egg.** `quantize/worker/runtime.ts`: when
  `opts.zx` is truthy it calls `module.zx_quantize(...)` (a ZX-Spectrum-palette
  quantizer) instead of `module.quantize(...)`, ignoring `maxNumColors`. The
  Svelte panel deliberately **omits** the `zx` control (only the original
  React/Konami path toggled it). It survives in the data shape and worker only.

### Rotate (preprocessor, `src/features/preprocessors/rotate`)

Shape: `rotate/shared/meta.ts`. Runs **before** processing.

| Field    | Values                            | Notes                                             |
| -------- | --------------------------------- | ------------------------------------------------- |
| `rotate` | `0` (default), `90`, `180`, `270` | ~500B WASM module; grows memory to hold 2x image. |

## Codecs / libraries

WASM/JS artifacts live under `codecs/` (inherited from Squoosh; ~80 committed
JS/WASM artifacts). Each codec is wired through `src/features/{encoders,decoders}`.

| Codec / role           | Library (upstream)               | Version / commit (recorded locally)                                 | Threads               | SIMD                    | App wiring                                                                                                     |
| ---------------------- | -------------------------------- | ------------------------------------------------------------------- | --------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| WebP enc/dec           | libwebp (webmproject/libwebp)    | commit `d2e245ea9e959a5a79e1db0ed2085206947e98f2`                   | no                    | yes (`webp_enc_simd`)   | enc+dec, `image/webp`                                                                                          |
| WebP 2 enc/dec         | libwebp2 (Chromium)              | commit `413df7caeca5013fa9a51401660f7efd8572e0ae`                   | yes (`wp2_enc_mt`)    | yes (`wp2_enc_mt_simd`) | enc+dec, experimental ("WebP v2 (unstable)"), `image/webp2`; SvelteKit uses baseline/single-thread asset paths |
| AVIF enc/dec           | libavif + libaom (+ libsharpyuv) | libavif `v1.0.1`, libaom `v3.7.0`, libwebp `e2c85878...` (sharpyuv) | yes (`avif_enc_mt`)   | no                      | enc+dec, `image/avif`; SvelteKit uses single-thread encode                                                     |
| JPEG XL enc/dec        | libjxl                           | commit `9f544641ec83f6abd9da598bdd08178ee8a003e0`                   | yes (`jxl_enc_mt`)    | yes (`jxl_enc_mt_simd`) | enc+dec, "JPEG XL (beta)", `image/jxl`; SvelteKit uses single-thread encode                                    |
| MozJPEG enc            | mozilla/mozjpeg                  | `v3.3.1` (built `--with-build-date=squoosh`)                        | no                    | no                      | enc, `image/jpeg`                                                                                              |
| OxiPNG enc             | oxipng (crates.io)               | `9.0` (normal + parallel wasm-pack)                                 | parallel build exists | no                      | enc, `image/png`; SvelteKit uses single-thread encode                                                          |
| imagequant (quantize)  | libimagequant (ImageOptim)       | `2.12.1` (`--disable-sse`)                                          | no                    | no                      | quantize processor                                                                                             |
| resize (worker resize) | `resize` crate (crates.io)       | `0.5.5` (wrapper `squoosh-resize` 0.1.0)                            | no                    | no                      | resize processor                                                                                               |
| hqx (pixel-art resize) | CryZe/wasmboy-rs `hqx` crate     | git tag `v0.1.3` (wrapper `squooshhqx` 0.1.0)                       | no                    | no                      | resize processor (`hqx` method)                                                                                |
| QOI enc/dec            | phoboslab/qoi                    | commit `8d35d93cdca85d2868246c2a8a80a1e2c16ba2a8`                   | no                    | no                      | enc+dec, `image/qoi`                                                                                           |
| rotate (preprocessor)  | local Rust (`squoosh-rotate`)    | local `0.1.0` (WABT `1.0.11` + `wasm-opt`)                          | no                    | no                      | rotate preprocessor                                                                                            |

### Browser-native (no WASM) encoders

- **Browser PNG** (`image/png`), **Browser JPEG** (`image/jpeg`, quality 0-1
  default 0.75), **Browser GIF** (`image/gif`) — canvas `toBlob`/`convertToBlob`.

### Codec assets present but not wired as app features

- `codecs/png/` — Rust PNG helper (`squoosh-png`); active PNG optimization uses
  OxiPNG. `codecs/visdif/` — butteraugli visual-diff utility (commit
  `71b18b636b9c7d1ae0c1d3730b85b3c127eb4511`). `codecs/*/*_node_*` — Node-targeted
  builds for codec tests/examples, not imported by browser features.

### Product direction (per provenance doc)

Focused codec list under consideration: **WebP 1, AVIF, JPEG XL**. WebP 2 is kept
as experimental parity. Nothing deleted yet; codecs to be hidden in UI before any
removal.

## Offline / Service Worker

- **Service worker** (`src/service-worker.ts`): SvelteKit-native. Cache name
  `sqush-${version}`. On `install` it precaches `build + files + prerendered +
serviceWorkerCodecAssetUrls` (codec WASM/JS via
  `src/lib/service-worker-codec-assets.ts`, merged from generated
  `sqush-generated/service-worker/cache-plan` + local probe workers). Strategy:
  **cache-first for known asset pathnames, network-first (with cache fallback)**
  for everything else. On `activate` it deletes stale caches and claims clients.
  Result: offline reload on the deployed origin once cached.
- **Registration** (`src/lib/service-worker-registration.ts`): registers the SW
  **only on the real deployed origin**. In dev, and on any
  loopback/localhost-style origin running a production build, it instead
  **unregisters** any leftover worker and clears Cache Storage, then skips
  registration. This stops a stale cache-first worker from hijacking another app
  that reuses the same localhost port. Opt back in for local offline QA with
  `?sw` (persisted via `localStorage` key `sqush:force-localhost-sw`; `?sw=0`
  disables). Loopback detection covers `localhost`, `*.localhost`, `127.0.0.0/8`,
  `::1`, `0.0.0.0`.
