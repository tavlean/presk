// Flat, mutable shapes for the resize/quantize processor option objects. The
// generated `ProcessorState['resize']` is a discriminated union (browser /
// worker / vector), which is awkward to mutate field-by-field in the UI; these
// supersets carry every field the panels touch. The page casts the live
// processor-state proxies to these when handing them to the panels.

export interface ResizeOptionsState {
  enabled: boolean;
  width: number;
  height: number;
  method:
    | 'lanczos3'
    | 'mitchell'
    | 'catrom'
    | 'triangle'
    | 'hqx'
    | 'browser-pixelated'
    | 'browser-low'
    | 'browser-medium'
    | 'browser-high'
    | 'vector';
  fitMethod: 'stretch' | 'contain';
  premultiply: boolean;
  linearRGB: boolean;
}

export interface QuantizeOptionsState {
  enabled: boolean;
  zx: number;
  maxNumColors: number;
  dither: number;
}
