import type { Options } from './meta';

// Film grain, calibrated against Luminar Neo's default look — the measured
// model and its calibration data live in docs/specs/2026-07-12-film-grain.md.
// In short: monochrome per-pixel white noise, amplitude following a midtone
// parabola of the pixel's own luma, samples drawn flatter-than-gaussian.
//
// Everything here is deterministic (fixed seed, one PRNG step per pixel):
// the encode signature, result cache, undo/redo and bulk staleness contracts
// all assume identical inputs produce identical bytes.

// sign(u)·|u|^SHAPE of uniform u has excess kurtosis ≈ −1.5, matching
// Luminar's default Roughness 30. SHAPE_SIGMA is that distribution's standard
// deviation, so dividing by it lets `peak` below be the literal grain σ at
// mid-gray in 8-bit units.
const SHAPE = 0.683;
const SHAPE_SIGMA = Math.sqrt(1 / (2 * SHAPE + 1));

// Measured: Luminar's Amount maps linearly to grain σ at mid-gray with this
// slope, and the maintainer's preferred looks (Amount 12 everyday, ~24
// creative) are expressed on that scale — so Frisp's slider adopts it 1:1.
const SIGMA_PER_AMOUNT = 0.44;

const SEED = 0x9e3779b9;

/** Add grain in place. `amount` is the UI slider value, 0–100. */
export function applyGrainToPixels(
  pixels: Uint8ClampedArray,
  amount: number,
): void {
  const peak = (SIGMA_PER_AMOUNT * amount) / SHAPE_SIGMA;
  let state = SEED;
  for (let i = 0; i < pixels.length; i += 4) {
    // xorshift32, advanced for every pixel — skipped pixels too — so the
    // noise field is a function of pixel index alone.
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    // Fully transparent pixels stay byte-identical: grain on invisible RGB
    // would only bloat PNG/lossless output.
    if (pixels[i + 3] === 0) continue;
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const u = (state >>> 0) / 0x80000000 - 1; // [-1, 1)
    const noise = Math.sign(u) * Math.abs(u) ** SHAPE;
    const delta = peak * 4 * luma * (1 - luma) * noise;
    // Uint8ClampedArray rounds and clamps on write.
    pixels[i] = r + delta;
    pixels[i + 1] = g + delta;
    pixels[i + 2] = b + delta;
  }
}

export function applyGrain(data: ImageData, options: Options): ImageData {
  const pixels = new Uint8ClampedArray(data.data);
  applyGrainToPixels(pixels, options.amount);
  return new ImageData(pixels, data.width, data.height);
}
