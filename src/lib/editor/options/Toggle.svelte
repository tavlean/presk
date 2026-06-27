<script lang="ts">
  // A switch-style checkbox (track + sliding thumb). Originally ported from
  // Squoosh's Options/Toggle; restyled as a modern pill switch — the track
  // fills with the side's accent colour when on.
  interface Props {
    checked?: boolean;
    disabled?: boolean;
    name?: string;
    onchange?: (checked: boolean) => void;
  }

  let {
    checked = $bindable(false),
    disabled = false,
    name,
    onchange,
  }: Props = $props();
</script>

<div class="checkbox">
  <input
    class="real-checkbox"
    type="checkbox"
    {name}
    {disabled}
    bind:checked
    onchange={(e) => onchange?.(e.currentTarget.checked)}
  />
  <div class="track">
    <div class="thumb"></div>
  </div>
</div>

<style>
  .checkbox {
    display: inline-block;
    position: relative;
  }

  /* Hide the real checkbox but keep it accessible; the wrapping <label>
     forwards clicks, so pointer-events can be off. */
  .real-checkbox {
    position: absolute;
    top: 0;
    opacity: 0;
    pointer-events: none;
    margin: 0;
  }

  .track {
    --w: 34px;
    --h: 20px;
    --thumb-size: 14px;
    --inset: calc((var(--h) - var(--thumb-size)) / 2);
    position: relative;
    box-sizing: border-box;
    width: var(--w);
    height: var(--h);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.14);
    border: 1px solid var(--stroke, rgba(255, 255, 255, 0.08));
    transition:
      background-color 200ms ease,
      border-color 200ms ease;
  }

  .checkbox:focus-within .track {
    outline: 2px solid var(--main-theme-color);
    outline-offset: 2px;
  }

  .thumb {
    position: absolute;
    top: calc(var(--inset) - 1px);
    left: calc(var(--inset) - 1px);
    width: var(--thumb-size);
    height: var(--thumb-size);
    background: var(--white, #fff);
    border-radius: 50%;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
    transition: transform 200ms cubic-bezier(0.34, 1.3, 0.64, 1);
  }

  .real-checkbox:checked + .track {
    background: var(--main-theme-color);
    border-color: transparent;
  }

  .real-checkbox:checked + .track .thumb {
    transform: translateX(
      calc(var(--w) - var(--thumb-size) - var(--inset) * 2)
    );
  }

  .real-checkbox:disabled + .track {
    opacity: 0.45;
  }
</style>
