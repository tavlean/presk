import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

/**
 * Codec benchmark. For each WASM codec we upgrade, it encodes a fixed real
 * image at the app's default settings and records:
 *   - outputBytes  — exact, deterministic. The "compresses better?" signal.
 *   - encodeMs     — median over N warm runs (cold/first run recorded separately
 *                    since it includes WASM module load). The "faster?" signal.
 *   - ok           — encode succeeded + produced a non-trivial blob. Reliability.
 *
 * It writes a JSON report to benchmarks/results/<label>.json. Capture one
 * report BEFORE a codec upgrade and one AFTER, then `npm run bench:compare` the
 * two to see the size/speed delta (and catch regressions). The numbers are also
 * the raw data for any "we made X% gains" write-up.
 *
 * Timing note: encodeMs measures the editor's working-state window (the encode
 * itself), not wall-clock, so it excludes the ~100ms option debounce. It is
 * machine-dependent — only compare reports captured on the same machine.
 */
const fixture = fileURLToPath(new URL('./fixtures/photo.png', import.meta.url));
const resultsDir = fileURLToPath(new URL('./results/', import.meta.url));

const WARMUP_RUNS = 1;
const MEASURED_RUNS = 4;

// Only the WASM codecs (the ones we upgrade). Browser PNG/JPEG/GIF are native
// and never rebuilt, so they're out of scope for codec-version benchmarking.
const CODECS = [
  { id: 'webP', label: 'WebP' },
  { id: 'avif', label: 'AVIF' },
  { id: 'jxl', label: 'JPEG XL' },
  { id: 'mozJPEG', label: 'MozJPEG' },
  { id: 'oxiPNG', label: 'OxiPNG' },
  { id: 'qoi', label: 'QOI' },
];

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

test('codec benchmark', async ({ page }) => {
  test.slow();
  await page.goto('/');
  await page.setInputFiles('input[type=file]', fixture);
  await expect(page.locator('.options-2 select.builtin-select')).toBeVisible();

  const env = await page.evaluate(() => ({
    cores: navigator.hardwareConcurrency,
    isolated: self.crossOriginIsolated,
    ua: navigator.userAgent,
  }));

  // One encode pass measured entirely in-page: switch the right side to the
  // target format, time the editor's working window, and read the output size.
  const encodeOnce = (formatId: string) =>
    page.evaluate(async (id: string) => {
      const root = document.querySelector('.options-2')!;
      const select = root.querySelector<HTMLSelectElement>(
        'select.builtin-select',
      )!;
      const download = () =>
        root.querySelector<HTMLAnchorElement>('a.download[href^="blob:"]');
      const setFormat = (val: string) => {
        const setter = Object.getOwnPropertyDescriptor(
          HTMLSelectElement.prototype,
          'value',
        )!.set!;
        setter.call(select, val);
        select.dispatchEvent(new Event('change', { bubbles: true }));
      };
      const waitFor = (pred: () => boolean, timeout = 120_000) =>
        new Promise<void>((resolve, reject) => {
          const start = performance.now();
          const tick = setInterval(() => {
            if (pred()) {
              clearInterval(tick);
              resolve();
            } else if (performance.now() - start > timeout) {
              clearInterval(tick);
              reject(new Error('timeout'));
            }
          }, 8);
        });
      const working = () => document.title.includes('⏳');

      // Reset to the original so re-selecting the format re-encodes from scratch.
      setFormat('identity');
      await waitFor(() => !working());
      const prevHref = download()?.href ?? null;

      setFormat(id);
      // Encode window = working-state up → down (excludes the option debounce).
      await waitFor(() => working(), 5_000).catch(() => {});
      const start = performance.now();
      await waitFor(
        () => !working() && !!download() && download()!.href !== prevHref,
      );
      const ms = performance.now() - start;

      const bytes = (await (await fetch(download()!.href)).arrayBuffer())
        .byteLength;
      return { ms, bytes };
    }, formatId);

  const inputBytes = readFileSync(fixture).byteLength;
  const results = [];

  for (const codec of CODECS) {
    let cold = 0;
    const runs: number[] = [];
    let bytes = 0;
    let ok = true;
    try {
      for (let i = 0; i < WARMUP_RUNS; i++) {
        const r = await encodeOnce(codec.id);
        cold = r.ms;
      }
      for (let i = 0; i < MEASURED_RUNS; i++) {
        const r = await encodeOnce(codec.id);
        runs.push(r.ms);
        bytes = r.bytes;
      }
      ok = bytes > 24;
    } catch {
      ok = false;
    }
    const medianMs = runs.length ? Math.round(median(runs)) : 0;
    results.push({
      format: codec.id,
      label: codec.label,
      ok,
      outputBytes: bytes,
      vsInputPct: inputBytes ? Math.round((bytes / inputBytes) * 1000) / 10 : 0,
      coldMs: Math.round(cold),
      medianMs,
      runsMs: runs.map((m) => Math.round(m)),
    });
    // eslint-disable-next-line no-console
    console.log(
      `  ${codec.label.padEnd(9)} ${ok ? 'ok ' : 'FAIL'} ${String(bytes).padStart(8)} B  ${medianMs}ms (cold ${Math.round(cold)}ms)`,
    );
    expect(ok, `${codec.label} encode failed`).toBe(true);
  }

  const report = {
    label: process.env.BENCH_LABEL ?? 'current',
    generatedAt: new Date().toISOString(),
    fixture: 'photo.png',
    inputBytes,
    machine: env,
    warmupRuns: WARMUP_RUNS,
    measuredRuns: MEASURED_RUNS,
    codecs: results,
  };

  mkdirSync(resultsDir, { recursive: true });
  const out = `${resultsDir}${report.label}.json`;
  writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
  // eslint-disable-next-line no-console
  console.log(
    `\nBenchmark report written: benchmarks/results/${report.label}.json`,
  );
});
