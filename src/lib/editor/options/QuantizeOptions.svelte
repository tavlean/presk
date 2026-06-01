<script lang="ts">
  // Ported from src/features/processors/quantize/client/index.tsx (the standard
  // controls; the konami "ZX" easter-egg type is omitted). Mutates the quantize
  // processor options in place.
  import Range from './Range.svelte';
  import OptionRow from './OptionRow.svelte';
  import type { QuantizeOptionsState } from './processor-types';

  let { options }: { options: QuantizeOptionsState } = $props();
</script>

<form class="options-section" onsubmit={(e) => e.preventDefault()}>
  <OptionRow>
    <Range min={2} max={256} bind:value={options.maxNumColors}>Colors:</Range>
  </OptionRow>
  <OptionRow>
    <Range min={0} max={1} step={0.01} bind:value={options.dither}
      >Dithering:</Range
    >
  </OptionRow>
</form>
