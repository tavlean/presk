# Simple & utility formats: QOI and the Browser encoders

> The "fast and simple" corner of Sqush: QOI (a quick lossless format) plus the three Browser-native encoders (Browser JPEG, Browser PNG, Browser GIF) that hand the work to your browser instead of Sqush's own engines.

## Overview / When to use it

Most of Sqush's output formats (WebP, AVIF, JPEG XL, MozJPEG, OxiPNG) run through high-quality **WASM** encoders — compiled compression engines that ship with the app and produce small, carefully-tuned files. The formats on this page are different: they are deliberately minimal. **QOI** is a young, very fast _lossless_ format (your pixels are preserved exactly), and the **Browser** encoders (Browser JPEG / PNG / GIF) skip Sqush's engines entirely and ask your web browser to do the encoding. They have few or no settings on purpose. You will rarely want them for a final, web-bound image — the WASM encoders almost always make smaller files — but they are handy for speed, for debugging, or as a fallback.

> **Jargon check.** _Lossless_ = no detail is thrown away; the decoded image is pixel-for-pixel identical to the input. _Lossy_ = some detail is discarded to shrink the file (JPEG is the classic example). _WASM_ (WebAssembly) = a fast, compiled program that runs inside the browser; it is how Sqush ships its best compressors. _Canvas_ = the browser's built-in drawing surface, which can also export images — that is what the Browser encoders use.

---

## QOI

> A fast, simple, lossless format — great for speed, rarely the smallest file.

QOI ("Quite OK Image") is a lossless format invented in 2021. Its appeal is **speed and simplicity**: it encodes roughly 20–50x faster and decodes 3–4x faster than PNG, from a reference implementation that fits in about 300 lines of code (src: [qoiformat.org](https://qoiformat.org/), [Wikipedia: QOI](<https://en.wikipedia.org/wiki/QOI_(image_format)>)). The trade-off is file size — PNG (and Sqush's OxiPNG) usually compress a bit smaller than QOI. In the code, QOI is registered as the `qoi` encoder with label **QOI**, MIME type `image/qoi`, and extension `.qoi` (src: `src/features/encoders/qoi/shared/meta.ts`).

### Controls / Settings

QOI has **no adjustable options at all**. Its `EncodeOptions` is an empty object (`{}`) and its `defaultOptions` is `{}` (src: `src/features/encoders/qoi/shared/meta.ts`). There is no panel for it, so the editor falls through to a plain message:

- **What you see:** the Compress panel shows **"QOI has no adjustable options."** (src: the fallback branch in `src/lib/editor/OptionsPanel.svelte` — any non-Original format whose options object has no numeric `quality` key renders `"<label> has no adjustable options."`).
- **Range & default:** none — there is nothing to set.
- **How to choose:** there is no quality/effort dial because QOI is lossless and single-pass by design; it does one fast encoding and that is it.
- **Recommended starting point:** just pick QOI and download. If the resulting file is bigger than you'd like, switch to **OxiPNG** (smaller lossless PNGs) instead.

### When would you pick QOI over the WASM encoders?

- You specifically need a `.qoi` file (for example, a game engine or tool that reads QOI for fast load times).
- You want the quickest possible lossless export and don't care about squeezing out the last few kilobytes.
- For anything destined for the **web**, prefer OxiPNG (lossless) or WebP/AVIF (lossy) — browsers don't display `.qoi` files natively.

### Recommended settings & community tips (QOI)

> **Community guidance**, not new defaults. QOI has no options to recommend — its whole point is being parameter-free.

- **There is nothing to tune, by design.** QOI is fixed lossless RGB(A) with zero quality/effort knobs. Just pick it and download.
- **Don't expect a size win.** QOI is usually *slightly worse* than an optimized libpng/OxiPNG on size; its only edge is speed (~20–50× faster encode, ~3–4× faster decode).
- **Not a browser-delivery format.** No major browser decodes `.qoi` natively, so a QOI download is useless for a web page — you'd have to convert it back.
- **Its real niche is pipelines you control:** game-engine/embedded asset loading, intermediate storage, fast screenshot capture — places where encode/decode throughput matters more than the last few kilobytes. It's already adopted in tools like FFmpeg, GIMP, and ImageMagick.

_Sources: [phoboslab/qoi](https://github.com/phoboslab/qoi); [QOI (Wikipedia)](<https://en.wikipedia.org/wiki/QOI_(image_format)>)._

---

## Browser encoders (JPEG / PNG / GIF)

> Lightweight fallbacks that let your _browser_ do the encoding instead of Sqush's tuned engines.

The three Browser encoders use the browser's built-in `canvas.toBlob()` to produce the image, on the main thread, rather than Sqush's WASM codecs (src: `src/lib/compress.ts`). They exist mainly for parity with Squoosh and as a baseline/fallback. Because they lean on whatever the browser ships, two things follow:

1. **They are feature-detected.** Sqush probes each one at startup by asking the canvas to produce that MIME type and checking the result really is that type — browsers quietly fall back to PNG for formats they can't encode, so Sqush filters those out. A Browser encoder only appears in the format menu if it genuinely works in your browser (src: `getSupportedFormatIds` / `canvasSupportsMime` in `src/lib/compress.ts`).
2. **Browser GIF is usually unavailable.** Most browsers don't support GIF in `canvas.toBlob()`, so it typically never shows up in the menu (src: comments in `src/lib/compress.ts`).

The three are registered as: **Browser JPEG** (`browserJPEG`, `image/jpeg`, `.jpg`), **Browser PNG** (`browserPNG`, `image/png`, `.png`), and **Browser GIF** (`browserGIF`, `image/gif`, `.gif`) (src: `src/features/encoders/browserJPEG|browserPNG|browserGIF/shared/meta.ts`).

### Controls / Settings

#### Quality (Browser JPEG only)

- **What it does:** sets how much detail JPEG keeps. It is passed straight to `canvas.toBlob('image/jpeg', quality)` as the browser's quality argument (src: `src/lib/editor/options/BrowserJpegOptions.svelte`).
- **Range & default:** **0 to 1**, step **0.01**, default **0.75** (option key `quality`) (src: `BrowserJpegOptions.svelte`; default from `src/features/encoders/browserJPEG/shared/meta.ts`). Note this is a **0–1 scale**, unlike the WASM encoders' 0–100 quality sliders — `0.75` here is the same idea as "75" in MozJPEG.
- **How to choose:** higher = better-looking image but a bigger file; lower = smaller file with more visible JPEG artifacts (blockiness, smudged edges). The exact appearance is decided by _your browser's_ JPEG encoder, which is generally less efficient than MozJPEG.
- **Recommended starting point:** **0.75** (the default). Nudge down toward ~0.6 if you need a smaller file and can tolerate some softening; raise toward ~0.85–0.9 for photos where quality matters. But if file size or quality really matters, use **MozJPEG** instead (see below).

#### Browser PNG and Browser GIF — no options

Both have an empty `EncodeOptions` (`{}`) and empty `defaultOptions` (src: `browserPNG/shared/meta.ts`, `browserGIF/shared/meta.ts`). Neither has a panel, so the Compress section shows **"Browser PNG has no adjustable options."** or **"Browser GIF has no adjustable options."** respectively (src: the fallback in `src/lib/editor/OptionsPanel.svelte`). There is nothing to tune — the browser decides everything.

### When would you pick a Browser encoder over the WASM encoders?

Honestly, rarely. Use them when:

- **You're comparing or debugging.** Putting **Browser JPEG** on one side and **MozJPEG** on the other shows just how much Sqush's engine saves: at the same quality (75 / 0.75), MozJPEG can be around **30% smaller** than the browser's built-in JPEG at visually similar quality (src: [MDN: image formats & compression tools](https://developer.mozilla.org/en-US/blog/image-formats-codecs-compression-tools/)).
- **A WASM codec won't load** in a restricted environment and you still need a quick export — the Browser encoders run with no WASM at all.
- **You need GIF specifically** — Sqush has no WASM GIF encoder, so Browser GIF is the only GIF path, _if_ your browser exposes it (most don't).

For real output, prefer the WASM equivalents: **MozJPEG** instead of Browser JPEG, **OxiPNG** instead of Browser PNG. They are smaller and offer real controls.

---

## Tips & pitfalls

- **Don't expect QOI to beat PNG on size.** QOI trades a little compression for a lot of speed. If you want the smallest lossless file, use **OxiPNG**; QOI is for when you need the `.qoi` format or maximum encode/decode speed.
- **Browser JPEG quality is 0–1, not 0–100.** It's easy to type `75` thinking it's a percentage — here, `0.75` is the right value and `75` would be clamped/treated as "use the default" by the browser (src: [MDN: HTMLCanvasElement.toBlob](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob)).
- **If you don't see Browser GIF (or PNG/JPEG) in the menu, your browser can't do it.** That's the feature-detection working as intended, not a bug. Browser GIF in particular is missing in most browsers.
- **Browser encoders run on the main thread.** Unlike the WASM codecs (which run in a worker), the Browser encoders encode on the page's main thread, so very large images may briefly make the UI less responsive.
- **The "no adjustable options" message is normal** for QOI, Browser PNG, and Browser GIF — those formats genuinely have nothing to configure. It's not an error.
- **Lossless means lossless.** QOI and Browser PNG never alter your pixels, so re-encoding the same image repeatedly won't degrade it. Browser JPEG is _lossy_ — each save discards a little more detail.

## Under the hood

The Browser encoders are thin wrappers over `canvas.toBlob(mime, quality)`: Sqush draws the processed pixels onto an off-screen canvas and asks the browser to serialize them. That means their quality, efficiency, and even availability depend entirely on the browser's own image code, which is why Sqush feature-tests each one and why their output is generally larger than the matching WASM encoder's. QOI, by contrast, is a real (WASM) encoder in Sqush's pipeline — it's just a format whose design exposes no knobs, so it appears option-less in the UI (src: `src/lib/compress.ts`, `src/features/encoders/qoi/shared/meta.ts`).
