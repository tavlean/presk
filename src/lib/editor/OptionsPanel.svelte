<script lang="ts">
  // One configurable comparison side. Structure (top to bottom):
  //   FORMAT  — chip grid (Original + the main encoders, long tail behind
  //             "More"), each chip showing its real encoded size once known
  //             (live result for the selected chip, "Compare sizes" for the
  //             rest, with a "best" badge on the smallest)
  //   options — the selected encoder's panel (Quality first, Advanced folded)
  //             plus the "Fit under N kB" quality search
  //   ADJUST  — resize / reduce-palette, ONE state shared by both sides
  //   footer  — output size, percent pill, Download (see Results.svelte)
  import { slide } from 'svelte/transition';
  import Toggle from './options/Toggle.svelte';
  import Range from './options/Range.svelte';
  import OptionRow from './options/OptionRow.svelte';
  import ToggleRow from './options/ToggleRow.svelte';
  import WebpOptions from './options/WebpOptions.svelte';
  import AvifOptions from './options/AvifOptions.svelte';
  import JxlOptions from './options/JxlOptions.svelte';
  import MozjpegOptions from './options/MozjpegOptions.svelte';
  import OxipngOptions from './options/OxipngOptions.svelte';
  import BrowserJpegOptions from './options/BrowserJpegOptions.svelte';
  import ResizeOptions from './options/ResizeOptions.svelte';
  import QuantizeOptions from './options/QuantizeOptions.svelte';
  import Results from './Results.svelte';
  import {
    COMPARE_FORMAT_IDS,
    OUTPUT_FORMATS,
    type OutputFormat,
    type SideFormat,
    type CompressOutcome,
  } from '$lib/compress';
  import type {
    ResizeOptionsState,
    QuantizeOptionsState,
  } from './options/processor-types';
  import type { ProcessorState } from 'client/lazy-app/feature-meta';
  import type { EncodeOptions as WebpEncodeOptions } from 'features/encoders/webP/shared/meta';
  import type { EncodeOptions as AvifEncodeOptions } from 'features/encoders/avif/shared/meta';
  import type { EncodeOptions as JxlEncodeOptions } from 'features/encoders/jxl/shared/meta';
  import type { EncodeOptions as MozjpegEncodeOptions } from 'features/encoders/mozJPEG/shared/meta';
  import type { EncodeOptions as OxipngEncodeOptions } from 'features/encoders/oxiPNG/shared/meta';

  interface Props {
    side: 'left' | 'right';
    format: SideFormat;
    /** Encoder choices to list (already filtered to those the browser supports). */
    formats?: { id: string; label: string; ext: string }[];
    /** The current format's option object (live $state proxy from the parent). */
    options: Record<string, unknown>;
    /** The SHARED Adjust state (one object for both sides). */
    processorState: ProcessorState;
    naturalWidth: number;
    naturalHeight: number;
    /** Source filename, shown on the Original chip's tooltip. */
    sourceName?: string;
    /** True when the source is a vector (SVG) — enables the Vector resize method. */
    isVector?: boolean;
    /** True when the OTHER side is also an encoder (Adjust edits both). */
    sharedAdjust?: boolean;
    result: CompressOutcome | null;
    working: boolean;
    canImport: boolean;
    downloadName: string;
    /** Original file size in bytes (the Original chip's number). */
    originalSize: number | null;
    /** "Compare sizes" results + state for this side. */
    compareSizes: Partial<Record<OutputFormat, number>>;
    compareBusy: boolean;
    /** "Fit to size" search in progress. */
    fitting: boolean;
    onFormatChange: (format: SideFormat) => void;
    onCompare: () => void;
    onFitToSize: (bytes: number) => void;
    onCopy: () => void;
    onSave: () => void;
    onImport: () => void;
  }

  let {
    side,
    format,
    formats = OUTPUT_FORMATS,
    options,
    processorState,
    naturalWidth,
    naturalHeight,
    sourceName,
    isVector = false,
    sharedAdjust = false,
    result,
    working,
    canImport,
    downloadName,
    originalSize,
    compareSizes,
    compareBusy,
    fitting,
    onFormatChange,
    onCompare,
    onFitToSize,
    onCopy,
    onSave,
    onImport,
  }: Props = $props();

  const isOriginal = $derived(format === 'identity');
  const typeLabel = $derived(formats.find((f) => f.id === format)?.label ?? '');

  // Friendly chip names: people think "JPEG"/"PNG", not encoder brands. The
  // encoder name stays in the tooltip for those who care.
  const CHIP_NAMES: Partial<Record<string, string>> = {
    avif: 'AVIF',
    webP: 'WebP',
    jxl: 'JPEG XL',
    mozJPEG: 'JPEG',
    oxiPNG: 'PNG',
  };
  const chipName = (id: string) =>
    CHIP_NAMES[id] ?? formats.find((f) => f.id === id)?.label ?? id;

  const mainFormats = $derived(
    COMPARE_FORMAT_IDS.filter((id) => formats.some((f) => f.id === id)),
  );
  const moreFormats = $derived(
    formats.filter((f) => !COMPARE_FORMAT_IDS.includes(f.id as OutputFormat)),
  );
  let moreOpen = $state(false);
  const showMore = $derived(
    moreOpen || moreFormats.some((f) => f.id === format),
  );

  // A chip's size: the live result for the selected chip, otherwise whatever
  // "Compare sizes" produced. Original always knows its size.
  function sizeFor(id: string): number | null {
    if (id === format && result && !working && !result.isOriginal)
      return result.outputSize;
    return compareSizes[id as OutputFormat] ?? null;
  }

  // "best" = the smallest known encoder size, only once there are at least two
  // numbers to rank (a single size isn't a comparison).
  const bestFormat = $derived.by(() => {
    const known = mainFormats
      .map((id) => ({ id, size: sizeFor(id) }))
      .filter(
        (entry): entry is { id: OutputFormat; size: number } =>
          typeof entry.size === 'number',
      );
    if (known.length < 2) return null;
    return known.reduce((a, b) => (b.size < a.size ? b : a)).id;
  });

  const SIZE_UNITS = ['B', 'kB', 'MB', 'GB'];
  function pretty(bytes: number): string {
    if (bytes < 1) return '0 B';
    const e = Math.min(
      Math.floor(Math.log10(bytes) / 3),
      SIZE_UNITS.length - 1,
    );
    return `${(bytes / 1000 ** e).toPrecision(3)} ${SIZE_UNITS[e]}`;
  }

  const hasQuality = $derived(typeof options.quality === 'number');
  // Default target: a round number near half the original, so the field never
  // starts blank or absurd.
  let fitKb = $state(500);
  $effect(() => {
    if (originalSize) {
      fitKb = Math.max(10, Math.round(originalSize / 2000) * 1);
    }
  });
</script>

<div class="options-scroller" class:original-image={isOriginal}>
  <h3 class="options-title">
    <div class="title-and-buttons">
      <span class="title-label"
        ><span class="title-dot" aria-hidden="true"></span>Format</span
      >
      {#if !isOriginal}
        <button
          type="button"
          class="title-button copy-over-button"
          title="Apply these settings to the other side"
          onclick={onCopy}
        >
          <svg viewBox="0 0 18 14">
            <path
              d="M5.5 3.6v6.8L2.1 7l3.4-3.4M7 0L0 7l7 7V0zm4 0v14l7-7-7-7z"
            />
          </svg>
        </button>
        <button
          type="button"
          class="title-button save-button"
          title="Save these settings as this side's preset"
          onclick={onSave}
        >
          <svg viewBox="0 0 24 24">
            <g
              fill="none"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
            >
              <path
                d="M12.501 20.93c-.866.25-1.914-.166-2.176-1.247a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37c1 .608 2.296.07 2.572-1.065c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.074.26 1.49 1.296 1.252 2.158M19 22v-6m3 3l-3-3l-3 3"
              />
              <path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0-6 0" />
            </g>
          </svg>
        </button>
        <button
          type="button"
          class="title-button import-button"
          class:button-opacity={!canImport}
          title="Load this side's saved preset"
          onclick={onImport}
          disabled={!canImport}
        >
          <svg viewBox="0 0 24 24">
            <g
              fill="none"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
            >
              <path
                d="M12.52 20.924c-.87.262-1.93-.152-2.195-1.241a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37c1 .608 2.296.07 2.572-1.065c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.088.264 1.502 1.323 1.242 2.192M19 16v6m3-3l-3 3l-3-3"
              />
              <path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0-6 0" />
            </g>
          </svg>
        </button>
      {/if}
    </div>
  </h3>

  <section class="options-section chips-section">
    <div class="chips" role="group" aria-label="Output format">
      <button
        type="button"
        class="chip"
        class:selected={isOriginal}
        data-format="identity"
        aria-pressed={isOriginal}
        title={sourceName ? `Original image (${sourceName})` : 'Original image'}
        onclick={() => onFormatChange('identity')}
      >
        <span class="chip-name">Original</span>
        <span class="chip-size"
          >{originalSize != null ? pretty(originalSize) : ' '}</span
        >
      </button>
      {#each mainFormats as id (id)}
        <button
          type="button"
          class="chip"
          class:selected={format === id}
          data-format={id}
          aria-pressed={format === id}
          title={formats.find((f) => f.id === id)?.label}
          onclick={() => onFormatChange(id)}
        >
          {#if bestFormat === id}
            <span class="chip-best">best</span>
          {/if}
          <span class="chip-name">{chipName(id)}</span>
          <span class="chip-size">
            {#if sizeFor(id) != null}
              {pretty(sizeFor(id)!)}
            {:else if compareBusy || (format === id && working)}
              <span class="chip-dots" aria-label="encoding">…</span>
            {:else}
              {' '}
            {/if}
          </span>
        </button>
      {/each}
      {#if moreFormats.length && !showMore}
        <button
          type="button"
          class="chip chip-more"
          onclick={() => (moreOpen = true)}
        >
          <span class="chip-name">More…</span>
          <span class="chip-size"
            >{moreFormats.map((f) => chipName(f.id)).join(' · ')}</span
          >
        </button>
      {/if}
      {#if showMore}
        {#each moreFormats as f (f.id)}
          <button
            type="button"
            class="chip"
            class:selected={format === f.id}
            data-format={f.id}
            aria-pressed={format === f.id}
            title={f.label}
            onclick={() => onFormatChange(f.id as SideFormat)}
          >
            <span class="chip-name">{chipName(f.id)}</span>
            <span class="chip-size">
              {#if sizeFor(f.id) != null}
                {pretty(sizeFor(f.id)!)}
              {:else if format === f.id && working}
                <span class="chip-dots" aria-label="encoding">…</span>
              {:else}
                {' '}
              {/if}
            </span>
          </button>
        {/each}
      {/if}
    </div>
    <button
      type="button"
      class="compare-button"
      onclick={onCompare}
      disabled={compareBusy}
    >
      {#if compareBusy}
        <span class="mini-spinner" aria-hidden="true"></span> Comparing…
      {:else}
        <svg class="compare-icon" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M9.5 1L3 9h4l-.5 6L13 7H9l.5-6z" />
        </svg>
        Compare sizes
      {/if}
    </button>
  </section>

  {#if !isOriginal}
    <div class="options-section" transition:slide={{ duration: 300 }}>
      <!-- Re-key on the options object identity so a panel that seeds its UI
           state once (AVIF/JXL etc.) remounts and re-derives when copy/import/
           fit-to-size replaces the options object. In-place edits keep the same
           identity, so this does not disrupt normal slider dragging. -->
      {#key options}
        {#if format === 'webP'}
          <WebpOptions options={options as unknown as WebpEncodeOptions} />
        {:else if format === 'avif'}
          <AvifOptions options={options as unknown as AvifEncodeOptions} />
        {:else if format === 'jxl'}
          <JxlOptions options={options as unknown as JxlEncodeOptions} />
        {:else if format === 'mozJPEG'}
          <MozjpegOptions
            options={options as unknown as MozjpegEncodeOptions}
          />
        {:else if format === 'oxiPNG'}
          <OxipngOptions options={options as unknown as OxipngEncodeOptions} />
        {:else if format === 'browserJPEG'}
          <BrowserJpegOptions
            options={options as unknown as { quality: number }}
          />
        {:else if typeof options.quality === 'number'}
          <OptionRow>
            <Range
              min={0}
              max={100}
              step={0.1}
              value={Number(options.quality)}
              oninput={(v) => (options.quality = v)}>Quality:</Range
            >
          </OptionRow>
        {:else}
          <p class="no-opts">{typeLabel} has no adjustable options.</p>
        {/if}
      {/key}

      {#if hasQuality}
        <!-- The most common real-world constraint: "it must be under N kB".
             Binary-searches quality so the user doesn't have to. -->
        <div class="fit-row">
          <label class="fit-label" for="fit-input-{side}">Fit under</label>
          <input
            id="fit-input-{side}"
            class="fit-input"
            type="number"
            min="1"
            bind:value={fitKb}
            disabled={fitting}
          />
          <span class="fit-unit">kB</span>
          <button
            type="button"
            class="fit-button"
            disabled={fitting || !fitKb}
            onclick={() => onFitToSize(fitKb * 1000)}
          >
            {#if fitting}
              <span class="mini-spinner" aria-hidden="true"></span>
            {:else}
              Fit
            {/if}
          </button>
        </div>
      {/if}
    </div>

    <div transition:slide={{ duration: 300 }}>
      <h3 class="options-title">
        <span class="title-label"
          ><span class="title-dot" aria-hidden="true"
          ></span>Adjust{#if sharedAdjust}<span class="title-hint"
              >both sides</span
            >{/if}</span
        >
      </h3>

      <ToggleRow class="section-enabler" label="Resize">
        <Toggle bind:checked={processorState.resize.enabled} />
      </ToggleRow>
      {#if processorState.resize.enabled}
        <div transition:slide={{ duration: 300 }}>
          <ResizeOptions
            options={processorState.resize as unknown as ResizeOptionsState}
            inputWidth={naturalWidth}
            inputHeight={naturalHeight}
            {isVector}
          />
        </div>
      {/if}

      <ToggleRow class="section-enabler" label="Reduce palette">
        <Toggle bind:checked={processorState.quantize.enabled} />
      </ToggleRow>
      {#if processorState.quantize.enabled}
        <div transition:slide={{ duration: 300 }}>
          <QuantizeOptions
            options={processorState.quantize as unknown as QuantizeOptionsState}
          />
        </div>
      {/if}
    </div>
  {/if}
</div>

<div class="options-results">
  <Results
    {side}
    {isOriginal}
    {typeLabel}
    size={result ? result.outputSize : null}
    percent={result ? result.percentChange : null}
    downloadHref={result?.outputUrl ?? '#'}
    {downloadName}
    loading={working}
    disabled={!result || working}
  />
</div>

<style>
  .options-scroller {
    overflow-x: hidden;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    background: transparent;
    flex: 0 1 auto;
    min-height: 0;
    overscroll-behavior: contain;
  }

  /* Section headers: a small tracked-out label with the side's accent dot,
     over the panel's glass (solid-ish bg so sticky scroll stays clean). */
  .options-title {
    background: var(--surface-header, rgba(24, 24, 28, 0.96));
    color: var(--text-2);
    margin: 0;
    padding: 12px var(--horizontal-padding) 9px;
    font-weight: 700;
    font-size: 1rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    border-bottom: 1px solid var(--stroke);
    position: sticky;
    top: 0;
    z-index: 1;
  }

  .title-label {
    display: inline-flex;
    align-items: center;
    gap: 7px;
  }

  .title-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--main-theme-color);
    box-shadow: 0 0 8px var(--main-theme-color);
  }
  .original-image .title-dot {
    background: var(--text-2);
    box-shadow: none;
  }

  .title-hint {
    margin-left: 8px;
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    color: var(--text-2);
    opacity: 0.75;
    text-transform: none;
  }

  .title-and-buttons {
    display: grid;
    grid-template-columns: 1fr;
    grid-auto-columns: max-content;
    grid-auto-flow: column;
    align-items: center;
    gap: 0.4rem;
  }

  .title-button {
    background: none;
    border: none;
    margin: -5px 0;
    padding: 5px;
    border-radius: 7px;
    cursor: pointer;
    color: var(--text-2);
    transition:
      background-color 150ms ease,
      color 150ms ease;
  }
  .title-button:hover {
    background: var(--field-bg-hover);
    color: var(--text-1);
  }
  .title-button svg {
    --size: 17px;
    display: block;
    width: var(--size);
    height: var(--size);
  }
  .copy-over-button {
    /* Point the filled arrow towards the other side (set per-side in theme). */
    transform: rotate(var(--rotate-copyoverbutton-angle, 0deg));
  }
  .copy-over-button svg {
    fill: currentColor;
  }
  .save-button svg,
  .import-button svg {
    stroke: currentColor;
  }
  .title-button:focus-visible {
    outline: var(--main-theme-color) solid 2px;
    outline-offset: 1px;
  }
  .button-opacity {
    pointer-events: none;
    cursor: not-allowed;
  }
  .button-opacity svg {
    opacity: 0.4;
  }

  /* ——— Format chips ——— */
  .chips-section {
    padding: 10px var(--horizontal-padding) 0;
  }

  .chips {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }

  .chip {
    position: relative;
    display: grid;
    gap: 1px;
    justify-items: start;
    padding: 7px 9px 6px;
    background: var(--field-bg, rgba(255, 255, 255, 0.06));
    border: 1px solid var(--stroke, rgba(255, 255, 255, 0.08));
    border-radius: 10px;
    color: var(--text-1);
    font: inherit;
    cursor: pointer;
    text-align: left;
    min-width: 0;
    transition:
      background-color 150ms ease,
      border-color 150ms ease,
      box-shadow 150ms ease;
  }
  .chip:hover {
    background: var(--field-bg-hover, rgba(255, 255, 255, 0.1));
  }
  .chip:focus-visible {
    outline: 2px solid var(--main-theme-color);
    outline-offset: 1px;
  }
  .chip.selected {
    border-color: var(--main-theme-color);
    background: var(--accent-soft);
    box-shadow: inset 0 0 0 1px var(--main-theme-color);
  }

  .chip-name {
    font-size: 1.05rem;
    font-weight: 700;
    letter-spacing: 0.01em;
    white-space: nowrap;
  }

  .chip-size {
    font-size: 0.85rem;
    font-variant-numeric: tabular-nums;
    color: var(--text-2);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }
  .chip.selected .chip-size {
    color: var(--text-1);
  }

  .chip-best {
    position: absolute;
    top: -7px;
    right: 6px;
    font-size: 0.7rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    line-height: 1;
    padding: 3px 5px;
    border-radius: 999px;
    background: #34d399;
    color: #052e1c;
  }

  .chip-more .chip-name {
    color: var(--text-2);
    font-weight: 600;
  }
  .chip-more .chip-size {
    font-size: 0.7rem;
  }

  .compare-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    margin: 8px 0 10px;
    padding: 7px 10px;
    background: none;
    border: 1px dashed var(--stroke-strong, rgba(255, 255, 255, 0.16));
    border-radius: 9px;
    color: var(--text-2);
    font: inherit;
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    transition:
      color 150ms ease,
      border-color 150ms ease,
      background-color 150ms ease;
  }
  .compare-button:hover:not(:disabled) {
    color: var(--text-1);
    border-color: var(--main-theme-color);
    background: var(--accent-soft);
  }
  .compare-button:disabled {
    cursor: default;
    opacity: 0.8;
  }
  .compare-icon {
    width: 12px;
    height: 12px;
    fill: var(--main-theme-color);
  }

  /* ——— Fit to size ——— */
  .fit-row {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 4px var(--horizontal-padding) 12px;
  }
  .fit-label {
    color: var(--text-2);
  }
  .fit-input {
    width: 62px;
    background: var(--field-bg, rgba(255, 255, 255, 0.06));
    color: var(--text-1);
    font: inherit;
    font-variant-numeric: tabular-nums;
    text-align: right;
    border: 1px solid var(--stroke, rgba(255, 255, 255, 0.08));
    border-radius: 7px;
    padding: 4px 7px;
    -moz-appearance: textfield;
    appearance: textfield;
  }
  .fit-input:focus {
    outline: none;
    border-color: var(--main-theme-color);
  }
  .fit-input::-webkit-outer-spin-button,
  .fit-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  .fit-unit {
    color: var(--text-2);
  }
  .fit-button {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 44px;
    padding: 5px 12px;
    background: var(--field-bg, rgba(255, 255, 255, 0.06));
    border: 1px solid var(--stroke-strong, rgba(255, 255, 255, 0.16));
    border-radius: 999px;
    color: var(--text-1);
    font: inherit;
    font-weight: 700;
    cursor: pointer;
    transition:
      background-color 150ms ease,
      border-color 150ms ease;
  }
  .fit-button:hover:not(:disabled) {
    background: var(--accent-soft);
    border-color: var(--main-theme-color);
  }
  .fit-button:disabled {
    cursor: default;
    opacity: 0.7;
  }

  .mini-spinner {
    width: 11px;
    height: 11px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .no-opts {
    padding: 12px var(--horizontal-padding);
    color: var(--text-2);
    margin: 0;
  }

  /* Results footer: pinned under the scroller, visually part of the card. */
  .options-results {
    flex: none;
    border-top: 1px solid var(--stroke);
    background: var(--surface-raised);
  }

  @media (max-width: 760px) {
    .options-scroller {
      /* Grow to fill the fixed-height mobile card (set on .options in the page)
         so both sides match height and the panel scrolls internally rather than
         letting tall content clip behind the results footer. */
      flex: 1 1 auto;
    }

    .options-title {
      padding: 9px var(--horizontal-padding) 7px;
      font-size: 0.85rem;
    }

    .title-and-buttons {
      gap: 0.2rem;
    }

    .title-button svg {
      --size: 16px;
    }

    .chips {
      grid-template-columns: repeat(2, 1fr);
      gap: 5px;
    }

    .chip {
      padding: 5px 7px 4px;
    }

    .chip-name {
      font-size: 0.95rem;
    }

    .compare-button {
      margin: 6px 0 8px;
      padding: 6px 8px;
    }
  }
</style>
