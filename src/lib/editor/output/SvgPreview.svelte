<script lang="ts">
  // Vector-true preview: an <img> whose LAYOUT size tracks the current zoom,
  // so the browser re-rasterizes the SVG at every zoom level instead of
  // scaling a frozen bitmap — crisp at any magnification, which is the entire
  // point of pixel-peeping a vector. It must NOT sit under the pinch-zoom
  // transform (that would bitmap-scale it like the canvas); instead it mirrors
  // the tracked transform as left-origin translate + layout width/height.
  //
  // Past MAX_EDGE layout pixels the remaining zoom is applied as a bitmap
  // scale: by then the base raster is 8k on its long edge, source detail is
  // exhausted, and memory — not fidelity — is the binding constraint.
  interface Props {
    url: string;
    /** Preprocessed source dims — the same box the canvases pin to. */
    naturalWidth: number;
    naturalHeight: number;
    /** The live view transform mirrored from the driven pinch-zoom. */
    scale: number;
    x: number;
    y: number;
  }

  let { url, naturalWidth, naturalHeight, scale, x, y }: Props = $props();

  const MAX_EDGE = 8192;

  const geometry = $derived.by(() => {
    const width = naturalWidth * scale;
    const height = naturalHeight * scale;
    const over = Math.max(width, height) / MAX_EDGE;
    const residual = over > 1 ? over : 1;
    return { width: width / residual, height: height / residual, residual };
  });
</script>

<img
  class="svg-preview"
  data-pinch-overlay
  src={url}
  alt=""
  draggable="false"
  style:translate="{x}px {y}px"
  style:width="{geometry.width}px"
  style:height="{geometry.height}px"
  style:transform={geometry.residual > 1 ? `scale(${geometry.residual})` : null}
/>

<style>
  .svg-preview {
    position: absolute;
    left: 0;
    top: 0;
    transform-origin: 0 0;
    /* Gestures belong to the two-up/pinch-zoom event retargeting. */
    pointer-events: none;
  }
</style>
