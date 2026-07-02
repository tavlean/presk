<script lang="ts">
  // THE STACK — the resting stage for the global / multi-select scope.
  //
  // Instead of a dead empty canvas, the stage holds the batch as a fanned stack
  // of cards: the anchor image is the centred top card (a BEFORE/AFTER split of
  // original vs optimized), the rest peek out behind it, alternating left/right
  // with growing offset + rotation so depth reads at a glance. It is a resting
  // COMPOSITION, not the production inspector — the split is a lightweight
  // CSS-clipped pairing of the existing thumbnail (original) and the engine's
  // output download URL (optimized), never the pinch-zoom two-up.
  //
  // Which images: nothing selected → the whole batch (anchor = first image);
  // a multi-selection (N>1) → exactly those, anchor on top. The parent only
  // mounts this for those two cases; a single selection is the real focus view.
  //
  // Interactions: click the top card → select that image (opens the focus view);
  // click a peeking card → bring it to the top (a local cycle, no selection
  // change); ←/→ cycle the top card. Cards whose job is mid-encode wear a
  // delayed shimmer so a global change visibly ripples through the fan.
  import { SvelteSet } from 'svelte/reactivity';
  import type { BulkStripItem } from 'client/lazy-app/bulk';
  import { labBulk } from './store.svelte';
  import DeltaPill from './DeltaPill.svelte';

  interface Props {
    items: BulkStripItem[];
    /** Stage-toolbar zoom (1 = fit). Scales the whole fan via a CSS transform. */
    zoom?: number;
    /** Stage-toolbar smoothing toggle → image-rendering:pixelated on the cards. */
    pixelated?: boolean;
  }

  let { items, zoom = 1, pixelated = false }: Props = $props();

  // The stage's free width shrinks between the two docked side panels in the
  // mid desktop band (901–~1240px). We track the viewport so the fan's CARD
  // size AND horizontal peek spread scale to fit that corridor — below 901px the
  // panels become bottom sheets and the whole width frees up again.
  let viewportWidth = $state(1280);
  const PANEL_BAND_MIN = 901;
  const PANEL_BAND_MAX = 1240;
  const inPanelBand = $derived(
    viewportWidth >= PANEL_BAND_MIN && viewportWidth <= PANEL_BAND_MAX,
  );
  // Horizontal spread multiplier for the peeks: full in the roomy states,
  // tucked in when the side panels squeeze the corridor.
  const spread = $derived(inPanelBand ? 0.4 : 1);

  const SIZE_UNITS = ['B', 'kB', 'MB', 'GB', 'TB'];
  function prettySize(bytes: number): string {
    if (bytes < 1) return '0 B';
    const exponent = Math.min(
      Math.floor(Math.log10(bytes) / 3),
      SIZE_UNITS.length - 1,
    );
    return `${(bytes / 1000 ** exponent).toPrecision(3)} ${SIZE_UNITS[exponent]}`;
  }

  // How many cards peek behind the top one before the rest collapse into a
  // "+N" depth chip. Kept small so the fan stays legible, not a debug spray.
  const MAX_PEEKS = 6;

  // Local cycle pointer: which item is currently on top. It's an OFFSET into the
  // incoming order, so ←/→ and peek-clicks rotate the fan without touching the
  // engine selection. Reset whenever the underlying set changes (add/remove/
  // reselect) so a stale pointer can't point past the end.
  let frontOffset = $state(0);
  // Plain (non-reactive) marker of the last item set we reset for. Reading it in
  // the effect must NOT create a dependency, so it stays a bare local.
  let lastSignature = '';

  const signature = $derived(items.map((item) => item.id).join('|'));
  // Reset the local cycle pointer whenever the underlying set changes (add /
  // remove / reselect) so it can never point past the new end.
  $effect(() => {
    if (signature !== lastSignature) {
      lastSignature = signature;
      frontOffset = 0;
    }
  });

  // The visible order: rotate the incoming list so `frontOffset` sits first.
  const ordered = $derived.by(() => {
    if (items.length === 0) return [] as BulkStripItem[];
    const n = items.length;
    const start = ((frontOffset % n) + n) % n;
    return [...items.slice(start), ...items.slice(0, start)];
  });

  const total = $derived(ordered.length);
  const topItem = $derived(ordered[0]);
  // Cards actually rendered behind the top one (the rest become the +N chip).
  const peeks = $derived(ordered.slice(1, 1 + MAX_PEEKS));
  const hiddenCount = $derived(Math.max(0, total - 1 - peeks.length));

  const topThumb = $derived(
    topItem ? labBulk.thumbs.get(topItem.id)?.url : undefined,
  );
  // Full-quality source object URL for the top card's ORIGINAL half. The
  // ~320px thumbnail looked low-quality blown up to stage size; the store mints
  // (and owns/revokes) a full-size URL of the source File instead.
  const topSourceUrl = $derived(
    topItem ? labBulk.sourceUrlFor(topItem.id) : undefined,
  );
  const topDownload = $derived(
    topItem ? labBulk.downloadFor(topItem.id) : undefined,
  );
  const topHasOutput = $derived(
    !!topItem &&
      topItem.outputSize !== undefined &&
      topItem.percentChange !== undefined,
  );

  // 500ms-delayed working treatment, per the strip's no-flicker rule: a card
  // only shimmers if its job stays active past the threshold.
  const activeIds = $derived(
    new Set(
      items.filter((item) => item.statusGroup === 'active').map((i) => i.id),
    ),
  );
  const shimmerIds = new SvelteSet<string>();
  $effect(() => {
    const current = activeIds;
    const timers: ReturnType<typeof setTimeout>[] = [];
    // Drop shimmer for anything no longer active.
    for (const id of [...shimmerIds]) {
      if (!current.has(id)) shimmerIds.delete(id);
    }
    // Arm a delayed shimmer for newly-active cards (500ms no-flicker rule).
    for (const id of current) {
      if (shimmerIds.has(id)) continue;
      timers.push(
        setTimeout(() => {
          if (activeIds.has(id)) shimmerIds.add(id);
        }, 500),
      );
    }
    return () => timers.forEach(clearTimeout);
  });

  // Geometry: alternate the peeks left / right of centre, each step further out
  // and more rotated, so the fan has a hand-held rhythm rather than a rigid
  // ladder. Depth index 1 = closest behind, larger = deeper. The offsets are a
  // PERCENTAGE of the (larger) card so the peeks reveal a substantial, clickable
  // slice of each card at every breakpoint — they read as images, not slivers —
  // rather than a fixed pixel nudge that vanished as the card grew.
  function peekTransform(depth: number): string {
    const side = depth % 2 === 1 ? -1 : 1; // 1st behind-left, 2nd behind-right…
    const step = Math.ceil(depth / 2); // 1,1,2,2,3,3…
    // First pair juts ~34% of the card out; each deeper pair adds ~16%. `spread`
    // tucks this in when the mid-desktop side panels squeeze the corridor.
    const xPct = side * (34 + (step - 1) * 16) * spread;
    const y = step * 16;
    const rot = side * (2.6 + step * 1.2);
    const scale = Math.max(0.8, 1 - step * 0.055);
    return `translate(-50%, -50%) translate(${xPct}%, ${y}px) rotate(${rot}deg) scale(${scale})`;
  }
  function peekOpacity(depth: number): number {
    const step = Math.ceil(depth / 2);
    return Math.max(0.5, 1 - step * 0.12);
  }

  // ── Top-card before/after divider ──────────────────────────────────────────
  // A REAL draggable split on the top card (the white line used to look like a
  // before/after slider but was inert). `splitPct` is the divider's horizontal
  // position as a 0–100% of the card; the before-half is clipped to its left,
  // the after-half to its right. Pointer-drag on the handle updates it (clamped
  // 4–96% so a sliver of each side always shows); ←/→ arrows nudge it when the
  // handle is focused. Lightweight — no zoom coupling, unlike the two-up.
  const SPLIT_MIN = 4;
  const SPLIT_MAX = 96;
  let splitPct = $state(50);
  let splitCardEl = $state<HTMLElement>();

  // Reset the divider to centre whenever the top card changes, so a new anchor
  // never inherits the previous card's drag position.
  let lastSplitTopId = '';
  $effect(() => {
    const id = topItem?.id ?? '';
    if (id !== lastSplitTopId) {
      lastSplitTopId = id;
      splitPct = 50;
    }
  });

  function clampSplit(value: number): number {
    return Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, value));
  }

  function splitFromClientX(clientX: number): void {
    const el = splitCardEl;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) return;
    splitPct = clampSplit(((clientX - rect.left) / rect.width) * 100);
  }

  // Track the active drag by pointer id (not by hasPointerCapture) so a move
  // still updates the split even if capture was never granted; capture is a
  // best-effort convenience (keeps the pointer targeting the handle off-card).
  let draggingPointerId: number | null = null;

  function onDividerPointerdown(event: PointerEvent): void {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    draggingPointerId = event.pointerId;
    const handle = event.currentTarget as HTMLElement;
    try {
      handle.setPointerCapture(event.pointerId);
    } catch {
      // Capture is optional — the id-tracked drag below works regardless.
    }
    splitFromClientX(event.clientX);
  }
  function onDividerPointermove(event: PointerEvent): void {
    if (draggingPointerId !== event.pointerId) return;
    event.preventDefault();
    splitFromClientX(event.clientX);
  }
  function onDividerPointerup(event: PointerEvent): void {
    if (draggingPointerId !== event.pointerId) return;
    draggingPointerId = null;
    const handle = event.currentTarget as HTMLElement;
    if (handle.hasPointerCapture(event.pointerId)) {
      handle.releasePointerCapture(event.pointerId);
    }
  }
  function onDividerKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      event.stopPropagation();
      splitPct = clampSplit(splitPct - (event.shiftKey ? 10 : 2));
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      event.stopPropagation();
      splitPct = clampSplit(splitPct + (event.shiftKey ? 10 : 2));
    } else if (event.key === 'Home') {
      event.preventDefault();
      splitPct = SPLIT_MIN;
    } else if (event.key === 'End') {
      event.preventDefault();
      splitPct = SPLIT_MAX;
    }
  }

  function selectTop(): void {
    if (!topItem) return;
    labBulk.select(topItem.id);
  }

  function bringToTop(id: string): void {
    const index = ordered.findIndex((item) => item.id === id);
    if (index <= 0) return;
    frontOffset = (frontOffset + index) % Math.max(1, total);
  }

  function cycle(direction: 1 | -1): void {
    if (total < 2) return;
    frontOffset = (frontOffset + direction + total) % total;
  }

  function onKeydown(event: KeyboardEvent): void {
    if (total < 2) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      cycle(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      cycle(1);
    }
  }
</script>

<svelte:window onkeydown={onKeydown} bind:innerWidth={viewportWidth} />

{#if topItem}
  <div class="stack-stage" role="group" aria-label="Batch stack">
    <div class="stack" style:--card-count={total} style:--stack-zoom={zoom}>
      <!-- Peeking cards, deepest painted first so the top card overlays them.
           Rendered in reverse so DOM order matches paint order. -->
      {#each [...peeks].reverse() as item, revIndex (item.id)}
        {@const depth = peeks.length - revIndex}
        {@const isDeepest = depth === peeks.length && hiddenCount > 0}
        {@const peekThumb = labBulk.thumbs.get(item.id)?.url}
        <button
          type="button"
          class="card peek"
          class:shimmer={shimmerIds.has(item.id)}
          style:transform={peekTransform(depth)}
          style:opacity={peekOpacity(depth)}
          style:z-index={100 - depth}
          title={`Bring ${item.fileName} to front`}
          aria-label={`Bring ${item.fileName} to front`}
          onclick={() => bringToTop(item.id)}
        >
          {#if peekThumb}
            <img src={peekThumb} alt="" draggable="false" class:pixelated />
          {:else}
            <span class="placeholder" aria-hidden="true"></span>
          {/if}
          {#if item.hasOverrides}
            <span class="override-dot" aria-label="Custom settings"></span>
          {/if}
          {#if isDeepest}
            <span class="more-chip">+{hiddenCount}</span>
          {/if}
          {#if shimmerIds.has(item.id)}
            <span class="shimmer-veil" aria-hidden="true"></span>
          {/if}
        </button>
      {/each}

      <!-- Top card: the anchor, shown as a BEFORE / AFTER split. Clicking it
           opens the real focus view for that image. -->
      <div
        class="card top"
        class:shimmer={shimmerIds.has(topItem.id)}
        style:z-index="120"
        style:--split={`${splitPct}%`}
        bind:this={splitCardEl}
      >
        <button
          type="button"
          class="top-hit"
          title={`Open ${topItem.fileName}`}
          aria-label={`Open ${topItem.fileName}`}
          onclick={selectTop}
        >
          <div class="split">
            <!-- LEFT (original) half: full-quality source object URL, clipped to
                 the divider position. The right half keeps the real output URL. -->
            <div class="half side-before">
              {#if topSourceUrl}
                <img
                  src={topSourceUrl}
                  alt=""
                  draggable="false"
                  class:pixelated
                />
              {:else if topThumb}
                <img src={topThumb} alt="" draggable="false" class:pixelated />
              {:else}
                <span class="placeholder" aria-hidden="true"></span>
              {/if}
            </div>
            <div class="half side-after">
              {#if topDownload?.url}
                <img
                  src={topDownload.url}
                  alt=""
                  draggable="false"
                  class:pixelated
                />
              {:else if topThumb}
                <img
                  src={topThumb}
                  alt=""
                  draggable="false"
                  class="dim"
                  class:pixelated
                />
              {:else}
                <span class="placeholder" aria-hidden="true"></span>
              {/if}
            </div>

            <span class="chip left">Original</span>
            <span class="chip right">
              WebP
              {#if topHasOutput}
                <DeltaPill percent={topItem.percentChange!} variant="bare" />
              {/if}
            </span>
          </div>

          {#if shimmerIds.has(topItem.id)}
            <span class="shimmer-veil" aria-hidden="true"></span>
          {/if}
        </button>

        <!-- REAL before/after divider: a draggable handle (pointer + keyboard),
             clamped, with a production-style scrubber affordance like the
             two-up's. Sits above the top-hit button so its gestures don't open
             the image; the card still opens on a click of the halves. -->
        <div
          class="divider"
          role="slider"
          tabindex="0"
          aria-label="Before / after divider"
          aria-valuemin={SPLIT_MIN}
          aria-valuemax={SPLIT_MAX}
          aria-valuenow={Math.round(splitPct)}
          aria-orientation="horizontal"
          onpointerdown={onDividerPointerdown}
          onpointermove={onDividerPointermove}
          onpointerup={onDividerPointerup}
          onpointercancel={onDividerPointerup}
          onkeydown={onDividerKeydown}
        >
          <span class="divider-line" aria-hidden="true"></span>
          <span class="divider-scrubber" aria-hidden="true">
            <svg viewBox="0 0 27 20" aria-hidden="true">
              <path class="arrow-left" d="M9.6 0L0 9.6l9.6 9.6z" />
              <path class="arrow-right" d="M17 19.2l9.5-9.6L16.9 0z" />
            </svg>
          </span>
        </div>

        {#if topItem.hasOverrides}
          <span class="override-dot top-dot" aria-label="Custom settings"
          ></span>
        {/if}
      </div>
    </div>

    <div class="caption">
      <span class="filename" title={topItem.fileName}>{topItem.fileName}</span>
      {#if topHasOutput}
        <span class="sizes">
          {prettySize(topItem.originalSize)}
          <span class="arrow" aria-hidden="true">→</span>
          {prettySize(topItem.outputSize!)}
        </span>
      {:else if shimmerIds.has(topItem.id) || topItem.statusGroup === 'active'}
        <span class="pending">Encoding…</span>
      {:else}
        <span class="pending">Queued</span>
      {/if}
    </div>

    <!-- Hint, redesigned as a compact iconic pill row rather than a sentence:
         the glyphs carry the meaning, whisper-sized labels annotate. -->
    <div class="hint" aria-label="Stack controls">
      {#if total > 1}
        <span class="hint-item">
          <svg class="hint-glyph" viewBox="0 0 24 24" aria-hidden="true">
            <rect
              x="6"
              y="8"
              width="13"
              height="11"
              rx="2"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
            />
            <path
              d="M9 5.5h9A2.5 2.5 0 0 1 20.5 8v8"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            />
          </svg>
          <span class="hint-count">{total}</span>
        </span>
        <span class="hint-sep" aria-hidden="true"></span>
        <span class="hint-item">
          <span class="keycap" aria-hidden="true">←</span>
          <span class="keycap" aria-hidden="true">→</span>
          <span class="hint-label">leaf</span>
        </span>
        <span class="hint-sep" aria-hidden="true"></span>
        <span class="hint-item">
          <svg class="hint-glyph" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M9 11V6.5a2 2 0 0 1 4 0V11m0-2a2 2 0 0 1 4 0v3.5a6 6 0 0 1-6 6h-1.2a4 4 0 0 1-3-1.4L2.8 15a1.6 1.6 0 0 1 2.4-2l1.8 1.8V8a2 2 0 0 1 4 0"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span class="hint-label">open</span>
        </span>
      {:else}
        <span class="hint-item">
          <svg class="hint-glyph" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M9 11V6.5a2 2 0 0 1 4 0V11m0-2a2 2 0 0 1 4 0v3.5a6 6 0 0 1-6 6h-1.2a4 4 0 0 1-3-1.4L2.8 15a1.6 1.6 0 0 1 2.4-2l1.8 1.8V8a2 2 0 0 1 4 0"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span class="hint-label">open</span>
        </span>
      {/if}
    </div>
  </div>
{/if}

<style>
  .stack-stage {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 22px;
    padding: 24px;
    box-sizing: border-box;
    /* Let the strip / panels above/below stay reachable; the fan itself is the
       only pointer surface. */
    pointer-events: none;
  }

  /* The fan lives in a fixed-height positioning frame so the absolutely-placed
     cards have a stable centre to orbit, and the caption/hint below never jump
     as cards cycle. Width/height scale with the viewport for presence. */
  .stack {
    position: relative;
    /* Command the stage: the top card is sized to the free corridor like the
       focus image would be. Larger than round 1 at every band (was 46vw/520px),
       within reason. The stage-toolbar zoom scales the whole fan on top. */
    width: min(56vw, 640px);
    height: min(52vh, 460px);
    transform: scale(var(--stack-zoom, 1));
    transition: transform 200ms cubic-bezier(0.22, 0.61, 0.36, 1);
    pointer-events: none;
  }

  .card {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 100%;
    aspect-ratio: 4 / 3;
    margin: 0;
    padding: 0;
    border: 1px solid var(--border-strong, rgba(255, 255, 255, 0.16));
    border-radius: 16px;
    background: var(--surface-solid, #16161c);
    overflow: hidden;
    pointer-events: auto;
    box-shadow: 0 30px 60px -24px rgba(0, 0, 0, 0.7);
    transition:
      transform 320ms cubic-bezier(0.22, 0.61, 0.36, 1),
      opacity 320ms ease,
      box-shadow 320ms ease,
      border-color 150ms ease;
  }

  .card img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .card img.dim {
    opacity: 0.5;
  }
  .card img.pixelated {
    image-rendering: crisp-edges;
    image-rendering: pixelated;
  }

  .placeholder {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      135deg,
      var(--surface-raise, rgba(255, 255, 255, 0.06)),
      transparent
    );
  }

  /* ── Peeking cards ─────────────────────────────────────────────────────── */
  .peek {
    transform: translate(-50%, -50%);
    cursor: pointer;
    /* A darkening scrim keeps the peeks reading as "behind", so the top card
       stays the clear focus. */
    filter: brightness(0.72) saturate(0.9);
  }
  .peek::after {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(6, 6, 9, 0.28);
    pointer-events: none;
  }
  .peek:hover {
    filter: brightness(0.92) saturate(0.95);
    border-color: var(--accent-2, #53b2ff);
  }
  .peek:focus-visible {
    outline: 2px solid var(--accent-2, #53b2ff);
    outline-offset: 2px;
  }

  .more-chip {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    z-index: 2;
    padding: 6px 12px;
    border-radius: 999px;
    background: rgba(12, 12, 15, 0.72);
    border: 1px solid var(--border-strong, rgba(255, 255, 255, 0.18));
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    color: var(--text-1, #f5f5f7);
    font-size: 1.05rem;
    font-weight: 750;
    font-variant-numeric: tabular-nums;
  }

  /* ── Top card + before/after split ─────────────────────────────────────── */
  .top {
    transform: translate(-50%, -50%);
    box-shadow: 0 40px 80px -28px rgba(0, 0, 0, 0.8);
  }
  .top-hit {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    color: inherit;
    font: inherit;
  }
  .top:hover {
    border-color: var(--accent-2, #53b2ff);
  }
  .top-hit:focus-visible {
    outline: 2px solid var(--accent-2, #53b2ff);
    outline-offset: 2px;
    border-radius: 16px;
  }

  .split {
    position: absolute;
    inset: 0;
  }
  /* Both halves fill the WHOLE card box and are clipped at the divider (--split,
     default 50%), the same technique the production two-up uses: each <img>
     covers the full frame, so the split reads as one continuous image cut down
     the middle wherever the divider sits. NB: the halves are `side-before` /
     `side-after`, NOT `original` / `output` — a class literally named `output`
     would be captured by the focus view's `:global(...) .output` rule (meant for
     the production Output component) and collapse the half. */
  .half {
    position: absolute;
    inset: 0;
    overflow: hidden;
  }
  .half img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .half.side-before {
    clip-path: inset(0 calc(100% - var(--split, 50%)) 0 0);
  }
  .half.side-after {
    clip-path: inset(0 0 0 var(--split, 50%));
  }

  /* ── Real draggable before/after divider ─────────────────────────────────── */
  .divider {
    position: absolute;
    top: 0;
    bottom: 0;
    left: var(--split, 50%);
    width: 30px;
    transform: translateX(-50%);
    z-index: 3;
    /* Sits above the top-hit button so its drag gestures win, and carries its
       own pointer surface. */
    touch-action: none;
    cursor: ew-resize;
    outline: none;
  }
  .divider-line {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 50%;
    width: 2px;
    transform: translateX(-50%);
    background: linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0.15),
      rgba(255, 255, 255, 0.9),
      rgba(255, 255, 255, 0.15)
    );
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
    pointer-events: none;
  }
  /* Glass scrubber thumb, matching the two-up's affordance (accent arrows on a
     dark blurred pill) so the divider reads as the same draggable control. */
  .divider-scrubber {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    box-sizing: border-box;
    padding: 0 9px;
    border-radius: 999px;
    background: rgba(14, 14, 18, 0.85);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.18);
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.5);
    pointer-events: none;
    transition: transform 150ms ease;
  }
  .divider:hover .divider-scrubber {
    transform: translate(-50%, -50%) scale(1.08);
  }
  .divider-scrubber svg {
    width: 100%;
    height: auto;
    display: block;
  }
  .divider-scrubber .arrow-left {
    fill: var(--accent-1, #ff8a5e);
  }
  .divider-scrubber .arrow-right {
    fill: var(--accent-2, #53b2ff);
  }
  .divider:focus-visible .divider-scrubber {
    outline: 2px solid var(--accent-2, #53b2ff);
    outline-offset: 2px;
  }

  .chip {
    position: absolute;
    bottom: 10px;
    z-index: 2;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 9px;
    border-radius: 999px;
    background: rgba(6, 6, 9, 0.62);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    color: var(--text-1, #f5f5f7);
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.01em;
    pointer-events: none;
  }
  .chip.left {
    left: 10px;
    color: var(--text-2, rgba(235, 235, 245, 0.72));
  }
  .chip.right {
    right: 10px;
  }
  .chip.right :global(.delta.bare) {
    font-size: 0.76rem;
  }

  /* ── Override dot ──────────────────────────────────────────────────────── */
  .override-dot {
    position: absolute;
    z-index: 3;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--accent-2, #53b2ff);
    box-shadow: 0 0 0 2px var(--surface-solid, #16161c);
  }
  .peek .override-dot {
    top: 8px;
    right: 8px;
  }
  .top-dot {
    top: 10px;
    left: 10px;
  }

  /* ── Working shimmer (500ms-delayed by the parent) ─────────────────────── */
  .shimmer-veil {
    position: absolute;
    inset: 0;
    z-index: 4;
    pointer-events: none;
    background: linear-gradient(
      100deg,
      transparent 20%,
      rgba(255, 255, 255, 0.14) 50%,
      transparent 80%
    );
    background-size: 220% 100%;
    animation: shimmer 1.15s linear infinite;
  }
  .card.shimmer {
    border-color: color-mix(in srgb, var(--accent-1, #ff8a5e) 40%, transparent);
  }

  @keyframes shimmer {
    to {
      background-position: -120% 0;
    }
  }

  /* ── Caption + hint ──────────────────────────────────────────────────────
     Both set in the lab's established type scale (matches the left-panel /
     filmstrip caption register): filename in the text-1 body weight, sizes in
     the text-2 tabular caption, all one deliberate rhythm. */
  .caption {
    display: flex;
    align-items: baseline;
    gap: 10px;
    max-width: min(90vw, 620px);
    pointer-events: none;
    font-variant-numeric: tabular-nums;
  }
  .filename {
    color: var(--text-1, #f5f5f7);
    font-size: 0.95rem;
    font-weight: 650;
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sizes {
    flex: none;
    color: var(--text-2, rgba(235, 235, 245, 0.62));
    font-size: 0.85rem;
    font-weight: 550;
    white-space: nowrap;
  }
  .arrow {
    color: var(--text-3, rgba(235, 235, 245, 0.38));
    margin: 0 2px;
  }
  .pending {
    flex: none;
    color: var(--text-3, rgba(235, 235, 245, 0.5));
    font-size: 0.85rem;
    font-weight: 550;
  }

  /* Hint pill row: a single designed element in the left-panel's quality
     register — one quiet glass pill holding iconic segments separated by
     hairlines. The glyphs carry the meaning; whisper-sized labels annotate. */
  .hint {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    margin: 0;
    padding: 6px 12px;
    border-radius: 999px;
    background: var(--surface-raise, rgba(255, 255, 255, 0.05));
    border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    color: var(--text-2, rgba(235, 235, 245, 0.62));
    pointer-events: none;
  }
  .hint-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .hint-glyph {
    width: 17px;
    height: 17px;
    color: var(--text-3, rgba(235, 235, 245, 0.5));
  }
  .hint-count {
    font-size: 0.85rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: var(--text-1, #f5f5f7);
  }
  .hint-label {
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.03em;
    text-transform: lowercase;
    color: var(--text-3, rgba(235, 235, 245, 0.5));
  }
  .keycap {
    display: inline-grid;
    place-items: center;
    min-width: 18px;
    height: 18px;
    padding: 0 3px;
    border-radius: 5px;
    background: var(--surface-raise-2, rgba(255, 255, 255, 0.09));
    border: 1px solid var(--border-strong, rgba(255, 255, 255, 0.16));
    color: var(--text-2, rgba(235, 235, 245, 0.72));
    font-size: 0.72rem;
    line-height: 1;
    font-weight: 700;
  }
  .hint-sep {
    width: 1px;
    height: 16px;
    background: var(--border, rgba(255, 255, 255, 0.08));
  }

  /* ── Mid desktop band: fit between the two docked side panels ────────────────
     From 901–1240px the left BatchInfoPanel and right settings panel are tall
     side cards (312px + insets each), leaving a corridor of ~(100vw − 680px) in
     the middle. Size the card to that corridor (the JS also halves the peek
     spread here) so the fan never reaches over either panel. */
  @media (min-width: 901px) and (max-width: 1240px) {
    .stack {
      /* Card sized to the corridor between the two 340px-footprint side panels,
         with slack for the rotated peek corners' bounding box. The peeks now jut
         a PERCENTAGE of the card (and `spread` halves that here), so the fan's
         bounding box stays inside the corridor as the card scales. */
      width: min(calc(100vw - 760px), 480px);
      height: min(40vh, 360px);
    }
    /* Keep the caption inside the same corridor so it doesn't slide under the
       side panels. */
    .caption {
      max-width: calc(100vw - 720px);
    }
  }
  /* ── Compact (≤900px): the two settings panels dock as bottom SHEETS ─────────
     They occupy the bottom ~var(--mobile-options-height) of the stage region, so
     centre the fan in the free space ABOVE them (add matching bottom padding)
     rather than behind them. The card also shrinks so it clears full-width. */
  @media (max-width: 900px) {
    .stack-stage {
      /* This band is CRAMPED: the two settings panels dock as tall bottom sheets
         (--mobile-options-height = min(44dvh,360px)) and the lab dev-controls pill
         sits at the very top, so the fan lives in a shallow corridor between them.
         Reserve both — top for the controls pill, bottom for the panels + the
         picker/toolbar lane above them — and keep the fan centred in what's left.
         The card is sized small enough (with flex:none so the cramped column can't
         crush it) that the whole fan + caption + hint clears both edges. */
      /* Top padding clears the lab-controls pill; bottom padding reserves the
         docked panels + the toolbar/picker lane above them. The fan centres in
         the shallow corridor between (caption + hint are dropped at this band —
         see below). */
      padding-top: 72px;
      padding-bottom: calc(var(--mobile-options-height, 360px) + 44px);
      gap: 8px;
    }
    /* NB: the card's on-screen HEIGHT is driven by its WIDTH (aspect-ratio 4/3),
       not by `.stack`'s height — so the WIDTH is what's tuned to fit the shallow
       corridor here (card height ≈ 0.75 × width). Kept modest so the rotated top
       card clears the top controls pill and the docked panels below. */
    .stack {
      flex: none;
      width: min(44vw, 280px);
      height: min(20vw, 150px);
    }
  }
  /* 621–900px compact band ONLY: the two settings panels dock as tall bottom
     sheets and leave a shallow corridor, so the fan + toolbar already fill it.
     The caption + hint would be buried behind the panels here — drop them (the
     toolbar carries the affordances; the fan is the content). They return on
     phone (≤620, panels are on-demand sheets → stage frees up) and desktop. */
  @media (min-width: 621px) and (max-width: 900px) {
    .stack-stage .caption,
    .stack-stage .hint {
      display: none;
    }
  }
  @media (max-width: 620px), (max-height: 500px) {
    /* Phone: the panels become on-demand bottom sheets (hidden by default), so
       the stage is free again — drop the reserved bottom padding and re-centre. */
    .stack-stage {
      gap: 14px;
      padding-bottom: 24px;
    }
    .stack {
      width: min(82vw, 380px);
      height: min(38vh, 300px);
    }
  }
  /* Short viewports (landscape phones) genuinely lack the vertical room for the
     hint pill under the fan — hide it there only; narrow-but-tall phones keep it
     (it's a compact pill now, not a sentence). */
  @media (max-height: 500px) {
    .hint {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .card {
      transition: opacity 150ms ease;
    }
    .shimmer-veil {
      animation: none;
      background: rgba(255, 255, 255, 0.06);
    }
  }
</style>
