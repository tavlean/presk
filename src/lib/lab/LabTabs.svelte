<script lang="ts" module>
  // Single source for the bar's height — the lab layout offsets its viewport
  // by the same value so skins never sit under the bar.
  export const LAB_TABS_HEIGHT = 34;

  export interface LabTab {
    label: string;
    /** Route id, matched against page.route.id for the active state. */
    id: string;
    href: string;
  }
</script>

<script lang="ts">
  import { resolve } from '$app/paths';

  let { tabs, current }: { tabs: readonly LabTab[]; current: string } =
    $props();
</script>

<nav
  class="lab-tabs"
  style:height="{LAB_TABS_HEIGHT}px"
  aria-label="Lab experiments"
>
  <a class="home" href={resolve('/lab')}>lab</a>
  {#each tabs as tab (tab.id)}
    <a
      class="tab"
      class:active={tab.id === current}
      aria-current={tab.id === current ? 'page' : undefined}
      href={tab.href}>{tab.label}</a
    >
  {/each}
  <a class="exit" href={resolve('/')}>app ↗</a>
</nav>

<style>
  /* The bar follows the OS theme regardless of the forced light/dark state of
     the skin below it — it belongs to the lab, not to any experiment. */
  .lab-tabs {
    color-scheme: light dark;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 0 10px;
    background: light-dark(rgba(250, 249, 248, 0.85), rgba(14, 14, 14, 0.8));
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-bottom: 1px solid light-dark(#e8e6e3, #262626);
    font-size: 12px;
  }

  .home {
    margin-right: 10px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-decoration: none;
    color: light-dark(#8a8884, #6f6f6f);
  }
  .home:hover {
    color: light-dark(#1a1a1a, #f2f2f2);
  }

  .tab {
    padding: 3px 10px;
    border-radius: 999px;
    text-decoration: none;
    color: light-dark(#5a5854, #a3a3a3);
  }
  .tab:hover {
    color: light-dark(#1a1a1a, #f2f2f2);
  }
  .tab.active {
    background: light-dark(#1a1a1a, #f2f2f2);
    color: light-dark(#ffffff, #111111);
    font-weight: 600;
  }

  .exit {
    margin-left: auto;
    font-size: 11px;
    text-decoration: none;
    color: light-dark(#8a8884, #6f6f6f);
  }
  .exit:hover {
    color: light-dark(#1a1a1a, #f2f2f2);
  }

  .home:focus-visible,
  .tab:focus-visible,
  .exit:focus-visible {
    outline: 2px solid light-dark(#3b6df2, #6f97ff);
    outline-offset: 2px;
    border-radius: 999px;
  }
</style>
