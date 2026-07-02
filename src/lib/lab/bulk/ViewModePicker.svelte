<script lang="ts">
  import { labBulk, type StripSize } from './store.svelte';

  const OPTIONS: {
    id: StripSize;
    title: string;
    glyph: { w: number; h: number };
  }[] = [
    { id: 'l', title: 'Large thumbnails', glyph: { w: 16, h: 12 } },
    { id: 'm', title: 'Medium thumbnails', glyph: { w: 12, h: 9 } },
    { id: 's', title: 'Small thumbnails', glyph: { w: 8, h: 6 } },
  ];

  function setMode(next: StripSize): void {
    labBulk.setStripSize(next);
  }
</script>

<div class="view-mode" role="radiogroup" aria-label="Bulk view mode">
  {#each OPTIONS as option (option.id)}
    <button
      type="button"
      class={{ active: labBulk.stripSize === option.id }}
      role="radio"
      aria-checked={labBulk.stripSize === option.id}
      title={option.title}
      aria-label={option.title}
      onclick={() => setMode(option.id)}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect
          x={(24 - option.glyph.w) / 2}
          y={(24 - option.glyph.h) / 2}
          width={option.glyph.w}
          height={option.glyph.h}
          rx="2"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        />
      </svg>
    </button>
  {/each}
</div>

<style>
  .view-mode {
    flex: none;
    align-self: center;
    display: inline-flex;
    align-items: center;
    gap: 1px;
    padding: 2px;
    border-radius: 999px;
    background: var(--surface-raise, rgba(255, 255, 255, 0.06));
    border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
  }
  .view-mode button {
    display: grid;
    place-items: center;
    width: 31px;
    height: 31px;
    padding: 0;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: var(--text-3, rgba(235, 235, 245, 0.38));
    cursor: pointer;
    transition:
      background-color 150ms ease,
      color 150ms ease,
      transform 150ms ease;
  }
  .view-mode button svg {
    width: 21px;
    height: 21px;
    display: block;
  }
  .view-mode button:hover:not(.active) {
    color: var(--text-1, #f5f5f7);
    transform: translateY(-1px);
  }
  .view-mode button.active {
    background: var(--accent-2, #53b2ff);
    color: #16161c;
  }
  .view-mode button:focus-visible {
    outline: 2px solid var(--accent-2, #53b2ff);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    .view-mode button:hover:not(.active) {
      transform: none;
    }
  }

  @media (max-width: 420px) {
    .view-mode button {
      width: 28px;
      height: 28px;
    }
    .view-mode button svg {
      width: 19px;
      height: 19px;
    }
  }
</style>
