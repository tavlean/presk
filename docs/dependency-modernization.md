# Dependency Modernization

Last updated: 2026-05-31.

The `svelte` branch now uses the SvelteKit/Vite dependency graph at the repo
root. The previous Rollup/Preact dependency modernization notes are historical
and no longer describe this branch.

## Current Baseline

- Svelte 5
- SvelteKit 2
- Vite 8
- TypeScript 6
- adapter-static
- Comlink
- pointer-tracker
- wasm-feature-detect

`npm install` on the root lockfile pruned the old Rollup/Preact packages.

## Policy

- Use `npm run check` after dependency changes.
- Use `npm run audit` after lockfile changes.
- Do not run `npm audit fix --force` blindly.
- Do not change codec package lockfiles unless actively rebuilding that codec.
- Keep build/dependency changes separate from product feature work.

## Near-Term Follow-Up

- Consider Prettier 3 only as a dedicated formatting churn change.
- Consider Husky/lint-staged modernization separately from runtime work.
- Revisit SvelteKit/Vite patch updates after the migration branch is accepted.
