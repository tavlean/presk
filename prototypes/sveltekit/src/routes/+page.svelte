<script lang="ts">
  import {
    compressFile,
    getDefaultOptions,
    OUTPUT_FORMATS,
    type CompressOutcome,
    type OutputFormat,
  } from '$lib/compress';
  import { registerPrototypeServiceWorker } from '$lib/service-worker-registration';
  import Output from '$lib/editor/output/Output.svelte';
  import WebpOptions from '$lib/editor/options/WebpOptions.svelte';
  import AvifOptions from '$lib/editor/options/AvifOptions.svelte';
  import JxlOptions from '$lib/editor/options/JxlOptions.svelte';
  import MozjpegOptions from '$lib/editor/options/MozjpegOptions.svelte';
  import OxipngOptions from '$lib/editor/options/OxipngOptions.svelte';
  import Range from '$lib/editor/options/Range.svelte';
  import Select from '$lib/editor/options/Select.svelte';
  import Toggle from '$lib/editor/options/Toggle.svelte';
  import type { EncodeOptions as WebpEncodeOptions } from 'features/encoders/webP/shared/meta';
  import type { EncodeOptions as AvifEncodeOptions } from 'features/encoders/avif/shared/meta';
  import type { EncodeOptions as JxlEncodeOptions } from 'features/encoders/jxl/shared/meta';
  import type { EncodeOptions as MozjpegEncodeOptions } from 'features/encoders/mozJPEG/shared/meta';
  import type { EncodeOptions as OxipngEncodeOptions } from 'features/encoders/oxiPNG/shared/meta';
  import '$lib/editor/theme.css';

  let file = $state<File | null>(null);
  let dragging = $state(false);
  let format = $state<OutputFormat>('webP');
  // One option object per format, seeded from each encoder's defaults. Panels
  // mutate these proxies in place; the encode effect reads them via a snapshot.
  let optionsByFormat = $state<Record<string, Record<string, unknown>>>(
    Object.fromEntries(OUTPUT_FORMATS.map((f) => [f.id, getDefaultOptions(f.id)])),
  );
  let resizeOn = $state(false);
  let resizeWidth = $state(1600);
  let resizeHeight = $state(1600);

  let result = $state<CompressOutcome | null>(null);
  let status = $state<'idle' | 'working' | 'done' | 'error'>('idle');
  let errorMessage = $state('');

  // Non-reactive holder so revoking the previous output URL does not re-trigger
  // the compression effect.
  let lastOutputUrl: string | null = null;

  $effect(() => {
    registerPrototypeServiceWorker().catch((error: unknown) => {
      console.error('Service worker registration failed', error);
    });
  });

  // Re-encode whenever the file or any setting changes. Debounced so dragging
  // the quality slider does not spawn an encode per pixel.
  $effect(() => {
    const current = file;
    // $state.snapshot deeply reads the option object, so editing any nested
    // option (quality, lossless, advanced…) re-triggers this effect.
    const request = {
      format,
      options: $state.snapshot(optionsByFormat[format]),
      resize: resizeOn
        ? { width: resizeWidth, height: resizeHeight }
        : undefined,
    };
    if (!current) {
      status = 'idle';
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      status = 'working';
      errorMessage = '';
      compressFile(current, request, controller.signal)
        .then((outcome) => {
          if (controller.signal.aborted) {
            URL.revokeObjectURL(outcome.outputUrl);
            return;
          }
          if (lastOutputUrl) URL.revokeObjectURL(lastOutputUrl);
          lastOutputUrl = outcome.outputUrl;
          result = outcome;
          status = 'done';
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          errorMessage = error instanceof Error ? error.message : String(error);
          status = 'error';
        });
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  });

  function pickFiles(list: FileList | null | undefined) {
    const next = list?.[0];
    if (next && next.type.startsWith('image/')) {
      file = next;
      result = null;
    }
  }

  function onInput(event: Event) {
    pickFiles((event.currentTarget as HTMLInputElement).files);
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    dragging = false;
    pickFiles(event.dataTransfer?.files);
  }

  const activeExt = $derived(
    OUTPUT_FORMATS.find((f) => f.id === format)?.ext ?? 'bin',
  );
  const downloadName = $derived(
    file ? file.name.replace(/\.[^.]+$/, '') + '.' + activeExt : 'image',
  );

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
</script>

<svelte:head>
  <title>Sqush — Compress an image</title>
</svelte:head>

{#if !file}
  <main class="intro">
    <header class="intro-head">
      <h1>Sqush</h1>
      <p>Local-first image compression. Nothing leaves your device.</p>
    </header>
    <label
      class="dropzone"
      class:dragging
      ondragover={(e) => {
        e.preventDefault();
        dragging = true;
      }}
      ondragleave={() => (dragging = false)}
      ondrop={onDrop}
    >
      <input type="file" accept="image/*" onchange={onInput} />
      <strong>Drop an image here</strong>
      <span>or click to choose a file</span>
    </label>
    <p class="intro-diag"><a href="/diagnostics">Pipeline diagnostics →</a></p>
  </main>
{:else}
  <div class="compress sqush-editor">
    <Output source={result?.sourceImageData} output={result?.outputImageData} />

    {#if status === 'working'}
      <p class="status-pill">Compressing…</p>
    {:else if status === 'error'}
      <p class="status-pill error">{errorMessage}</p>
    {/if}

    <header class="topbar">
      <span class="wordmark">Sqush</span>
      <div class="topbar-actions">
        <a class="topbar-link" href="/diagnostics">Diagnostics</a>
        <button
          type="button"
          class="topbar-button"
          onclick={() => (file = null)}
        >
          Open image
        </button>
      </div>
    </header>

    <aside class="options options-1">
      <div class="options-title">Original</div>
      <div class="options-scroller">
        <div class="info-row">
          <span>File</span><strong title={file.name}>{file.name}</strong>
        </div>
        <div class="info-row">
          <span>Size</span><strong>{formatBytes(file.size)}</strong>
        </div>
        {#if result}
          <div class="info-row">
            <span>Dimensions</span>
            <strong
              >{result.sourceImageData.width} × {result.sourceImageData
                .height}</strong
            >
          </div>
        {/if}
      </div>
    </aside>

    <aside class="options options-2">
      <div class="options-title">
        <Select
          large
          value={format}
          onchange={(e) =>
            (format = (e.currentTarget as HTMLSelectElement)
              .value as OutputFormat)}
        >
          {#each OUTPUT_FORMATS as option (option.id)}
            <option value={option.id}>{option.label}</option>
          {/each}
        </Select>
      </div>
      <div class="options-scroller">
        {#if format === 'webP'}
          <WebpOptions
            options={optionsByFormat[format] as unknown as WebpEncodeOptions}
          />
        {:else if format === 'avif'}
          <AvifOptions
            options={optionsByFormat[format] as unknown as AvifEncodeOptions}
          />
        {:else if format === 'jxl'}
          <JxlOptions
            options={optionsByFormat[format] as unknown as JxlEncodeOptions}
          />
        {:else if format === 'mozJPEG'}
          <MozjpegOptions
            options={optionsByFormat[
              format
            ] as unknown as MozjpegEncodeOptions}
          />
        {:else if format === 'oxiPNG'}
          <OxipngOptions
            options={optionsByFormat[
              format
            ] as unknown as OxipngEncodeOptions}
          />
        {:else}
          <div class="options-section">
            {#if typeof optionsByFormat[format].quality === 'number'}
              <div class="option-one-cell">
                <Range
                  min={0}
                  max={100}
                  step={0.1}
                  value={Number(optionsByFormat[format].quality)}
                  oninput={(v) => (optionsByFormat[format].quality = v)}
                  >Quality:</Range
                >
              </div>
            {:else}
              <p class="no-opts">{format} has no adjustable options.</p>
            {/if}
          </div>
        {/if}

        <label class="option-toggle section-enabler">
          Resize
          <Toggle bind:checked={resizeOn} />
        </label>
        {#if resizeOn}
          <div class="option-text-first">
            Width
            <input class="num" type="number" min="1" bind:value={resizeWidth} />
          </div>
          <div class="option-text-first">
            Height
            <input
              class="num"
              type="number"
              min="1"
              bind:value={resizeHeight}
            />
          </div>
        {/if}
      </div>

      <div class="options-results">
        <div class="result-line">
          <span class="result-size"
            >{result ? formatBytes(result.outputSize) : '—'}</span
          >
          {#if result}
            <span
              class="delta"
              class:good={result.percentChange < 0}
              class:bad={result.percentChange > 0}
            >
              {result.percentChange > 0 ? '+' : ''}{result.percentChange}%
            </span>
          {/if}
        </div>
        <a
          class="download"
          class:disabled={!result || status !== 'done'}
          href={result?.outputUrl ?? '#'}
          download={downloadName}
        >
          Download {activeExt.toUpperCase()}
        </a>
      </div>
    </aside>
  </div>
{/if}

<style>
  :global(html),
  :global(body) {
    margin: 0;
    height: 100%;
  }
  :global(body) {
    background: #1a1a1a;
    color: #fff;
    font-family:
      Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
      'Segoe UI', sans-serif;
  }

  /* Intro / drop screen */
  .intro {
    max-width: 760px;
    margin: 0 auto;
    padding: 64px 24px;
  }
  .intro-head h1 {
    margin: 0 0 4px;
    font-size: 2.4rem;
    letter-spacing: -0.02em;
  }
  .intro-head p {
    margin: 0 0 28px;
    color: #bcbcbc;
  }
  .dropzone {
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: center;
    justify-content: center;
    min-height: 340px;
    border: 2px dashed #444;
    border-radius: 14px;
    background: #222;
    cursor: pointer;
    text-align: center;
  }
  .dropzone.dragging {
    border-color: #5fb4e4;
    background: #20303a;
  }
  .dropzone strong {
    font-size: 1.2rem;
  }
  .dropzone span {
    color: #bcbcbc;
  }
  .dropzone input {
    display: none;
  }
  .intro-diag {
    margin-top: 16px;
  }
  .intro-diag a {
    color: #5fb4e4;
  }

  /* Full-bleed editor */
  .compress {
    position: relative;
    width: 100vw;
    height: 100dvh;
    overflow: hidden;
    background: #1a1a1a;
  }

  .status-pill {
    position: absolute;
    top: 60px;
    left: 50%;
    transform: translateX(-50%);
    margin: 0;
    padding: 6px 14px;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.7);
    color: #fff;
    z-index: 8;
    pointer-events: none;
  }
  .status-pill.error {
    color: #ff8a8a;
    font-weight: 600;
  }

  .topbar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 14px;
    box-sizing: border-box;
    z-index: 10;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(6px);
  }
  .wordmark {
    font-weight: 800;
    font-size: 1.2rem;
    letter-spacing: -0.01em;
  }
  .topbar-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .topbar-link {
    color: #bcbcbc;
    text-decoration: none;
    font-size: 0.9rem;
  }
  .topbar-link:hover {
    color: #fff;
  }
  .topbar-button {
    background: rgba(255, 255, 255, 0.12);
    color: #fff;
    border: none;
    border-radius: 6px;
    padding: 7px 12px;
    cursor: pointer;
    font: inherit;
    font-size: 0.9rem;
  }
  .topbar-button:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  /* Option rails */
  .options {
    position: absolute;
    top: 48px;
    bottom: 0;
    width: 320px;
    display: flex;
    flex-direction: column;
    color: #fff;
    font-size: 1.2rem;
    z-index: 5;
  }
  .options-1 {
    left: 0;
    --main-theme-color: var(--pink);
    --header-text-color: var(--white);
  }
  .options-2 {
    right: 0;
    --main-theme-color: var(--blue);
    --header-text-color: var(--dark-text);
  }
  .options-title {
    background: var(--main-theme-color);
    color: var(--header-text-color);
    padding: 10px 12px;
    font-weight: bold;
    font-size: 1.4rem;
    border-bottom: 1px solid var(--off-black);
  }
  .options-scroller {
    flex: 1;
    overflow-y: auto;
    background: var(--off-black);
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 11px 15px;
    border-bottom: 1px solid #ffffff14;
  }
  .info-row span {
    color: #bcbcbc;
  }
  .info-row strong {
    max-width: 190px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .num {
    width: 100%;
    background: var(--black);
    color: #fff;
    border: none;
    border-radius: 4px;
    padding: 7px 10px;
    font: inherit;
    box-sizing: border-box;
  }

  .options-results {
    background: var(--off-black);
    border-top: 1px solid #00000066;
    padding: 14px 15px;
    display: grid;
    gap: 10px;
  }
  .result-line {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }
  .result-size {
    font-weight: 700;
    font-size: 1.4rem;
  }
  .delta {
    font-weight: 700;
  }
  .delta.good {
    color: #7cfc9b;
  }
  .delta.bad {
    color: #ff8a8a;
  }
  .download {
    display: block;
    text-align: center;
    padding: 12px;
    border-radius: 6px;
    background: var(--main-theme-color);
    color: var(--header-text-color);
    font-weight: 700;
    text-decoration: none;
  }
  .download.disabled {
    background: #444;
    color: #999;
    pointer-events: none;
  }

  @media (max-width: 800px) {
    .options {
      width: 260px;
    }
  }
</style>
