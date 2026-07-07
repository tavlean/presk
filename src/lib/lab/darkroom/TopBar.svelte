<script lang="ts">
  // The top navigation bar: a rounded panel on the left with the logo glyph +
  // nav items (EDITOR active, DIAGNOSTICS → /diagnostics), and a right cluster of
  // chips on the page background — undo/redo, EXPORT (downloads the RIGHT side's
  // result), and a circular "+" that adds images to the session gallery. Frisp
  // has no accounts, so the reference's avatar/pro chips are honestly omitted.
  import { resolve } from '$app/paths';

  interface Props {
    /** The right side's download URL, or undefined while encoding / no result. */
    exportHref?: string;
    exportName: string;
    exportReady: boolean;
    canUndo: boolean;
    canRedo: boolean;
    undoTip: string;
    redoTip: string;
    onUndo: () => void;
    onRedo: () => void;
    onAddImages: () => void;
  }

  let {
    exportHref,
    exportName,
    exportReady,
    canUndo,
    canRedo,
    undoTip,
    redoTip,
    onUndo,
    onRedo,
    onAddImages,
  }: Props = $props();
</script>

<header class="dr-topbar">
  <div class="dr-topbar-panel">
    <span class="dr-logo" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <rect
          x="3"
          y="3"
          width="18"
          height="18"
          rx="5"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
        />
        <path
          d="M8 15.5V8.5h6M8 12h4.5"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </span>
    <nav class="dr-nav" aria-label="Sections">
      <span class="dr-nav-item active" aria-current="page">Editor</span>
      <a class="dr-nav-item" href={resolve('/diagnostics')}>Diagnostics</a>
    </nav>
  </div>

  <div class="dr-topbar-right">
    <div class="dr-chip-pair">
      <button
        type="button"
        class="dr-chip-btn"
        disabled={!canUndo}
        data-tooltip={undoTip}
        aria-label={undoTip}
        onclick={() => onUndo()}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H9"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
      <button
        type="button"
        class="dr-chip-btn"
        disabled={!canRedo}
        data-tooltip={redoTip}
        aria-label={redoTip}
        onclick={() => onRedo()}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M15 14l5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H15"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>

    <a
      class="dr-chip-btn dr-export"
      class:disabled={!exportReady}
      href={exportReady ? exportHref : undefined}
      download={exportReady ? exportName : undefined}
      aria-disabled={!exportReady}
      data-tooltip="Download the compared result"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 3v10.5m0 0l4-4M12 13.5L8 9.5M5 16.5v2c0 1 .8 1.8 1.8 1.8h10.4c1 0 1.8-.8 1.8-1.8v-2"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <span class="dr-export-text">Export</span>
    </a>

    <button
      type="button"
      class="dr-chip-btn dr-add"
      data-tooltip="Add images"
      aria-label="Add images"
      onclick={() => onAddImages()}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 5.5v13M5.5 12h13"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linecap="round"
        />
      </svg>
    </button>
  </div>
</header>

<style>
  .dr-topbar {
    position: fixed;
    top: 12px;
    left: 12px;
    right: 12px;
    z-index: 22;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    pointer-events: none;
  }
  .dr-topbar > * {
    pointer-events: auto;
  }

  .dr-topbar-panel {
    display: flex;
    align-items: center;
    gap: 14px;
    height: 44px;
    padding: 0 16px 0 12px;
    border-radius: 12px;
    border: 1px solid var(--dr-border);
    background: var(--dr-panel);
    box-shadow: var(--dr-shadow-panel);
  }

  .dr-logo {
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    color: var(--dr-text-1);
  }
  .dr-logo svg {
    width: 22px;
    height: 22px;
    display: block;
  }

  .dr-nav {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .dr-nav-item {
    font-size: 0.92rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--dr-text-2);
    text-decoration: none;
    transition: color 150ms ease;
  }
  .dr-nav-item:hover {
    color: var(--dr-text-1);
  }
  .dr-nav-item.active {
    color: var(--dr-text-1);
  }

  .dr-topbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .dr-chip-pair {
    display: flex;
    gap: 6px;
  }

  .dr-export {
    gap: 7px;
    padding: 0 14px;
  }
  .dr-export-text {
    font-size: 0.92rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .dr-export svg {
    width: 16px;
    height: 16px;
    display: block;
  }
  .dr-export.disabled {
    opacity: 0.4;
    pointer-events: none;
  }

  .dr-add svg {
    width: 18px;
    height: 18px;
    display: block;
  }
  .dr-add {
    border-radius: 999px;
  }

  @media (max-width: 760px) {
    .dr-export-text {
      display: none;
    }
    .dr-export {
      padding: 0;
      width: 36px;
      justify-content: center;
    }
  }
</style>
