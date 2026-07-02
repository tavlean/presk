<script lang="ts">
  import { dev } from '$app/environment';
  import { onMount, untrack } from 'svelte';
  import { fileDrop } from '$lib/editor/file-drop';
  import { EditorSession } from '$lib/editor/editor-session.svelte';
  import type { CompressOutcome, SideFormat } from '$lib/compress';
  import SvelteKitWorkerBridge from '$lib/sveltekit-worker-bridge';
  import {
    bulkStore,
    deepEqual,
    normalizeProcessorStateForBulkDiff,
  } from '$lib/bulk/store.svelte';
  import Snackbar from '$lib/editor/Snackbar.svelte';
  import Home from '$lib/bulk/Home.svelte';
  import {
    getEffectiveSettings,
    type BulkImageOverrides,
    type BulkImageSettings,
    type ImageJob,
  } from 'client/lazy-app/bulk';
  import {
    decodeImage,
    decodeSourceImage,
    preprocessImage,
    processImage,
    type ImagePipelineWorkerBridge,
  } from 'client/lazy-app/image-pipeline';
  import type {
    EncoderState,
    EncoderType,
    ProcessorState,
  } from 'client/lazy-app/feature-meta';
  import {
    defaultPreprocessorState,
    defaultProcessorState,
  } from 'client/lazy-app/feature-meta';
  import '$lib/editor/theme.css';

  const focusSession = new EditorSession();

  let fileInput = $state<HTMLInputElement>();
  let seeding = true;
  let pendingSeed = $state<{ jobId: string; loadId: number } | null>(null);
  let seedSerial = 0;
  let focusPreviewBridge: SvelteKitWorkerBridge | null = null;
  let focusPreviewController: AbortController | null = null;

  onMount(() => {
    return () => {
      focusPreviewController?.abort();
      focusPreviewBridge?.dispose();
      focusSession.dispose();
      bulkStore.dispose();
    };
  });

  $effect(() => focusSession.seedResizeDimensions());

  $effect(() => {
    const selectedId = bulkStore.selectedId;
    if (!selectedId) {
      seeding = true;
      pendingSeed = null;
      focusSession.clearFile();
      return;
    }

    untrack(() => seedFocusFromSelected());
  });

  $effect(() => {
    const seed = pendingSeed;
    const selectedId = bulkStore.selectedId;
    const loadId = focusSession.loadId;
    const naturalWidth = focusSession.naturalWidth;

    if (
      !seed ||
      seed.jobId !== selectedId ||
      seed.loadId !== loadId ||
      naturalWidth <= 0
    ) {
      return;
    }

    untrack(() => finishFocusSeed(seed));
  });

  $effect(() => {
    bulkStore.session.globalSettings;
    untrack(() => bulkStore.refreshGlobalSideFromSession());
  });

  $effect(() => {
    $state.snapshot(bulkStore.globalSide);
    bulkStore.queueGlobalSideApply(() => seedFocusFromSelected());
  });

  $effect(() => {
    const side = focusSession.sides[1];
    const snapshot = {
      format: side.format,
      options: $state.snapshot(side.optionsByFormat[side.format] ?? {}),
      processorState: $state.snapshot(side.processorState) as ProcessorState,
    };

    if (seeding || !bulkStore.selectedId || !bulkStore.selectedJob) return;

    const override = buildOverrideFromFocus(snapshot);
    const current = bulkStore.selectedJob.overrides ?? {};

    if (isEmptyOverride(override)) {
      if (!isEmptyOverride(current)) bulkStore.queueSelectedOverridesApply({});
      return;
    }

    if (!deepEqual(override, current)) {
      bulkStore.queueSelectedOverridesApply(override);
    }
  });

  function seedFocusFromSelected(): void {
    const job = bulkStore.selectedJob;
    if (!job) return;

    seeding = true;
    pendingSeed = null;
    focusPreviewController?.abort();
    const seedId = ++seedSerial;

    const effective = effectiveSettingsForJob(job);
    if (
      effective.encoderState &&
      job.output?.settingsHash === bulkStore.settingsHashForJob(job)
    ) {
      void hydrateFocusFromBulkOutput(job, effective, seedId);
      return;
    }

    seedFocusThroughEditor(job);
  }

  function seedFocusThroughEditor(job: ImageJob): void {
    const transfer = new DataTransfer();
    transfer.items.add(job.sourceFile);
    // The production method currently requires a callback for the "first open"
    // route hook; the lab needs no route state, so this is intentionally inert.
    focusSession.pickFiles(transfer.files, () => {});
    pendingSeed = { jobId: job.id, loadId: focusSession.loadId };
  }

  function finishFocusSeed(seed: { jobId: string; loadId: number }): void {
    const job = bulkStore.selectedJob;
    if (
      !job ||
      job.id !== seed.jobId ||
      bulkStore.selectedId !== seed.jobId ||
      focusSession.loadId !== seed.loadId ||
      focusSession.naturalWidth <= 0
    ) {
      return;
    }

    focusSession.seedResizeDimensions();

    const effective = effectiveSettingsForJob(job);
    const encoderState = effective.encoderState;
    if (encoderState) {
      focusSession.setFormat(1, encoderState.type as SideFormat);
      focusSession.sides[1].optionsByFormat[encoderState.type] =
        structuredClone(encoderState.options as Record<string, unknown>);
    }
    focusSession.sides[1].processorState = structuredClone(
      effective.processorState,
    );
    focusSession.history.clear();
    reconcileSeededOverrides(job);

    pendingSeed = null;
    seeding = false;
  }

  function reconcileSeededOverrides(job: ImageJob): void {
    const seededOverride = buildOverrideFromFocus(snapshotFocusSide());
    const normalizedCurrent = normalizeExistingOverrides(job, job.overrides);
    const current = job.overrides ?? {};

    if (
      isEmptyOverride(seededOverride) &&
      isEmptyOverride(normalizedCurrent) &&
      !isEmptyOverride(current)
    ) {
      bulkStore.clearAnchorOverrides();
    } else if (
      !deepEqual(seededOverride, current) &&
      deepEqual(seededOverride, normalizedCurrent)
    ) {
      bulkStore.applyAnchorOverrides(seededOverride);
    }
  }

  function focusPreviewWorkerBridge(): ImagePipelineWorkerBridge {
    focusPreviewBridge ??= new SvelteKitWorkerBridge();
    return focusPreviewBridge as unknown as ImagePipelineWorkerBridge;
  }

  async function hydrateFocusFromBulkOutput(
    job: ImageJob,
    effective: BulkImageSettings,
    seedId: number,
  ): Promise<void> {
    const output = job.output;
    const encoderState = effective.encoderState;
    if (!output || !encoderState) {
      seedFocusThroughEditor(job);
      return;
    }

    const controller = new AbortController();
    focusPreviewController = controller;
    const signal = controller.signal;

    try {
      const bridge = focusPreviewWorkerBridge();
      const decodedSource = await decodeSourceImage(
        signal,
        job.sourceFile,
        bridge,
      );
      const preprocessed = await preprocessImage(
        signal,
        decodedSource.decoded,
        defaultPreprocessorState,
        bridge,
      );
      const processed = await processImage(
        signal,
        { ...decodedSource, preprocessed },
        effective.processorState,
        bridge,
      );
      const outputImageData = await decodeImage(signal, output.file, bridge);

      if (
        signal.aborted ||
        seedId !== seedSerial ||
        bulkStore.selectedId !== job.id
      ) {
        return;
      }

      applyHydratedFocus(job, effective, {
        sourceImageData: preprocessed,
        processedImageData: processed,
        outputImageData,
      });
    } catch (error) {
      if (signal.aborted) return;
      if (seedId === seedSerial && bulkStore.selectedId === job.id) {
        seedFocusThroughEditor(job);
      }
    } finally {
      if (focusPreviewController === controller) {
        focusPreviewController = null;
      }
    }
  }

  function applyHydratedFocus(
    job: ImageJob,
    effective: BulkImageSettings,
    images: {
      sourceImageData: ImageData;
      processedImageData: ImageData;
      outputImageData: ImageData;
    },
  ): void {
    const output = job.output;
    const encoderState = effective.encoderState;
    if (!output || !encoderState) {
      seedFocusThroughEditor(job);
      return;
    }

    focusSession.clearFile();
    focusSession.preprocessorState = structuredClone(defaultPreprocessorState);
    focusSession.sides[0].format = 'identity';
    focusSession.sides[0].processorState = structuredClone(
      defaultProcessorState,
    );
    focusSession.sides[1].format = encoderState.type as SideFormat;
    focusSession.sides[1].optionsByFormat[encoderState.type] = structuredClone(
      encoderState.options as Record<string, unknown>,
    );
    focusSession.sides[1].processorState = structuredClone(
      effective.processorState,
    );

    const loadId = focusSession.loadId + 1;
    const preprocessedWidth = images.sourceImageData.width;
    const preprocessedHeight = images.sourceImageData.height;
    const leftSig = focusEncodeSignature(
      'identity',
      {},
      focusSession.sides[0].processorState,
      focusSession.preprocessorState,
      preprocessedWidth,
      preprocessedHeight,
    );
    const rightSig = focusEncodeSignature(
      focusSession.sides[1].format,
      focusSession.sides[1].optionsByFormat[focusSession.sides[1].format] ?? {},
      focusSession.sides[1].processorState,
      focusSession.preprocessorState,
      preprocessedWidth,
      preprocessedHeight,
    );
    const leftResizeSig = focusResizeSignature(
      focusSession.sides[0].processorState,
      preprocessedWidth,
      preprocessedHeight,
    );
    const rightResizeSig = focusResizeSignature(
      focusSession.sides[1].processorState,
      preprocessedWidth,
      preprocessedHeight,
    );

    const leftOutcome: CompressOutcome = {
      outputFile: job.sourceFile,
      outputUrl: '#',
      outputSize: job.sourceFile.size,
      originalSize: job.sourceFile.size,
      percentChange: 0,
      sourceImageData: images.sourceImageData,
      outputImageData: images.sourceImageData,
      isOriginal: true,
      preprocessedWidth,
      preprocessedHeight,
    };
    const rightOutcome: CompressOutcome = {
      outputFile: output.file,
      outputUrl: output.downloadUrl,
      outputSize: output.size,
      originalSize: job.originalSize,
      percentChange: Math.round(output.percentChange * 10) / 10,
      sourceImageData: images.processedImageData,
      outputImageData: images.outputImageData,
      isOriginal: false,
      preprocessedWidth,
      preprocessedHeight,
    };

    focusSession.file = job.sourceFile;
    focusSession.loadId = loadId;
    seedHydratedRuntime(0, leftOutcome, leftSig, leftResizeSig, loadId);
    seedHydratedRuntime(1, rightOutcome, rightSig, rightResizeSig, loadId);
    focusSession.history.clear();
    reconcileSeededOverrides(job);
    pendingSeed = null;
    seeding = false;
  }

  function seedHydratedRuntime(
    index: 0 | 1,
    outcome: CompressOutcome,
    signature: string,
    resizeSignature: string,
    loadId: number,
  ): void {
    const runtime = focusSession.runtime[index];
    runtime.result = outcome;
    runtime.displayedSig = signature;
    runtime.encodedLoadId = loadId;
    runtime.lastResizeSig = resizeSignature;
    runtime.spinnerDelayPassed = false;
    runtime.error = '';
    runtime.status = 'done';
  }

  function focusEncodeSignature(
    format: SideFormat,
    options: Record<string, unknown>,
    processorState: ProcessorState,
    preprocessorState: typeof defaultPreprocessorState,
    preprocessedWidth: number,
    preprocessedHeight: number,
  ): string {
    return stableStringify({
      preprocessor: preprocessorState,
      recipe: focusSideRecipe(
        format,
        options,
        processorState,
        focusResizeIsReal(
          processorState,
          preprocessedWidth,
          preprocessedHeight,
        ),
      ),
    });
  }

  function focusSideRecipe(
    format: SideFormat,
    options: Record<string, unknown>,
    processorState: ProcessorState,
    resizeCounts: boolean,
  ): {
    format: SideFormat;
    options: Record<string, unknown>;
    quantize: ProcessorState['quantize'];
    resize: ProcessorState['resize'] | null;
  } {
    return {
      format,
      options: options ?? {},
      quantize: processorState.quantize,
      resize: resizeCounts ? processorState.resize : null,
    };
  }

  function focusResizeSignature(
    processorState: ProcessorState,
    preprocessedWidth: number,
    preprocessedHeight: number,
  ): string {
    return focusResizeIsReal(
      processorState,
      preprocessedWidth,
      preprocessedHeight,
    )
      ? stableStringify(processorState.resize)
      : 'off';
  }

  function focusResizeIsReal(
    processorState: ProcessorState,
    preprocessedWidth: number,
    preprocessedHeight: number,
  ): boolean {
    const resize = processorState.resize;
    return (
      resize.enabled &&
      preprocessedWidth > 0 &&
      preprocessedHeight > 0 &&
      (resize.width !== preprocessedWidth ||
        resize.height !== preprocessedHeight)
    );
  }

  function stableStringify(value: unknown): string {
    if (value === null || typeof value !== 'object')
      return JSON.stringify(value);
    if (Array.isArray(value))
      return '[' + value.map(stableStringify).join(',') + ']';

    const record = value as Record<string, unknown>;
    return (
      '{' +
      Object.keys(record)
        .sort()
        .map((key) => JSON.stringify(key) + ':' + stableStringify(record[key]))
        .join(',') +
      '}'
    );
  }

  function snapshotFocusSide(): {
    format: SideFormat;
    options: Record<string, unknown>;
    processorState: ProcessorState;
  } {
    const side = focusSession.sides[1];
    return {
      format: side.format,
      options: $state.snapshot(side.optionsByFormat[side.format] ?? {}),
      processorState: $state.snapshot(side.processorState) as ProcessorState,
    };
  }

  function buildOverrideFromFocus(snapshot: {
    format: SideFormat;
    options: Record<string, unknown>;
    processorState: ProcessorState;
  }): BulkImageOverrides {
    const job = bulkStore.selectedJob;
    return buildOverrideFromSettings(
      snapshot.format,
      snapshot.options,
      snapshot.processorState,
      job ? bulkStore.processingGlobalSettingsForJob(job) : undefined,
    );
  }

  function buildOverrideFromSettings(
    format: SideFormat,
    options: Record<string, unknown>,
    processorStateSnapshot: ProcessorState,
    globalSettings: BulkImageSettings = bulkStore.session.globalSettings,
  ): BulkImageOverrides {
    const override: BulkImageOverrides = {};
    const normalizedProcessorState = normalizeProcessorStateForBulkDiff(
      processorStateSnapshot,
    );
    const normalizedGlobalProcessorState = normalizeProcessorStateForBulkDiff(
      globalSettings.processorState,
    );

    if (
      format !== 'identity' &&
      (format !== globalSettings.encoderState?.type ||
        !deepEqual(options, globalSettings.encoderState?.options ?? {}))
    ) {
      override.encoderState = {
        type: format as EncoderType,
        options: structuredClone(options),
      } as EncoderState;
    }

    const processorState: BulkImageOverrides['processorState'] = {};
    for (const key of ['resize', 'quantize'] as const) {
      if (
        !deepEqual(
          normalizedProcessorState[key],
          normalizedGlobalProcessorState[key],
        )
      ) {
        processorState[key] = structuredClone(processorStateSnapshot[key]);
      }
    }

    if (Object.keys(processorState).length > 0) {
      override.processorState = processorState;
    }

    return override;
  }

  function normalizeExistingOverrides(
    job: ImageJob,
    overrides: BulkImageOverrides | undefined,
  ): BulkImageOverrides {
    const effective = getEffectiveSettings(
      bulkStore.processingGlobalSettingsForJob(job),
      overrides,
    );
    const encoderState = effective.encoderState;
    return buildOverrideFromSettings(
      (encoderState?.type ?? 'identity') as SideFormat,
      structuredClone((encoderState?.options ?? {}) as Record<string, unknown>),
      effective.processorState,
      bulkStore.processingGlobalSettingsForJob(job),
    );
  }

  function effectiveSettingsForJob(job: ImageJob): BulkImageSettings {
    return getEffectiveSettings(
      bulkStore.processingGlobalSettingsForJob(job),
      job.overrides,
    );
  }

  function isEmptyOverride(overrides: BulkImageOverrides): boolean {
    return (
      !overrides.encoderState &&
      Object.keys(overrides.processorState ?? {}).length === 0
    );
  }

  function onPick(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    if (files.length) void bulkStore.importFiles(files);
    input.value = '';
  }

  function onDrop(list: FileList) {
    void bulkStore.importFiles(Array.from(list));
  }

  function resetLab(): void {
    seeding = true;
    focusSession.clearFile();
    bulkStore.resetLab();
  }
</script>

<svelte:head>
  <title>Bulk UI Lab</title>
</svelte:head>

{#if dev}
  <div class="lab" {@attach fileDrop(onDrop)}>
    <div class="lab-controls" aria-label="Lab controls">
      <button type="button" class="btn" onclick={() => fileInput?.click()}>
        Add images
      </button>

      <button type="button" class="btn ghost" onclick={resetLab}>Reset</button>

      {#if bulkStore.hasJobs}
        <!-- Dev-only resting-stage experiment toggle. STACK (default) fans the
             batch onto the stage; BLANK keeps the original quiet empty state for
             side-by-side comparison. The L/M/S thumbnail picker sits next to
             the stage's bottom toolbar (see FocusView). -->
        <div
          class="stage-toggle"
          role="radiogroup"
          aria-label="Resting stage experiment"
        >
          <button
            type="button"
            class:active={bulkStore.stageMode === 'stack'}
            role="radio"
            aria-checked={bulkStore.stageMode === 'stack'}
            title="Stack resting stage (experiment)"
            onclick={() => bulkStore.setStageMode('stack')}
          >
            Stack
          </button>
          <button
            type="button"
            class:active={bulkStore.stageMode === 'blank'}
            role="radio"
            aria-checked={bulkStore.stageMode === 'blank'}
            title="Blank resting stage (original)"
            onclick={() => bulkStore.setStageMode('blank')}
          >
            Blank
          </button>
        </div>
      {/if}

      <input
        bind:this={fileInput}
        class="hidden-input"
        type="file"
        accept="image/*"
        multiple
        onchange={onPick}
      />
    </div>

    {#if bulkStore.hasJobs}
      <Home {focusSession} onReseed={seedFocusFromSelected} />
    {:else}
      <main class="dropzone">
        <div class="dropzone-inner">
          <p class="drop-title">Drop images to start</p>
          <p class="drop-hint">or use <strong>Add images</strong> above.</p>
        </div>
      </main>
    {/if}

    <Snackbar />
  </div>
{:else}
  <main class="not-dev">
    <p>The Bulk UI Lab is only available in development.</p>
  </main>
{/if}

<style>
  :global(html),
  :global(body) {
    height: 100%;
  }
  :global(body) {
    background: #0c0c0f;
    color: #f5f5f7;
  }

  .lab {
    position: relative;
    width: 100vw;
    min-height: 100dvh;
    overflow: hidden;
    background: var(--bg-0, #0c0c0f);
    color: var(--text-1, #f5f5f7);
  }

  .lab::after {
    content: '';
    position: fixed;
    inset: 10px;
    border: 2px dashed var(--accent-1, #ff8a5e);
    background-color: rgba(255, 122, 80, 0.06);
    border-radius: 16px;
    opacity: 0;
    transform: scale(0.95);
    transition:
      opacity 200ms ease-in,
      transform 200ms ease-in;
    pointer-events: none;
    z-index: 40;
  }
  .lab:global(.drop-valid)::after {
    opacity: 1;
    transform: scale(1);
    transition-timing-function: ease-out;
  }

  .lab-controls {
    position: fixed;
    top: 14px;
    right: 14px;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 8px;
    max-width: calc(100vw - 28px);
    box-sizing: border-box;
    padding: 6px;
    border-radius: 999px;
    background: var(--surface, rgba(19, 19, 25, 0.82));
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
  }

  .btn {
    border: none;
    border-radius: 999px;
    font: inherit;
    font-weight: 750;
    cursor: pointer;
    transition:
      background-color 150ms ease,
      color 150ms ease,
      opacity 150ms ease;
  }

  .btn {
    padding: 7px 11px;
    background: transparent;
    color: var(--text-1, #f5f5f7);
  }

  .btn:hover:not(:disabled) {
    background: var(--surface-raise-2, rgba(255, 255, 255, 0.09));
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .btn.ghost {
    color: var(--text-2, rgba(235, 235, 245, 0.62));
  }

  /* Stage experiment toggle: same pill language as the font toggle. */
  .stage-toggle {
    display: inline-flex;
    padding: 2px;
    border-radius: 999px;
    background: var(--surface-raise, rgba(255, 255, 255, 0.06));
    border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
  }
  .stage-toggle button {
    padding: 6px 12px;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: var(--text-2, rgba(235, 235, 245, 0.62));
    font: inherit;
    font-weight: 700;
    font-size: 0.85rem;
    cursor: pointer;
    white-space: nowrap;
    transition:
      background-color 150ms ease,
      color 150ms ease;
  }
  .stage-toggle button:hover:not(.active) {
    color: var(--text-1, #f5f5f7);
  }
  .stage-toggle button.active {
    background: var(--accent-2, #53b2ff);
    color: #16161c;
  }
  .stage-toggle button:focus-visible {
    outline: 2px solid var(--accent-2, #53b2ff);
    outline-offset: 2px;
  }

  .hidden-input {
    display: none;
  }

  .dropzone {
    min-height: 100dvh;
    display: grid;
    place-items: center;
    padding: 24px;
    box-sizing: border-box;
  }

  .dropzone-inner {
    display: grid;
    gap: 8px;
    justify-items: center;
    width: min(560px, 100%);
    padding: 64px 32px;
    border: 2px dashed var(--border-strong, rgba(255, 255, 255, 0.16));
    border-radius: var(--options-radius, 16px);
    background: var(--surface, rgba(19, 19, 25, 0.82));
    text-align: center;
    transition:
      border-color 200ms ease,
      background-color 200ms ease;
  }

  .lab:global(.drop-valid) .dropzone-inner {
    border-color: var(--accent-1, #ff8a5e);
    background: color-mix(in srgb, var(--accent-1, #ff8a5e) 10%, transparent);
  }

  .drop-title {
    margin: 0;
    font-size: 1.4rem;
    font-weight: 800;
  }

  .drop-hint {
    margin: 0;
    color: var(--text-2, rgba(235, 235, 245, 0.62));
    font-size: 0.95rem;
  }

  .not-dev {
    display: grid;
    place-items: center;
    min-height: 100vh;
    color: #888;
    font-family: system-ui, sans-serif;
  }

  @media (max-width: 760px) {
    .lab-controls {
      left: 8px;
      right: 8px;
      top: 8px;
      max-width: calc(100vw - 16px);
      overflow-x: auto;
      justify-content: flex-end;
      border-radius: 18px;
      scrollbar-width: none;
    }

    .lab-controls::-webkit-scrollbar {
      display: none;
    }

    .btn {
      white-space: nowrap;
    }
  }
</style>
