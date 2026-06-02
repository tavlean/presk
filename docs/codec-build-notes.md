# Codec build notes — engineering log

Last updated: 2026-06-02.

Deep technical record of **building the WASM codecs from source** — what works,
what breaks, and why. Distinct from the other codec docs:

- [codec-upgrade-audit.md](codec-upgrade-audit.md) — *what* to upgrade and *why*.
- [codec-upgrade-runbooks.md](codec-upgrade-runbooks.md) — per-codec version
  targets + wrapper diffs.
- [codec-upgrade-handoff.md](codec-upgrade-handoff.md) — the operational
  build+verify+commit loop.
- **this doc** — the *build engineering knowledge*: toolchains, linker
  behaviour, the gotchas that cost hours, so the next codec update doesn't
  repeat them.

## TL;DR — the toolchain decision

The codecs were originally built (via `codecs/build-cpp.sh` → Docker) with
**Emscripten `emsdk:2.0.34`** (Oct 2021). You do **not** need Docker — install
Emscripten directly (no sudo). But **which Emscripten version matters a lot**:

| Codec kind | Examples | Toolchain that works | Why |
|---|---|---|---|
| Simple: single library, **direct** calls | libimagequant, libwebp | **emcc 5.x (latest)** is fine | Wrapper calls the lib directly; the linker keeps the chain. |
| Complex: **multi-library** (libavif→libaom), indirect/codec-table dispatch | libavif+libaom, (likely) libjxl | **emcc 3.1.0** (arm64-native) or 2.0.34 (x86/Rosetta) | emcc 5.x's linker strips the inner library — see the AVIF saga below. |

**Rule of thumb:** try emcc-latest first (simplest). If the built `.wasm` is
*tiny* compared to the old one (e.g. an AVIF encoder at 21 KB vs 2.8 MB), the
linker dropped a library — drop to **emsdk 3.1.0** (era-matched to the codecs'
2.0.34, arm64-native so no Rosetta) and rebuild.

## Native build setup (no Docker, no sudo)

```sh
git clone --depth 1 https://github.com/emscripten-core/emsdk.git ~/emsdk
cd ~/emsdk
./emsdk install latest && ./emsdk activate latest    # emcc 5.x — simple codecs
./emsdk install 3.1.0                                 # arm64-native — complex codecs
brew install cmake                                    # avif/webp/jxl need it
```

Switch toolchains per codec with `./emsdk activate <ver> && source ~/emsdk/emsdk_env.sh`.

Per C/C++ codec, replicate `codecs/cpp.Dockerfile`'s env and run the Makefile
directly (bypassing the Docker wrapper):

```sh
source ~/emsdk/emsdk_env.sh
cd codecs/<codec>
rm -rf node_modules                 # force a fresh source download of the new version
export CFLAGS="-O3 -flto"
export CXXFLAGS="-O3 -flto -std=c++17"
export LDFLAGS="-O3 -flto -s FILESYSTEM=0 -s ALLOW_MEMORY_GROWTH=1 -s TEXTDECODER=2 -s NODEJS_CATCH_EXIT=0 -s NODEJS_CATCH_REJECTION=0"
emmake make                         # writes the new .js/.wasm into the codec dir
```

> On emcc 5.x, clang is v16+ and treats more warnings as errors; add
> `-Wno-error=implicit-function-declaration` (and for x86-SIMD code,
> `-msimd128`). On emcc 3.1.0 (clang 14) these are usually unnecessary — another
> reason the older toolchain is smoother for the legacy codec sources.

## Build-integration gotcha (all codecs) — the sync-script patch

`scripts/sync-sveltekit-app.mjs` rewrites each codec's `.js` to replace
Emscripten's `new URL("x.wasm", import.meta.url)` with a bare string (so Vite
doesn't emit a duplicate WASM). The suffix differs by toolchain
(`.toString()` on 2.0.x, `.href` on 5.x). **Fixed 2026-06-02** to be
toolchain-agnostic (regex matches both). Without this, a modern-emcc rebuild
fails `npm run check` with "Expected … wrapper fallback URL pattern".

## Per-codec build findings

### libimagequant — ✅ done (emcc 5.0.7)
2.12.1 → 2.18.0. Clean: simple C library, `./configure && make`. One harmless
`warn_unused_result` warning. No wrapper edits. Built fine on emcc 5.x.

### libwebp — ✅ done (emcc 5.0.7)
commit (pre-1.2.0) → v1.6.0 (CVE-2023-4863). Two real gotchas:
1. **libsharpyuv split** — since libwebp v1.3.0 `libsharpyuv` is a separate
   archive; the Makefile now links `libsharpyuv.a` **after** `libwebp.a` (it's a
   byproduct of the same cmake build).
2. **SIMD silently lost** — the `simd` variant needs **`-msimd128`** so emcc
   translates libwebp's SSE intrinsics to WASM SIMD. Without it the "simd" build
   compiles to the *non-SIMD baseline* (caught because `webp_enc_simd.wasm` came
   out the same size as `webp_enc.wasm`). Plus `-Wno-error=implicit-function-declaration`.

Output was byte-identical to the old build at default quality → pure security
upgrade, zero regression (benchmark-verified).

### libavif + libaom — the emcc 5.x linker saga (READ THIS before retrying)
libavif **v1.0.1 → v1.4.2**, libaom **v3.7.0 → v3.12.1** (CVE-2024-5171, CVSS
9.8; aom must be ≥ v3.9.1).

**Compiles fine** with two build-file fixes:
- libavif v1.4 **newly requires libyuv** → pass `-DAVIF_LIBYUV=OFF` to the
  libavif cmake (helper.Makefile). (libavif falls back to its built-in YUV
  conversion; we use sharp-YUV anyway.)
- bump the sharpyuv source to libwebp **v1.6.0** (matches what libavif v1.4.2's
  own `ext/libsharpyuv.cmd` pins).

**The wall (emcc 5.0.7):** the encoder links to a **21 KB** `.wasm` (vs ~2.8 MB)
and doesn't run — **libaom is stripped out**. Exhaustively diagnosed:
- `avif_enc.o` has correct undefined refs (`U avifEncoderCreate`, …).
- `libavif.a` defines all 211 `avif*` symbols (`T avifEncoderCreate`, …).
- `libaom.a` is valid (154 real wasm objects, defines `aom_codec_encode`).
- Yet the linker won't pull them. **Tried and FAILED:** `-Wl,--start-group`,
  removing `-s ERROR_ON_UNDEFINED_SYMBOLS=0`, compiling `avif_enc.cpp` to a
  separate `.o` first. **Only `-Wl,--whole-archive -Wl,--no-gc-sections`
  force-includes libaom** (→ 2.57 MB) — but *that* binary traps at runtime
  (dead code + uninitialised codec registry). So force-inclusion is a dead end.
- Root cause: an Emscripten **DCE / archive-extraction behaviour change** between
  2.0.34 and 5.x. libavif reaches libaom through its codec function-pointer
  table (indirect dispatch); emcc 5.x's `--gc-sections` can't see that, so it
  drops the whole codec. (webp survived because it calls its lib directly.)

**The fix (the *right* way, not a band-aid):** build avif with the era-matched
toolchain **emsdk 3.1.0** (arm64-native; same linker behaviour as the codecs'
original 2.0.34) — see the saga's resolution in git history / STATUS. The
band-aid flags (`--whole-archive`, `--no-gc-sections`, `-DCMAKE_C_STANDARD=11`)
are **not** needed with 3.1.0; use the faithful `-O3 -flto` env.

> Note: the **threaded** `avif_enc_mt` variant additionally fails on emcc 5.x
> with "`--shared-memory` disallowed … not compiled with 'atomics'/'bulk-memory'"
> — a pthread-flags issue. It's unused by the app (single-thread only; threading
> is deferred), so it can be skipped, but it'll want `-matomics -mbulk-memory`
> on the MT libaom build when threading is enabled.

### libjxl — not yet attempted; expect the same class of issue
Complex multi-library C++ (brotli/highway/skcms submodules) using libjxl's
**internal** C++ API. Plan: emsdk 3.1.0 + **Path A (v0.8.5)** first (keeps the
internal headers the wrapper uses → ~zero source edits); v0.11.2 needs a full
encoder rewrite onto the public C API. See the libjxl runbook.

### Rust codecs (oxipng, resize, hqx) — not yet attempted
Need `rustup` + `rustup target add wasm32-unknown-unknown` + `wasm-pack`, and the
squoosh rust build wires Emscripten's clang as the wasm sysroot (see
`codecs/rust.Dockerfile`). Fiddlier; do last.

## Verification loop (every codec)

`npm run check` (integration) → `npm run test:e2e` (does it *encode*? — the
AVIF/quantize tests caught silent breakage) → `npm run bench` + `npm run
bench:compare` (improvement, not regression; size is exact, time is noisy).
**A build that "succeeds" can still produce a broken codec** — always run the
e2e + benchmark, never trust the build exit code alone.
