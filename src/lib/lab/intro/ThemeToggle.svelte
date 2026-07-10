<script lang="ts">
  // Inline System → Light → Dark cycler for the intro-lab variants' headers.
  // Unlike the editor labs' fixed-corner segmented pill, this is a single
  // compact button a variant places INSIDE its own header layout. It only
  // reports the mode up; the page toggles force-light/force-dark on its
  // .intro-lab-root, and light-dark() does the rest.
  import Icon from './Icon.svelte';

  export type ThemeMode = 'system' | 'light' | 'dark';

  interface Props {
    value: ThemeMode;
    onchange: (mode: ThemeMode) => void;
  }

  let { value, onchange }: Props = $props();

  const next: Record<ThemeMode, ThemeMode> = {
    system: 'light',
    light: 'dark',
    dark: 'system',
  };
  const label = $derived(
    value === 'system' ? 'Auto' : value === 'light' ? 'Light' : 'Dark',
  );
</script>

<button
  type="button"
  class="theme-toggle"
  title="Theme: {label} — click to change"
  aria-label="Theme: {label} — click to change"
  onclick={() => onchange(next[value])}
>
  {#if value === 'light'}
    <Icon name="theme-sun" size={17} />
  {:else if value === 'dark'}
    <Icon name="theme-moon" size={17} />
  {:else}
    <Icon name="theme-auto" size={17} />
  {/if}
</button>

<style>
  .theme-toggle {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    padding: 0;
    border: 1px solid var(--il-border);
    border-radius: 10px;
    background: transparent;
    color: var(--il-text-2);
    cursor: pointer;
    transition:
      color 150ms ease,
      border-color 150ms ease,
      background-color 150ms ease;
  }
  @supports (corner-shape: squircle) {
    .theme-toggle {
      corner-shape: squircle;
      border-radius: 12px;
    }
  }
  .theme-toggle:hover {
    color: var(--il-text-1);
    border-color: var(--il-border-strong);
    background: var(--il-surface);
  }
</style>
