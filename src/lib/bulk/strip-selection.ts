import { bulkStore } from './store.svelte';

const CELL_SELECTOR = '[data-bulk-cell-id]';
const DRAG_THRESHOLD = 4;

interface DragState {
  pointerId: number;
  startId: string | undefined;
  lastId: string | undefined;
  x: number;
  y: number;
  dragging: boolean;
}

interface ClickModifiers {
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
}

function cellIdFromTarget(target: EventTarget | null): string | undefined {
  if (!(target instanceof Element)) return undefined;
  return (
    target.closest(CELL_SELECTOR)?.getAttribute('data-bulk-cell-id') ??
    undefined
  );
}

function cellIdAtPoint(x: number, y: number): string | undefined {
  return cellIdFromTarget(document.elementFromPoint(x, y));
}

export function createStripSelectionController(): {
  onClick: (event: MouseEvent) => void;
  onKeydown: (event: KeyboardEvent) => void;
  onPointerdown: (event: PointerEvent) => void;
  onPointermove: (event: PointerEvent) => void;
  onPointerup: (event: PointerEvent) => void;
  onPointercancel: (event: PointerEvent) => void;
} {
  let drag: DragState | null = null;
  let suppressClick = false;
  let pendingClickId: string | undefined;
  let pendingClickModifiers: ClickModifiers | undefined;

  function finishPointer(event: PointerEvent): void {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const wasDragging = drag.dragging;
    const target = event.currentTarget as HTMLElement | null;
    if (target?.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }
    drag = null;
    if (wasDragging) {
      suppressClick = true;
      setTimeout(() => {
        suppressClick = false;
      }, 0);
    }
    event.stopPropagation();
  }

  return {
    onClick(event: MouseEvent): void {
      const id = cellIdFromTarget(event.target) ?? pendingClickId;
      const modifiers = pendingClickModifiers;
      pendingClickId = undefined;
      pendingClickModifiers = undefined;

      event.preventDefault();
      event.stopPropagation();

      if (suppressClick) {
        suppressClick = false;
        return;
      }

      if (!id) {
        bulkStore.deselect();
        return;
      }

      const shiftKey = event.shiftKey || modifiers?.shiftKey;
      const metaKey = event.metaKey || modifiers?.metaKey;
      const ctrlKey = event.ctrlKey || modifiers?.ctrlKey;

      if (shiftKey) bulkStore.selectRangeTo(id);
      else if (metaKey || ctrlKey) bulkStore.toggleSelection(id);
      else bulkStore.select(id);
    },

    onKeydown(event: KeyboardEvent): void {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const id = cellIdFromTarget(event.target);
      if (!id) return;

      event.preventDefault();
      event.stopPropagation();

      if (event.shiftKey) bulkStore.selectRangeTo(id);
      else if (event.metaKey || event.ctrlKey) bulkStore.toggleSelection(id);
      else bulkStore.select(id);
    },

    onPointerdown(event: PointerEvent): void {
      if (!event.isPrimary || event.button !== 0) return;
      const id = cellIdFromTarget(event.target);

      drag = {
        pointerId: event.pointerId,
        startId: id,
        lastId: id,
        x: event.clientX,
        y: event.clientY,
        dragging: false,
      };
      pendingClickId = id;
      pendingClickModifiers = {
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
      };
      // Only capture for drag-select on fine pointers. Capturing a touch pointer
      // would swallow the strip's native horizontal scroll (drag-select is
      // disabled on touch anyway — see onPointermove).
      if (event.pointerType !== 'touch') {
        (event.currentTarget as HTMLElement | null)?.setPointerCapture(
          event.pointerId,
        );
      }
      event.stopPropagation();
    },

    onPointermove(event: PointerEvent): void {
      if (!drag || event.pointerId !== drag.pointerId) return;

      // On coarse pointers (touch), a horizontal drag IS the scroll gesture —
      // hijacking it for range-select fights the strip's own scrolling and feels
      // broken. So drag-select is pointer-fine only; touch keeps tap (select)
      // and tap+modifier stays available via keyboard/long-press elsewhere.
      if (event.pointerType === 'touch') return;

      if (!drag.dragging) {
        const dx = event.clientX - drag.x;
        const dy = event.clientY - drag.y;
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        drag.dragging = true;
      }

      const hitId = cellIdAtPoint(event.clientX, event.clientY);
      if (!drag.startId) {
        if (!hitId) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        drag.startId = hitId;
        drag.lastId = hitId;
        bulkStore.selectDragRange(hitId, hitId);
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      const startId = drag.startId;
      if (!startId) return;
      const id = hitId ?? drag.lastId;
      if (id !== drag.lastId) {
        drag.lastId = id;
        if (id) bulkStore.selectDragRange(startId, id);
      }
      event.preventDefault();
      event.stopPropagation();
    },

    onPointerup: finishPointer,
    onPointercancel: finishPointer,
  };
}
