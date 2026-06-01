<script lang="ts">
  // Single-column option row — the `option-one-cell` grid wrapper (layout lives
  // in theme.css) that every Range sits in. Extracted to replace the wrapper
  // `<div class="option-one-cell">` repeated across the encoder panels.
  // `slide` plays the same 300ms reveal the panels used inline for rows that
  // appear/disappear behind a toggle.
  import type { Snippet } from 'svelte';
  import { slide } from 'svelte/transition';

  let {
    slide: animate = false,
    children,
  }: { slide?: boolean; children: Snippet } = $props();
</script>

{#if animate}
  <div class="option-one-cell" transition:slide={{ duration: 300 }}>
    {@render children()}
  </div>
{:else}
  <div class="option-one-cell">
    {@render children()}
  </div>
{/if}
