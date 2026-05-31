# Engine & codecs

> Sqush compresses your images entirely inside your own browser — nothing is ever uploaded — using the same battle-tested open-source codecs that power Google's Squoosh.

## Overview / When to use it

A **codec** (short for _coder–decoder_) is the piece of software that knows how to read one image format and write another — for example, turning a big PNG into a small WebP. In most online compressors, that work happens on a faraway server, which means your image leaves your device. Sqush is different: every codec is compiled to **WebAssembly** (WASM) — a fast, portable format that runs inside the web page — so all decoding, resizing, and re-encoding happen _locally_ in your browser. You don't need to understand any of this to use Sqush; it just means your photos stay private, the app keeps working offline, and you get desktop-app speed without installing anything.

## How the engine works

### Everything runs on your device

When you drop an image into Sqush, it travels through a four-step pipeline — **decode → preprocess → process → encode** — and every step runs client-side inside background threads called **Web Workers** (so the interface stays responsive while the heavy lifting happens). No server is involved and no image data is sent over the network. This is what "local-first" means in practice: the picture you compress never leaves the computer or phone you're using.

(Source of truth: `src/lib/compress.ts`, which drives `decode → preprocess → process → compressImage`; engine notes in `docs/user-guide/reference/engine-and-codecs.md`.)

### It picks the fastest build your browser allows

Modern browsers can run WebAssembly faster when they support two optional features:

- **Threads** — letting a codec use several CPU cores at once.
- **SIMD** — a CPU trick that processes several pixels in a single instruction.

Sqush checks for both at runtime (using the `wasm-feature-detect` library) and automatically loads the best build each codec offers. If your browser supports threads and the codec has a threaded build, you get it; otherwise Sqush quietly falls back to the **single-thread baseline** build, which works everywhere. You never have to choose — the speed-up is opt-in by your browser, and correctness never depends on it.

There's one safety note baked in: Safari 16 shipped thread support but couldn't run workers-inside-workers the way Sqush needs, so the engine explicitly guards against that case and falls back to single-thread there (`src/worker-shared/supports-wasm-threads.ts`).

> **Single-thread is the floor, not the ceiling.** Every codec is guaranteed to run single-threaded on any browser. Threads and SIMD are bonuses layered on top when your browser can handle them.

## The codecs

Sqush bundles a focused set of image codecs, each built from a well-known open-source library. The committed WASM/JavaScript files live under `codecs/` (inherited from Squoosh) and are wired into the app through `src/features/encoders` and `src/features/decoders`. The output formats you can pick are defined in `src/lib/compress.ts` (`OUTPUT_FORMATS`).

The versions below come straight from the project's build recipes, recorded in `docs/codec-provenance.md`.

### Output formats (what you can compress _to_)

| Format in the menu           | Underlying library               | Recorded version                  | Speed boosts  | Notes                                                                    |
| ---------------------------- | -------------------------------- | --------------------------------- | ------------- | ------------------------------------------------------------------------ |
| **WebP**                     | libwebp (`webmproject/libwebp`)  | commit `d2e245ea…`                | SIMD          | Broadly supported modern format; great all-rounder.                      |
| **AVIF**                     | libavif + libaom (+ libsharpyuv) | libavif `v1.0.1`, libaom `v3.7.0` | Threads       | Excellent compression for photos; slower to encode.                      |
| **JPEG XL (beta)**           | libjxl                           | commit `9f544641…`                | Threads, SIMD | Newer high-efficiency format; labelled **beta** in the app.              |
| **WebP v2 (unstable)**       | libwebp2 (Chromium)              | commit `413df7ca…`                | Threads, SIMD | Experimental; labelled **unstable**. Keep expectations modest.           |
| **MozJPEG**                  | `mozilla/mozjpeg`                | `v3.3.1`                          | —             | Highly optimized classic JPEG encoder.                                   |
| **OxiPNG**                   | `oxipng` (crates.io)             | `9.0`                             | —             | Lossless PNG optimizer; shrinks PNGs without quality loss.               |
| **QOI**                      | `phoboslab/qoi`                  | commit `8d35d93c…`                | —             | Tiny, very fast lossless format.                                         |
| **Browser PNG / JPEG / GIF** | your browser's own canvas        | n/a (built into the browser)      | —             | No WASM involved; availability varies by browser (GIF is often missing). |

The three **Browser** encoders use the canvas that's already in your browser rather than a bundled codec, so Sqush feature-detects them at startup (`getSupportedFormatIds()` in `src/lib/compress.ts`). If your browser can't produce a given type, that option simply won't appear. The WASM codecs above are always available.

### Input formats (what you can open)

Sqush can also _decode_ (read) WebP, AVIF, JPEG XL, WebP v2, and QOI, in addition to whatever your browser natively understands (JPEG, PNG, GIF, SVG, and so on). Decoding uses the matching libraries from the table above (`src/features/decoders`).

### Helpers behind the editing controls

Two more libraries power the editing options rather than an output format:

- **Resize** uses the Rust `resize` crate (`0.5.5`) for its high-quality methods, plus the **hqx** pixel-art scaler (`v0.1.3`).
- **Reduce palette / quantize** uses **imagequant** (libimagequant `2.12.1`).
- **Rotate** uses a small local Rust module (`squoosh-rotate`) that runs before everything else.

These are documented in their own guides; they're listed here so you can see the full set of engines Sqush ships.

## What "offline" means in practice

Sqush is a **Progressive Web App (PWA)** — a website that can install and run like a native app, including when you have no internet. A background **service worker** (`src/service-worker.ts`) makes this possible:

- The first time you visit the deployed site, it quietly **caches** the app and all the codec files your browser needs.
- After that, the app loads from that cache, so it opens fast and **keeps working with no connection**. Because the codecs are stored locally too, you can compress images on a plane or in a tunnel with no loss of capability.
- The cache is versioned (named `sqush-${version}`), so when a new release ships, stale files are cleaned up automatically.

The service worker only activates on the **real deployed site**. During development, or on local "localhost"-style addresses, Sqush deliberately _unregisters_ the worker and clears its cache so a leftover copy can't hijack another app sharing the same port. This is purely a developer safeguard and doesn't affect normal users (details in `src/lib/service-worker-registration.ts`).

## Tips & pitfalls

- **Privacy is structural, not a promise.** Because there is no server in the compression path, there is no upload to opt out of — your image physically cannot leave your device during compression.
- **Encoding speed depends on your browser and CPU, not on Sqush settings alone.** A browser without thread/SIMD support will still produce identical output; it just takes longer. AVIF and JPEG XL are the most compute-heavy, so they feel slowest on older machines.
- **"Browser GIF" may be missing.** Many browsers don't let the canvas write GIFs, so that menu entry can be absent. That's expected — use a WASM format instead.
- **Beta and unstable labels mean what they say.** JPEG XL is marked **(beta)** and WebP v2 **(unstable)**. They work, but they're newer and less universally supported by other apps and browsers, so prefer WebP or AVIF for files you need to share widely.
- **First offline use requires one online visit.** The PWA can only work offline _after_ it has cached itself, so open Sqush online once before relying on it without a connection.

## Under the hood

Sqush is a maintained Svelte fork of Google's Squoosh, and it reuses Squoosh's committed codec artifacts under `codecs/` rather than rebuilding them on every install — the project even records that there are roughly 80 committed JS/WASM artifacts, including baseline, threaded, SIMD, and Node-targeted builds (`docs/codec-provenance.md`). The single-image editor and the bulk workflow share one framework-neutral pipeline so both paths produce the same results, with heavy work dispatched to a codec worker (`src/lib/compress.ts`). The recorded versions above are the _rebuild recipe inputs_; the provenance doc is candid that they document how each codec would be rebuilt rather than proving every shipped `.wasm` was generated from exactly those inputs.
