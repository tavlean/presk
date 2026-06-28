// A generic undo/redo stack for the editor's editable "document" (a side's
// format + options + processor state, plus the shared preprocessor state).
//
// Design notes (Svelte 5):
//  - `entries` is `$state.raw`: each entry is an immutable snapshot captured once
//    (via `$state.snapshot` upstream) and never mutated again, so there's no point
//    paying for deep proxying. We REASSIGN the array to commit — `$state.raw` only
//    reacts to reassignment, not in-place mutation.
//  - `index` is plain `$state` (small, flipped often by undo/redo).
//  - `canUndo` / `canRedo` are `$derived` so the toolbar buttons enable/disable
//    reactively with zero wiring.
//  - Dedup is signature-based: the caller hands us a string `sig` alongside each
//    value. A commit whose sig equals the current entry's is a no-op. This is what
//    makes restoring a snapshot safe — the restore write re-enters the watcher,
//    but the recomputed sig matches the entry we just moved to, so nothing commits.

export interface HistoryEntry<T> {
  /** The captured snapshot to restore. Immutable once stored. */
  value: T;
  /** A stable string fingerprint of `value`, used for cheap equality. */
  sig: string;
}

export class EditorHistory<T> {
  // Most-recent-last list of committed snapshots. Raw: never mutated in place.
  #entries = $state.raw<HistoryEntry<T>[]>([]);
  // Pointer into `#entries` for the snapshot currently applied (-1 when empty).
  #index = $state(-1);
  // Hard cap on retained steps; oldest are dropped from the front past this.
  #limit: number;

  constructor(limit = 60) {
    this.#limit = limit;
  }

  /** True when there's an earlier snapshot to step back to. */
  canUndo = $derived(this.#index > 0);
  /** True when there's a later snapshot to step forward to. */
  canRedo = $derived(this.#index < this.#entries.length - 1);

  /** The snapshot currently pointed at, or null when the stack is empty. */
  get current(): T | null {
    return this.#entries[this.#index]?.value ?? null;
  }

  /** Number of retained snapshots (for diagnostics / tests). */
  get size(): number {
    return this.#entries.length;
  }

  /** Pointer position (for diagnostics / tests). */
  get position(): number {
    return this.#index;
  }

  #currentSig(): string | null {
    return this.#entries[this.#index]?.sig ?? null;
  }

  /**
   * Discard all history and seed a fresh baseline. Call when a new image loads:
   * undo/redo is scoped to one image's editing session.
   */
  reset(value: T, sig: string): void {
    this.#entries = [{ value, sig }];
    this.#index = 0;
  }

  /** Drop everything (e.g. when the editor closes). */
  clear(): void {
    this.#entries = [];
    this.#index = -1;
  }

  /**
   * Commit a new snapshot. Truncates any redo tail (you can't redo into a branch
   * you've edited away from), then appends and advances the pointer. Returns
   * false — committing nothing — when the snapshot matches the current entry.
   */
  commit(value: T, sig: string): boolean {
    if (sig === this.#currentSig()) return false;

    let next = this.#entries.slice(0, this.#index + 1);
    next.push({ value, sig });
    // Keep only the most-recent `#limit` steps; trimming the front shifts the
    // pointer to the new last entry below regardless.
    if (next.length > this.#limit) next = next.slice(next.length - this.#limit);

    this.#entries = next;
    this.#index = next.length - 1;
    return true;
  }

  /** Step back one snapshot; returns it (to apply), or null if at the start. */
  undo(): T | null {
    if (!this.canUndo) return null;
    this.#index -= 1;
    return this.current;
  }

  /** Step forward one snapshot; returns it (to apply), or null if at the end. */
  redo(): T | null {
    if (!this.canRedo) return null;
    this.#index += 1;
    return this.current;
  }
}
