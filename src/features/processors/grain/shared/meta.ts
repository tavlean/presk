export interface Options {
  amount: number;
  // Grain size on a 1–100 slider scale, 20 units per output pixel: ≤20 = the
  // calibrated per-pixel film look (the finest physically possible), 40 = 2px
  // particles (the byte-efficient debanding shape — see the spec's size
  // experiment), 100 = 5px. The default sits at 20 like Luminar's, leaving
  // room to move in both directions.
  size: number;
}

export const defaultOptions: Options = {
  amount: 12,
  size: 20,
};
