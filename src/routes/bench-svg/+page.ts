// Dev-only benchmark route. Opting out of prerender/SSR keeps it a client-only
// island. In production, the app-strip-dev-only-routes Vite plugin
// (vite.config.ts) replaces this route's +page.svelte with a "Not found" stub,
// so the benchmark UI is never emitted into the static build.
export const prerender = false;
export const ssr = false;
export const csr = true;
