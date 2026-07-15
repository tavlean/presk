// Dev-only lab route. Opting out of prerender/SSR keeps it a client-only
// island. In production, the app-strip-dev-only-routes Vite plugin
// (vite.config.ts) replaces this route's +page.svelte with a "Not found" stub,
// so the lab UI and its $lib/lab deps are never emitted or precached.
export const prerender = false;
export const ssr = false;
export const csr = true;
