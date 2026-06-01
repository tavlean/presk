<script lang="ts">
  // Ported from src/client/lazy-app/Compress/Options/Checkbox. A real (hidden)
  // checkbox drives an icon-rendered box, with a focus ripple.
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
  {#if checked}
    <svg
      class="icon"
      class:checked={!disabled}
      class:disabled
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        d="M21.3 0H2.7A2.7 2.7 0 0 0 0 2.7v18.6A2.7 2.7 0 0 0 2.7 24h18.6a2.7 2.7 0 0 0 2.7-2.7V2.7A2.7 2.7 0 0 0 21.3 0zm-12 18.7L2.7 12l1.8-1.9L9.3 15 19.5 4.8l1.8 1.9z"
      />
    </svg>
  {:else}
    <svg
      class="icon"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        d="M21.3 2.7v18.6H2.7V2.7h18.6m0-2.7H2.7A2.7 2.7 0 0 0 0 2.7v18.6A2.7 2.7 0 0 0 2.7 24h18.6a2.7 2.7 0 0 0 2.7-2.7V2.7A2.7 2.7 0 0 0 21.3 0z"
      />
    </svg>
  {/if}
  <input
    class="real-checkbox"
    type="checkbox"
    {name}
    {disabled}
    bind:checked
    onchange={(e) => onchange?.(e.currentTarget.checked)}
  />
</div>

<style>
  .checkbox {
    display: inline-block;
    position: relative;
    --size: 17px;
  }

  .checkbox::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 200%;
    height: 200%;
    background-color: var(--main-theme-color);
    border-radius: 999px;
    opacity: 0.25;
    transform: translate(-50%, -50%) scale(0);
    transition-property: transform;
    transition-duration: 250ms;
  }

  .checkbox:focus-within::before {
    transform: translate(-50%, -50%) scale(1);
  }

  .real-checkbox {
    top: 0;
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .icon {
    display: block;
    width: var(--size);
    height: var(--size);
  }

  .checked {
    fill: var(--main-theme-color);
  }

  .disabled {
    fill: var(--dark-gray);
  }
</style>
