import { gzipSync } from 'node:zlib';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import process from 'node:process';

// Every tool is measured from files on disk so raw sizes and one gzip encoder
// are applied uniformly to browser-produced and external outputs.
const root = new URL('../..', import.meta.url).pathname;
const bench = join(root, 'benchmarks/svg');
const manifest = JSON.parse(
  await readFile(join(bench, 'corpus/MANIFEST.json'), 'utf8'),
);
const resultFiles = process.argv.slice(2);
for (const file of resultFiles) JSON.parse(await readFile(file, 'utf8'));
const entries = await readdir(join(bench, 'external'), {
  withFileTypes: true,
}).catch(() => []);
const tools = entries
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
if (!tools.length)
  throw Error('No tool directories found under benchmarks/svg/external');

const inputs = new Map();
const outputs = new Map(tools.map((tool) => [tool, new Map()]));
for (const item of manifest) {
  const data = await readFile(join(bench, 'corpus', item.path));
  inputs.set(item.path, {
    raw: data.length,
    gzip: gzipSync(data, { level: 9 }).length,
  });
  for (const tool of tools) {
    try {
      const output = await readFile(join(bench, 'external', tool, item.path));
      outputs
        .get(tool)
        .set(item.path, {
          raw: output.length,
          gzip: gzipSync(output, { level: 9 }).length,
        });
    } catch {}
  }
}
const median = (values) => {
  const sorted = values.toSorted((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return !sorted.length
    ? NaN
    : sorted.length % 2
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
};
const geomean = (values) =>
  values.length
    ? Math.exp(
        values.reduce((sum, value) => sum + Math.log(value), 0) / values.length,
      )
    : NaN;
const pct = (value) =>
  Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : '—';
const tie = (a, b) => Math.abs(a - b) <= Math.max(4, Math.max(a, b) * 0.001);

function summary(tool, stratum) {
  const items = manifest.filter(
    (item) =>
      (!stratum || item.stratum === stratum) &&
      outputs.get(tool).has(item.path),
  );
  const values = items.map((item) => outputs.get(tool).get(item.path));
  return {
    count: items.length,
    raw: values.reduce((sum, value) => sum + value.raw, 0),
    gzip: values.reduce((sum, value) => sum + value.gzip, 0),
    mr: median(
      values.map((value, i) => value.raw / inputs.get(items[i].path).raw),
    ),
    gr: geomean(
      values.map((value, i) => value.raw / inputs.get(items[i].path).raw),
    ),
    mg: median(
      values.map((value, i) => value.gzip / inputs.get(items[i].path).gzip),
    ),
    gg: geomean(
      values.map((value, i) => value.gzip / inputs.get(items[i].path).gzip),
    ),
  };
}
function contests(tool) {
  return tools
    .filter((other) => other !== tool)
    .map((other) => {
      let wins = 0,
        ties = 0,
        losses = 0;
      for (const item of manifest) {
        const a = outputs.get(tool).get(item.path)?.gzip;
        const b = outputs.get(other).get(item.path)?.gzip;
        if (a === undefined || b === undefined) continue;
        if (tie(a, b)) ties++;
        else if (a < b) wins++;
        else losses++;
      }
      return `${other}: ${wins}/${ties}/${losses}`;
    })
    .join('<br>');
}
function table(stratum) {
  const lines = [
    '| Tool | Files | Raw bytes | Gzip-9 bytes | Median raw/input | Geomean raw/input | Median gzip/input | Geomean gzip/input | Gzip W/T/L |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---|',
  ];
  for (const tool of tools) {
    const s = summary(tool, stratum);
    lines.push(
      `| ${tool} | ${s.count} | ${s.raw.toLocaleString()} | ${s.gzip.toLocaleString()} | ${pct(s.mr)} | ${pct(s.gr)} | ${pct(s.mg)} | ${pct(s.gg)} | ${contests(tool)} |`,
    );
  }
  return lines.join('\n');
}
const note = resultFiles.length
  ? `Frisp metadata: ${resultFiles.map(basename).join(', ')}.`
  : 'No Frisp result JSON supplied.';
const sections = [...new Set(manifest.map((item) => item.stratum))]
  .sort()
  .flatMap((stratum) => ['', `## ${stratum}`, '', table(stratum)]);
const report = [
  '# SVG benchmark results',
  '',
  `Generated ${new Date().toISOString()}. ${note}`,
  '',
  'All outputs are read from disk and recompressed with Node zlib gzip level 9. W/T/L uses gzip size; ties are within max(4 bytes, 0.1%).',
  '',
  '## Overall',
  '',
  table(),
  ...sections,
  '',
].join('\n');
await writeFile(join(bench, 'RESULTS.md'), report);
console.log('Wrote benchmarks/svg/RESULTS.md');
