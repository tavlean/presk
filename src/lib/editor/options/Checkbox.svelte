<script lang="ts">
  // A real (hidden) checkbox driving a drawn box. Originally ported from
  // Squoosh's Options/Checkbox; restyled as a rounded square that fills with
  // the side's accent colour and shows a white check.
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
  <div class="box" class:disabled>
    <svg class="tick" viewBox="0 0 12 12" aria-hidden="true">
      <path
        d="M2.5 6.5L5 9l4.5-5.5"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </div>
</div>

<style>
  .checkbox {
    display: inline-block;
    position: relative;
    --size: 17px;
  }

  .real-checkbox {
    top: 0;
    position: absolute;
    opacity: 0;
    pointer-events: none;
    margin: 0;
  }

  .box {
    box-sizing: border-box;
    width: var(--size);
    height: var(--size);
    border-radius: 5px;
    border: 1.5px solid rgba(255, 255, 255, 0.3);
    background: var(--field-bg, rgba(255, 255, 255, 0.06));
    display: grid;
    place-items: center;
    color: #fff;
    transition:
      background-color 150ms ease,
      border-color 150ms ease;
  }

  .checkbox:focus-within .box {
    outline: 2px solid var(--main-theme-color);
    outline-offset: 2px;
  }

  .tick {
    width: 11px;
    height: 11px;
    opacity: 0;
    transform: scale(0.6);
    transition:
      opacity 150ms ease,
      transform 150ms cubic-bezier(0.34, 1.4, 0.64, 1);
  }

  .real-checkbox:checked + .box {
    background: var(--main-theme-color);
    border-color: transparent;
  }

  .real-checkbox:checked + .box .tick {
    opacity: 1;
    transform: scale(1);
  }

  .box.disabled {
    opacity: 0.45;
  }
</style>
