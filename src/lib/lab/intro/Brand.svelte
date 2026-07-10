<script lang="ts">
  // The frisp lockup for the intro-lab variants: origami-bird mark + lowercase
  // wordmark. Uses /logo-dark-mode.webp — the GRAPHITE bird (real alpha) — in
  // BOTH modes: maintainer doctrine 2026-07-10 is graphite-as-main-identity
  // with the orange/blue accents reserved for rare moments. A light-mode
  // filter deepens the grey so it holds against the warm porcelain page.
  // (/logo.webp = the coral bird, now the accent-tier asset;
  // /logo-light-mode.webp has an opaque tile baked in — never use it here.)
  import { asset } from '$app/paths';
  import { APP_NAME } from 'shared/brand';

  interface Props {
    /** Wordmark font size in px; the bird scales with it. */
    size?: number;
  }

  let { size = 17 }: Props = $props();
</script>

<span class="brand" style="--brand-size: {size}px">
  <img
    class="bird"
    src={asset('/logo-dark-mode.webp')}
    alt=""
    width="176"
    height="176"
  />
  <span class="name">{APP_NAME}</span>
</span>

<style>
  .brand {
    display: inline-flex;
    align-items: center;
    gap: calc(var(--brand-size) * 0.35);
    line-height: 1;
  }
  .bird {
    /* Slightly taller than the text so the mark reads as the anchor. */
    width: calc(var(--brand-size) * 1.35);
    height: calc(var(--brand-size) * 1.35);
    display: block;
    /* The steel bird is tuned for dark; deepen it in light so it doesn't
       wash out on porcelain. light-dark() can't feed a filter's strength
       directly, so gate on the resolved scheme via a custom property. */
    filter: brightness(var(--il-bird-brightness, 1)) contrast(1.02);
  }
  .name {
    font-size: var(--brand-size);
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--il-text-1);
  }
</style>
