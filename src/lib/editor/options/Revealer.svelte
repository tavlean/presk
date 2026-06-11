<script lang="ts">
  // A checkbox shown as a rotating chevron, used to reveal "Advanced settings".
  interface Props {
    checked?: boolean;
    name?: string;
    onchange?: (event: Event) => void;
  }

  let { checked = $bindable(false), name, onchange }: Props = $props();
</script>

<div class="checkbox">
  <input class="real-checkbox" type="checkbox" {name} bind:checked {onchange} />
  <div class="arrow">
    <svg viewBox="0 -1.95 9.8 9.8" aria-hidden="true">
      <path
        d="M8.2.2a1 1 0 011.4 1.4l-4 4a1 1 0 01-1.4 0l-4-4A1 1 0 011.6.2l3.3 3.3L8.2.2z"
      />
    </svg>
  </div>
</div>

<style>
  .checkbox {
    display: inline-block;
    position: relative;
  }

  .arrow {
    width: 10px;
    height: 10px;
    fill: currentColor;
    transition: transform 250ms cubic-bezier(0.34, 1.3, 0.64, 1);
    transform: rotate(-90deg);
  }

  .arrow svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  .real-checkbox {
    top: 0;
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .real-checkbox:checked + .arrow {
    transform: none;
  }
</style>
