<script lang="ts">
  // A styled native select with a custom chevron. Originally ported from
  // Squoosh's Options/Select; restyled as a soft glass field. `value` is
  // bindable; children supply <option>s.
  import type { Snippet } from 'svelte';

  interface Props {
    value?: string | number;
    name?: string;
    large?: boolean;
    disabled?: boolean;
    onchange?: (value: string) => void;
    children: Snippet;
  }

  let {
    value = $bindable(),
    name,
    large = false,
    disabled = false,
    onchange,
    children,
  }: Props = $props();
</script>

<div class="select">
  <select
    class="builtin-select"
    class:large
    {name}
    {disabled}
    bind:value
    onchange={(e) => onchange?.(e.currentTarget.value)}
  >
    {@render children()}
  </select>
  <div class="arrow">
    <svg viewBox="0 -1.95 9.8 9.8" aria-hidden="true">
      <path
        d="M8.2.2a1 1 0 011.4 1.4l-4 4a1 1 0 01-1.4 0l-4-4A1 1 0 011.6.2l3.3 3.3L8.2.2z"
      />
    </svg>
  </div>
</div>

<style>
  .select {
    position: relative;
  }

  .builtin-select {
    background: var(--field-bg, rgba(255, 255, 255, 0.06));
    border: 1px solid var(--stroke, rgba(255, 255, 255, 0.08));
    border-radius: 9px;
    font: inherit;
    padding: 7px 0;
    padding-right: 26px;
    padding-left: 10px;
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    color: var(--text-1, #fafafa);
    width: 100%;
    cursor: pointer;
    transition:
      background-color 150ms ease,
      border-color 150ms ease;
  }

  .builtin-select:hover {
    background: var(--field-bg-hover, rgba(255, 255, 255, 0.1));
  }

  .builtin-select:focus-visible {
    outline: none;
    border-color: var(--main-theme-color);
  }

  /* Native dropdown list renders on the OS side; keep its text legible. */
  .builtin-select option {
    background: #18181b;
    color: #fafafa;
  }

  .arrow {
    position: absolute;
    right: 9px;
    top: 50%;
    transform: translateY(-50%);
    fill: var(--text-2, #a1a1aa);
    width: 10px;
    pointer-events: none;
  }

  .arrow svg {
    display: block;
    width: 100%;
  }

  .large {
    padding: 10px 35px 10px 12px;
    font-weight: 600;
    background: var(--field-bg, rgba(255, 255, 255, 0.06));
    border-color: var(--stroke-strong, rgba(255, 255, 255, 0.16));
    border-radius: 10px;
  }

  .large + .arrow {
    right: 13px;
  }
</style>
