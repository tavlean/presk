<script lang="ts">
  // Ported from src/features/encoders/mozJPEG/client/index.tsx at parity.
  // mozJPEG stores its toggles as booleans, so the checkboxes bind directly.
  import { slide } from 'svelte/transition';
  import {
    MozJpegColorSpace,
    type EncodeOptions,
  } from 'features/encoders/mozJPEG/shared/meta';
  import Range from './Range.svelte';
  import Checkbox from './Checkbox.svelte';
  import Revealer from './Revealer.svelte';
  import Select from './Select.svelte';

  let { options }: { options: EncodeOptions } = $props();

  let showAdvanced = $state(false);
</script>

<form class="options-section" onsubmit={(e) => e.preventDefault()}>
  <div class="option-one-cell">
    <Range min={0} max={100} bind:value={options.quality}>Quality:</Range>
  </div>

  <label class="option-reveal">
    <Revealer bind:checked={showAdvanced} />
    Advanced settings
  </label>

  {#if showAdvanced}
    <div transition:slide={{ duration: 300 }}>
      <label class="option-text-first">
        Channels:
        <Select
          value={String(options.color_space)}
          onchange={(e) =>
            (options.color_space = Number(
              (e.currentTarget as HTMLSelectElement).value,
            ) as MozJpegColorSpace)}
        >
          <option value={String(MozJpegColorSpace.GRAYSCALE)}>Grayscale</option>
          <option value={String(MozJpegColorSpace.RGB)}>RGB</option>
          <option value={String(MozJpegColorSpace.YCbCr)}>YCbCr</option>
        </Select>
      </label>

      {#if options.color_space === MozJpegColorSpace.YCbCr}
        <div transition:slide={{ duration: 300 }}>
          <label class="option-toggle">
            Auto subsample chroma
            <Checkbox bind:checked={options.auto_subsample} />
          </label>
          {#if !options.auto_subsample}
            <div class="option-one-cell" transition:slide={{ duration: 300 }}>
              <Range min={1} max={4} bind:value={options.chroma_subsample}
                >Subsample chroma by:</Range
              >
            </div>
          {/if}
          <label class="option-toggle">
            Separate chroma quality
            <Checkbox bind:checked={options.separate_chroma_quality} />
          </label>
          {#if options.separate_chroma_quality}
            <div class="option-one-cell" transition:slide={{ duration: 300 }}>
              <Range min={0} max={100} bind:value={options.chroma_quality}
                >Chroma quality:</Range
              >
            </div>
          {/if}
        </div>
      {/if}

      <label class="option-toggle">
        Pointless spec compliance
        <Checkbox bind:checked={options.baseline} />
      </label>
      {#if !options.baseline}
        <label class="option-toggle" transition:slide={{ duration: 300 }}>
          Progressive rendering
          <Checkbox bind:checked={options.progressive} />
        </label>
      {:else}
        <label class="option-toggle" transition:slide={{ duration: 300 }}>
          Optimize Huffman table
          <Checkbox bind:checked={options.optimize_coding} />
        </label>
      {/if}

      <div class="option-one-cell">
        <Range min={0} max={100} bind:value={options.smoothing}>Smoothing:</Range
        >
      </div>

      <label class="option-text-first">
        Quantization:
        <Select
          value={String(options.quant_table)}
          onchange={(e) =>
            (options.quant_table = Number(
              (e.currentTarget as HTMLSelectElement).value,
            ))}
        >
          <option value="0">JPEG Annex K</option>
          <option value="1">Flat</option>
          <option value="2">MSSIM-tuned Kodak</option>
          <option value="3">ImageMagick</option>
          <option value="4">PSNR-HVS-M-tuned Kodak</option>
          <option value="5">Klein et al</option>
          <option value="6">Watson et al</option>
          <option value="7">Ahumada et al</option>
          <option value="8">Peterson et al</option>
        </Select>
      </label>

      <label class="option-toggle">
        Trellis multipass
        <Checkbox bind:checked={options.trellis_multipass} />
      </label>
      {#if options.trellis_multipass}
        <label class="option-toggle" transition:slide={{ duration: 300 }}>
          Optimize zero block runs
          <Checkbox bind:checked={options.trellis_opt_zero} />
        </label>
      {/if}
      <label class="option-toggle">
        Optimize after trellis quantization
        <Checkbox bind:checked={options.trellis_opt_table} />
      </label>
      <div class="option-one-cell">
        <Range min={1} max={50} bind:value={options.trellis_loops}
          >Trellis quantization passes:</Range
        >
      </div>
    </div>
  {/if}
</form>
