import { describe, expect, it } from 'vitest';
import { applyGrainToPixels } from '../../src/features/processors/grain/shared/apply';
import { grainIsReal } from '../../src/client/lazy-app/feature-meta/shared';

// The numeric assertions test the CALIBRATED model, not implementation
// details: σ ≈ 0.44·amount at mid-gray, a 4L(1−L) midtone parabola, and
// monochrome deltas. Tolerances are statistical (128×128 = 16k samples).
// Calibration data: docs/specs/2026-07-12-film-grain.md.

const SIZE = 128;

function flatPixels(r: number, g = r, b = r, a = 255): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(SIZE * SIZE * 4);
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = r;
    pixels[i + 1] = g;
    pixels[i + 2] = b;
    pixels[i + 3] = a;
  }
  return pixels;
}

function channelStd(pixels: Uint8ClampedArray, base: number): number {
  let sum = 0;
  let sumSq = 0;
  const n = pixels.length / 4;
  for (let i = 0; i < pixels.length; i += 4) {
    const d = pixels[i] - base;
    sum += d;
    sumSq += d * d;
  }
  const mean = sum / n;
  return Math.sqrt(sumSq / n - mean * mean);
}

describe('applyGrainToPixels', () => {
  it('is deterministic: identical runs produce identical bytes', () => {
    const a = flatPixels(128);
    const b = flatPixels(128);
    applyGrainToPixels(a, 50);
    applyGrainToPixels(b, 50);
    expect(a).toEqual(b);
  });

  it('amount 0 is a byte-level no-op', () => {
    const pixels = flatPixels(128);
    applyGrainToPixels(pixels, 0);
    expect(pixels).toEqual(flatPixels(128));
  });

  it('hits the calibrated σ ≈ 0.44·amount at mid-gray', () => {
    for (const amount of [12, 50, 100]) {
      const pixels = flatPixels(128);
      applyGrainToPixels(pixels, amount);
      const sigma = channelStd(pixels, 128);
      expect(sigma).toBeGreaterThan(0.44 * amount * 0.93);
      expect(sigma).toBeLessThan(0.44 * amount * 1.07);
    }
  });

  it('follows the midtone parabola: quarter-tones get ~75% of peak σ', () => {
    const mid = flatPixels(128);
    const quarter = flatPixels(64);
    applyGrainToPixels(mid, 50);
    applyGrainToPixels(quarter, 50);
    // 4L(1−L) at L=64/255 is ≈ 0.752 of the mid-gray peak.
    const ratio = channelStd(quarter, 64) / channelStd(mid, 128);
    expect(ratio).toBeGreaterThan(0.7);
    expect(ratio).toBeLessThan(0.81);
  });

  it('fades to (near) nothing at the tonal extremes', () => {
    for (const tone of [0, 255]) {
      const pixels = flatPixels(tone);
      applyGrainToPixels(pixels, 100);
      expect(channelStd(pixels, tone)).toBeLessThan(1);
    }
  });

  it('adds monochrome grain: R, G and B move together', () => {
    const pixels = flatPixels(120, 130, 140);
    applyGrainToPixels(pixels, 50);
    for (let i = 0; i < pixels.length; i += 4) {
      const dr = pixels[i] - 120;
      const dg = pixels[i + 1] - 130;
      const db = pixels[i + 2] - 140;
      // Independent per-channel rounding/clamping allows ±1 divergence.
      expect(Math.abs(dr - dg)).toBeLessThanOrEqual(1);
      expect(Math.abs(dr - db)).toBeLessThanOrEqual(1);
    }
  });

  it('leaves fully transparent pixels byte-identical', () => {
    const pixels = flatPixels(128, 128, 128, 0);
    applyGrainToPixels(pixels, 100);
    expect(pixels).toEqual(flatPixels(128, 128, 128, 0));
  });

  it('never touches alpha', () => {
    const pixels = flatPixels(128, 128, 128, 137);
    applyGrainToPixels(pixels, 100);
    for (let i = 3; i < pixels.length; i += 4) {
      expect(pixels[i]).toBe(137);
    }
  });
});

describe('grainIsReal', () => {
  it('requires enabled AND a non-zero amount', () => {
    expect(grainIsReal({ enabled: true, amount: 12 })).toBe(true);
    expect(grainIsReal({ enabled: true, amount: 0 })).toBe(false);
    expect(grainIsReal({ enabled: false, amount: 12 })).toBe(false);
  });
});
