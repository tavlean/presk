<script lang="ts">
  import { onMount } from 'svelte';
  import { dev } from '$app/environment';
  import { pushState } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { registerSqushServiceWorker } from '$lib/service-worker-registration';
  import Output from '$lib/editor/output/Output.svelte';
  import OptionsPanel from '$lib/editor/OptionsPanel.svelte';
  import Snackbar from '$lib/editor/Snackbar.svelte';
  import Intro from '$lib/editor/intro/Intro.svelte';
  import { snackbar } from '$lib/editor/snackbar-store.svelte';
  import { fileDrop } from '$lib/editor/file-drop';
  import { EditorSession } from '$lib/editor/editor-session.svelte';
  import '$lib/editor/theme.css';

  const session = new EditorSession();
  const sideIndexes = [0, 1] as const;

  onMount(() => {
    registerSqushServiceWorker().catch((error: unknown) => {
      console.error('Service worker registration failed', error);
    });

    session.loadSupportedFormats().catch((error: unknown) => {
      console.error('Format support detection failed', error);
    });

    return () => session.dispose();
  });

  // The per-side encode + spinner effects now live inside EditorSession (set up
  // in its constructor, disposed in dispose()); the page keeps only the effects
  // that depend on page/route state or write back to shared session state.
  $effect(() => session.syncRouteState(!!page.state.editor));
  $effect(() => session.seedResizeDimensions());
  $effect(() => session.persistSettings());

  function pickFiles(list: FileList | null | undefined) {
    session.pickFiles(list, () => pushState('', { editor: true }));
  }

  function back() {
    if (typeof history !== 'undefined') history.back();
    else session.clearFile();
  }
</script>

<svelte:head>
  <title>{session.docTitle}</title>
</svelte:head>

<!-- The whole app is a drop target so an image dropped ANYWHERE (intro padding,
     or over the open editor) loads/replaces it instead of the browser opening
     the file — Squoosh wraps everything in <file-drop> the same way. -->
<div class="app-root" {@attach fileDrop((files) => pickFiles(files))}>
  {#if !session.file}
    <Intro onFiles={pickFiles} onMessage={(t) => snackbar.show(t)} />
    {#if dev}
      <p class="intro-diag">
        <a href={resolve('/diagnostics')}>Pipeline diagnostics →</a>
      </p>
    {/if}
  {:else}
    <div class="compress sqush-editor">
      <Output
        leftImage={session.results[0]?.outputImageData}
        rightImage={session.results[1]?.outputImageData}
        leftWorking={session.showSpinner[0]}
        rightWorking={session.showSpinner[1]}
        leftDone={session.statuses[0] === 'done'}
        rightDone={session.statuses[1] === 'done'}
        fileId={session.loadId}
        leftContain={session.leftContain}
        rightContain={session.rightContain}
        containWidth={session.naturalWidth}
        containHeight={session.naturalHeight}
        onRotate={() => session.rotate()}
      />

      {#if session.firstError}
        <p class="status-pill error">{session.firstError}</p>
      {/if}

      <button class="back" onclick={back} title="Back" aria-label="Back">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M18.3 5.7a1 1 0 0 0-1.4 0L12 10.6 7.1 5.7a1 1 0 0 0-1.4 1.4l4.9 4.9-4.9 4.9a1 1 0 1 0 1.4 1.4l4.9-4.9 4.9 4.9a1 1 0 0 0 1.4-1.4L13.4 12l4.9-4.9a1 1 0 0 0 0-1.4z"
          />
        </svg>
      </button>

      {#each sideIndexes as index (index)}
        <aside class="options options-{index + 1}">
          <OptionsPanel
            side={index === 0 ? 'left' : 'right'}
            format={session.sides[index].format}
            formats={session.availableFormats}
            options={session.sides[index].optionsByFormat[
              session.sides[index].format
            ] ?? {}}
            processorState={session.processorState}
            naturalWidth={session.naturalWidth}
            naturalHeight={session.naturalHeight}
            sourceName={session.file.name}
            isVector={session.isVectorSource}
            sharedAdjust={session.sides[index === 0 ? 1 : 0].format !==
              'identity'}
            result={session.results[index]}
            working={session.showSpinner[index]}
            canImport={session.canImport[index]}
            downloadName={session.downloadName(index)}
            originalSize={session.file.size}
            compareSizes={session.compareSizes[index]}
            compareBusy={session.compareBusy[index]}
            fitting={session.fitting[index]}
            onFormatChange={(f) => session.setFormat(index, f)}
            onCompare={() => session.runCompare(index)}
            onFitToSize={(bytes) => session.fitToSize(index, bytes)}
            onCopy={() => session.copyToOther(index)}
            onSave={() => session.saveSide(index)}
            onImport={() => session.importSide(index)}
          />
        </aside>
      {/each}
    </div>
  {/if}

  <Snackbar />
</div>

<style>
  /* Body reset + font stack live in the root +layout.svelte; this page only
     owns its full-height sizing and dark background. */
  :global(html),
  :global(body) {
    height: 100%;
  }
  :global(body) {
    background: #0b0b0d;
    color: #fff;
  }

  /* The landing screen itself lives in Intro.svelte. The whole viewport is the
     drop target (see the fileDrop attachment on .app-root), with the pink
     dashed drop overlay for feedback. This page only adds the dev-only
     diagnostics link, pinned out of the way in a corner. */
  .intro-diag {
    position: fixed;
    bottom: 12px;
    right: 14px;
    margin: 0;
    z-index: 20;
  }
  .intro-diag a {
    color: #38bdf8;
  }

  /* App wrapper — the drop target spanning both intro and editor. */
  .app-root {
    position: relative;
  }

  /* Full-bleed editor */
  .compress {
    --mobile-options-height: min(44dvh, 360px);
    --fit-inset-left: 344px;
    --fit-inset-right: 344px;
    --fit-inset-top: 0px;
    --fit-inset-bottom: 0px;
    position: relative;
    width: 100vw;
    height: 100dvh;
    overflow: hidden;
    background: #131316;
  }

  /* Drag-to-replace feedback: an accent dashed frame with a soft tint while an
     image is dragged anywhere over the app (class toggled by fileDrop). */
  .app-root::after {
    content: '';
    position: fixed;
    inset: 12px;
    border: 2px dashed var(--pink, #f472b6);
    background:
      radial-gradient(
        60% 60% at 50% 50%,
        rgba(244, 114, 182, 0.08),
        transparent
      ),
      rgba(0, 0, 0, 0.25);
    border-radius: 18px;
    opacity: 0;
    transform: scale(0.97);
    transition:
      opacity 200ms ease-in,
      transform 200ms ease-in;
    pointer-events: none;
    z-index: 40;
  }
  .app-root:global(.drop-valid)::after {
    opacity: 1;
    transform: scale(1);
    transition-timing-function: ease-out;
  }

  .status-pill {
    position: absolute;
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    margin: 0;
    padding: 7px 14px;
    border-radius: 999px;
    background: rgba(19, 19, 23, 0.88);
    border: 1px solid var(--stroke, rgba(255, 255, 255, 0.08));
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    color: #fff;
    z-index: 8;
    pointer-events: none;
    max-width: 70vw;
  }
  .status-pill.error {
    color: #f87171;
    border-color: rgba(248, 113, 113, 0.35);
    font-weight: 600;
  }

  /* Back button: a frosted circle with an X, top-left. */
  .back {
    position: absolute;
    top: 16px;
    left: 16px;
    width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
    background: rgba(19, 19, 23, 0.78);
    border: 1px solid var(--stroke, rgba(255, 255, 255, 0.08));
    border-radius: 50%;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    padding: 0;
    cursor: pointer;
    color: #fafafa;
    z-index: 10;
    transition:
      background-color 150ms ease,
      transform 150ms ease;
  }
  .back:hover {
    background: rgba(40, 40, 46, 0.85);
    transform: scale(1.05);
  }
  .back:focus-visible {
    outline: 2px solid var(--pink, #f472b6);
    outline-offset: 2px;
  }
  .back svg {
    width: 18px;
    height: 18px;
    fill: currentColor;
    display: block;
  }

  /* Floating glass option cards, one per bottom corner; the compare canvas
     shows above and between them. */
  .options {
    position: absolute;
    bottom: 16px;
    width: 312px;
    max-height: calc(100% - 88px);
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    color: #fff;
    font-size: 1.2rem;
    z-index: 5;
    background: var(--surface, rgba(19, 19, 23, 0.88));
    border: 1px solid var(--stroke, rgba(255, 255, 255, 0.08));
    border-radius: var(--options-radius, 16px);
    box-shadow: var(
      --shadow-panel,
      0 24px 48px -12px rgba(0, 0, 0, 0.55),
      0 4px 12px rgba(0, 0, 0, 0.35)
    );
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    overflow: hidden;
  }
  .options-1 {
    left: 16px;
  }
  .options-2 {
    right: 16px;
  }

  @media (max-width: 760px) {
    .compress {
      --fit-inset-left: 0px;
      --fit-inset-right: 0px;
    }

    :global(.sqush-editor .output) {
      bottom: calc(var(--mobile-options-height) + 8px);
    }

    :global(.sqush-editor .controls) {
      bottom: calc(var(--mobile-options-height) + 16px);
      padding: 0 56px;
      box-sizing: border-box;
    }

    .back {
      top: 8px;
      left: 8px;
      width: 36px;
      height: 36px;
    }
    .back svg {
      width: 16px;
      height: 16px;
    }

    .status-pill {
      top: 8px;
      max-width: calc(100vw - 112px);
      font-size: 0.85rem;
    }

    .options {
      bottom: 8px;
      width: calc(50vw - 11px);
      /* Fixed (not just max) height so both bottom cards are the SAME height —
         otherwise the short "Original" side and the tall encoder side bottom-
         align at different heights and read as broken. The inner scroller grows
         to fill and scrolls (see OptionsPanel), keeping the download footer
         pinned at the bottom of each card. */
      height: var(--mobile-options-height);
      max-height: var(--mobile-options-height);
      font-size: 0.95rem;
    }
    .options-1 {
      left: 8px;
    }
    .options-2 {
      right: 8px;
    }
  }

  @media (max-width: 420px) {
    .compress {
      --mobile-options-height: 48dvh;
    }

    :global(.sqush-editor .controls) {
      bottom: calc(var(--mobile-options-height) + 14px);
      padding: 0 48px;
    }
  }
</style>
