import type { ServerResponse } from 'node:http';
import { fileURLToPath } from 'node:url';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Connect, type Plugin } from 'vite';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));

// Cross-origin isolation headers. WASM threads need SharedArrayBuffer, which is
// only available when the page is cross-origin isolated. These restore the
// COOP/COEP pair that upstream Squoosh shipped (dropped when the app moved to
// root), so the existing multithreaded codec builds (_mt / _mt_simd / parallel)
// can light up. Production hosts get the same pair via static/_headers.
const crossOriginIsolationHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

// Vite's `server.headers` / `preview.headers` are NOT applied to SvelteKit's own
// page (document) responses, so the top-level document never became cross-origin
// isolated and SharedArrayBuffer stayed unavailable. This plugin injects the
// COOP/COEP pair via middleware on EVERY dev/preview response, including the
// SvelteKit-rendered page, which is what actually flips `crossOriginIsolated`.
const setIsolationHeaders = (
  _req: Connect.IncomingMessage,
  res: ServerResponse,
  next: Connect.NextFunction,
) => {
  for (const [k, v] of Object.entries(crossOriginIsolationHeaders))
    res.setHeader(k, v);
  next();
};

const crossOriginIsolation: Plugin = {
  name: 'sqush-cross-origin-isolation',
  configureServer(server) {
    server.middlewares.use(setIsolationHeaders);
  },
  configurePreviewServer(server) {
    server.middlewares.use(setIsolationHeaders);
  },
};

export default defineConfig({
  plugins: [crossOriginIsolation, sveltekit()],
  build: {
    // Never inline WASM, nor the threaded (pthread / rayon) codec glue + worker
    // scripts. A `*_mt(.worker).js` is ~2 kB — below the default inline limit —
    // so Vite would emit it as a `data:` URI, but pthread workers must be real,
    // fetchable files (a `data:` worker breaks under COEP and in WebKit), and the
    // audit + service-worker manifest expect emitted files, not inlined URIs.
    assetsInlineLimit: (filePath) => {
      if (filePath.endsWith('.wasm')) return false;
      if (/_mt(_simd)?(\.worker)?\.js$/.test(filePath)) return false;
      return undefined;
    },
  },
  resolve: {
    alias: {
      'client/lazy-app/feature-meta/shared': fileURLToPath(
        new URL(
          './.svelte-kit/sqush-generated/feature-meta/shared.ts',
          import.meta.url,
        ),
      ),
      'client/lazy-app/feature-meta/encoders': fileURLToPath(
        new URL(
          './.svelte-kit/sqush-generated/feature-meta/encoders.ts',
          import.meta.url,
        ),
      ),
      'client/lazy-app/feature-meta': fileURLToPath(
        new URL(
          './.svelte-kit/sqush-generated/feature-meta/index.ts',
          import.meta.url,
        ),
      ),
      'sqush-generated': fileURLToPath(
        new URL('./.svelte-kit/sqush-generated', import.meta.url),
      ),
      codecs: fileURLToPath(new URL('./codecs', import.meta.url)),
      client: fileURLToPath(new URL('./src/client', import.meta.url)),
      features: fileURLToPath(new URL('./src/features', import.meta.url)),
      shared: fileURLToPath(new URL('./src/shared', import.meta.url)),
      sw: fileURLToPath(new URL('./src/sw', import.meta.url)),
      'worker-shared': fileURLToPath(
        new URL('./src/worker-shared', import.meta.url),
      ),
    },
  },
  server: {
    headers: crossOriginIsolationHeaders,
    fs: {
      allow: [repoRoot],
    },
  },
  preview: {
    headers: crossOriginIsolationHeaders,
  },
});
