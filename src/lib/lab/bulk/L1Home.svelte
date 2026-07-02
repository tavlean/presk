<script lang="ts">
  // VARIANT L1 — "Focus-first home" (maintainer favorite; bulk-focus-mode.webp).
  //
  // Dropping N images lands DIRECTLY in the focus view of the first image. The
  // filmstrip is the all-images surface; there is no grid, so there is no
  // onBack. The left column is the batch card: totals + progress + Save all,
  // with the GLOBAL settings behind an expander (scope geography: LEFT = the
  // whole batch, RIGHT = this one image).
  import FocusView from './FocusView.svelte';
  import PanelControls from './PanelControls.svelte';
  import { labBulk } from './store.svelte';

  const summary = $derived(labBulk.summary);
  const output = $derived(summary.output);
  const progress = $derived(summary.progress);
  const busy = $derived(progress.active + progress.queued > 0);

  let globalsOpen = $state(false);

  const SIZE_UNITS = ['B', 'kB', 'MB', 'GB', 'TB'];
  function prettySize(bytes: number): string {
    if (bytes < 1) return '0 B';
    const exponent = Math.min(
      Math.floor(Math.log10(bytes) / 3),
      SIZE_UNITS.length - 1,
    );
    return `${(bytes / 1000 ** exponent).toPrecision(3)} ${SIZE_UNITS[exponent]}`;
  }

  const delta = $derived.by(() => {
    if (output.optimized === 0) return null;
    const rounded = Math.round(output.percentChange);
    if (rounded < 0) return { text: `▼ ${Math.abs(rounded)}%`, up: false };
    if (rounded > 0) return { text: `▲ ${rounded}%`, up: true };
    return { text: '0%', up: false };
  });
</script>

<FocusView onBack={null}>
  {#snippet left()}
    <section class="batch-card" aria-label="Batch">
      <header class="head">
        <h2>All images</h2>
        <p class="count">{summary.totalJobs} images</p>
      </header>

      <div class="totals">
        <span class="sizes">
          {prettySize(output.totalOriginalSize)}
          <span class="arrow" aria-hidden="true">→</span>
          {#if output.optimized > 0}
            {prettySize(output.totalOutputSize)}
          {:else}
            …
          {/if}
        </span>
        {#if delta}
          <span class="pill" class:up={delta.up} class:down={!delta.up}>
            {delta.text}
          </span>
        {/if}
      </div>

      {#if busy}
        <p class="progress">
          <span class="spinner" aria-hidden="true"></span>
          Encoding {progress.completed} of {progress.total}…
        </p>
      {:else if progress.failed > 0}
        <p class="failed">{progress.failed} failed</p>
      {/if}

      <button
        type="button"
        class="save-all"
        onclick={() => labBulk.saveAllStub()}
      >
        Save all · ZIP
      </button>

      <div class="globals" class:open={globalsOpen}>
        <button
          type="button"
          class="globals-toggle"
          aria-expanded={globalsOpen}
          onclick={() => (globalsOpen = !globalsOpen)}
        >
          <svg class="chevron" viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="m5.5 3.5 5 4.5-5 4.5"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          Global settings
          <span class="globals-hint">all images</span>
        </button>
        {#if globalsOpen}
          <div class="globals-body">
            <PanelControls scope="global" />
          </div>
        {/if}
      </div>
    </section>
  {/snippet}
</FocusView>

<style>
  .batch-card {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 16px;
    border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    border-radius: var(--options-radius, 16px);
    background: var(--surface, rgba(19, 19, 25, 0.82));
    backdrop-filter: blur(12px) saturate(1.2);
    -webkit-backdrop-filter: blur(12px) saturate(1.2);
  }

  .head h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-1, #f5f5f7);
  }

  .count {
    margin: 2px 0 0;
    color: var(--text-3, rgba(235, 235, 245, 0.38));
    font-size: 0.9rem;
  }

  .totals {
    display: flex;
    align-items: baseline;
    gap: 10px;
    flex-wrap: wrap;
  }

  .sizes {
    color: var(--text-1, #f5f5f7);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .arrow {
    color: var(--text-3, rgba(235, 235, 245, 0.38));
    font-weight: 400;
    margin: 0 2px;
  }

  .pill {
    padding: 1px 9px;
    border-radius: 999px;
    font-weight: 700;
    font-size: 0.85rem;
  }

  .pill.down {
    background: rgba(61, 220, 151, 0.14);
    color: var(--good, #3ddc97);
  }

  .pill.up {
    background: rgba(255, 176, 32, 0.14);
    color: var(--warn, #ffb020);
  }

  .progress {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    color: var(--text-2, rgba(235, 235, 245, 0.62));
    font-size: 0.9rem;
    font-variant-numeric: tabular-nums;
  }

  .spinner {
    width: 13px;
    height: 13px;
    border: 2px solid rgba(255, 255, 255, 0.22);
    border-top-color: var(--accent-1, #ff8a5e);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    flex: none;
  }

  .failed {
    margin: 0;
    color: var(--bad, #ff7d92);
    font-size: 0.9rem;
    font-weight: 600;
  }

  .save-all {
    padding: 11px 16px;
    border: none;
    border-radius: 999px;
    background: linear-gradient(
      135deg,
      var(--accent-1, #ff8a5e),
      var(--accent-1-hot, #ff6a3c)
    );
    color: #16161c;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
    transition: filter 150ms ease;
  }

  .save-all:hover {
    filter: brightness(1.08);
  }

  .globals {
    border-top: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    padding-top: 12px;
  }

  .globals-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 4px 0;
    border: none;
    background: transparent;
    color: var(--text-1, #f5f5f7);
    font: inherit;
    font-weight: 600;
    cursor: pointer;
    text-align: left;
  }

  .chevron {
    width: 13px;
    height: 13px;
    flex: none;
    color: var(--text-3, rgba(235, 235, 245, 0.38));
    transition: transform 180ms cubic-bezier(0.34, 1.3, 0.64, 1);
  }

  .globals.open .chevron {
    transform: rotate(90deg);
  }

  .globals-hint {
    margin-left: auto;
    color: var(--text-3, rgba(235, 235, 245, 0.38));
    font-size: 0.8rem;
    font-weight: 400;
  }

  .globals-body {
    padding-top: 12px;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
