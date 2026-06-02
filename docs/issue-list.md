# Issue List

Last updated: 2026-06-02.

Small backlog seed. The big tracks live in their own plans — see
[README.md](README.md) for the map. Product work belongs in
[road-map.md](road-map.md); the (concluded) migration record is in
[history/MIGRATION-PLAN.md](history/MIGRATION-PLAN.md).

## Done

- Migration closeout verification — `npm run check`, `npm run audit`, production
  preview browser smoke, and offline-reload-after-SW-install all pass (see
  [STATUS.md](STATUS.md) → Verification State).
- Svelte hardening waves 0–2, 4–6 landed; Wave 3 promoted to
  [codec-options-model.md](codec-options-model.md).

## Open

1. **Release browser coverage.** Chromium is primary; confirm Safari and Firefox
   before public support claims. Safari's nested-worker behavior specifically
   matters once threading is enabled — fold into
   [threading-enablement.md](threading-enablement.md) verification.
2. **Browser smoke command.** If repeated local QA keeps re-running the same
   Playwright flow, capture it as a script. See [manual-qa.md](manual-qa.md).
3. **Codec provenance gaps.** Fill any remaining gaps in
   [codec-provenance.md](codec-provenance.md) before touching committed codec
   artifacts (the codec rebuilds in [codec-upgrade-audit.md](codec-upgrade-audit.md)
   will exercise this).
4. **Turn stable backlog items into GitHub issues** if/when the project moves to
   issue-tracked work.

## Pointers (not tracked here)

- Codec version currency, urgency, new codecs → [codec-upgrade-audit.md](codec-upgrade-audit.md).
- WebP 2 removal (dead `codecs/png/` already deleted) → [codec-surface-cleanup.md](codec-surface-cleanup.md).
- Multithreading / COOP-COEP → [threading-enablement.md](threading-enablement.md).
- Remaining Svelte cleanup → [svelte-hardening-plan.md](svelte-hardening-plan.md).
