<script lang="ts">
  // Browser-native JPEG encoder options. Mirrors the original
  // features/encoders/browserJPEG/client: a single quality slider on a 0–1
  // scale (canvas.toBlob's quality argument), distinct from the WASM encoders'
  // 0–100 scale. Mutates the options object in place.
  import Range from './Range.svelte';
  import OptionRow from './OptionRow.svelte';

  let { options }: { options: { quality: number } } = $props();
</script>

<form class="options-section" onsubmit={(e) => e.preventDefault()}>
  <!-- The codec runs on 0–1, but every other quality slider in the app reads
       0–100 — present the same scale and map underneath. -->
  <OptionRow>
    <Range
      min={0}
      max={100}
      step={1}
      value={Math.round(options.quality * 100)}
      oninput={(v) => (options.quality = v / 100)}>Quality:</Range
    >
  </OptionRow>
</form>
