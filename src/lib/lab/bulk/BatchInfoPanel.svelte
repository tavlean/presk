<script lang="ts">
  // The left-panel surface for the bulk lab. It has two faces driven by
  // SELECTION (not the right-panel scope tab):
  //
  //  • IMAGE face (an image is selected): the panel TITLE is the filename, then
  //    the info rows (Format / Dimensions / Original size / Aspect chip), then
  //    the ● custom-settings + "Reset to global" row when the job deviates.
  //    No "IMAGE" section header — the filename is the title.
  //  • GLOBAL face (nothing selected): the title is the image COUNT with a
  //    quiet "Select an image below to inspect" hint, no info rows.
  //
  // A footer is ALWAYS present (both faces), styled after the production Results
  // footer (Results.svelte): the big batch output total + delta pill, a
  // secondary line carrying the count + transform ("12 images · 10.5 MB →
  // 301 kB"), and the coral "Save all · ZIP" action at the right. The count
  // living in the footer is what lets the old "BATCH" header disappear.
  import { labBulk } from './store.svelte';
  import { inferAspect } from './aspect';
  import DeltaPill from './DeltaPill.svelte';

  interface Props {
    /** Selected source File (for name + format + size). Undefined = global. */
    file: File | undefined;
    /** Natural pixel width, or 0 until the thumbnail decode lands. */
    width: number;
    /** Natural pixel height, or 0 until the thumbnail decode lands. */
    height: number;
    /** Clear the selected image's overrides back to global. */
    onReset?: () => void;
  }

  let { file, width, height, onReset }: Props = $props();

  const summary = $derived(labBulk.summary);
  const output = $derived(summary.output);
  const progress = $derived(summary.progress);
  const busy = $derived(progress.active + progress.queued > 0);
  const hasOverrides = $derived(labBulk.selectedHasOverrides);

  const SIZE_UNITS = ['B', 'kB', 'MB', 'GB', 'TB'];
  // Decimal (SI, base-1000), 3 significant figures — matches Results.svelte so
  // sizes read identically across the app.
  function prettySize(bytes: number): string {
    if (bytes < 1) return '0 B';
    const exponent = Math.min(
      Math.floor(Math.log10(bytes) / 3),
      SIZE_UNITS.length - 1,
    );
    return `${(bytes / 1000 ** exponent).toPrecision(3)} ${SIZE_UNITS[exponent]}`;
  }

  // The footer's leading figure: value + unit split so the unit can echo the
  // production footer's smaller accented unit glyph.
  function prettyParts(bytes: number): { value: string; unit: string } {
    if (bytes < 1) return { value: '0', unit: 'B' };
    const exponent = Math.min(
      Math.floor(Math.log10(bytes) / 3),
      SIZE_UNITS.length - 1,
    );
    return {
      value: (bytes / 1000 ** exponent).toPrecision(3),
      unit: SIZE_UNITS[exponent],
    };
  }

  const outputParts = $derived(
    output.optimized > 0 ? prettyParts(output.totalOutputSize) : null,
  );

  const showDelta = $derived(output.optimized > 0);

  /** A short, uppercase format label from the MIME type or extension. */
  function formatLabel(source: File): string {
    const fromMime = source.type.split('/')[1]?.toLowerCase() ?? '';
    const fromExt = source.name.includes('.')
      ? source.name.split('.').pop()!.toLowerCase()
      : '';
    const raw = fromMime || fromExt;
    const map: Record<string, string> = {
      jpeg: 'JPEG',
      jpg: 'JPEG',
      jfif: 'JPEG',
      png: 'PNG',
      webp: 'WebP',
      avif: 'AVIF',
      gif: 'GIF',
      'svg+xml': 'SVG',
      svg: 'SVG',
      jxl: 'JPEG XL',
      qoi: 'QOI',
      bmp: 'BMP',
      tiff: 'TIFF',
      tif: 'TIFF',
    };
    return map[raw] ?? (raw ? raw.toUpperCase() : 'Image');
  }

  const hasDims = $derived(width > 0 && height > 0);
  const aspect = $derived(hasDims ? inferAspect(width, height) : null);
</script>

<div class="batch-info">
  <div class="batch-info-scroll">
    {#if file}
      <!-- IMAGE face: filename is the title, then the info rows. -->
      <div class="head">
        <p class="title filename" title={file.name}>{file.name}</p>
      </div>
      <div class="body">
        <dl class="rows">
          <div class="row">
            <dt>Format</dt>
            <dd>{formatLabel(file)}</dd>
          </div>
          <div class="row">
            <dt>Dimensions</dt>
            <dd>{hasDims ? `${width} × ${height}` : '—'}</dd>
          </div>
          <div class="row">
            <dt>Original size</dt>
            <dd>{prettySize(file.size)}</dd>
          </div>
          <div class="row">
            <dt>Aspect</dt>
            <dd>
              {#if aspect}
                <span class="chip" class:approx={aspect.approx}
                  >{aspect.label}</span
                >
              {:else}
                —
              {/if}
            </dd>
          </div>
        </dl>

        {#if hasOverrides}
          <div class="override-row">
            <span class="dot" aria-hidden="true">●</span>
            <strong>Custom settings</strong>
            <button type="button" onclick={() => onReset?.()}
              >Reset to global</button
            >
          </div>
        {/if}
      </div>
    {:else}
      <!-- GLOBAL face: the count is the title, with a quiet inspect hint. -->
      <div class="head">
        <p class="title count">
          {summary.totalJobs}
          {summary.totalJobs === 1 ? 'image' : 'images'}
        </p>
        <p class="hint">Select an image below to inspect</p>
      </div>
    {/if}

    {#if busy}
      <div class="progress" aria-label="Batch progress">
        <span class="spinner" aria-hidden="true"></span>
        <span>Encoding {progress.completed} of {progress.total}…</span>
      </div>
    {:else if progress.failed > 0}
      <p class="failed">{progress.failed} failed</p>
    {/if}
  </div>

  <!-- Panel footer, styled after the production Results footer: the batch
       output total + delta at the top, a secondary count + transform line, and
       the coral "Save all · ZIP" action at the right. -->
  <div class="panel-footer">
    <div class="stats">
      <div class="size-row">
        <span class="total-size">
          {#if outputParts}
            {outputParts.value}<span class="unit">{outputParts.unit}</span>
          {:else}
            <span class="pending">…</span>
          {/if}
        </span>
        {#if showDelta}
          <DeltaPill percent={output.percentChange} />
        {/if}
      </div>
      <span class="from-to">
        {summary.totalJobs}
        {summary.totalJobs === 1 ? 'image' : 'images'}
        <span class="sep" aria-hidden="true">·</span>
        {prettySize(output.totalOriginalSize)}
        <span class="arrow" aria-hidden="true">→</span>
        {#if output.optimized > 0}
          {prettySize(output.totalOutputSize)}
        {:else}
          …
        {/if}
      </span>
    </div>

    <button
      type="button"
      class="save-all"
      onclick={() => labBulk.saveAllStub()}
    >
      Save all · ZIP
    </button>
  </div>
</div>

<style>
  .batch-info {
    display: flex;
    flex-direction: column;
    min-height: 0;
    color: var(--text-1, #f5f5f7);
  }

  /* Title + info rows scroll together; the footer stays pinned. */
  .batch-info-scroll {
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow-y: auto;
  }

  .head {
    display: grid;
    gap: 3px;
    padding: 14px 16px 10px;
  }

  /* The panel title (filename OR count) reads like a card heading, not a
     section label — it replaces the removed IMAGE/BATCH headers. */
  .title {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--text-1, #f5f5f7);
  }
  .filename {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .count {
    font-variant-numeric: tabular-nums;
  }

  .hint {
    margin: 0;
    color: var(--text-3, rgba(235, 235, 245, 0.38));
    font-size: 0.9rem;
  }

  .body {
    display: grid;
    gap: 12px;
    padding: 0 16px 14px;
  }

  .rows {
    display: grid;
    gap: 9px;
    margin: 0;
  }

  .row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
  }

  dt {
    color: var(--text-3, rgba(235, 235, 245, 0.38));
    font-size: 0.85rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  dd {
    margin: 0;
    color: var(--text-1, #f5f5f7);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    text-align: right;
  }

  .chip {
    display: inline-block;
    padding: 2px 9px;
    border-radius: 999px;
    background: var(--surface-raise, rgba(255, 255, 255, 0.06));
    border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--text-1, #f5f5f7);
  }
  .chip.approx {
    color: var(--text-2, rgba(235, 235, 245, 0.62));
  }

  /* Custom-settings affordance — closes out the IMAGE face. */
  .override-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-top: 2px;
    color: var(--text-2, rgba(235, 235, 245, 0.62));
    font-size: 0.92rem;
  }
  .override-row .dot {
    color: var(--accent-1, #ff8a5e);
  }
  .override-row strong {
    color: var(--text-1, #f5f5f7);
    font-weight: 700;
  }
  .override-row button {
    margin-left: auto;
    border: none;
    background: transparent;
    color: var(--text-2, rgba(235, 235, 245, 0.62));
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }
  .override-row button:hover {
    color: var(--text-1, #f5f5f7);
  }

  .progress {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 16px 12px;
    color: var(--text-2, rgba(235, 235, 245, 0.62));
    font-size: 0.9rem;
    font-variant-numeric: tabular-nums;
  }

  .spinner {
    flex: none;
    width: 13px;
    height: 13px;
    border: 2px solid rgba(255, 255, 255, 0.22);
    border-top-color: var(--accent-1, #ff8a5e);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .failed {
    margin: 0;
    padding: 0 16px 12px;
    color: var(--bad, #ff7d92);
    font-size: 0.9rem;
    font-weight: 700;
  }

  /* Footer: mirrors Results.svelte — size stats at the left, action at the
     right, same paddings/radius rhythm as the production OptionsPanel footer
     (border-top + faint inset background). */
  .panel-footer {
    flex: none;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    padding: 10px 16px 12px;
    border-top: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    background: rgba(0, 0, 0, 0.18);
  }

  .stats {
    display: grid;
    gap: 1px;
    min-width: 0;
  }

  .size-row {
    display: flex;
    align-items: baseline;
    gap: 7px;
    min-width: 0;
  }

  .total-size {
    font-size: 1.7rem;
    font-weight: 700;
    letter-spacing: 0.01em;
    font-variant-numeric: tabular-nums;
    color: var(--text-1, #f5f5f7);
    white-space: nowrap;
  }

  .unit {
    font-size: 1.1rem;
    font-weight: 600;
    margin-left: 2px;
    color: var(--main-theme-color, #ff8a5e);
  }

  .pending {
    color: var(--text-3, rgba(235, 235, 245, 0.38));
  }

  .from-to {
    font-size: 0.85rem;
    font-weight: 500;
    letter-spacing: 0.02em;
    color: var(--text-3, rgba(235, 235, 245, 0.38));
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .sep {
    margin: 0 3px;
  }

  .arrow {
    margin: 0 2px;
  }

  .save-all {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 34px;
    padding: 0 16px;
    border: none;
    border-radius: 999px;
    font: inherit;
    font-weight: 700;
    font-size: 1.05rem;
    white-space: nowrap;
    cursor: pointer;
    background: linear-gradient(
      135deg,
      var(--main-theme-color, #ff8a5e),
      var(--hot-theme-color, #ff5e8a)
    );
    color: #16161c;
    box-shadow:
      0 4px 14px var(--main-theme-glow, rgba(255, 122, 80, 0.35)),
      inset 0 1px 0 rgba(255, 255, 255, 0.25);
    transition:
      transform 150ms ease,
      box-shadow 200ms ease,
      filter 200ms ease;
  }
  .save-all:hover {
    transform: translateY(-1px);
    filter: brightness(1.06);
  }
  .save-all:active {
    transform: translateY(0);
  }
  .save-all:focus-visible {
    outline: 2px solid var(--main-theme-color, #ff8a5e);
    outline-offset: 2px;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
