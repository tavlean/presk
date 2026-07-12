import fs from 'fs';
const BASE="/Users/tav/Development/Tavlean/Frisp/benchmarks/svg";

// nano data per stratum
const nanoFiles = {
  'icons-stroke': '/tmp/nano_results.json',
  'icons-color': '/tmp/nano_icons-color.json',
  'icons-fill': '/tmp/nano_icons-fill.json',
  'logos': '/tmp/nano_logos.json',
  'editor-exports': '/tmp/nano_editor-exports.json',
  'illustrations': '/tmp/nano_illustrations.json',
};
const parseSize = s => {
  s = String(s).trim();
  if (s.endsWith('KB')) return { bytes: Math.round(parseFloat(s)*1024), approx: true };
  if (s.endsWith('B')) return { bytes: parseInt(s), approx: false };
  return { bytes: NaN, approx: true };
};

// Frisp results, index by path
const frispPath = fs.readdirSync(BASE+'/results').filter(f=>f.startsWith('frisp-')&&f.endsWith('.json'))
  .map(f=>BASE+'/results/'+f).sort((a,b)=>fs.statSync(b).mtimeMs-fs.statSync(a).mtimeMs)[0];
const frisp = JSON.parse(fs.readFileSync(frispPath,'utf8'));
const byPath = {};
for (const r of frisp.records) if(!r.error) byPath[r.path]=r;

const TIE = (a,b) => { const t=Math.max(4, 0.005*Math.max(a,b)); return Math.abs(a-b)<=t; };
const rows = [];
for (const [stratum, file] of Object.entries(nanoFiles)) {
  let data = JSON.parse(fs.readFileSync(file,"utf8")); if(!Array.isArray(data)) data = data[stratum];
  for (const d of data) {
    const path = stratum+'/'+d.name;
    const fr = byPath[path];
    if (!fr) { continue; }
    const nano = parseSize(d.res);
    rows.push({
      stratum, name:d.name,
      input: fr.inputBytes,
      nano: nano.bytes, nanoApprox: nano.approx,
      safe: fr.safe.rawBytes, auto: fr.auto.rawBytes,
    });
  }
}

// Aggregate
const strata = [...new Set(rows.map(r=>r.stratum))];
const agg = (rs) => {
  const ti=rs.reduce((a,r)=>a+r.input,0), tn=rs.reduce((a,r)=>a+r.nano,0),
        ts=rs.reduce((a,r)=>a+r.safe,0), ta=rs.reduce((a,r)=>a+r.auto,0);
  // W/T/L auto vs nano (lower=better for auto)
  let aw=0,at=0,al=0, sw=0,st=0,sl=0;
  for (const r of rs){
    if(TIE(r.auto,r.nano))at++; else if(r.auto<r.nano)aw++; else al++;
    if(TIE(r.safe,r.nano))st++; else if(r.safe<r.nano)sw++; else sl++;
  }
  return {n:rs.length,ti,tn,ts,ta,aw,at,al,sw,st,sl};
};
const pct = (out,inp)=> (100*(1-out/inp)).toFixed(1)+'%';
let md = `# Frisp vs vecta.io/nano — SVG output size\n\n`;
md += `Date: 2026-07-12. nano run via vecta.io/nano (client-side compressor, results are nano's own reported output sizes; verified exact for <1KB files, ±~51B rounding for KB-range). Frisp numbers from ${frispPath.split('/').pop()} (exact raw bytes). Comparison is RAW output bytes (nano's headline metric; nano's download is a data:URI the sandbox can't capture for gzip, so gzip/chain legs were not run — see notes).\n\n`;
md += `Sample: ${rows.length} files across ${strata.length} strata (stratified from the 215-file corpus). "auto" = Frisp Auto mode (visually-gated candidate search); "safe" = Frisp default preset.\n\n`;
md += `## Overall\n\n`;
const O = agg(rows);
md += `| Tool | Total output | Reduction vs input | vs nano (W/T/L) |\n|---|---:|---:|---|\n`;
md += `| input | ${O.ti} B | — | — |\n`;
md += `| **nano** | ${O.tn} B | ${pct(O.tn,O.ti)} | — |\n`;
md += `| **Frisp auto** | ${O.ta} B | ${pct(O.ta,O.ti)} | ${O.aw}/${O.at}/${O.al} |\n`;
md += `| **Frisp safe** | ${O.ts} B | ${pct(O.ts,O.ti)} | ${O.sw}/${O.st}/${O.sl} |\n\n`;
md += `## Per stratum (Frisp auto vs nano)\n\n`;
md += `| Stratum | n | input | nano | auto | nano red. | auto red. | auto vs nano W/T/L |\n|---|--:|--:|--:|--:|--:|--:|---|\n`;
for (const s of strata){
  const a = agg(rows.filter(r=>r.stratum===s));
  md += `| ${s} | ${a.n} | ${a.ti} | ${a.tn} | ${a.ta} | ${pct(a.tn,a.ti)} | ${pct(a.ta,a.ti)} | ${a.aw}/${a.at}/${a.al} |\n`;
}
md += `\n## Per-file detail\n\n| File | input | nano | Frisp auto | Frisp safe |\n|---|--:|--:|--:|--:|\n`;
for (const r of rows) md += `| ${r.stratum}/${r.name} | ${r.input} | ${r.nano}${r.nanoApprox?'~':''} | ${r.auto} | ${r.safe} |\n`;
md += `\n(~ = nano value rounded to 0.1KB, ±~51B)\n`;
fs.mkdirSync(BASE+'/external/nano',{recursive:true});
fs.writeFileSync(BASE+'/external/nano/RESULTS-nano.md', md);
// console summary
console.log('=== OVERALL ('+rows.length+' files) ===');
console.log('input:', O.ti, '| nano:', O.tn, '('+pct(O.tn,O.ti)+') | auto:', O.ta, '('+pct(O.ta,O.ti)+') | safe:', O.ts, '('+pct(O.ts,O.ti)+')');
console.log('Frisp auto vs nano: '+O.aw+' win / '+O.at+' tie / '+O.al+' loss');
console.log('Frisp safe vs nano: '+O.sw+' win / '+O.st+' tie / '+O.sl+' loss');
console.log('\nPer stratum (auto vs nano):');
for (const s of strata){const a=agg(rows.filter(r=>r.stratum===s));console.log(`  ${s.padEnd(16)} nano ${pct(a.tn,a.ti).padStart(6)} | auto ${pct(a.ta,a.ti).padStart(6)} | W/T/L ${a.aw}/${a.at}/${a.al}`);}
