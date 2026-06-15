<script lang="ts">
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();
</script>

{@render children()}

<style>
  /* Self-hosted Outfit (variable, weight 400-700) — two woff2 subsets in
     static/fonts/, so they are served from the app origin and SvelteKit's
     service worker auto-precaches them via `files` (offline-safe, no network
     font fetch, nothing leaves the device). Latin + Latin-Ext cover the UI
     text and accented filenames; absolute `/fonts/` URLs are correct because
     no base path is configured. */
  @font-face {
    font-family: 'Outfit';
    font-style: normal;
    font-weight: 400 700;
    font-display: swap;
    src: url(/fonts/Outfit-latin.woff2) format('woff2');
    unicode-range:
      U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC,
      U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193,
      U+2212, U+2215, U+FEFF, U+FFFD;
  }
  @font-face {
    font-family: 'Outfit';
    font-style: normal;
    font-weight: 400 700;
    font-display: swap;
    src: url(/fonts/Outfit-latin-ext.woff2) format('woff2');
    unicode-range:
      U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304,
      U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020,
      U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
  }

  /* Root font-size = 12px, matching Squoosh's `font: 12px/1.3` base
     (src/static-build/pages/index/base.css). Every editor dimension was ported
     from Squoosh as `rem`, so the whole UI is sized against this root; without
     it the browser default (16px) scaled every value up ~1.33×, throwing the
     typography out of balance and pushing the download blob off-panel. */
  :global(html) {
    font-size: 12px;
  }

  /* Shared body reset + font stack for every route. Each page keeps its own
     background/color, and the editor page adds its full-height sizing. */
  :global(body) {
    margin: 0;
    line-height: 1.3;
    font-family:
      'Outfit',
      ui-sans-serif,
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      'Segoe UI',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }
</style>
