import { expect, test } from '@playwright/test';

// De-risking probe for MT threading: wasm-bindgen-rayon (oxipng pkg-parallel)
// needs, from INSIDE the codec worker: SharedArrayBuffer + spawning a NESTED
// Worker + sharing that SAB with the nested worker via Atomics. Safari
// historically lacked nested workers. This tests that exact capability in the
// app's cross-origin-isolated context, per-engine, with zero codec wiring.
test('engine supports nested-worker + SharedArrayBuffer (what rayon needs)', async ({
  page,
  browserName,
}) => {
  await page.goto('/');
  // The app's COOP/COEP must make the page cross-origin isolated.
  await expect
    .poll(() => page.evaluate(() => self.crossOriginIsolated), {
      timeout: 30_000,
    })
    .toBe(true);

  const result = await page.evaluate(async () => {
    const outer = `
      self.onmessage = async () => {
        try {
          const iso = self.crossOriginIsolated;
          if (typeof SharedArrayBuffer === 'undefined') { self.postMessage({ ok:false, step:'sab', iso }); return; }
          const sab = new SharedArrayBuffer(8);
          const view = new Int32Array(sab);
          if (!('Worker' in self)) { self.postMessage({ ok:false, step:'nested-worker-ctor', iso }); return; }
          const nestedCode = "self.onmessage = (e) => { const v = new Int32Array(e.data); Atomics.store(v,0,42); self.postMessage('done'); };";
          const nestedUrl = URL.createObjectURL(new Blob([nestedCode], { type:'text/javascript' }));
          const nested = new Worker(nestedUrl);
          const done = await new Promise((res) => {
            nested.onmessage = () => res('ok');
            nested.onerror = (err) => res('error:' + (err && err.message));
            setTimeout(() => res('timeout'), 5000);
            nested.postMessage(sab);
          });
          self.postMessage({ ok: done === 'ok' && Atomics.load(view,0) === 42, step:'complete', iso, nested: done, wrote: Atomics.load(view,0) });
        } catch (e) { self.postMessage({ ok:false, step:'throw', error:String(e) }); }
      };
    `;
    const url = URL.createObjectURL(
      new Blob([outer], { type: 'text/javascript' }),
    );
    const w = new Worker(url);
    return await new Promise((res) => {
      w.onmessage = (e) => res(e.data);
      w.onerror = (err) =>
        res({ ok: false, step: 'outer-error', error: err.message });
      setTimeout(() => res({ ok: false, step: 'outer-timeout' }), 15000);
      w.postMessage('go');
    });
  });

  // eslint-disable-next-line no-console
  console.log(`[THREADS-PROBE ${browserName}]`, JSON.stringify(result));
  expect(
    (result as { ok: boolean }).ok,
    `${browserName} nested-worker+SAB probe: ${JSON.stringify(result)}`,
  ).toBe(true);
});
