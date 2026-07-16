# Mobile save/download behavior + the Share plan

Research summary (2026-07-17, web-verified against WebKit/Chromium sources)
for how Frisp's save buttons behave on phones today and what a better flow
looks like. Read when touching the download/share affordances; update when
the share button ships or platform behavior changes.

## Where a saved image lands today

Every save in Frisp is an `<a href="blob:…" download>` anchor (single editor:
`Results.svelte`; bulk per-image: `StripCell.svelte`; Save-all ZIP:
`triggerBlobDownload` in `src/lib/bulk/zip.ts`). That is a **file download,
never a photo-library import**, on both platforms:

- **iOS Safari (browser tab):** confirmation prompt → Files app, Downloads
  folder (iCloud Drive → Downloads by default; configurable in Settings →
  Apps → Safari → Downloads). Never reaches Photos.
  ([Apple 102440](https://support.apple.com/en-us/102440))
- **iOS installed PWA (standalone):** blob downloads are still quirky — the
  anchor can open a full-screen Quick Look preview instead of downloading,
  with no obvious way out; the user must manually share/save from the
  preview. Known WebKit issue, unfixed as of mid-2026
  ([WebKit 275288](https://bugs.webkit.org/show_bug.cgi?id=275288)). Frisp
  is installable, so this hits real users.
- **Android Chrome:** saved via `MediaStore.Downloads` → Downloads folder.
  Gallery apps and Google Photos show it under "On this device → Download",
  not the main timeline; no cloud backup unless the user enabled it for that
  folder. The honest promise is "saved to Downloads", not "in your gallery".

## The platform-intended fix: Web Share

`navigator.share({ files: [file] })` opens the OS share sheet; on iOS it
offers **Save Image** (straight into Photos), AirDrop, Messages, etc., and it
works in standalone PWAs — sidestepping the Quick Look bug entirely. Solid
since Safari 16.5 (the iOS 16 "Save Image" regression was fixed 2023-04);
Android Chrome has file-share since 75 (limits: ≤10 files, ≤50 MiB, image
types allowed; **ZIP is not on the allowlist**).

Rules for a correct implementation:

- Feature-detect with the REAL finished file:
  `navigator.canShare?.({ files: [file] })` — a `Blob` is not a `File`, and
  empty-file probes prove nothing.
- Call `share()` directly in the tap handler with the already-encoded file.
  Transient user activation expires — never encode-then-share on one tap.
  (Frisp's Results footer only enables once the encode is done, so this is
  naturally satisfied.)
- Share `files` alone — no `text`/`url` alongside; WebKit can drop the file
  when they're combined ([WebKit 251500](https://bugs.webkit.org/show_bug.cgi?id=251500)).
- "Save Image" only appears for OS-recognized formats (JPEG/PNG/WebP are
  safe; don't promise Photos for JPEG XL or QOI).
- Keep **Download** — share is a complement, not a replacement: on Android
  share doesn't guarantee local persistence, on desktop (where share() also
  exists — macOS Safari, Chrome 128+) users expect a deterministic save,
  and the bulk ZIP can't go through share at all.

## Recommended shape (pending maintainer decision)

1. Single editor: add a quiet **Share** action beside the download control in
   the Results footer, shown only when `canShare({files})` passes for the
   actual result file. On iOS standalone it becomes the primary save path.
2. Bulk: per-image share can ride the same component; **Save-all ZIP stays a
   download**. Optional Android nicety, low priority: `showSaveFilePicker()`
   for the ZIP (Chrome 132+, 2025-01).
3. Copy: keep the distinction plain — "Download" vs "Share" (the share sheet
   itself says "Save Image", so no need to over-promise in our label).

Squoosh (upstream) never shipped output sharing — it only registers as a
share *target* for incoming images. This would be a genuine UX edge over it.
