// The root layout prerenders; this dev-only subtree must not be emitted into
// the production build, so opt out of prerender/SSR here (CSR only).
export const prerender = false;
export const ssr = false;
export const csr = true;
