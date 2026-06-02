# Codec Surface Cleanup — Plan

Last updated: 2026-06-02. Status: **DONE — both removals committed** on branch
`codec-cleanup-and-threading`. Kept as the record of what was removed and why.

Read [codec-provenance.md](codec-provenance.md) before touching `codecs/`, and
follow its build / generated-metadata / service-worker / browser verification
rules. Evidence behind both removals is in
[codec-upgrade-audit.md](codec-upgrade-audit.md).

## 1. Remove WebP 2 (wp2) — DONE

**Decision: remove it.** WebP 2 is a permanently-experimental Google "playground"
format — no browser or OS can open the files, the bitstream is deliberately
non-final (today's `.wp2` files can become undecodable later), and the build
predates years of fuzzer fixes. There is no "more stable version" to move to.
This reverses the migration-era "keep for parity" stance now that parity is
closed and we have the evidence.

**Removed end to end in commit `962bdd0f`** (encoder *and* decoder — no
mainstream browser ever shipped `.wp2`, and the only real-world producer was this
app's own encoder, so full removal was the chosen path rather than the staged
hide-then-delete originally sketched here). What went:

- `codecs/wp2/` (the entire committed WASM/JS/source tree).
- `src/features/encoders/wp2/`, `src/features/decoders/wp2/`,
  `src/lib/editor/options/Wp2Options.svelte`.
- `docs/user-guide/formats/webp2.md` and all user-guide wp2/WebP2 rows + links.
- All wp2 wiring in the data-driven layer: `scripts/sync-sveltekit-app.mjs`
  (encoder names, ready-worker methods, codec-asset records, patched-wrapper
  paths, the generated features-worker template, orchestration),
  `scripts/audit-static-output.mjs` (globs/finds/expected records/asserts),
  `src/shared/codec-assets.ts` (the `CodecAssetCodec` union), `src/lib/compress.ts`
  (`OUTPUT_FORMATS`), `src/client/lazy-app/image-pipeline*.ts`, `image-decode.ts`
  (the `image/webp2` magic-byte branch), `bulk/import.ts` (`.wp2` extension),
  `sveltekit-worker-bridge.ts`, `OptionsPanel.svelte`, `src/sw/cache-plan.ts`
  (dead wp2 fields + the `Omit` alias + dead
  `buildAdditionalProcessorCacheUrls`), and an `AdvancedSection.svelte` comment.

**Verified:** `npm run check` passes (format:check, sync, svelte-kit sync,
svelte-check 0/0, vite build, audit:static-output). The regenerated
`.svelte-kit/sqush-generated/**` contains no wp2 references.

## 2. Delete the dead `codecs/png/` directory — DONE

`codecs/png/` was a Rust `image-png` wrapper (`squoosh-png`, `png 0.16.7`) that
was **never imported by the web app**. It was a vestigial CLI/Node
encoder/decoder carried from the Squoosh monorepo, deleted in the codec-cleanup
pass (commit `7bd03980`, alongside the dead `codecs/visdif/` butteraugli utility
and the orphaned `src/client/lazy-app/storage.ts` localStorage helper). Docs
(`codec-provenance.md`, `user-guide/reference/engine-and-codecs.md`) were updated
in the same commit to mark png/visdif deleted.

The browser PNG path is fully covered without it:
- **encode** → browserPNG (canvas `toBlob`),
- **optimize** → OxiPNG,
- **decode** → native browser (that's why `src/features/decoders/` has no `png`).

No generated codec-asset record referenced it; `npm run check` stayed green after
deletion.

## Out of scope here

- QOI (spec frozen — bump the pinned SHA only if rebuilding for another reason),
  `hqx` (already latest, upstream abandoned). Tracked in
  [codec-upgrade-audit.md](codec-upgrade-audit.md) as skip/opportunistic.
- Other codec visibility/grouping decisions — product call, see
  [road-map.md](road-map.md).
