<script lang="ts">
  import { fade } from 'svelte/transition';
  import { SvelteMap, SvelteSet } from 'svelte/reactivity';
  import type { EditorSession } from '$lib/editor/editor-session.svelte';
  import BatchInfoPanel from './BatchInfoPanel.svelte';
  import DeltaPill from './DeltaPill.svelte';
  import GlobalOptionsPanel from './GlobalOptionsPanel.svelte';
  import ViewModePicker from './ViewModePicker.svelte';
  import { labBulk } from './store.svelte';

  interface Props {
    focusSession: EditorSession;
    onReseed: () => void;
  }

  let { focusSession, onReseed }: Props = $props();

  const items = $derived(labBulk.stripItems);
  const file = $derived(labBulk.selectedFile);
  const thumb = $derived(labBulk.selectedThumb);
  const visibleProcessingIds = new SvelteSet<string>();
  const processingTimers = new SvelteMap<
    string,
    ReturnType<typeof setTimeout>
  >();

  const SIZE_UNITS = ['B', 'kB', 'MB', 'GB', 'TB'];

  function prettySize(bytes: number): string {
    if (bytes < 1) return '0 B';
    const exponent = Math.min(
      Math.floor(Math.log10(bytes) / 3),
      SIZE_UNITS.length - 1,
    );
    return `${(bytes / 1000 ** exponent).toPrecision(3)} ${SIZE_UNITS[exponent]}`;
  }

  $effect(() => {
    const activeIds = new Set(
      items
        .filter((item) => item.statusGroup === 'active')
        .map((item) => item.id),
    );

    for (const id of activeIds) {
      if (visibleProcessingIds.has(id) || processingTimers.has(id)) continue;
      processingTimers.set(
        id,
        setTimeout(() => {
          processingTimers.delete(id);
          visibleProcessingIds.add(id);
        }, 500),
      );
    }

    for (const [id, timer] of processingTimers) {
      if (activeIds.has(id)) continue;
      clearTimeout(timer);
      processingTimers.delete(id);
    }

    for (const id of Array.from(visibleProcessingIds)) {
      if (!activeIds.has(id)) visibleProcessingIds.delete(id);
    }
  });

  function openCard(event: MouseEvent, id: string): void {
    if (event.shiftKey) {
      labBulk.selectRangeTo(id);
      return;
    }
    if (event.metaKey || event.ctrlKey) {
      labBulk.toggleSelection(id);
      return;
    }

    labBulk.select(id);
    labBulk.openFocusFromGrid();
    onReseed();
  }

  function openCardFromKey(event: KeyboardEvent, id: string): void {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    if (event.shiftKey) labBulk.selectRangeTo(id);
    else if (event.metaKey || event.ctrlKey) labBulk.toggleSelection(id);
    else {
      labBulk.select(id);
      labBulk.openFocusFromGrid();
      onReseed();
    }
  }

  function stopCard(event: Event): void {
    event.stopPropagation();
  }

  function removeImage(event: Event, id: string): void {
    event.preventDefault();
    event.stopPropagation();
    labBulk.removeOne(id);
  }

  function downloadImage(
    event: Event,
    download: { url: string; fileName: string },
  ): void {
    event.preventDefault();
    event.stopPropagation();
    const anchor = document.createElement('a');
    anchor.href = download.url;
    anchor.download = download.fileName;
    anchor.click();
  }

  function isTypeableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    return (
      tag === 'TEXTAREA' ||
      target.isContentEditable ||
      (tag === 'INPUT' &&
        !['range', 'checkbox', 'radio'].includes(
          (target as HTMLInputElement).type,
        ))
    );
  }

  function onKeydown(event: KeyboardEvent): void {
    if (
      (event.key === 'Delete' || event.key === 'Backspace') &&
      labBulk.selectedCount > 0 &&
      !isTypeableTarget(event.target)
    ) {
      event.preventDefault();
      labBulk.removeSelected();
      return;
    }

    if (event.key === 'Escape' && labBulk.selectedCount > 0) {
      event.preventDefault();
      labBulk.deselect();
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div class="grid-home sqush-editor">
  <!-- In grid view there is no stage toolbar, so the view picker sits at the TOP
       edge of the grid area (centred), keeping the Grid/L/M/S control reachable
       while browsing the batch. -->
  <div class="view-picker-dock">
    <ViewModePicker />
  </div>

  <main class="cards" aria-label="Images">
    {#each items as item (item.id)}
      {@const itemThumb = labBulk.thumbs.get(item.id)}
      {@const download = labBulk.downloadFor(item.id)}
      <div
        class="card"
        class:selected={labBulk.isSelected(item.id)}
        class:anchor={labBulk.selectedId === item.id}
        role="button"
        tabindex="0"
        in:fade={{ duration: 150 }}
        title={item.fileName}
        onclick={(event) => openCard(event, item.id)}
        onkeydown={(event) => openCardFromKey(event, item.id)}
      >
        <span class="thumb-wrap">
          {#if itemThumb}
            <img src={itemThumb.url} alt="" draggable="false" />
          {:else}
            <span class="shimmer" aria-hidden="true"></span>
          {/if}

          {#if item.hasOverrides}
            <span class="override-dot" aria-label="Custom settings"></span>
          {/if}

          {#if visibleProcessingIds.has(item.id)}
            <span class="spinner-overlay" aria-hidden="true">
              <span class="spinner"></span>
            </span>
          {:else if item.statusGroup === 'failed'}
            <span class="failed-overlay" aria-label="Failed">!</span>
          {/if}

          <button
            type="button"
            class="remove"
            title={`Remove ${item.fileName}`}
            aria-label={`Remove ${item.fileName}`}
            onclick={(event) => removeImage(event, item.id)}
            onpointerdown={stopCard}
          >
            ×
          </button>

          {#if download}
            <button
              type="button"
              class="download"
              title={`Download ${download.fileName}`}
              aria-label={`Download ${download.fileName}`}
              onclick={(event) => downloadImage(event, download)}
              onpointerdown={stopCard}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M12 4v11m0 0l-4.2-4.2M12 15l4.2-4.2M5 19h14"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          {/if}
        </span>

        <span class="card-body">
          <span class="name">{item.fileName}</span>
          <span class="meta">
            <span class="card-sizes">
              {prettySize(item.originalSize)}
              <span class="arrow" aria-hidden="true">-></span>
              {#if item.outputSize !== undefined}
                {prettySize(item.outputSize)}
              {:else if item.statusGroup === 'active'}
                ...
              {:else}
                queued
              {/if}
            </span>
            {#if item.percentChange !== undefined}
              <DeltaPill percent={item.percentChange} />
            {/if}
          </span>
        </span>
      </div>
    {/each}
  </main>

  <aside class="options options-1">
    <BatchInfoPanel {file} width={thumb?.w ?? 0} height={thumb?.h ?? 0} />
  </aside>

  <aside class="options options-2">
    <GlobalOptionsPanel {focusSession} />
  </aside>
</div>

<style>
  .grid-home {
    --mobile-options-height: min(44dvh, 360px);
    --panel-width: 312px;
    --panel-inset: 14px;
    --fit-inset-left: calc(var(--panel-width) + var(--panel-inset) * 2);
    --fit-inset-right: calc(var(--panel-width) + var(--panel-inset) * 2);
    position: relative;
    width: 100vw;
    height: 100dvh;
    overflow: hidden;
    background: var(--bg-0, #0c0c0f);
  }

  /* View picker at the top edge of the grid area, centred. Kept clear of the
     top-right lab controls; the cards start below it. */
  .view-picker-dock {
    position: absolute;
    top: 18px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 6;
  }
  .view-picker-dock :global(.view-mode) {
    background: var(--surface, rgba(19, 19, 25, 0.82));
    backdrop-filter: blur(16px) saturate(1.3);
    -webkit-backdrop-filter: blur(16px) saturate(1.3);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
  }

  .cards {
    position: absolute;
    top: 72px;
    left: var(--fit-inset-left);
    right: var(--fit-inset-right);
    bottom: var(--panel-inset);
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
    gap: 14px;
    align-content: start;
    min-height: 0;
    overflow-y: auto;
    padding: 2px 2px 12px;
  }

  .options {
    position: absolute;
    bottom: var(--panel-inset);
    width: var(--panel-width);
    max-height: calc(100% - 76px);
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    color: var(--text-1, #fff);
    font-size: 1.2rem;
    z-index: 5;
    background: var(--surface, rgba(19, 19, 25, 0.82));
    backdrop-filter: blur(20px) saturate(1.3);
    -webkit-backdrop-filter: blur(20px) saturate(1.3);
    border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    border-radius: var(--options-radius, 16px);
    box-shadow: var(--panel-shadow, 0 24px 48px -16px rgba(0, 0, 0, 0.55));
    overflow: hidden;
  }
  .options-1 {
    left: var(--panel-inset);
  }
  .options-2 {
    right: var(--panel-inset);
  }
  .grid-home .options-2 {
    --main-theme-color: var(--accent-1, #ff8a5e);
    --hot-theme-color: var(--accent-1-hot, #ff6a3c);
    --main-theme-glow: var(--accent-1-glow, rgba(255, 122, 80, 0.32));
    --accent-color: var(--accent-1, #ff8a5e);
  }

  .card {
    position: relative;
    display: flex;
    flex-direction: column;
    padding: 0;
    border: 2px solid var(--border, rgba(255, 255, 255, 0.08));
    border-radius: 14px;
    background: var(--surface, rgba(19, 19, 25, 0.82));
    overflow: hidden;
    cursor: pointer;
    text-align: left;
    font: inherit;
    transition:
      border-color 150ms ease,
      box-shadow 150ms ease,
      transform 150ms ease;
  }

  .card:hover {
    border-color: var(--border-strong, rgba(255, 255, 255, 0.16));
    transform: translateY(-1px);
  }

  .card.selected {
    border-color: var(--accent-2, #53b2ff);
    box-shadow: 0 0 0 1px var(--accent-2, #53b2ff);
  }
  .card.anchor {
    box-shadow:
      0 0 0 1px var(--accent-2, #53b2ff),
      0 0 20px var(--accent-2-glow, rgba(74, 163, 255, 0.32));
  }

  .thumb-wrap {
    position: relative;
    display: block;
    width: 100%;
    aspect-ratio: 4 / 3;
    overflow: hidden;
    background: var(--surface-solid, #16161c);
  }

  .thumb-wrap img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .shimmer {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      135deg,
      var(--surface-raise, rgba(255, 255, 255, 0.06)),
      transparent
    );
  }

  .override-dot {
    position: absolute;
    bottom: 8px;
    left: 8px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--accent-2, #53b2ff);
    box-shadow: 0 0 0 2px var(--surface-solid, #16161c);
  }

  .spinner-overlay {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    background: rgba(12, 12, 15, 0.55);
    backdrop-filter: blur(1px);
  }

  .spinner {
    width: 26px;
    height: 26px;
    border: 3px solid rgba(255, 255, 255, 0.25);
    border-top-color: var(--accent-1, #ff8a5e);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .failed-overlay {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    background: rgba(12, 12, 15, 0.55);
    color: var(--bad, #ff7d92);
    font-weight: 700;
    font-size: 1.5rem;
  }

  .remove,
  .download {
    position: absolute;
    top: 8px;
    z-index: 3;
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: var(--text-1, #f5f5f7);
    background: rgba(12, 12, 15, 0.62);
    border: 1px solid var(--border-strong, rgba(255, 255, 255, 0.16));
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    opacity: 0;
    transform: scale(0.86);
    pointer-events: none;
    transition:
      opacity 150ms ease,
      transform 150ms ease,
      color 150ms ease,
      border-color 150ms ease;
    text-decoration: none;
    font: inherit;
    font-size: 19px;
    font-weight: 700;
    line-height: 1;
    cursor: pointer;
    padding: 0;
  }
  .remove {
    left: 8px;
  }
  .download {
    right: 8px;
  }
  .card:hover .remove,
  .card:hover .download,
  .card:focus-within .remove,
  .card:focus-within .download,
  .remove:focus-visible,
  .download:focus-visible {
    opacity: 1;
    transform: scale(1);
    pointer-events: auto;
  }
  .remove:hover {
    color: var(--bad, #ff7d92);
    border-color: var(--bad, #ff7d92);
  }
  .download:hover {
    color: var(--accent-2, #53b2ff);
    border-color: var(--accent-2, #53b2ff);
  }
  .remove:focus-visible,
  .download:focus-visible {
    outline: 2px solid var(--accent-2, #53b2ff);
    outline-offset: 2px;
  }
  .download svg {
    width: 15px;
    height: 15px;
    display: block;
  }

  .card-body {
    display: grid;
    gap: 4px;
    padding: 10px 12px 12px;
  }

  .name {
    color: var(--text-1, #f5f5f7);
    font-weight: 600;
    font-size: 0.95rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .meta {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }

  .card-sizes {
    color: var(--text-2, rgba(235, 235, 245, 0.62));
    font-size: 0.85rem;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .arrow {
    color: var(--text-3, rgba(235, 235, 245, 0.38));
    font-weight: 400;
    margin: 0 2px;
  }

  .meta :global(.delta) {
    font-size: 0.85rem;
  }

  @media (max-width: 760px) {
    .grid-home {
      --panel-inset: 6px;
      --fit-inset-left: 0px;
      --fit-inset-right: 0px;
    }

    .cards {
      top: 64px;
      left: var(--panel-inset);
      right: var(--panel-inset);
      bottom: calc(var(--mobile-options-height) + var(--panel-inset) * 2);
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    }

    .options {
      width: calc(50vw - var(--panel-inset) * 1.5);
      height: var(--mobile-options-height);
      max-height: var(--mobile-options-height);
      font-size: 0.95rem;
    }
  }

  @media (max-width: 420px) {
    .grid-home {
      --mobile-options-height: 48dvh;
    }

    .cards {
      grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
    }
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
