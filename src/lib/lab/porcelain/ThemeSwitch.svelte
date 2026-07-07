<script lang="ts">
  // Lab-only System/Light/Dark forcer, pinned top-right (the only corner no
  // floating panel reaches; bottom corners belong to the panels). It doesn't touch
  // production theming — it just reports the chosen mode up to the page, which
  // toggles `force-light` / `force-dark` on the porcelain root. `light-dark()`
  // in porcelain.css resolves against that root's `color-scheme`, so forcing the
  // scheme flips every token at once. Default = System (no class).
  import Segmented from './Segmented.svelte';

  export type ThemeMode = 'system' | 'light' | 'dark';

  interface Props {
    value: ThemeMode;
    onchange: (mode: ThemeMode) => void;
  }

  let { value, onchange }: Props = $props();

  const options = [
    { id: 'system', label: 'System' },
    { id: 'light', label: 'Light' },
    { id: 'dark', label: 'Dark' },
  ];
</script>

<div class="theme-switch">
  <span class="caption" aria-hidden="true">◐ porcelain lab</span>
  <div class="pill">
    <Segmented
      {options}
      {value}
      small
      ariaLabel="Theme"
      onchange={(id) => onchange(id as ThemeMode)}
    />
  </div>
</div>

<style>
  .theme-switch {
    position: fixed;
    right: 16px;
    top: 20px;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 9px;
  }

  .caption {
    font-size: 11px;
    font-weight: 500;
    color: var(--pc-text-3);
    white-space: nowrap;
  }

  .pill {
    padding: 3px;
    border-radius: 13px;
    background: var(--pc-surface);
    border: 1px solid var(--pc-border);
    box-shadow: var(--pc-shadow-control);
  }
  @supports (corner-shape: squircle) {
    .pill {
      corner-shape: squircle;
      border-radius: 15px;
    }
  }

  @media (max-width: 760px) {
    .theme-switch .caption {
      display: none;
    }
  }
</style>
