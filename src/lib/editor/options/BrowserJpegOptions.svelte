<script lang="ts">
  // Browser-native JPEG encoder options. Mirrors the original
  // features/encoders/browserJPEG/client: a single quality slider on a 0–1
  // scale (canvas.toBlob's quality argument), distinct from the WASM encoders'
  // 0–100 scale. Mutates the options object in place.
  import Range from './Range.svelte';

  let { options }: { options: { quality: number } } = $props();
</script>

<form class="options-section" onsubmit={(e) => e.preventDefault()}>
  <div class="option-one-cell">
    <Range min={0} max={1} step={0.01} bind:value={options.quality}
      >Quality:</Range
    >
  </div>
</form>
