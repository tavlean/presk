<script lang="ts">
  // The left comparison panel. Two faces:
  //  • the "info" face — a frisp wordmark + project title, then Image | Compare
  //    tabs (image info rows, or a grid of format tiles to preview against);
  //  • the "compare" face — when the left side has picked a format, the shared
  //    LabOptionsPanel takes over, with a header to close the comparison.
  import { APP_NAME } from 'shared/brand';
  import ImageInfoRows from '$lib/editor/ImageInfoRows.svelte';
  import { prettySize } from '$lib/editor/pretty-size';
  import { IDENTITY, type SideFormat } from '$lib/compress';
  import type { EditorSession } from '$lib/editor/editor-session.svelte';
  import Segmented from './Segmented.svelte';
  import LabOptionsPanel from './LabOptionsPanel.svelte';

  interface Props {
    session: EditorSession;
  }

  let { session }: Props = $props();

  let tab = $state<'image' | 'compare'>('image');
  const tabs = [
    { id: 'image', label: 'Image' },
    { id: 'compare', label: 'Compare' },
  ];

  const comparing = $derived(session.sides[0].format !== IDENTITY);
  const file = $derived(session.file);
  const formatLabel = $derived(
    session.availableFormats.find((f) => f.id === session.sides[0].format)
      ?.label ?? '',
  );

  // Subtitle: "W × H px · TYPE · SIZE" — computed from the live session.
  const typeLabel = $derived.by(() => {
    const name = file?.name ?? '';
    const mime = file?.type.split('/')[1] ?? '';
    const ext = name.includes('.') ? name.split('.').pop()! : '';
    return (mime || ext || 'image').toUpperCase();
  });
  const subtitle = $derived.by(() => {
    if (!file) return '';
    const dims =
      session.naturalWidth > 0 && session.naturalHeight > 0
        ? `${session.naturalWidth} × ${session.naturalHeight} px`
        : '';
    const parts = [dims, typeLabel, prettySize(file.size)].filter(Boolean);
    return parts.join(' · ');
  });
</script>

<div class="left-panel">
  {#if comparing && file}
    <div class="compare-head">
      <span class="side-dot" aria-hidden="true"></span>
      <span class="compare-title">Compare — {formatLabel}</span>
      <button
        type="button"
        class="close-btn"
        aria-label="Close comparison"
        onclick={() => session.setFormat(0, IDENTITY)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M7 7l10 10M17 7L7 17"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </div>

    <LabOptionsPanel
      side="left"
      format={session.sides[0].format}
      formats={session.availableFormats}
      options={session.sides[0].optionsByFormat[session.sides[0].format] ?? {}}
      processorState={session.sides[0].processorState}
      naturalWidth={session.naturalWidth}
      naturalHeight={session.naturalHeight}
      isVector={session.isVectorSource}
      result={session.runtime[0].result}
      working={session.runtime[0].showSpinner}
      downloadName={session.downloadName(0)}
      onFormatChange={(f) => session.setFormat(0, f)}
    />
  {:else if file}
    <header class="head">
      <div class="brand">
        <svg class="logo" viewBox="0 0 24 24" aria-hidden="true">
          <rect
            x="4"
            y="4"
            width="16"
            height="16"
            rx="5"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
          />
          <path
            d="M9 15V9h5M9 12h4"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span class="wordmark">{APP_NAME}</span>
      </div>
      <p class="project-title" title={file.name}>{file.name}</p>
      <p class="project-sub">{subtitle}</p>
    </header>

    <div class="tabs">
      <Segmented
        options={tabs}
        value={tab}
        ariaLabel="Left panel view"
        onchange={(id) => (tab = id as 'image' | 'compare')}
      />
    </div>

    <div class="body">
      {#if tab === 'image'}
        <div class="info-rows">
          <ImageInfoRows
            {file}
            width={session.naturalWidth}
            height={session.naturalHeight}
          />
        </div>
      {:else}
        <p class="caption">
          Preview the image in a second format, side by side.
        </p>
        <div class="format-grid">
          {#each session.availableFormats as fmt (fmt.id)}
            <button
              type="button"
              class="format-tile"
              title={fmt.tooltip}
              onclick={() => session.setFormat(0, fmt.id as SideFormat)}
            >
              <span class="tile-label">{fmt.label}</span>
              <span class="tile-ext">{fmt.ext.toUpperCase()}</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .left-panel {
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
  }

  /* ── Info face ─────────────────────────────────────────────────────────── */
  .head {
    display: grid;
    gap: 3px;
    padding: 14px var(--horizontal-padding) 10px;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 4px;
  }

  .logo {
    width: 16px;
    height: 16px;
    color: var(--pc-text-1);
  }

  .wordmark {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.01em;
    color: var(--pc-text-1);
  }

  .project-title {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: var(--pc-text-1);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .project-sub {
    margin: 0;
    font-size: 12px;
    color: var(--pc-text-2);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tabs {
    padding: 4px var(--horizontal-padding) 6px;
  }

  .body {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    padding: 4px var(--horizontal-padding) 16px;
  }

  .info-rows {
    padding-top: 6px;
  }

  .caption {
    margin: 6px 0 12px;
    font-size: 12px;
    line-height: 1.4;
    color: var(--pc-text-2);
  }

  .format-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .format-tile {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    padding: 12px 12px;
    border: 1px solid var(--pc-border);
    border-radius: 12px;
    background: var(--pc-raise);
    color: var(--pc-text-1);
    font: inherit;
    cursor: pointer;
    text-align: left;
    box-shadow: var(--pc-shadow-control);
    transition:
      transform 140ms ease,
      border-color 140ms ease;
  }
  @supports (corner-shape: squircle) {
    .format-tile {
      corner-shape: squircle;
      border-radius: 14px;
    }
  }

  .format-tile:hover {
    transform: translateY(-2px);
    border-color: var(--pc-border-strong);
  }

  .format-tile:focus-visible {
    outline: 2px solid var(--pc-focus);
    outline-offset: 2px;
  }

  .tile-label {
    font-size: 14px;
    font-weight: 600;
  }

  .tile-ext {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: var(--pc-text-3);
  }

  /* ── Compare face header ───────────────────────────────────────────────── */
  .compare-head {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 13px var(--horizontal-padding) 8px;
  }

  .side-dot {
    flex: none;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--main-theme-color);
  }

  .compare-title {
    flex: 1;
    min-width: 0;
    font-size: 15px;
    font-weight: 600;
    color: var(--pc-text-1);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .close-btn {
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--pc-text-3);
    cursor: pointer;
    padding: 0;
    transition:
      background-color 140ms ease,
      color 140ms ease;
  }

  .close-btn svg {
    width: 18px;
    height: 18px;
  }

  .close-btn:hover {
    background: var(--pc-inset);
    color: var(--pc-text-1);
  }

  .close-btn:focus-visible {
    outline: 2px solid var(--pc-focus);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    .format-tile {
      transition-duration: 0ms;
    }
  }
</style>
