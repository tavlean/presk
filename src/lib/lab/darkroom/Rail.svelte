<script lang="ts">
  // The left icon rail: bare chips on the page background. Top: a Back chip
  // (hidden with no file). Middle: the two flyout openers (Image info, Compare) —
  // an open flyout's button reads as an active chip. Bottom: rotate + the theme
  // toggle. The parent owns which flyout is open and the theme state; the rail
  // just renders buttons and forwards intents, binding the two opener buttons so
  // the flyouts can anchor near them and restore focus on close.
  import ThemeToggle, { type ThemeMode } from './ThemeToggle.svelte';

  type Flyout = 'info' | 'compare' | null;

  interface Props {
    hasFile: boolean;
    openFlyout: Flyout;
    themeMode: ThemeMode;
    themeResolved: 'light' | 'dark';
    infoBtn?: HTMLButtonElement;
    compareBtn?: HTMLButtonElement;
    onBack: () => void;
    onToggleFlyout: (which: 'info' | 'compare') => void;
    onRotate: () => void;
    onCycleTheme: () => void;
  }

  let {
    hasFile,
    openFlyout,
    themeMode,
    themeResolved,
    infoBtn = $bindable(),
    compareBtn = $bindable(),
    onBack,
    onToggleFlyout,
    onRotate,
    onCycleTheme,
  }: Props = $props();
</script>

<nav class="dr-rail" aria-label="Tools">
  <div class="dr-rail-group">
    {#if hasFile}
      <button
        type="button"
        class="dr-rail-btn"
        data-tooltip="Back"
        aria-label="Back"
        onclick={() => onBack()}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M14 6l-6 6 6 6M8 12h11"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    {/if}
  </div>

  <div class="dr-rail-group">
    <button
      type="button"
      class="dr-rail-btn"
      class:active={openFlyout === 'info'}
      data-tooltip="Image info"
      aria-label="Image info"
      aria-pressed={openFlyout === 'info'}
      bind:this={infoBtn}
      onclick={() => onToggleFlyout('info')}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle
          cx="12"
          cy="12"
          r="9"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
        />
        <path
          d="M12 11v5"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
        <circle cx="12" cy="7.8" r="1.05" fill="currentColor" />
      </svg>
    </button>

    <button
      type="button"
      class="dr-rail-btn"
      class:active={openFlyout === 'compare'}
      data-tooltip="Compare"
      aria-label="Compare"
      aria-pressed={openFlyout === 'compare'}
      bind:this={compareBtn}
      onclick={() => onToggleFlyout('compare')}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect
          x="3.5"
          y="4.5"
          width="17"
          height="15"
          rx="2"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
        />
        <path
          d="M12 4.5v15"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
        />
      </svg>
    </button>
  </div>

  <div class="dr-rail-group dr-rail-bottom">
    <button
      type="button"
      class="dr-rail-btn"
      data-tooltip="Rotate"
      aria-label="Rotate"
      onclick={() => onRotate()}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M4.5 9A8 8 0 1 1 4 13"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
        <path
          d="M4.5 4.5v4.8h4.8"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    <ThemeToggle
      mode={themeMode}
      resolved={themeResolved}
      onCycle={onCycleTheme}
    />
  </div>
</nav>

<style>
  .dr-rail {
    position: fixed;
    top: 68px;
    left: 12px;
    bottom: 76px;
    z-index: 20;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .dr-rail-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .dr-rail-bottom {
    margin-top: auto;
  }
</style>
