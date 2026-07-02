<script lang="ts">
  // Scope-aware WebP compression controls (design doc §4, §5).
  //
  //  - scope="global": plain Quality/Effort editing the batch globals.
  //  - scope="image":  shows the SELECTED job's EFFECTIVE values; editing a
  //    control creates a per-image override. Each overridden control gets a
  //    small coral dot before its label + a circular-arrow reset; a "Reset all
  //    to global" text button appears at the bottom while any override exists.
  //
  // No slider recoloring, no count badges — signaling is dots + reset only.
  // Format is locked to WebP, so only Quality (0–100) and Effort (0–6, mapped
  // to the WebP `method` field) are exposed.
  import Range from '$lib/editor/options/Range.svelte';
  import { labBulk, LabBulk } from './store.svelte';

  interface Props {
    scope: 'global' | 'image';
  }

  let { scope }: Props = $props();

  // The settings whose values the sliders display: globals for global scope,
  // the selected job's effective (global+override) settings for image scope.
  const settings = $derived(
    scope === 'global'
      ? labBulk.session.globalSettings
      : labBulk.selectedEffectiveSettings,
  );
  const options = $derived(LabBulk.webpOptions(settings));

  const quality = $derived(Number(options.quality ?? 80));
  const effort = $derived(Number(options.method ?? 6));

  // Which controls carry an override on the selected job (image scope only).
  // encoderState is a single leaf here (format is locked, so the option-object
  // override marks BOTH quality and effort as deviating together).
  const overridePaths = $derived(
    scope === 'image' && labBulk.selectedId
      ? labBulk.overridePaths(labBulk.selectedId)
      : [],
  );
  const encoderOverridden = $derived(overridePaths.includes('encoderState'));
  const hasAnyOverride = $derived(overridePaths.length > 0);

  function setQuality(value: number) {
    if (scope === 'global') labBulk.updateGlobal({ quality: value });
    else labBulk.overrideSelected({ quality: value });
  }

  function setEffort(value: number) {
    if (scope === 'global') labBulk.updateGlobal({ method: value });
    else labBulk.overrideSelected({ method: value });
  }

  function resetEncoder() {
    if (labBulk.selectedId) {
      labBulk.resetOverridePath(labBulk.selectedId, 'encoderState');
    }
  }

  function resetAll() {
    if (labBulk.selectedId) labBulk.resetAllOverrides(labBulk.selectedId);
  }
</script>

<div class="controls" class:image-scope={scope === 'image'}>
  <div class="control">
    <div class="control-head">
      <span class="label">
        {#if scope === 'image' && encoderOverridden}
          <span class="dot" aria-label="Overridden"></span>
        {/if}
        Quality
      </span>
      <span class="value">{quality}</span>
      {#if scope === 'image' && encoderOverridden}
        <button
          type="button"
          class="reset"
          title="Reset to global"
          aria-label="Reset quality to global"
          onclick={resetEncoder}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M13.6 8a5.6 5.6 0 1 1-1.64-3.96M13.6 2.4V5.2H10.8"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      {/if}
    </div>
    <Range value={quality} min={0} max={100} oninput={setQuality} />
  </div>

  <div class="control">
    <div class="control-head">
      <span class="label">
        {#if scope === 'image' && encoderOverridden}
          <span class="dot" aria-label="Overridden"></span>
        {/if}
        Effort
      </span>
      <span class="value">{effort}</span>
      {#if scope === 'image' && encoderOverridden}
        <button
          type="button"
          class="reset"
          title="Reset to global"
          aria-label="Reset effort to global"
          onclick={resetEncoder}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M13.6 8a5.6 5.6 0 1 1-1.64-3.96M13.6 2.4V5.2H10.8"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      {/if}
    </div>
    <Range value={effort} min={0} max={6} snap={false} oninput={setEffort} />
  </div>

  {#if scope === 'image' && hasAnyOverride}
    <button type="button" class="reset-all" onclick={resetAll}>
      Reset all to global
    </button>
  {/if}
</div>

<style>
  .controls {
    display: grid;
    gap: 18px;
    /* Coral accent drives the slider fill/thumb in image scope (per side
       accents live on .options-N in production; the lab uses a single coral). */
    --main-theme-color: var(--accent-1, #ff8a5e);
    --hot-theme-color: var(--accent-1-hot, #ff6a3c);
    --main-theme-glow: var(--accent-1-glow, rgba(255, 122, 80, 0.32));
  }

  .control-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 2px;
  }

  .label {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: var(--text-2, rgba(235, 235, 245, 0.62));
    font-weight: 500;
  }

  .value {
    margin-left: auto;
    color: var(--text-1, #f5f5f7);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--accent-1, #ff8a5e);
    flex: none;
  }

  .reset {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: var(--text-3, rgba(235, 235, 245, 0.38));
    cursor: pointer;
    transition:
      color 150ms ease,
      background-color 150ms ease;
  }

  .reset:hover {
    color: var(--text-1, #f5f5f7);
    background: var(--surface-raise, rgba(255, 255, 255, 0.06));
  }

  .reset svg {
    width: 14px;
    height: 14px;
  }

  .reset-all {
    justify-self: center;
    margin-top: 2px;
    padding: 6px 10px;
    border: none;
    background: transparent;
    color: var(--text-2, rgba(235, 235, 245, 0.62));
    font: inherit;
    font-weight: 600;
    cursor: pointer;
    border-radius: 8px;
    transition: color 150ms ease;
  }

  .reset-all:hover {
    color: var(--accent-1, #ff8a5e);
  }
</style>
