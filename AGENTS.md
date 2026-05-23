# Agent guide

This repo is not being cleaned up for its own sake. The work should move Sqush toward a lean, maintainable image optimizer whose core single-image optimization remains dependable, offline, and serverless. Bulk image optimization is the first major product milestone, and eventual Svelte/SvelteKit migration is a long-term maintainability goal.

The heart of the app is still image optimization that works reliably. Users return to Squoosh/Sqush because it can be trusted: no server dependency, no internet requirement after load, and predictable local processing. Bulk workflows, UI changes, cleanup, and migration work must protect that reliability first.

## Mission

Make the project:

- preserve reliable local image optimization as the core product value;
- easier to understand;
- safer from dependency and build-chain risk;
- simpler to maintain;
- better tested where behavior matters;
- less coupled to old Preact UI internals;
- ready for a future Svelte/SvelteKit migration when the logic boundaries are clean.

## Current product priority

Phase one is bulk image optimization.

That does not mean bulk is more important than the optimizer core. Bulk is a multiplier on the existing value: it should reuse and strengthen the same reliable decode, process, encode, preview, and export pipeline that already makes the single-image app useful.

Allowed before UI design is finalized:

- framework-neutral bulk models and helpers;
- pure tests for import, settings, queue, export, processing, and cleanup behavior;
- documentation and architecture notes;
- build, CI, dependency, and security cleanup;
- extraction of pure logic from UI components.

Do not implement production bulk UI or redesign visible UI without maintainer discussion.

## Big-picture progress signals

Track progress by area, not by commit count:

- Stabilization, CI, and security
- Documentation and handoff clarity
- Bulk backend foundation
- Repo simplification
- Svelte/SvelteKit migration readiness

Use [Progress dashboard](docs/progress-dashboard.md) as the current reference.

## Engineering rules

- Prefer small, behavior-preserving changes.
- Keep the current app working.
- Treat regressions in single-image optimization, offline behavior, or export reliability as release blockers.
- Run focused tests for small pure-helper changes.
- Run `npm run check` for build/tooling/editor changes.
- Do not push local commits unless CI validation is needed or the maintainer asks.
- Update [Maintenance status](docs/maintenance-status.md) before context may be lost.
- Keep docs honest: remove stale “pending” items after committing them.

## Simplification strategy

Prefer this order:

1. Extract pure logic from UI components.
2. Add tests around extracted behavior.
3. Reduce dependency/build risk.
4. Hide or gate product complexity only after product decisions are clear.
5. Delete old code only after build assumptions and user flows are tested.

Do not start a Svelte migration by rewriting screens first. Start by importing tested framework-neutral modules into a small prototype after the current app has better smoke coverage.

## Codec strategy

Product focus is:

- WebP 1 first;
- AVIF second;
- JPEG XL as advanced/experimental until support is confirmed;
- WebP 2 experimental only, not a normal production output.

Do not delete codec code yet. Hiding formats from the UI is lower risk than removing codec folders, generated metadata, workers, and WASM assets.
