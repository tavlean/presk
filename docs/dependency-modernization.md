# Dependency Modernization

Last updated: 2026-06-02.

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

## Resolved

- Prettier 3 is in use (`prettier` ^3.8.3 with `prettier-plugin-svelte`).
- Husky/lint-staged: **removed entirely on 2026-06-02** rather than modernized.
  This is a solo project, so the pre-commit hook's only real benefit (enforcing
  format across contributors) didn't apply, and its auto-`prettier --write`
  reflowed Markdown and mangled docs. Deleted `.husky/`, the `husky`/`lint-staged`
  devDeps, the `prepare` script, and the `lint-staged` config; also dropped `md`
  from the Prettier globs. Formatting is now manual (`npm run format`). See
  [STATUS.md](STATUS.md). Do not reintroduce git hooks here without a reason.

## Near-Term Follow-Up

- Revisit SvelteKit/Vite patch updates after the migration branch is accepted.
