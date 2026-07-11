export interface Options {
  amount: number;
  // Grain particle scale in output pixels, 1–4. 1 = the calibrated film look;
  // 2 is the byte-efficient debanding shape (see the spec's size experiment).
  size: number;
}

export const defaultOptions: Options = {
  amount: 12,
  size: 1,
};
