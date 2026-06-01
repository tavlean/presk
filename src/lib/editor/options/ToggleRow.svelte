<script lang="ts">
  // Label + control row — the `option-toggle` grid wrapper (text on the left,
  // a Checkbox/Toggle on the right; layout in theme.css). Extracted to replace
  // the `<label class="option-toggle">…</label>` wrapper repeated across the
  // panels. `class` adds the gray "section-enabler" variant; `slide` plays the
  // 300ms reveal for rows that appear/disappear behind another toggle.
  import type { Snippet } from 'svelte';
  import { slide } from 'svelte/transition';

  let {
    label,
    class: extraClass = '',
    slide: animate = false,
    children,
  }: {
    label: string;
    class?: string;
    slide?: boolean;
    children: Snippet;
  } = $props();
</script>

{#if animate}
  <label
    class={['option-toggle', extraClass]}
    transition:slide={{ duration: 300 }}
  >
    {label}
    {@render children()}
  </label>
{:else}
  <label class={['option-toggle', extraClass]}>
    {label}
    {@render children()}
  </label>
{/if}
