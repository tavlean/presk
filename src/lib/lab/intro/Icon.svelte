<script lang="ts" module>
  // Nucleo duotone icon set for the intro-lab variants (18×18 sources,
  // stroke 1.5 + a 30%-opacity fill layer; both channels ride currentColor,
  // so color/theming is entirely the caller's CSS). Exported from the local
  // Nucleo library — see docs/lab-editor-restyle.md conventions.
  import themeSun from './icons/theme-sun.svg?raw';
  import themeMoon from './icons/theme-moon.svg?raw';
  import themeAuto from './icons/theme-auto.svg?raw';
  import dropImage from './icons/drop-image.svg?raw';
  import dropPhotos from './icons/drop-photos.svg?raw';
  import dropTray from './icons/drop-tray.svg?raw';

  const ICONS = {
    'theme-sun': themeSun,
    'theme-moon': themeMoon,
    'theme-auto': themeAuto,
    'drop-image': dropImage,
    'drop-photos': dropPhotos,
    'drop-tray': dropTray,
  } as const;

  export type IconName = keyof typeof ICONS;
</script>

<script lang="ts">
  interface Props {
    name: IconName;
    /** Rendered square size in CSS px (the sources are 18×18). */
    size?: number;
  }

  let { name, size = 18 }: Props = $props();
</script>

<span class="icon" style="--icon-size: {size}px" aria-hidden="true">
  <!-- eslint-disable-next-line svelte/no-at-html-tags — static build-time SVG strings from our own repo -->
  {@html ICONS[name]}
</span>

<style>
  .icon {
    display: inline-grid;
    place-items: center;
    width: var(--icon-size);
    height: var(--icon-size);
  }
  .icon :global(svg) {
    width: 100%;
    height: 100%;
    display: block;
  }
</style>
