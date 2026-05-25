import { sveltekit } from '@sveltejs/kit/vite';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig({
  plugins: [sveltekit()],
  resolve: {
    alias: {
      'client/lazy-app/feature-meta/shared': fileURLToPath(
        new URL(
          './.svelte-kit/sqush-generated/feature-meta/shared.ts',
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
      codecs: fileURLToPath(new URL('../../codecs', import.meta.url)),
      client: fileURLToPath(new URL('../../src/client', import.meta.url)),
      features: fileURLToPath(new URL('../../src/features', import.meta.url)),
      shared: fileURLToPath(new URL('../../src/shared', import.meta.url)),
      'wasm-feature-detect': fileURLToPath(
        new URL(
          './node_modules/wasm-feature-detect/dist/esm/index.js',
          import.meta.url,
        ),
      ),
    },
  },
  server: {
    fs: {
      allow: [repoRoot],
    },
  },
});
