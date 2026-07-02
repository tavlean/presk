<script lang="ts">
  // The contextual image-info card (design doc §4): filename, original format,
  // pixel dimensions, original file size, and an inferred aspect-ratio chip.
  // "LEFT = what you're looking at" — this always describes the selected image.
  // Dimensions come from the store's thumbnail decode (natural w/h); if that
  // hasn't landed yet the dimension row shows a dash rather than jumping.
  import { inferAspect } from './aspect';

  interface Props {
    /** Selected source File (for name + type + size). */
    file: File | undefined;
    /** Natural pixel width, or 0 until the thumbnail decode lands. */
    width: number;
    /** Natural pixel height, or 0 until the thumbnail decode lands. */
    height: number;
  }

  let { file, width, height }: Props = $props();

  const SIZE_UNITS = ['B', 'kB', 'MB', 'GB', 'TB'];
  // Decimal (SI, base-1000), 3 significant figures — matches Results.svelte so
  // sizes read identically across the app.
  function prettySize(bytes: number): string {
    if (bytes < 1) return '0 B';
    const exponent = Math.min(
      Math.floor(Math.log10(bytes) / 3),
      SIZE_UNITS.length - 1,
    );
    return `${(bytes / 1000 ** exponent).toPrecision(3)} ${SIZE_UNITS[exponent]}`;
  }

  /** A short, uppercase format label from the MIME type or extension. */
  function formatLabel(source: File): string {
    const fromMime = source.type.split('/')[1]?.toLowerCase() ?? '';
    const fromExt = source.name.includes('.')
      ? source.name.split('.').pop()!.toLowerCase()
      : '';
    const raw = fromMime || fromExt;
    const map: Record<string, string> = {
      jpeg: 'JPEG',
      jpg: 'JPEG',
      jfif: 'JPEG',
      png: 'PNG',
      webp: 'WebP',
      avif: 'AVIF',
      gif: 'GIF',
      'svg+xml': 'SVG',
      svg: 'SVG',
      jxl: 'JPEG XL',
      qoi: 'QOI',
      bmp: 'BMP',
      tiff: 'TIFF',
      tif: 'TIFF',
    };
    return map[raw] ?? (raw ? raw.toUpperCase() : 'Image');
  }

  const hasDims = $derived(width > 0 && height > 0);
  const aspect = $derived(hasDims ? inferAspect(width, height) : null);
</script>

<section class="info-panel" aria-label="Image information">
  {#if file}
    <h3 class="filename" title={file.name}>{file.name}</h3>
    <dl class="rows">
      <div class="row">
        <dt>Format</dt>
        <dd>{formatLabel(file)}</dd>
      </div>
      <div class="row">
        <dt>Dimensions</dt>
        <dd>{hasDims ? `${width} × ${height}` : '—'}</dd>
      </div>
      <div class="row">
        <dt>Original size</dt>
        <dd>{prettySize(file.size)}</dd>
      </div>
      <div class="row">
        <dt>Aspect</dt>
        <dd>
          {#if aspect}
            <span class="chip" class:approx={aspect.approx}>{aspect.label}</span
            >
          {:else}
            —
          {/if}
        </dd>
      </div>
    </dl>
  {:else}
    <p class="empty">No image selected.</p>
  {/if}
</section>

<style>
  .info-panel {
    background: var(--surface, rgba(19, 19, 25, 0.82));
    border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    border-radius: var(--control-radius, 12px);
    padding: 14px 16px;
    backdrop-filter: blur(12px) saturate(1.2);
    -webkit-backdrop-filter: blur(12px) saturate(1.2);
  }

  .filename {
    margin: 0 0 12px;
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--text-1, #f5f5f7);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .rows {
    display: grid;
    gap: 9px;
    margin: 0;
  }

  .row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
  }

  dt {
    color: var(--text-3, rgba(235, 235, 245, 0.38));
    font-size: 0.9rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  dd {
    margin: 0;
    color: var(--text-1, #f5f5f7);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    text-align: right;
  }

  .chip {
    display: inline-block;
    padding: 2px 9px;
    border-radius: 999px;
    background: var(--surface-raise, rgba(255, 255, 255, 0.06));
    border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--text-1, #f5f5f7);
  }

  .chip.approx {
    color: var(--text-2, rgba(235, 235, 245, 0.62));
  }

  .empty {
    margin: 0;
    color: var(--text-3, rgba(235, 235, 245, 0.38));
    font-size: 0.95rem;
  }
</style>
