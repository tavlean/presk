<script lang="ts">
  // The result footer of each side's panel: output filesize + a semantic
  // delta badge (green = smaller, red = larger) and the download button.
  // Accent-tinted per side via the inherited --main-theme-color /
  // --hot-theme-color custom properties.

  interface Props {
    /** Which side this footer belongs to (kept for parity; layout is uniform). */
    side: 'left' | 'right';
    /** Output size in bytes (null while encoding / before first result). */
    size: number | null;
    /** Signed percent change vs the original (negative = smaller = good). */
    percent: number | null;
    /** True for the Original/identity side: hides the delta badge. */
    isOriginal: boolean;
    downloadHref: string;
    downloadName: string;
    /** Short format label shown under the size. */
    typeLabel: string;
    loading: boolean;
    disabled: boolean;
  }

  let {
    side,
    size,
    percent,
    isOriginal,
    downloadHref,
    downloadName,
    typeLabel,
    loading,
    disabled,
  }: Props = $props();

  // Decimal (SI, base-1000) units with 3 significant figures, matching the
  // original's Results/pretty-bytes.ts (so displayed sizes are identical).
  const SIZE_UNITS = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  function prettySize(bytes: number): { value: string; unit: string } {
    if (bytes < 1) return { value: '0', unit: 'B' };
    const exponent = Math.min(
      Math.floor(Math.log10(bytes) / 3),
      SIZE_UNITS.length - 1,
    );
    return {
      value: (bytes / 1000 ** exponent).toPrecision(3),
      unit: SIZE_UNITS[exponent],
    };
  }

  const pretty = $derived(size === null ? null : prettySize(size));
  const direction = $derived(
    isOriginal || percent === null || percent === 0
      ? null
      : percent < 0
        ? 'down'
        : 'up',
  );
  const percentMagnitude = $derived(
    percent === null ? '' : String(Math.abs(Math.round(percent))),
  );
</script>

<div class="results" data-side={side}>
  <div class="stats">
    <div class="size-row">
      <span class="file-size">
        {#if pretty}
          {pretty.value}<span class="unit">{pretty.unit}</span>
        {:else}
          <span class="pending">…</span>
        {/if}
      </span>
      {#if direction}
        <span
          class="delta"
          class:down={direction === 'down'}
          class:up={direction === 'up'}
        >
          <svg class="delta-arrow" viewBox="0 0 10 10" aria-hidden="true">
            {#if direction === 'down'}
              <path
                d="M5 1v6.6M2 5.2L5 8.3l3-3.1"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            {:else}
              <path
                d="M5 9V2.4M2 4.8L5 1.7l3 3.1"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            {/if}
          </svg>{percentMagnitude}%
        </span>
      {/if}
    </div>
    <span class="type-label">{isOriginal ? 'Original' : typeLabel}</span>
  </div>
  <a
    class="download"
    class:ghost={isOriginal}
    class:download-disable={disabled}
    href={disabled ? undefined : downloadHref}
    download={disabled ? undefined : downloadName}
    title="Download"
    aria-disabled={disabled}
  >
    {#if loading}
      <span class="spinner" aria-hidden="true"></span>
    {:else}
      <svg class="download-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 3v10.2m0 0l4.2-4.2M12 13.2L7.8 9M4.5 16.5v2.3c0 .9.8 1.7 1.7 1.7h11.6c.9 0 1.7-.8 1.7-1.7v-2.3"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    {/if}
    <span class="download-text">Save</span>
  </a>
</div>

<style>
  .results {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    padding: 10px var(--horizontal-padding, 16px) 12px;
    min-width: 0;
  }

  .stats {
    display: grid;
    gap: 1px;
    min-width: 0;
  }

  .size-row {
    display: flex;
    align-items: baseline;
    gap: 7px;
    min-width: 0;
  }

  .file-size {
    font-size: 1.7rem;
    font-weight: 700;
    letter-spacing: 0.01em;
    font-variant-numeric: tabular-nums;
    color: var(--text-1);
    white-space: nowrap;
  }

  .unit {
    font-size: 1.1rem;
    font-weight: 600;
    margin-left: 2px;
    color: var(--main-theme-color);
  }

  .pending {
    color: var(--text-3);
  }

  .delta {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    align-self: center;
    padding: 2px 7px 2px 5px;
    border-radius: 999px;
    font-size: 1.05rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .delta.down {
    color: var(--good);
    background: color-mix(in srgb, var(--good) 14%, transparent);
  }

  .delta.up {
    color: var(--bad);
    background: color-mix(in srgb, var(--bad) 14%, transparent);
  }

  .delta-arrow {
    width: 10px;
    height: 10px;
  }

  .type-label {
    font-size: 0.95rem;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-3);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .download {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 34px;
    padding: 0 14px;
    border-radius: 999px;
    background: linear-gradient(
      135deg,
      var(--main-theme-color),
      var(--hot-theme-color)
    );
    color: #16161c;
    font-weight: 700;
    font-size: 1.05rem;
    text-decoration: none;
    box-shadow:
      0 4px 14px var(--main-theme-glow, transparent),
      inset 0 1px 0 rgba(255, 255, 255, 0.25);
    transition:
      transform 150ms ease,
      box-shadow 200ms ease,
      opacity 200ms ease,
      filter 200ms ease;
  }

  .download:hover {
    transform: translateY(-1px);
    filter: brightness(1.06);
    box-shadow:
      0 6px 20px var(--main-theme-glow, transparent),
      inset 0 1px 0 rgba(255, 255, 255, 0.25);
  }

  .download:active {
    transform: translateY(0);
  }

  .download:focus-visible {
    outline: 2px solid var(--main-theme-color);
    outline-offset: 2px;
  }

  /* The Original side: quieter outline button (still downloads the source). */
  .download.ghost {
    background: var(--surface-raise);
    color: var(--text-1);
    border: 1px solid var(--border-strong);
    box-shadow: none;
  }

  .download.ghost:hover {
    background: var(--surface-raise-2);
  }

  .download-icon {
    width: 15px;
    height: 15px;
  }

  .download-disable {
    pointer-events: none;
    opacity: 0.45;
    filter: saturate(0.4);
  }

  .spinner {
    width: 13px;
    height: 13px;
    border: 2px solid rgba(0, 0, 0, 0.25);
    border-top-color: rgba(0, 0, 0, 0.75);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .download.ghost .spinner {
    border-color: rgba(255, 255, 255, 0.25);
    border-top-color: #fff;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 760px) {
    .results {
      padding: 6px var(--horizontal-padding, 12px) 8px;
      gap: 8px;
    }

    .file-size {
      font-size: 1.3rem;
    }

    .download {
      height: 30px;
      padding: 0 11px;
    }

    .download-text {
      display: none;
    }

    .download {
      width: 30px;
      padding: 0;
    }
  }
</style>
