// Dev-only lab route. The intro group has no index of its own anymore — the
// lab layout's tab bar is the switcher — so this route just forwards to the
// first variant. Same client-only island options as the rest of the lab.
import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';

export const prerender = false;
export const ssr = false;
export const csr = true;

export function load(): never {
  redirect(307, resolve('/lab/intro/billboard'));
}
