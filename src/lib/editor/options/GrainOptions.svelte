<script lang="ts">
  // Single-control panel by design: the calibrated grain model pins size and
  // roughness to film-plausible constants (docs/specs/2026-07-12-film-grain.md),
  // leaving Amount as the only knob. Mutates the grain processor options in
  // place.
  import Range from './Range.svelte';
  import OptionRow from './OptionRow.svelte';
  import type { GrainOptionsState } from './processor-types';

  let { options }: { options: GrainOptionsState } = $props();
</script>

<form class="options-section" onsubmit={(e) => e.preventDefault()}>
  <OptionRow>
    <Range min={0} max={100} bind:value={options.amount}>Amount:</Range>
  </OptionRow>
</form>
