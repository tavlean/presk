// Dev-only benchmark route. The root layout prerenders; this browser-pipeline
// driver must never become part of the production static app.
export const prerender = false;
export const ssr = false;
export const csr = true;
