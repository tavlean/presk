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
  }

  let { items }: Props = $props();

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
  // ladder. Depth index 1 = closest behind, larger = deeper.
  function peekTransform(depth: number): string {
    const side = depth % 2 === 1 ? -1 : 1; // 1st behind-left, 2nd behind-right…
    const step = Math.ceil(depth / 2); // 1,1,2,2,3,3…
    const x = side * (26 + step * 20) * spread;
    const y = step * 12;
    const rot = side * (2.4 + step * 1.1);
    const scale = Math.max(0.82, 1 - step * 0.05);
    return `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${rot}deg) scale(${scale})`;
  }
  function peekOpacity(depth: number): number {
    const step = Math.ceil(depth / 2);
    return Math.max(0.4, 1 - step * 0.14);
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
    <div class="stack" style:--card-count={total}>
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
            <img src={peekThumb} alt="" draggable="false" />
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
      >
        <button
          type="button"
          class="top-hit"
          title={`Open ${topItem.fileName}`}
          aria-label={`Open ${topItem.fileName}`}
          onclick={selectTop}
        >
          <div class="split">
            <div class="half side-before">
              {#if topThumb}
                <img src={topThumb} alt="" draggable="false" />
              {:else}
                <span class="placeholder" aria-hidden="true"></span>
              {/if}
            </div>
            <div class="half side-after">
              {#if topDownload?.url}
                <img src={topDownload.url} alt="" draggable="false" />
              {:else if topThumb}
                <img src={topThumb} alt="" draggable="false" class="dim" />
              {:else}
                <span class="placeholder" aria-hidden="true"></span>
              {/if}
            </div>
            <span class="divider" aria-hidden="true"></span>

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

    <p class="hint">
      {#if total > 1}
        {total} images · click a card or press ←/→ to leaf through · click the top
        card to open it
      {:else}
        Click the card to open this image
      {/if}
    </p>
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
    width: min(46vw, 520px);
    height: min(42vh, 380px);
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
  .half {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 50%;
    overflow: hidden;
  }
  /* NB: the halves are `side-before` / `side-after`, NOT `original` / `output`
     — a class literally named `output` would be captured by the focus view's
     `:global(.compress .stage-region .output)` rule (meant for the production
     Output component) and get its `bottom` overridden, collapsing the half. */
  .half.side-before {
    left: 0;
  }
  /* The after-half is clipped to the RIGHT so its image aligns with the same
     pixels as the before-half — both <img> cover the full card box, each half
     just reveals its side, so the split reads as one continuous frame cut down
     the middle. */
  .half.side-before img {
    width: 200%;
  }
  .half.side-after {
    right: 0;
  }
  .half.side-after img {
    width: 200%;
    left: -100%;
  }

  .divider {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 50%;
    width: 2px;
    transform: translateX(-50%);
    background: linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0.15),
      rgba(255, 255, 255, 0.85),
      rgba(255, 255, 255, 0.15)
    );
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
    pointer-events: none;
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

  /* ── Caption + hint ────────────────────────────────────────────────────── */
  .caption {
    display: flex;
    align-items: baseline;
    gap: 12px;
    max-width: min(90vw, 560px);
    pointer-events: none;
    font-variant-numeric: tabular-nums;
  }
  .filename {
    color: var(--text-1, #f5f5f7);
    font-size: 1.02rem;
    font-weight: 650;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sizes {
    flex: none;
    color: var(--text-2, rgba(235, 235, 245, 0.62));
    font-size: 0.94rem;
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
    font-size: 0.92rem;
    font-weight: 550;
  }

  .hint {
    margin: 0;
    max-width: min(90vw, 520px);
    text-align: center;
    color: var(--text-3, rgba(235, 235, 245, 0.4));
    font-size: 0.86rem;
    line-height: 1.4;
    pointer-events: none;
  }

  /* ── Mid desktop band: fit between the two docked side panels ────────────────
     From 901–1240px the left BatchInfoPanel and right settings panel are tall
     side cards (312px + insets each), leaving a corridor of ~(100vw − 680px) in
     the middle. Size the card to that corridor (the JS also halves the peek
     spread here) so the fan never reaches over either panel. */
  @media (min-width: 901px) and (max-width: 1240px) {
    .stack {
      /* Card sized to the corridor between the two 340px-footprint side panels,
         with slack for the rotated peek corners' bounding box. */
      width: min(calc(100vw - 820px), 420px);
      height: min(34vh, 300px);
    }
    /* Keep the caption + hint inside the same corridor so they don't slide under
       the side panels. */
    .caption,
    .hint {
      max-width: calc(100vw - 720px);
    }
  }
  /* ── Compact (≤900px): the two settings panels dock as bottom SHEETS ─────────
     They occupy the bottom ~var(--mobile-options-height) of the stage region, so
     centre the fan in the free space ABOVE them (add matching bottom padding)
     rather than behind them. The card also shrinks so it clears full-width. */
  @media (max-width: 900px) {
    .stack-stage {
      /* --mobile-options-height (min(44dvh,360px)) is defined on .compress; the
         extra ~96px leaves the picker lane (which sits just above the panels)
         clear too. */
      padding-bottom: calc(var(--mobile-options-height, 360px) + 96px);
      gap: 14px;
    }
    .stack {
      width: min(58vw, 340px);
      height: min(26vh, 240px);
    }
  }
  @media (max-width: 620px), (max-height: 500px) {
    /* Phone: the panels become on-demand bottom sheets (hidden by default), so
       the stage is free again — drop the reserved bottom padding and re-centre. */
    .stack-stage {
      gap: 16px;
      padding-bottom: 24px;
    }
    .stack {
      width: min(78vw, 360px);
      height: min(34vh, 260px);
    }
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
