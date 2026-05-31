// pointer-tracker ships ESM without a type declaration that the app's
// "bundler" module resolution picks up, so we declare the small surface we use.
// Mirrors the library's real API (github.com/GoogleChromeLabs/pointer-tracker).
declare module 'pointer-tracker' {
  export interface Pointer {
    id: number;
    pageX: number;
    pageY: number;
    clientX: number;
    clientY: number;
    nativePointer: Touch | PointerEvent | MouseEvent;
  }

  export interface PointerTrackerOptions {
    start?: (pointer: Pointer, event: Event) => boolean;
    move?: (
      previousPointers: Pointer[],
      changedPointers: Pointer[],
      event: Event,
    ) => void;
    end?: (pointer: Pointer, event: Event, cancelled: boolean) => void;
    rawUpdates?: boolean;
    avoidPointerEvents?: boolean;
    eventListenerOptions?: AddEventListenerOptions;
  }

  export default class PointerTracker {
    constructor(element: HTMLElement, options?: PointerTrackerOptions);
    readonly currentPointers: Pointer[];
    readonly startPointers: Pointer[];
    stop(): void;
  }
}
