<script lang="ts">
  // Inline-SVG host for the lab's shared Nucleo icon set ($lib/lab/icons).
  // Icons arrive as `?raw` import strings so there's no runtime fetch, and
  // every glyph strokes with currentColor — color belongs to the control.
  let { svg, size = 16 }: { svg: string; size?: number } = $props();
</script>

<!-- eslint-disable-next-line svelte/no-at-html-tags — build-time SVG strings from our own repo -->
<span
  class="lab-icon"
  style:width="{size}px"
  style:height="{size}px"
  aria-hidden="true">{@html svg}</span
>

<style>
  .lab-icon {
    display: inline-flex;
    flex: none;
  }
  .lab-icon :global(svg) {
    width: 100%;
    height: 100%;
    display: block;
  }
</style>
