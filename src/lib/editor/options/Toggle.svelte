<script lang="ts">
  // A switch-style checkbox (pill track + sliding thumb), accent-tinted per
  // side when on.
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
    <div class="thumb-track">
      <div class="thumb"></div>
    </div>
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
    --thumb-size: 14px;
    background: rgba(255, 255, 255, 0.14);
    border-radius: 1000px;
    width: 24px;
    padding: 3px calc(var(--thumb-size) / 2 + 3px);
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.3);
    transition:
      background-color 250ms ease,
      box-shadow 250ms ease;
  }

  .checkbox:focus-within .track {
    outline: 2px solid var(--main-theme-color, #fff);
    outline-offset: 2px;
  }

  .real-checkbox:checked + .track {
    background: linear-gradient(
      135deg,
      var(--main-theme-color),
      var(--hot-theme-color)
    );
    box-shadow:
      inset 0 1px 2px rgba(0, 0, 0, 0.15),
      0 0 12px var(--main-theme-glow, transparent);
  }

  .thumb {
    position: relative;
    width: var(--thumb-size);
    height: var(--thumb-size);
    background: #fff;
    border-radius: 100%;
    transform: translateX(calc(var(--thumb-size) / -2));
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
  }

  .thumb-track {
    transition: transform 250ms cubic-bezier(0.34, 1.3, 0.64, 1);
  }

  .real-checkbox:checked + .track .thumb-track {
    transform: translateX(100%);
  }
</style>
