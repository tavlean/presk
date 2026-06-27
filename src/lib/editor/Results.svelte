<script lang="ts">
  // The per-side results footer: output filesize, format, a percent-change
  // pill, and the download button. Originally ported from Squoosh's
  // Compress/Results (speech bubble + blob button); redesigned as a clean
  // stats row + accent-gradient pill button. Props are unchanged.

  interface Props {
    /** Which side this footer belongs to (kept for API stability/theming). */
    side: 'left' | 'right';
    /** Output size in bytes (null while encoding / before first result). */
    size: number | null;
    /** Signed percent change vs the original (negative = smaller = good). */
    percent: number | null;
    /** True for the Original/identity side: hides the percent pill. */
    isOriginal: boolean;
    downloadHref: string;
    downloadName: string;
    /** Short format label shown next to the size. */
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

<div class="results" class:is-original={isOriginal} data-side={side}>
  <div class="stats">
    <div class="size-line">
      <span class="file-size">
        {#if pretty}
          {pretty.value}<span class="unit">{pretty.unit}</span>
        {:else}
          …
        {/if}
      </span>
      {#if direction}
        <span class="delta" class:up={direction === 'up'}>
          <span class="delta-arrow" aria-hidden="true"
            >{direction === 'down' ? '↓' : '↑'}</span
          >{percentMagnitude}%
        </span>
      {/if}
    </div>
    <span class="type-label">{isOriginal ? 'Original' : typeLabel}</span>
  </div>

  <a
    class="download"
    class:download-disable={disabled}
    href={disabled ? undefined : downloadHref}
    download={disabled ? undefined : downloadName}
    title="Download"
    aria-disabled={disabled}
  >
    {#if loading}
      <span class="spinner" aria-hidden="true"></span>
    {:else}
      <svg class="download-icon" viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="M8 1.5a.75.75 0 0 1 .75.75v6.19l2.22-2.22a.75.75 0 1 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 0 1 1.06-1.06l2.22 2.22V2.25A.75.75 0 0 1 8 1.5z"
        />
        <path
          d="M2.75 10.5a.75.75 0 0 1 .75.75v1.5c0 .41.34.75.75.75h7.5c.41 0 .75-.34.75-.75v-1.5a.75.75 0 0 1 1.5 0v1.5A2.25 2.25 0 0 1 11.75 15h-7.5A2.25 2.25 0 0 1 2 12.75v-1.5a.75.75 0 0 1 .75-.75z"
        />
      </svg>
    {/if}
    <span class="dl-label">Download</span>
  </a>
</div>

<style>
  .results {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 11px var(--horizontal-padding, 16px);
    min-width: 0;
  }

  .stats {
    display: grid;
    gap: 2px;
    min-width: 0;
  }

  .size-line {
    display: flex;
    align-items: baseline;
    gap: 8px;
    white-space: nowrap;
  }

  .file-size {
    font-size: 1.6rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.01em;
    color: var(--text-1);
  }

  .unit {
    font-size: 1.05rem;
    font-weight: 600;
    color: var(--text-2);
    margin-left: 2px;
  }

  /* Percent-change pill: green when smaller (good), red when bigger. */
  .delta {
    display: inline-flex;
    align-items: center;
    gap: 1px;
    font-size: 0.95rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    line-height: 1;
    padding: 4px 7px;
    border-radius: 999px;
    color: #34d399;
    background: rgba(52, 211, 153, 0.14);
  }
  .delta.up {
    color: #f87171;
    background: rgba(248, 113, 113, 0.14);
  }
  .delta-arrow {
    font-family: system-ui, sans-serif;
  }

  .type-label {
    font-size: 0.9rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-2);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* The download button: the side's accent as a soft gradient pill. */
  .download {
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 32px;
    padding: 0 13px;
    border-radius: 999px;
    background: linear-gradient(
      135deg,
      var(--main-theme-color),
      var(--hot-theme-color)
    );
    color: #fff;
    font-weight: 700;
    font-size: 1.05rem;
    text-decoration: none;
    box-shadow:
      0 2px 10px var(--accent-soft, rgba(0, 0, 0, 0.3)),
      inset 0 1px 0 rgba(255, 255, 255, 0.25);
    transition:
      transform 150ms ease,
      box-shadow 150ms ease,
      filter 150ms ease,
      opacity 200ms ease;
  }
  .download:hover {
    transform: translateY(-1px);
    filter: brightness(1.08);
    box-shadow:
      0 4px 16px var(--accent-soft, rgba(0, 0, 0, 0.3)),
      inset 0 1px 0 rgba(255, 255, 255, 0.25);
  }
  .download:active {
    transform: translateY(0);
    filter: brightness(0.97);
  }
  .download:focus-visible {
    outline: 2px solid var(--main-theme-color);
    outline-offset: 2px;
  }

  /* The Original side downloads too, just without the accent shout. */
  .is-original .download {
    background: var(--field-bg, rgba(255, 255, 255, 0.06));
    border: 1px solid var(--stroke-strong, rgba(255, 255, 255, 0.16));
    box-shadow: none;
  }
  .is-original .download:hover {
    background: var(--field-bg-hover, rgba(255, 255, 255, 0.1));
    filter: none;
  }

  .download-icon {
    width: 14px;
    height: 14px;
    fill: currentColor;
  }

  .download-disable {
    pointer-events: none;
    opacity: 0.45;
  }

  .spinner {
    width: 12px;
    height: 12px;
    border: 2px solid rgba(255, 255, 255, 0.35);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 760px) {
    .results {
      padding: 9px var(--horizontal-padding, 12px);
      gap: 8px;
    }

    .file-size {
      font-size: 1.25rem;
    }
    .unit {
      font-size: 0.9rem;
    }
    .delta {
      font-size: 0.8rem;
      padding: 3px 6px;
    }
    .type-label {
      font-size: 0.78rem;
    }

    /* Icon-only download on the narrow half-width cards. */
    .download {
      width: 32px;
      padding: 0;
    }
    .dl-label {
      display: none;
    }
  }
</style>
