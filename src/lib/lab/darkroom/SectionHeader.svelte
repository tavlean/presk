<script lang="ts">
  // A collapsible section header row for the darkroom Inspector: a label on the
  // left, and on the right an optional "eye" enable toggle plus a chevron that
  // expands/collapses the section body. The eye maps the reference tool's
  // per-section visibility control onto Frisp's real per-section ENABLE state
  // (Resize / Reduce-palette). A disabled section reads dimmed; the caller keeps
  // `open` and `enabled` as bindable local/real state respectively.
  interface Props {
    label: string;
    /** When defined, renders the eye enable-toggle bound to this side's state. */
    enabled?: boolean;
    /** When true, the eye is shown (Resize/Palette); false → header only. */
    hasEnable?: boolean;
    open?: boolean;
    onToggleEnabled?: (next: boolean) => void;
    onToggleOpen?: () => void;
  }

  let {
    label,
    enabled = false,
    hasEnable = false,
    open = false,
    onToggleEnabled,
    onToggleOpen,
  }: Props = $props();
</script>

<div class="dr-section-header" class:dimmed={hasEnable && !enabled}>
  <button
    type="button"
    class="dr-section-label"
    aria-expanded={open}
    onclick={() => onToggleOpen?.()}
  >
    <span class="dr-chevron" class:open>
      <svg viewBox="0 0 10 10" aria-hidden="true">
        <path
          d="M2 3.5L5 6.5L8 3.5"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </span>
    <span class="dr-section-title">{label}</span>
  </button>

  {#if hasEnable}
    <button
      type="button"
      class="dr-eye"
      class:on={enabled}
      aria-pressed={enabled}
      data-tooltip={enabled
        ? 'Enabled — click to disable'
        : 'Disabled — click to enable'}
      aria-label={enabled ? `Disable ${label}` : `Enable ${label}`}
      onclick={() => onToggleEnabled?.(!enabled)}
    >
      {#if enabled}
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <circle
            cx="12"
            cy="12"
            r="2.6"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
          />
        </svg>
      {:else}
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M4 4L20 20M9.5 9.6A2.6 2.6 0 0 0 14.4 14.5M6.3 6.4C3.8 8 2.5 12 2.5 12S6 18.5 12 18.5c1.3 0 2.4-.3 3.5-.7M17.6 17.5C20.2 15.9 21.5 12 21.5 12S18 5.5 12 5.5c-.5 0-1 0-1.5.1"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      {/if}
    </button>
  {/if}
</div>

<style>
  .dr-section-header {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 36px;
    padding: 0 4px 0 6px;
    transition: opacity 200ms ease;
  }

  .dr-section-header.dimmed {
    opacity: 0.55;
  }

  .dr-section-label {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    padding: 6px 4px;
    margin: 0;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--dr-text-1);
    font: inherit;
    text-align: left;
  }

  .dr-section-title {
    font-size: 1rem;
    font-weight: 500;
    color: var(--dr-text-1);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dr-chevron {
    flex: none;
    display: grid;
    place-items: center;
    width: 14px;
    height: 14px;
    color: var(--dr-text-2);
    transform: rotate(-90deg);
    transition: transform 200ms ease;
  }
  .dr-chevron.open {
    transform: none;
  }
  .dr-chevron svg {
    width: 10px;
    height: 10px;
    display: block;
  }

  .dr-eye {
    flex: none;
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    border-radius: 8px;
    border: 1px solid transparent;
    background: none;
    cursor: pointer;
    color: var(--dr-text-3);
    transition:
      color 150ms ease,
      background-color 150ms ease,
      border-color 150ms ease;
  }
  .dr-eye:hover {
    color: var(--dr-text-1);
    background: var(--dr-chip);
    border-color: var(--dr-border);
  }
  .dr-eye.on {
    color: var(--dr-text-1);
  }
  .dr-eye svg {
    width: 17px;
    height: 17px;
    display: block;
  }
  .dr-eye:focus-visible {
    outline: 2px solid var(--dr-focus);
    outline-offset: 2px;
  }
</style>
