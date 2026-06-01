<script lang="ts">
  // Ported from src/client/lazy-app/Compress/Options/Toggle — a switch-style
  // checkbox (track + sliding thumb).
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
     forwards clicks, so pointer-events can be off. Ported from the original
     Toggle/style.css, which the first migration pass dropped. */
  .real-checkbox {
    position: absolute;
    top: 0;
    opacity: 0;
    pointer-events: none;
    margin: 0;
  }

  .track {
    --thumb-size: 14px;
    background: var(--black);
    border-radius: 1000px;
    width: 24px;
    padding: 3px calc(var(--thumb-size) / 2 + 3px);
  }

  .checkbox:focus-within .track {
    outline: white solid 2px;
  }

  .thumb {
    position: relative;
    width: var(--thumb-size);
    height: var(--thumb-size);
    background: var(--less-light-gray);
    border-radius: 100%;
    transform: translateX(calc(var(--thumb-size) / -2));
    overflow: hidden;
  }

  .thumb::before {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--main-theme-color);
    opacity: 0;
    transition: opacity 200ms ease;
  }

  .thumb-track {
    transition: transform 200ms ease;
  }

  .real-checkbox:checked + .track .thumb-track {
    transform: translateX(100%);
  }

  .real-checkbox:checked + .track .thumb::before {
    opacity: 1;
  }
</style>
