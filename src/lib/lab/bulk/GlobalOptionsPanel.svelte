<script lang="ts">
  import OptionsPanel from '$lib/editor/OptionsPanel.svelte';
  import type { EditorSession } from '$lib/editor/editor-session.svelte';
  import { labBulk } from './store.svelte';
  import DeltaPill from './DeltaPill.svelte';

  interface Props {
    focusSession: EditorSession;
  }

  let { focusSession }: Props = $props();

  const formats = $derived(
    focusSession.availableFormats.filter(
      (format) => (format.id as string) !== 'identity',
    ),
  );

  const summary = $derived(labBulk.summary);
  const output = $derived(summary.output);
  const firstJobId = $derived(labBulk.session.jobs[0]?.id);
  const firstThumb = $derived(
    firstJobId ? labBulk.thumbs.get(firstJobId) : undefined,
  );
  const naturalWidth = $derived(firstThumb?.w ?? 0);
  const naturalHeight = $derived(firstThumb?.h ?? 0);

  const SIZE_UNITS = ['B', 'kB', 'MB', 'GB', 'TB'];
  function prettySize(bytes: number): string {
    if (bytes < 1) return '0 B';
    const exponent = Math.min(
      Math.floor(Math.log10(bytes) / 3),
      SIZE_UNITS.length - 1,
    );
    return `${(bytes / 1000 ** exponent).toPrecision(3)} ${SIZE_UNITS[exponent]}`;
  }

  const showDelta = $derived(output.optimized > 0);

  function applyFormat(format: string): void {
    if (format === 'identity') return;
    labBulk.setGlobalFormat(format as typeof labBulk.globalSide.format);
  }
</script>

<!-- The global scope has no single-image download, so the production Results
     footer ("… WEBP · Save") is inert here. We hide it (scoped to THIS wrapper
     only) and render a compact batch-totals footer in its place. -->
<div class="global-panel">
  <OptionsPanel
    side="left"
    format={labBulk.globalSide.format}
    {formats}
    options={labBulk.globalSide.optionsByFormat[labBulk.globalSide.format] ??
      {}}
    processorState={labBulk.globalSide.processorState}
    {naturalWidth}
    {naturalHeight}
    sourceName={labBulk.selectedFile?.name}
    isVector={labBulk.selectedFile?.type === 'image/svg+xml'}
    result={null}
    working={false}
    canImport={false}
    downloadName=""
    onFormatChange={applyFormat}
    onCopy={() => {}}
    onSave={() => {}}
    onImport={() => {}}
  />

  <div class="lab-footer">
    <span class="totals">
      {prettySize(output.totalOriginalSize)}
      <span class="arrow" aria-hidden="true">→</span>
      {#if output.optimized > 0}
        {prettySize(output.totalOutputSize)}
      {:else}
        …
      {/if}
    </span>
    {#if showDelta}
      <span class="delta-slot">
        <DeltaPill percent={output.percentChange} />
      </span>
    {/if}
  </div>
</div>

<style>
  .global-panel {
    display: contents;
  }

  /* Suppress the inert per-image download footer for the global scope only. */
  .global-panel :global(.results) {
    display: none;
  }

  .lab-footer {
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 10px 16px;
    border-top: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    background: rgba(0, 0, 0, 0.18);
    font-variant-numeric: tabular-nums;
  }

  .totals {
    color: var(--text-2, rgba(235, 235, 245, 0.62));
    font-weight: 650;
  }

  .arrow {
    color: var(--text-3, rgba(235, 235, 245, 0.38));
    margin: 0 2px;
  }

  .delta-slot {
    margin-left: auto;
    font-size: 0.85rem;
  }
</style>
