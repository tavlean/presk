<script lang="ts">
  // Size-adjustable rich strip. The picker chooses S/M/L thumbnail scale.
  import { bulkStore } from './store.svelte';
  import StripCell from './StripCell.svelte';
  import { createStripSelectionController } from './strip-selection';

  const items = $derived(bulkStore.stripItems);
  const size = $derived(bulkStore.stripSize);
  const selection = createStripSelectionController();
  const thumbCount = $derived(bulkStore.thumbs.size);

  const EDGE_THRESHOLD = 2;
  let scroller = $state<HTMLElement>();
  let fadeLeft = $state(false);
  let fadeRight = $state(false);

  function updateScrollFades(): void {
    if (!scroller) return;
    const max = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    fadeLeft = max > EDGE_THRESHOLD && scroller.scrollLeft > EDGE_THRESHOLD;
    fadeRight =
      max > EDGE_THRESHOLD && scroller.scrollLeft < max - EDGE_THRESHOLD;
  }

  $effect(() => {
    if (!scroller) return;
    const observer = new ResizeObserver(updateScrollFades);
    observer.observe(scroller);
    updateScrollFades();
    return () => observer.disconnect();
  });

  $effect(() => {
    items.length;
    size;
    thumbCount;
    queueMicrotask(updateScrollFades);
  });
</script>

<svelte:window onresize={updateScrollFades} />

<div class="rich-strip size-{size}">
  <div
    bind:this={scroller}
    class="scroller"
    class:fade-left={fadeLeft}
    class:fade-right={fadeRight}
    role="listbox"
    aria-label="Images"
    tabindex="-1"
    onclick={selection.onClick}
    onkeydown={selection.onKeydown}
    onpointerdown={selection.onPointerdown}
    onpointermove={selection.onPointermove}
    onpointerup={selection.onPointerup}
    onpointercancel={selection.onPointercancel}
    onscroll={updateScrollFades}
  >
    {#each items as item (item.id)}
      <StripCell {item} mode={size} />
    {/each}
  </div>
</div>

<style>
  .rich-strip {
    display: flex;
    align-items: stretch;
    gap: 10px;
    width: 100%;
    height: 100%;
    min-height: 0;
  }

  /* Horizontal scroller: centered while the thumbs fit, left-aligned the moment
     they overflow (safe center), scrollbar chrome only on hover. */
  .scroller {
    --strip-fade-size: 36px;
    display: flex;
    align-items: center;
    justify-content: safe center;
    gap: 10px;
    flex: 1;
    min-width: 0;
    height: 100%;
    box-sizing: border-box;
    overflow-x: auto;
    padding: 8px 12px;
    scrollbar-width: none;
    scroll-snap-type: x proximity;
    user-select: none;
    -webkit-user-select: none;
  }
  .scroller.fade-left {
    -webkit-mask-image: linear-gradient(
      to right,
      transparent,
      #000 var(--strip-fade-size),
      #000 100%
    );
    mask-image: linear-gradient(
      to right,
      transparent,
      #000 var(--strip-fade-size),
      #000 100%
    );
  }
  .scroller.fade-right {
    -webkit-mask-image: linear-gradient(
      to right,
      #000 0,
      #000 calc(100% - var(--strip-fade-size)),
      transparent
    );
    mask-image: linear-gradient(
      to right,
      #000 0,
      #000 calc(100% - var(--strip-fade-size)),
      transparent
    );
  }
  .scroller.fade-left.fade-right {
    -webkit-mask-image: linear-gradient(
      to right,
      transparent,
      #000 var(--strip-fade-size),
      #000 calc(100% - var(--strip-fade-size)),
      transparent
    );
    mask-image: linear-gradient(
      to right,
      transparent,
      #000 var(--strip-fade-size),
      #000 calc(100% - var(--strip-fade-size)),
      transparent
    );
  }
  .scroller::-webkit-scrollbar {
    height: 6px;
  }
  .scroller::-webkit-scrollbar-thumb {
    background: transparent;
    border-radius: 999px;
  }
  .scroller:hover {
    scrollbar-width: thin;
  }
  .scroller:hover::-webkit-scrollbar-thumb {
    background: var(--border-strong, rgba(255, 255, 255, 0.16));
  }

  @media (prefers-reduced-motion: reduce) {
    .rich-strip :global(.view-mode button:hover:not(.active)) {
      transform: none;
    }
  }
</style>
