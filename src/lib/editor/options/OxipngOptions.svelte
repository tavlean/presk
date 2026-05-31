<script lang="ts">
  // Ported from src/features/encoders/oxiPNG/client/index.tsx at parity.
  import type { EncodeOptions } from 'features/encoders/oxiPNG/shared/meta';
  import Range from './Range.svelte';
  import Checkbox from './Checkbox.svelte';

  let { options }: { options: EncodeOptions } = $props();
</script>

<form class="options-section" onsubmit={(e) => e.preventDefault()}>
  <label class="option-toggle">
    Interlace
    <Checkbox bind:checked={options.interlace} />
  </label>
  <div class="option-one-cell">
    <Range min={0} max={6} step={1} bind:value={options.level}>Effort:</Range>
  </div>
</form>
