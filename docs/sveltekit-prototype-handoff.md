# SvelteKit prototype handoff

Last updated: 2026-05-25.

## Purpose

Create a small, disposable technical prototype that answers whether Sqush can
move from the current Rollup/Preact stack toward SvelteKit or Svelte plus Vite
without weakening the core product promise:

- image optimization stays local;
- no server upload path is introduced;
- offline/service-worker behavior remains viable;
- workers and WASM assets can be built and served reliably;
- existing framework-neutral helpers can be reused from a Svelte app.

This is not a production UI migration and not the bulk UI implementation.

## Recommended branch/worktree

Use a separate worktree and branch:

```sh
git worktree add ../Sqush-sveltekit-prototype -b code/sveltekit-prototype main
```

Keep `main` stable. The prototype branch may add temporary dependencies,
configuration, and scaffolding that would be too noisy for the production app
until proven.

## Prototype scope

Start with `prototypes/sveltekit/`.

The first milestone should prove:

1. Svelte 5/SvelteKit static output builds.
2. A Svelte route can import existing plain TypeScript helpers from the repo.
3. Bulk/session helpers can create and summarize a metadata-only batch.
4. The prototype can include a service-worker path or document what blocks it.
5. The prototype can explain how current worker/WASM codec assets would be
   handled before any real migration.

Avoid:

- production bulk UI;
- replacing the current app shell;
- deleting or moving codecs;
- changing current Rollup build behavior;
- adding server-side image processing.

## Useful context files

Read these before working:

- `docs/phase-1-readiness-audit.md`
- `docs/svelte-migration-context.md`
- `docs/bulk-image-architecture.md`
- `docs/progress-dashboard.md`
- `docs/maintenance-status.md`
- `AGENTS.md`

## Current recommendation

The SvelteKit prototype is now the highest-leverage engineering spike. It should
answer the build/platform question before production migration work begins.

If it succeeds, merge back lessons and small reusable config/docs first. Do not
merge a full UI rewrite by default.

## Fresh-chat prompt

Use this prompt in a new Codex chat if needed:

```text
Work in /Users/tav/Development/Tavlean/Sqush or the prototype worktree
/Users/tav/Development/Tavlean/Sqush-sveltekit-prototype.

Goal: create a small SvelteKit/Svelte 5 technical prototype for Sqush in a
separate worktree/branch, without changing production UI or implementing bulk
UI. The prototype should prove whether existing framework-neutral Sqush helpers
can be imported into a static/offline-capable SvelteKit or Svelte+Vite app, and
identify what must happen for workers, WASM assets, and service-worker caching.

Read first:
- AGENTS.md
- docs/phase-1-readiness-audit.md
- docs/sveltekit-prototype-handoff.md
- docs/svelte-migration-context.md
- docs/bulk-image-architecture.md
- docs/maintenance-status.md

Constraints:
- Keep the current local/offline single-image optimizer safe.
- Do not implement production bulk UI.
- Do not start a full migration.
- Do not delete codecs or major build pieces.
- Use Svelte MCP/docs when creating or analyzing Svelte code.
- Keep the prototype disposable and clearly separated from the current app.
```
