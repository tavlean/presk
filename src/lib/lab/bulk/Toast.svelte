<script module lang="ts">
  // A tiny standalone toast for the lab. The editor's Snackbar is coupled to
  // EditorSession + its own store; the lab needs a dependency-free notice, so
  // this owns a minimal module-level reactive queue and exports `toast(msg)`.
  //
  // One transient message at a time; a new call replaces the current one and
  // resets the auto-dismiss timer. Mount <Toast /> once at the lab root.

  interface ToastState {
    id: number;
    message: string;
  }

  const DISMISS_MS = 2600;

  let current = $state<ToastState | null>(null);
  let nextId = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  /** Show a transient toast message (replaces any current one). */
  export function toast(message: string): void {
    nextId += 1;
    current = { id: nextId, message };
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      current = null;
      timer = null;
    }, DISMISS_MS);
  }
</script>

<script lang="ts">
  import { fly } from 'svelte/transition';
</script>

{#if current}
  {#key current.id}
    <div
      class="lab-toast"
      role="status"
      transition:fly={{ y: 60, duration: 200 }}
    >
      {current.message}
    </div>
  {/key}
{/if}

<style>
  .lab-toast {
    position: fixed;
    left: 50%;
    bottom: 28px;
    transform: translateX(-50%);
    max-width: 90vw;
    padding: 11px 18px;
    border-radius: 999px;
    background: rgba(24, 24, 30, 0.9);
    backdrop-filter: blur(16px) saturate(1.3);
    -webkit-backdrop-filter: blur(16px) saturate(1.3);
    border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
    color: var(--text-1, #f5f5f7);
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.5);
    z-index: 40;
    font-size: 1rem;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
