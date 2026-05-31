# Issue List

Last updated: 2026-05-31.

Use this as a backlog seed. Product work belongs in [road-map.md](road-map.md);
migration closeout belongs in [MIGRATION-PLAN.md](MIGRATION-PLAN.md).

## Migration Closeout

1. Complete full root verification.
   - `npm run check`
   - `npm run audit`
   - production preview browser smoke
   - offline reload after service-worker install

2. Add or document a current browser smoke command if repeated local QA keeps
   needing the same Playwright flow.

3. Confirm release browser coverage.
   - Chromium first.
   - Safari and Firefox before public support claims.

## Post-Migration

4. Decide codec visibility before deleting codec code.
   - Keep WebP 2 as experimental parity until maintainer testing says otherwise.
   - Hide formats only through product/design discussion.
   - Delete codec folders only after build, generated metadata, service-worker,
     and browser verification prove removal is safe.

5. Expand pure helper tests when bulk work resumes.
   - Queue progress.
   - Per-image overrides.
   - Retry/cancel behavior.
   - Export naming and cleanup.

6. Fill codec provenance gaps before touching committed codec artifacts.

7. Turn stable backlog items into GitHub issues after migration acceptance.
