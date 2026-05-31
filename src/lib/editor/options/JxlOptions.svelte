<script lang="ts">
  // Ported from src/features/encoders/jxl/client/index.tsx at parity.
  // The UI form-state is derived from the encoder options once, then written back
  // via apply() on every change (mirrors the Preact getDerivedStateFromProps).
  import { untrack } from 'svelte';
  import { slide } from 'svelte/transition';
  import type { EncodeOptions } from 'features/encoders/jxl/shared/meta';
  import Range from './Range.svelte';
  import Checkbox from './Checkbox.svelte';

  let { options }: { options: EncodeOptions } = $props();

  // Seed the editable UI state from the incoming options once; the panel writes
  // changes back through apply() and never reassigns `options`.
  const o = untrack(() => $state.snapshot(options));

  let effort = $state(o.effort);
  let quality = $state(o.quality);
  let progressive = $state(o.progressive);
  let edgePreservingFilter = $state(o.epf === -1 ? 2 : o.epf);
  let lossless = $state(o.quality === 100);
  let slightLoss = $state(o.lossyPalette);
  let autoEdgePreservingFilter = $state(o.epf === -1);
  let decodingSpeedTier = $state(o.decodingSpeedTier);
  let photonNoiseIso = $state(o.photonNoiseIso);
  let alternativeLossy = $state(o.lossyModular);
  let showAdvanced = $state(false);

  function apply() {
    options.effort = effort;
    options.quality = lossless ? 100 : quality;
    options.progressive = progressive;
    options.epf = autoEdgePreservingFilter ? -1 : edgePreservingFilter;
    options.lossyPalette = lossless ? slightLoss : false;
    options.decodingSpeedTier = decodingSpeedTier;
    options.photonNoiseIso = photonNoiseIso;
    options.lossyModular = quality < 7 ? true : alternativeLossy;
  }

  const checked = (e: Event) => (e.currentTarget as HTMLInputElement).checked;
</script>

<form class="options-section" onsubmit={(e) => e.preventDefault()}>
  <label class="option-toggle">
    Lossless
    <Checkbox
      checked={lossless}
      onchange={(e) => {
        lossless = checked(e);
        apply();
      }}
    />
  </label>

  {#if lossless}
    <label class="option-toggle" transition:slide={{ duration: 300 }}>
      Slight loss
      <Checkbox
        checked={slightLoss}
        onchange={(e) => {
          slightLoss = checked(e);
          apply();
        }}
      />
    </label>
  {:else}
    <div transition:slide={{ duration: 300 }}>
      <div class="option-one-cell">
        <Range
          min={0}
          max={99.9}
          step={0.1}
          value={quality}
          oninput={(v) => {
            quality = v;
            apply();
          }}>Quality:</Range
        >
      </div>
      <label class="option-toggle">
        Alternative lossy mode
        <Checkbox
          checked={quality < 7 ? true : alternativeLossy}
          disabled={quality < 7}
          onchange={(e) => {
            alternativeLossy = checked(e);
            apply();
          }}
        />
      </label>
      <label class="option-toggle">
        Auto edge filter
        <Checkbox
          checked={autoEdgePreservingFilter}
          onchange={(e) => {
            autoEdgePreservingFilter = checked(e);
            apply();
          }}
        />
      </label>
      {#if !autoEdgePreservingFilter}
        <div class="option-one-cell" transition:slide={{ duration: 300 }}>
          <Range
            min={0}
            max={3}
            value={edgePreservingFilter}
            oninput={(v) => {
              edgePreservingFilter = v;
              apply();
            }}>Edge preserving filter:</Range
          >
        </div>
      {/if}
      <div class="option-one-cell">
        <Range
          min={0}
          max={4}
          value={decodingSpeedTier}
          oninput={(v) => {
            decodingSpeedTier = v;
            apply();
          }}>Optimise for decoding speed (worse compression):</Range
        >
      </div>
      <div class="option-one-cell">
        <Range
          min={0}
          max={50000}
          step={100}
          value={photonNoiseIso}
          oninput={(v) => {
            photonNoiseIso = v;
            apply();
          }}>Noise equivalent to ISO:</Range
        >
      </div>
    </div>
  {/if}

  <label class="option-toggle">
    Progressive rendering
    <Checkbox
      checked={progressive}
      onchange={(e) => {
        progressive = checked(e);
        apply();
      }}
    />
  </label>
  <div class="option-one-cell">
    <Range
      min={1}
      max={9}
      value={effort}
      oninput={(v) => {
        effort = v;
        apply();
      }}>Effort:</Range
    >
  </div>
</form>
