<script lang="ts">
  import { dev } from '$app/environment';
  import { APP_NAME } from 'shared/brand';
  import { IntroDropDemo } from '$lib/lab/intro/drop-demo.svelte';
  import Icon from '$lib/lab/intro/Icon.svelte';
  import ThemeToggle, {
    type ThemeMode,
  } from '$lib/lab/intro/ThemeToggle.svelte';
  import '$lib/lab/intro/intro-lab.css';

  const demo = new IntroDropDemo();

  let theme = $state<ThemeMode>('system');
  let fileInput = $state<HTMLInputElement>();

  const shownFiles = $derived(demo.files.slice(0, 4));

  function openPicker(): void {
    if (demo.hasFiles) return;
    fileInput?.click();
  }

  function reset(event: MouseEvent): void {
    event.stopPropagation();
    demo.reset();
  }
</script>

{#if dev}
  <main
    class="intro-lab-root il-ledger-root"
    class:force-light={theme === 'light'}
    class:force-dark={theme === 'dark'}
    {@attach demo.dropTarget()}
  >
    <input
      bind:this={fileInput}
      class="file-input"
      type="file"
      accept="image/*"
      multiple
      onchange={demo.onPick}
    />

    <header class="ledger-header">
      <span class="wordmark">{APP_NAME}</span>
      <ThemeToggle value={theme} onchange={(mode) => (theme = mode)} />
    </header>

    <section class="ledger-stage">
      <div class="ledger-column">
        <h1>
          <span class="headline-dot" aria-hidden="true"></span>{APP_NAME}
          compresses images without uploading them.
        </h1>

        <div class:drag-active={demo.dragActive} class="tray-wrap">
          <button
            type="button"
            class="tray"
            class:accepted={demo.hasFiles}
            onclick={openPicker}
            aria-label={demo.hasFiles
              ? demo.summary
              : 'Drop images, or click to browse files'}
          >
            {#if demo.hasFiles}
              <span class="accepted-content">
                <span class="summary">{demo.summary}</span>
                <span class="file-names">
                  {#each shownFiles as item (item.relativePath ?? item.file.name)}
                    <span class="file-name">{item.file.name}</span>
                  {/each}
                </span>
                <span class="stub"
                  >Lab stub — production opens the editor here.</span
                >
              </span>
            {:else}
              <span class="idle-content">
                <span class="tray-glyph">
                  <Icon name="drop-tray" size={34} />
                </span>
                <span class="tray-copy">
                  {demo.dragActive ? 'Release to add' : 'Drop images — or '}
                  {#if !demo.dragActive}<span class="browse">browse</span>{/if}
                </span>
              </span>
            {/if}
          </button>

          {#if demo.hasFiles}
            <button type="button" class="reset-button" onclick={reset}
              >Start over</button
            >
          {/if}
        </div>

        <dl class="ledger">
          <div class="ledger-row">
            <dt class="number">01</dt>
            <dt class="step">Decode</dt>
            <dd>in your browser</dd>
          </div>
          <div class="ledger-row">
            <dt class="number">02</dt>
            <dt class="step">Resize &amp; palette</dt>
            <dd>optional, per image</dd>
          </div>
          <div class="ledger-row">
            <dt class="number">03</dt>
            <dt class="step">Encode</dt>
            <dd>WebP · AVIF · JPEG XL · JPEG · PNG</dd>
          </div>
          <div class="ledger-row">
            <dt class="number">04</dt>
            <dt class="step">Upload</dt>
            <dd class="never">never</dd>
          </div>
        </dl>
      </div>
    </section>

    <footer class="ledger-footer">
      {APP_NAME} — images never leave your device · Open source · Works offline
    </footer>
  </main>
{:else}
  <p>Not found.</p>
{/if}

<style>
  .il-ledger-root {
    box-sizing: border-box;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    font-size: 15px;
  }

  .file-input {
    position: absolute;
    width: 1px;
    height: 1px;
    clip-path: inset(50%);
  }

  .ledger-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 26px;
  }

  .wordmark {
    color: var(--il-text-1);
    font-size: 16px;
    font-weight: 800;
  }

  .ledger-stage {
    flex: 1 1 auto;
    display: grid;
    place-items: center;
    padding: 28px 0;
  }

  .ledger-column {
    width: min(560px, calc(100vw - 48px));
    display: flex;
    flex-direction: column;
    gap: 28px;
  }

  h1 {
    margin: 0;
    color: var(--il-text-1);
    font-size: clamp(24px, 3.6vw, 38px);
    font-weight: 750;
    line-height: 1.15;
    letter-spacing: -0.015em;
    text-wrap: balance;
  }

  .headline-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    margin-right: 10px;
    border-radius: 50%;
    background: var(--il-accent);
    vertical-align: middle;
  }

  .tray-wrap {
    position: relative;
    width: 100%;
    height: 176px;
  }

  .tray {
    width: 100%;
    height: 176px;
    display: grid;
    place-items: center;
    padding: 0;
    overflow: hidden;
    border: 1px solid var(--il-border-strong);
    border-radius: 18px;
    background: var(--il-inset);
    color: inherit;
    font: inherit;
    cursor: pointer;
    transition:
      border-color 180ms ease,
      background-color 180ms ease;
  }

  @supports (corner-shape: squircle) {
    .tray {
      corner-shape: squircle;
      border-radius: 22px;
    }
  }

  .tray.accepted {
    cursor: default;
  }

  .drag-active .tray {
    border-color: var(--il-accent);
    background: color-mix(in srgb, var(--il-accent) 7%, var(--il-inset));
  }

  .idle-content {
    display: grid;
    justify-items: center;
    gap: 8px;
  }

  .tray-glyph {
    display: inline-grid;
    color: var(--il-text-2);
    transition: transform 180ms ease;
  }

  .drag-active .tray-glyph {
    transform: translateY(3px);
  }

  .tray-copy {
    color: var(--il-text-2);
    font-size: clamp(13.5px, 2vw, 15px);
    font-weight: 600;
  }

  .drag-active .tray-copy {
    color: var(--il-text-1);
    font-weight: 650;
  }

  .browse,
  .reset-button {
    color: var(--il-accent-2);
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .accepted-content {
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16px 18px 52px;
    overflow: hidden;
  }

  .summary {
    flex: 0 0 auto;
    color: var(--il-text-1);
    font-size: 17px;
    font-weight: 800;
  }

  .file-names {
    width: min(100%, 44ch);
    display: grid;
    margin-top: 5px;
    overflow: hidden;
  }

  .file-name {
    display: block;
    overflow: hidden;
    color: var(--il-text-2);
    font-size: 12.5px;
    line-height: 1.35;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .stub {
    position: absolute;
    right: 18px;
    bottom: 13px;
    left: 18px;
    overflow: hidden;
    color: var(--il-text-3);
    font-size: 11.5px;
    line-height: 1.2;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .reset-button {
    position: absolute;
    z-index: 1;
    bottom: 34px;
    left: 50%;
    padding: 0;
    border: none;
    background: none;
    font: inherit;
    font-size: 13px;
    cursor: pointer;
    transform: translateX(-50%);
  }

  .ledger {
    margin: 0;
  }

  .ledger-row {
    display: grid;
    grid-template-columns: 34px 1fr auto;
    align-items: baseline;
    padding: 12px 2px;
    border-top: 1px solid var(--il-border);
  }

  .ledger-row:last-child {
    border-bottom: 1px solid var(--il-border);
  }

  .ledger dt,
  .ledger dd {
    margin: 0;
  }

  .number {
    color: var(--il-text-3);
    font-size: 12.5px;
    font-variant-numeric: tabular-nums;
  }

  .step {
    color: var(--il-text-1);
    font-size: 14.5px;
    font-weight: 650;
  }

  .ledger dd {
    color: var(--il-text-2);
    font-size: 13px;
    text-align: right;
  }

  .ledger dd.never {
    color: var(--il-accent);
    font-weight: 750;
  }

  .ledger-footer {
    padding: 16px 26px 20px;
    color: var(--il-text-3);
    font-size: 12.5px;
    text-align: center;
  }

  @media (prefers-reduced-motion: reduce) {
    .tray-glyph,
    .drag-active .tray-glyph {
      transform: none;
      transition: none;
    }
  }
</style>
