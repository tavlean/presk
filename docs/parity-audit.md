# Editor parity audit & deviation log

Last updated: 2026-05-31.

Goal: the Svelte editor must not **lose** any feature or gain any bug relative
to the original Preact Squoosh editor. This doc tracks (a) deliberate deviations
made during migration, (b) things that need the user's input/discussion before
acting, (c) the running gap list from the automated parity audit, and (d) items
deferred by explicit decision.

The audit is a multi-agent workflow (`editor-parity-audit`) that enumerates the
original editor's behaviors area-by-area, classifies each against the Svelte
source, then adversarially re-verifies every flagged gap to drop false
positives. Last run 2026-05-31: **107 behaviors audited, 41 confirmed gaps**
(9 major, 24 minor, 8 trivial). Re-run after significant editor changes.

---

## A. Deliberate deviations (done, no input needed)

Intentionally different from the original because Svelte offers a cleaner idiom;
behavior parity is preserved.

1. **Drag-to-replace = a Svelte attachment**, not the `file-drop-element`
   custom element. `lib/editor/file-drop.ts` `fileDrop(onFiles)` (`{@attach}`)
   on the app wrapper; reactive, auto-cleaned, no custom-element registration.
2. **Snackbar = a rune-backed store**, not the `<snack-bar>` custom element.
   `lib/editor/snackbar-store.svelte.ts` + `Snackbar.svelte`; `show()` returns a
   promise resolving with the chosen action (so Undo works exactly like Squoosh).
3. **Encoder panels re-sync via `{#key options}`** instead of Preact's
   `getDerivedStateFromProps`. Remounting on options-object identity change is
   the idiomatic Svelte way to re-seed a panel after copy/import.
4. **Post-rotation dims via a derived value** off a new `preprocessedWidth/Height`
   on `CompressOutcome`, instead of the original reading `source.preprocessed`
   live each render.
5. **Results-bubble metrics shrunk** slightly so the size + percent badge +
   download blob fit the 300px panel without overflowing the viewport.

> NOTE (import gotcha): shared `.svelte.ts` stores must be imported by the SAME
> specifier everywhere (we use `$lib/editor/snackbar-store.svelte`). A mix of
> `$lib/…` and relative `./…` makes Vite instantiate the store twice, so writes
> from one component never reach the other. Cost us a debugging cycle.

---

## B. Needs the user's input / discussion (NOT acted on)

1. **Browser-native encoders (Browser JPEG / PNG / GIF) + dynamic
   feature-detection.** The original lists every supported encoder (filtered by
   async `featureTest`); the Svelte `OUTPUT_FORMATS` is a static list that
   **intentionally omits** the browser encoders (per the comment in
   `compress.ts`). Strictly this is a parity gap, but it was a deliberate scope
   call. Decision needed: restore them (add to `OUTPUT_FORMATS` + a
   feature-detection pass), or confirm they stay cut?
2. **`wp2` (WebP v2, "unstable").** Blocked at the shared-engine level, not just
   the UI. Stays out until the engine unblocks it. Confirm that's intended.
3. **Canvas `object-fit: contain` for the `contain` resize fitMethod.** When a
   side uses resize → fitMethod "contain", the original letterboxes the output
   inside the source footprint and keeps it pixel-aligned at the two-up split.
   Svelte draws at the output dims, so a contain side can look mis-sized. Edge
   case; worth fixing if contain is commonly used.
4. **Pinch-zoom pan-compensation on rotate/resize.** The original _preserves_
   the user's zoom/pan and merely shifts the pan when content dims change; our
   version re-fits (resets zoom) on a dimension change. Re-fit is arguably nicer
   — confirm which behavior you want.
5. **History integration uses the raw `history` API.** Works (Back returns to
   the intro, verified), but SvelteKit warns it can conflict with its router and
   recommends `pushState`/`page.state` from `$app/navigation` (shallow routing).
   Left as-is to avoid risk; should migrate to the SvelteKit idiom.
6. **Shared decode.** The original decodes+preprocesses the source once and forks
   per side; our dual-side runs the full `compressFile` (incl. decode) per side
   — redundant work on large images when comparing two encoders. For the later
   foundations-cleanup phase.
7. **Share-target (PWA).** The original accepts an OS-shared image via
   `?share-target` + a SW POST handler. Absent here; the prototype isn't an
   installable PWA with a `share_target` manifest yet. Defer until PWA work.

---

## C. Verified parity gaps from the audit (status)

### Fixed in this pass (commit "Close audit parity gaps (batch 1)")

Major: browser/in-app Back (history+popstate) · copy-settings snackbar + Undo ·
AVIF & JXL panel re-sync on copy/import · Resize "Vector" method for SVG sources
(browser-verified: SVG decodes, Vector encodes) · post-rotation
`inputWidth/Height` · 500ms delayed loading spinner · SI (base-1000) filesize
formatting.

Minor/trivial: document-title filename + hourglass · open pushes a history entry
· Back uses `history.back()` · immediate first encode · non-image-file rejection
message · drop an image anywhere (not just the dropzone) · "Original Image
(filename)" option label · save-side snackbar (with try/catch) · import-side
snackbar + Undo · invalid-import message + basic validation · versioned saved
settings · 300ms reveal animations · zoom step 1.25 · download-icon rotate
animation · zoom readout width 7rem / grey · JXL "(beta)" label · 100ms debounce
· reset view on a new same-size file.

### Flagged (see §B) — not yet implemented

Browser encoders + dynamic feature-detection (B-1) · wp2 (B-2) · contain
object-fit (B-3) · pinch pan-compensation (B-4).

### Deferred / N-A (see §D)

Mobile multi-panel accordion · `<two-up>` legacy `clip` fallback (modern desktop
only) · quantize "ZX" konami easter-egg (intentionally cut) · document-title
restore-on-unmount (vacuous — the route never unmounts) · share-target (B-7).

---

## D. Known-deferred (by user decision)

- **Mobile / responsive layout** and the `<multi-panel>` accordion (<600px).
  Editor is desktop-only for now; revisit after parity is otherwise reached.
- Items above explicitly marked deferred/intentional.
