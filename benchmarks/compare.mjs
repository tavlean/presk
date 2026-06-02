#!/usr/bin/env node
// Compare two codec benchmark reports (before vs after a codec upgrade).
// Usage: node benchmarks/compare.mjs <before.json> <after.json>
// Defaults: before = benchmarks/baseline.json, after = benchmarks/results/current.json
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const arg = (i, fallback) => process.argv[i] ?? fallback;
const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const beforePath = arg(2, here('./baseline.json'));
const afterPath = arg(3, here('./results/current.json'));

const load = (p) => {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch (e) {
    console.error(`Could not read benchmark report: ${p}\n  ${e.message}`);
    process.exit(1);
  }
};

const before = load(beforePath);
const after = load(afterPath);

const pct = (b, a) => (b ? ((a - b) / b) * 100 : 0);
const fmtPct = (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
const arrow = (v, lowerIsBetter = true) => {
  if (Math.abs(v) < 0.5) return '≈';
  const better = lowerIsBetter ? v < 0 : v > 0;
  return better ? '✓ better' : '✗ WORSE';
};

console.log(`\nCodec benchmark comparison`);
console.log(`  before: ${before.label}  (${before.generatedAt ?? '?'})`);
console.log(`  after:  ${after.label}  (${after.generatedAt ?? '?'})`);
if (before.machine?.cores !== after.machine?.cores) {
  console.log(
    `  ⚠ different machines (cores ${before.machine?.cores} vs ${after.machine?.cores}) — timing not comparable`,
  );
}
console.log('');

const head = [
  'Codec'.padEnd(9),
  'size before'.padStart(12),
  'size after'.padStart(12),
  'size Δ'.padStart(9),
  '',
  'ms before'.padStart(10),
  'ms after'.padStart(9),
  'ms Δ'.padStart(8),
  '',
].join(' ');
console.log(head);
console.log('-'.repeat(head.length));

let regressions = 0;
for (const a of after.codecs) {
  const b = before.codecs?.find((x) => x.format === a.format);
  if (!b) {
    console.log(`${a.label.padEnd(9)}  (new — no baseline)`);
    continue;
  }
  const sizePct = pct(b.outputBytes, a.outputBytes);
  const timePct = pct(b.medianMs, a.medianMs);
  const sizeVerdict = arrow(sizePct, true); // smaller = better
  const timeVerdict = arrow(timePct, true); // faster = better
  const reliability = !a.ok ? '  ✗ ENCODE FAILED' : !b.ok ? '  (was failing)' : '';
  if (sizeVerdict.includes('WORSE') || timeVerdict.includes('WORSE') || !a.ok)
    regressions++;
  console.log(
    [
      a.label.padEnd(9),
      String(b.outputBytes).padStart(12),
      String(a.outputBytes).padStart(12),
      fmtPct(sizePct).padStart(9),
      sizeVerdict.padEnd(8),
      String(b.medianMs).padStart(10),
      String(a.medianMs).padStart(9),
      fmtPct(timePct).padStart(8),
      timeVerdict.padEnd(8),
      reliability,
    ].join(' '),
  );
}

console.log('');
console.log(
  regressions === 0
    ? '✓ No size/speed/reliability regressions.'
    : `✗ ${regressions} codec(s) regressed — review above before shipping the upgrade.`,
);
console.log('  (smaller bytes = better compression; lower ms = faster.)\n');
process.exit(regressions === 0 ? 0 : 1);
