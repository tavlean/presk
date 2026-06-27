<script lang="ts">
  // Originally ported from Squoosh's Options/Range + its <range-input> custom
  // element; restyled as a modern slider. A native range input (transparent)
  // drives a styled track, thumb, and a value pill that appears while dragging;
  // a number input mirrors the value. `value` is bindable; label text comes
  // from children.
  import type { Snippet } from 'svelte';

  interface Props {
    value: number;
    min: number | string;
    max: number | string;
    step?: number | string;
    name?: string;
    disabled?: boolean;
    /** Forces decimal places in the bubble; otherwise derived from `step`. */
    labelPrecision?: string;
    /** Fires with the committed numeric value (for derived/inverted fields). */
    oninput?: (value: number) => void;
    children?: Snippet;
  }

  let {
    value = $bindable(),
    min,
    max,
    step = 1,
    name,
    disabled = false,
    labelPrecision = '',
    oninput,
    children,
  }: Props = $props();

  let active = $state(false);

  function precisionOf(s: string): number {
    const afterDecimal = s.split('.')[1];
    return afterDecimal ? afterDecimal.length : 0;
  }

  const percent = $derived(
    ((value - Number(min)) / (Number(max) - Number(min))) * 100,
  );

  const displayValue = $derived.by(() => {
    if (value >= 10000) return (value / 1000).toFixed(1) + 'k';
    const precision = Number(labelPrecision) || precisionOf(String(step)) || 0;
    return precision ? value.toFixed(precision) : Math.round(value).toString();
  });

  function commit(raw: string) {
    if (!raw.trim()) return;
    const next = Number(raw);
    if (Number.isNaN(next)) return;
    value = next;
    oninput?.(next);
  }

  function onPointerDown() {
    active = true;
    const up = () => {
      active = false;
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }
</script>

<label class="range">
  <span class="label-text">{@render children?.()}</span>
  <div class="range-wc-container">
    <div
      class="range-input"
      class:active
      class:disabled
      style="--value-percent: {percent}%"
    >
      <input
        class="input"
        type="range"
        {name}
        {min}
        {max}
        {step}
        {disabled}
        {value}
        oninput={(e) => commit(e.currentTarget.value)}
        onpointerdown={onPointerDown}
      />
      <div class="thumb-wrapper">
        <div class="thumb"></div>
        <div class="value-display">{displayValue}</div>
      </div>
    </div>
  </div>
  <input
    class="text-input"
    type="number"
    {min}
    {max}
    {step}
    {disabled}
    {value}
    oninput={(e) => commit(e.currentTarget.value)}
  />
</label>

<style>
  .range {
    position: relative;
    z-index: 0;
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    row-gap: 2px;
  }

  .label-text {
    color: var(--text-2, #a1a1aa);
  }

  .range-wc-container {
    position: relative;
    z-index: 1;
    grid-row: 2 / 3;
    grid-column: 1 / 3;
  }

  .range-input {
    position: relative;
    display: flex;
    height: 20px;
    width: 100%;
    margin: 2px 0;
    font: inherit;
    line-height: 16px;
    overflow: visible;
  }

  /* The track: a soft groove with the filled portion in the side's accent. */
  .range-input::before {
    content: '';
    display: block;
    position: absolute;
    top: 8px;
    left: 0;
    width: 100%;
    height: 4px;
    border-radius: 2px;
    background: linear-gradient(
        90deg,
        color-mix(in srgb, var(--main-theme-color) 65%, transparent),
        var(--main-theme-color)
      )
      0 / var(--value-percent, 0%) 100% no-repeat rgba(255, 255, 255, 0.12);
  }

  .input {
    position: relative;
    width: 100%;
    padding: 0;
    margin: 0;
    opacity: 0;
    cursor: pointer;
  }

  .thumb {
    pointer-events: none;
    position: absolute;
    bottom: 3px;
    left: 0;
    margin-left: -7px;
    background: #fff;
    border-radius: 50%;
    width: 14px;
    height: 14px;
    box-shadow:
      0 1px 4px rgba(0, 0, 0, 0.45),
      0 0 0 0 var(--accent-soft, rgba(255, 255, 255, 0.15));
    transition: box-shadow 150ms ease;
  }

  .range-input:focus-within .thumb,
  .range-input.active .thumb {
    box-shadow:
      0 1px 4px rgba(0, 0, 0, 0.45),
      0 0 0 5px var(--accent-soft, rgba(255, 255, 255, 0.15));
  }

  .thumb-wrapper {
    position: absolute;
    left: 7px;
    right: 7px;
    bottom: 0;
    height: 0;
    overflow: visible;
    transform: translate(var(--value-percent, 0%), 0);
    pointer-events: none;
  }

  /* Value pill shown above the thumb while dragging. */
  .value-display {
    position: absolute;
    box-sizing: border-box;
    left: 0;
    bottom: 24px;
    transform: translateX(-50%) translateY(4px) scale(0.8);
    transform-origin: 50% 100%;
    opacity: 0;
    background: var(--main-theme-color);
    color: #fff;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    font-size: 0.95em;
    line-height: 1;
    padding: 5px 8px;
    border-radius: 7px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    white-space: nowrap;
    transition:
      opacity 150ms ease,
      transform 150ms cubic-bezier(0.34, 1.3, 0.64, 1);
    will-change: transform;
    pointer-events: none;
  }

  .value-display::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: -3px;
    width: 7px;
    height: 7px;
    background: inherit;
    transform: translateX(-50%) rotate(45deg);
    border-radius: 1px;
  }

  .range-input.active .value-display {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }

  .range-input.disabled {
    filter: grayscale(1);
    opacity: 0.5;
    cursor: default;
  }

  .text-input {
    grid-row: 1 / 2;
    grid-column: 2 / 3;
    text-align: right;
    background: var(--field-bg, rgba(255, 255, 255, 0.06));
    color: inherit;
    font: inherit;
    font-variant-numeric: tabular-nums;
    border: 1px solid transparent;
    border-radius: 6px;
    padding: 2px 6px;
    box-sizing: border-box;
    width: 54px;
    -moz-appearance: textfield;
    appearance: textfield;
    transition:
      background-color 150ms ease,
      border-color 150ms ease;
  }

  .text-input:hover {
    background: var(--field-bg-hover, rgba(255, 255, 255, 0.1));
  }

  .text-input:focus {
    outline: none;
    border-color: var(--main-theme-color);
    background: var(--field-bg-hover, rgba(255, 255, 255, 0.1));
  }

  .text-input::-webkit-outer-spin-button,
  .text-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
</style>
