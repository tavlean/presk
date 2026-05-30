<script lang="ts">
  import {
    compressFile,
    getDefaultOptions,
    OUTPUT_FORMATS,
    IDENTITY,
    type CompressOutcome,
    type SideFormat,
  } from '$lib/compress';
  import { registerPrototypeServiceWorker } from '$lib/service-worker-registration';
  import Output from '$lib/editor/output/Output.svelte';
  import OptionsPanel from '$lib/editor/OptionsPanel.svelte';
  import { fileDrop } from '$lib/editor/file-drop';
  import {
    defaultPreprocessorState,
    defaultProcessorState,
  } from 'client/lazy-app/feature-meta';
  import type { ProcessorState } from 'client/lazy-app/feature-meta';
  import '$lib/editor/theme.css';

  // Squoosh compares two independently-configured "sides". Each side picks its
  // own output (Original/identity or any encoder), its own encoder options, and
  // its own resize/quantize processing. Rotation is a source-level preprocess,
  // so it is shared across both sides.
  interface SideState {
    format: SideFormat;
    optionsByFormat: Record<string, Record<string, unknown>>;
    processorState: ProcessorState;
  }

  type SavedSide = {
    format?: string;
    optionsByFormat?: Record<string, Record<string, unknown>>;
  };

  const STORAGE_KEY = 'sqush:settings:v2';
  const sideSaveKey = (i: 0 | 1) =>
    `sqush:side-settings:${i === 0 ? 'left' : 'right'}`;

  function isValidFormat(f: unknown): f is SideFormat {
    return f === IDENTITY || OUTPUT_FORMATS.some((o) => o.id === f);
  }

  function readSaved(): { sides?: SavedSide[] } {
    if (typeof localStorage === 'undefined') return {};
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') ?? {};
    } catch {
      return {};
    }
  }

  function buildSide(saved: SavedSide | undefined, fallback: SideFormat): SideState {
    const optionsByFormat = Object.fromEntries(
      OUTPUT_FORMATS.map((f) => {
        const defaults = getDefaultOptions(f.id);
        const savedForFormat = saved?.optionsByFormat?.[f.id];
        return [
          f.id,
          savedForFormat ? { ...defaults, ...savedForFormat } : defaults,
        ];
      }),
    );
    return {
      format: isValidFormat(saved?.format) ? (saved!.format as SideFormat) : fallback,
      optionsByFormat,
      processorState: structuredClone(defaultProcessorState),
    };
  }

  const saved = readSaved();
  // Defaults match Squoosh: left = Original, right = WebP.
  let sides = $state<[SideState, SideState]>([
    buildSide(saved.sides?.[0], IDENTITY),
    buildSide(saved.sides?.[1], 'webP'),
  ]);

  // Shared, per-image state (reset on each new file).
  let preprocessorState = $state(structuredClone(defaultPreprocessorState));
  let naturalWidth = $state(0);
  let naturalHeight = $state(0);
  let dimsSeeded = false;

  let file = $state<File | null>(null);
  let dragging = $state(false);

  let results = $state<[CompressOutcome | null, CompressOutcome | null]>([
    null,
    null,
  ]);
  let statuses = $state<('idle' | 'working' | 'done' | 'error')[]>([
    'idle',
    'idle',
  ]);
  let errors = $state<string[]>(['', '']);
  // Non-reactive: revoking the previous URL must not re-trigger the encode.
  const lastUrls: (string | null)[] = [null, null];

  let canImport = $state<[boolean, boolean]>([
    typeof localStorage !== 'undefined' &&
      !!localStorage.getItem(sideSaveKey(0)),
    typeof localStorage !== 'undefined' &&
      !!localStorage.getItem(sideSaveKey(1)),
  ]);

  $effect(() => {
    registerPrototypeServiceWorker().catch((error: unknown) => {
      console.error('Service worker registration failed', error);
    });
  });

  // One debounced encode effect per side. Re-runs when that side's format /
  // options / processing change, or when the file or shared rotation changes.
  for (const index of [0, 1] as const) {
    $effect(() => {
      const current = file;
      const side = sides[index];
      const request = {
        format: side.format,
        options: $state.snapshot(side.optionsByFormat[side.format] ?? {}),
        processorState: $state.snapshot(side.processorState),
        preprocessorState: $state.snapshot(preprocessorState),
      };
      if (!current) {
        statuses[index] = 'idle';
        return;
      }

      const controller = new AbortController();
      const timer = setTimeout(() => {
        statuses[index] = 'working';
        errors[index] = '';
        compressFile(current, request, controller.signal)
          .then((outcome) => {
            if (controller.signal.aborted) {
              URL.revokeObjectURL(outcome.outputUrl);
              return;
            }
            if (lastUrls[index]) URL.revokeObjectURL(lastUrls[index]!);
            lastUrls[index] = outcome.outputUrl;
            results[index] = outcome;
            statuses[index] = 'done';
          })
          .catch((error: unknown) => {
            if (controller.signal.aborted) return;
            errors[index] =
              error instanceof Error ? error.message : String(error);
            statuses[index] = 'error';
          });
      }, 200);

      return () => {
        clearTimeout(timer);
        controller.abort();
      };
    });
  }

  // Seed natural dimensions + each side's resize inputs from the first result.
  $effect(() => {
    const r = results[0] ?? results[1];
    if (!r || dimsSeeded) return;
    dimsSeeded = true;
    naturalWidth = r.sourceImageData.width;
    naturalHeight = r.sourceImageData.height;
    for (const s of sides) {
      s.processorState.resize.width = r.sourceImageData.width;
      s.processorState.resize.height = r.sourceImageData.height;
    }
  });

  // Persist each side's encoder settings (processing is per-image, not saved).
  $effect(() => {
    if (typeof localStorage === 'undefined') return;
    const payload = JSON.stringify({
      sides: sides.map((s) => ({
        format: s.format,
        optionsByFormat: $state.snapshot(s.optionsByFormat),
      })),
    });
    try {
      localStorage.setItem(STORAGE_KEY, payload);
    } catch {
      // Storage may be unavailable (private mode); ignore.
    }
  });

  function pickFiles(list: FileList | null | undefined) {
    const next = list?.[0];
    if (next && next.type.startsWith('image/')) {
      file = next;
      results = [null, null];
      for (const s of sides) {
        s.processorState = structuredClone(defaultProcessorState);
      }
      preprocessorState = structuredClone(defaultPreprocessorState);
      dimsSeeded = false;
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

  function rotate() {
    preprocessorState.rotate.rotate = ((preprocessorState.rotate.rotate + 90) %
      360) as 0 | 90 | 180 | 270;
  }

  function setFormat(index: 0 | 1, format: SideFormat) {
    sides[index].format = format;
  }

  function copyToOther(from: 0 | 1) {
    const to: 0 | 1 = from === 0 ? 1 : 0;
    sides[to].format = sides[from].format;
    sides[to].optionsByFormat = structuredClone(
      $state.snapshot(sides[from].optionsByFormat),
    );
    sides[to].processorState = structuredClone(
      $state.snapshot(sides[from].processorState),
    );
  }

  function saveSide(index: 0 | 1) {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(
      sideSaveKey(index),
      JSON.stringify({
        format: sides[index].format,
        optionsByFormat: $state.snapshot(sides[index].optionsByFormat),
        processorState: $state.snapshot(sides[index].processorState),
      }),
    );
    canImport[index] = true;
  }
  function importSide(index: 0 | 1) {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(sideSaveKey(index));
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (isValidFormat(data.format)) sides[index].format = data.format;
      if (data.optionsByFormat) {
        sides[index].optionsByFormat = {
          ...sides[index].optionsByFormat,
          ...data.optionsByFormat,
        };
      }
      if (data.processorState) sides[index].processorState = data.processorState;
    } catch {
      // Corrupt saved blob; ignore.
    }
  }

  function downloadName(index: 0 | 1): string {
    if (!file) return 'image';
    const side = sides[index];
    if (side.format === IDENTITY) return file.name;
    const ext = OUTPUT_FORMATS.find((f) => f.id === side.format)?.ext ?? 'bin';
    return file.name.replace(/\.[^.]+$/, '') + '.' + ext;
  }

  const firstError = $derived(errors.find((e) => e) ?? '');
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
  <div
    class="compress sqush-editor"
    {@attach fileDrop((files) => pickFiles(files))}
  >
    <Output
      leftImage={results[0]?.outputImageData}
      rightImage={results[1]?.outputImageData}
      onRotate={rotate}
    />

    {#if firstError}
      <p class="status-pill error">{firstError}</p>
    {/if}

    <button class="back" onclick={() => (file = null)} title="Back" aria-label="Back">
      <svg viewBox="0 0 61 53.3">
        <title>Back</title>
        <path
          class="back-blob"
          d="M0 25.6c-.5-7.1 4.1-14.5 10-19.1S23.4.1 32.2 0c8.8 0 19 1.6 24.4 8s5.6 17.8 1.7 27a29.7 29.7 0 01-20.5 18c-8.4 1.5-17.3-2.6-24.5-8S.5 32.6.1 25.6z"
        />
        <path
          class="back-x"
          d="M41.6 17.1l-2-2.1-8.3 8.2-8.2-8.2-2 2 8.2 8.3-8.3 8.2 2.1 2 8.2-8.1 8.3 8.2 2-2-8.2-8.3z"
        />
      </svg>
    </button>

    <aside class="options options-1">
      <OptionsPanel
        side="left"
        format={sides[0].format}
        options={sides[0].optionsByFormat[sides[0].format] ?? {}}
        processorState={sides[0].processorState}
        {naturalWidth}
        {naturalHeight}
        result={results[0]}
        working={statuses[0] === 'working'}
        canImport={canImport[0]}
        downloadName={downloadName(0)}
        onFormatChange={(f) => setFormat(0, f)}
        onCopy={() => copyToOther(0)}
        onSave={() => saveSide(0)}
        onImport={() => importSide(0)}
      />
    </aside>

    <aside class="options options-2">
      <OptionsPanel
        side="right"
        format={sides[1].format}
        options={sides[1].optionsByFormat[sides[1].format] ?? {}}
        processorState={sides[1].processorState}
        {naturalWidth}
        {naturalHeight}
        result={results[1]}
        working={statuses[1] === 'working'}
        canImport={canImport[1]}
        downloadName={downloadName(1)}
        onFormatChange={(f) => setFormat(1, f)}
        onCopy={() => copyToOther(1)}
        onSave={() => saveSide(1)}
        onImport={() => importSide(1)}
      />
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

  /* Drag-to-replace feedback, ported from Squoosh's .drop-valid overlay. The
     `drop-valid` class is toggled by the fileDrop attachment while an image is
     dragged over the editor. */
  .compress::after {
    content: '';
    position: absolute;
    inset: 10px;
    border: 2px dashed var(--pink);
    background-color: rgba(0, 0, 0, 0.1);
    border-radius: 10px;
    opacity: 0;
    transform: scale(0.95);
    transition:
      opacity 200ms ease-in,
      transform 200ms ease-in;
    pointer-events: none;
    z-index: 20;
  }
  .compress:global(.drop-valid)::after {
    opacity: 1;
    transform: scale(1);
    transition-timing-function: ease-out;
  }

  .status-pill {
    position: absolute;
    top: 14px;
    left: 50%;
    transform: translateX(-50%);
    margin: 0;
    padding: 6px 14px;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.7);
    color: #fff;
    z-index: 8;
    pointer-events: none;
    max-width: 70vw;
  }
  .status-pill.error {
    color: #ff8a8a;
    font-weight: 600;
  }

  /* Back button (pink blob X), ported from Compress/style.css */
  .back {
    position: absolute;
    top: 0;
    left: 0;
    margin: 14px;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    z-index: 10;
  }
  .back svg {
    width: 58px;
    overflow: visible;
    display: block;
  }
  .back-blob {
    fill: var(--hot-pink);
    opacity: 0.77;
  }
  .back-x {
    fill: var(--white);
  }

  /* Bottom-anchored option cards, ported from Compress/style.css.
     Each side is a content-height card in a bottom corner; the canvas shows
     above and between them. */
  .options {
    position: absolute;
    bottom: 0;
    width: 300px;
    max-height: calc(100% - 64px);
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    color: #fff;
    font-size: 1.2rem;
    z-index: 5;
  }
  .options-1 {
    left: 0;
  }
  .options-2 {
    right: 0;
  }

  @media (max-width: 760px) {
    .options {
      width: 44vw;
    }
  }
</style>
