<script lang="ts">
  // Ported from src/client/lazy-app/Compress/Options/Select — a styled native
  // select with a custom arrow. `value` is bindable; children supply <option>s.
  import type { Snippet } from 'svelte';

  interface Props {
    value?: string | number;
    name?: string;
    large?: boolean;
    disabled?: boolean;
    onchange?: (event: Event) => void;
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
    {onchange}
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
    background: var(--black);
    border-radius: 4px;
    font: inherit;
    padding: 7px 0;
    padding-right: 25px;
    padding-left: 10px;
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    border: none;
    color: #fff;
    width: 100%;
  }

  .arrow {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    fill: #fff;
    width: 10px;
    pointer-events: none;
  }

  .arrow svg {
    display: block;
    width: 100%;
  }

  .large {
    padding: 10px 35px 10px 10px;
    background: var(--dark-gray);
  }

  .large + .arrow {
    right: 13px;
  }
</style>
