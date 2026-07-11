# Codec benchmarks

For the browser-pipeline SVG benchmark, see [svg/README.md](svg/README.md).

Measures each WASM codec's **output size** (compression), **encode time** (speed),
and **success** (reliability) on a fixed image, so a codec upgrade can be proven
to be an improvement — not a regression — and so we have real numbers to quote
when writing up "we got X% smaller / Y% faster."

## Run

```sh
npm run bench                         # writes benchmarks/results/current.json
BENCH_LABEL=webp-1.6 npm run bench    # custom label → results/webp-1.6.json
```

It boots the production build (cross-origin isolated) and, for each **image type**
(`photo` 1024×683, `illustration`, `transparent`, and `photo-large` 12 MP — see
`tests/fixtures/`), encodes through each of WebP, AVIF, JPEG XL, MozJPEG, OxiPNG,
QOI at the app's default settings. The normal fixtures run 1 warm-up + 3 measured
runs (records median); the big 12 MP image runs once (each encode is slow — it's
there to show whether huge inputs behave differently). Browser PNG/JPEG/GIF are
excluded (native, never rebuilt).

Multiple types matter: a codec change can help photos but hurt flat
illustrations, break alpha, or behave very differently on huge images — the
report (and `bench:compare`) breaks results out per type so any of those shows up.

## Compare (before vs after an upgrade)

```sh
# 1. Before touching a codec, capture the baseline (already committed):
#    benchmarks/baseline.json
# 2. After rebuilding the codec:
npm run bench
# 3. Diff:
npm run bench:compare
#    (defaults to baseline.json vs results/current.json)
#    or: node benchmarks/compare.mjs <before.json> <after.json>
```

`bench:compare` prints a per-codec size Δ / time Δ table, marks each ✓ better /
✗ WORSE / ≈, and **exits non-zero if any codec regressed** (got bigger, slower,
or started failing) — so it can gate a codec upgrade in CI.

## Files

- `baseline.json` — committed reference (the current codecs). **Re-capture and
  commit this after a confirmed-good upgrade** so it tracks the shipped state.
- `results/` — per-run reports (gitignored).
- Fixtures live in `tests/fixtures/` (shared with the e2e suite) — see
  `tests/fixtures/README.md`. Swap `photo.jpg` / `photo-large.jpg` for your own
  images for article-quality numbers; re-capture the baseline if you do.

## Caveats

- **Size is exact and machine-independent** — the primary "compresses better?"
  signal. Trust it.
- **Time is machine-dependent** (and excludes the ~100ms option debounce, since
  it measures the editor's encode window). Only compare reports captured on the
  **same machine**; `bench:compare` warns if core counts differ.
- This measures size at the codec's **default settings**. A smaller file at the
  same settings is usually a real win, but a big drop can also mean lower default
  quality — for headline claims, sanity-check quality visually (or add a
  perceptual metric like SSIMULACRA2 later).
- Once multithreading is wired (see `docs/threading-enablement.md`), re-baseline:
  threaded encodes change the speed numbers substantially.
