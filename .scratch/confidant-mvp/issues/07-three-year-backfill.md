# 07: Resume and reconcile 36 months

**What to build:** A customer can start with recent value, then watch all available authorized records in a rolling 36-month window import newest first, resume after interruption, and refresh when new records arrive.

**Blocked by:** 06: Show a useful recent brief quickly.

**Status:** blocked

- [ ] A synthetic 36-month history is processed in bounded, idempotent pages with a source and time-window ledger showing pending, committed, excluded, failed, unavailable, and unknown coverage.
- [ ] Pause, restart, offline periods, rate limits, malformed items, and duplicate pages do not advance a durable cursor past uncommitted records or silently drop an item.
- [ ] Every imported record is classified or has a visible pending, excluded, or failed reason; no unresolved range is labeled complete.
- [ ] Incremental refresh finds changed and new records after the backfill, avoids duplicates, and shows the last successful refresh time when scheduling slips.
- [ ] The customer can pause and resume the backfill, and an operator can reconcile source counts against the ledger without opening private content.

## Verification status

**Synthetic implementation status:** implemented and verified on 2026-09-30. This status applies to the fictional implementation described below; original and live acceptance remains blocked and unchecked.

Scope update, 2026-09-30: this is gate-independent synthetic prototype work authorized by the user. Scheduled tasks are an accepted alternative to Dot, but actual scheduling, notifications, plan-based AI and live source/provider access remain unverified. No vault is created or opened. Original dependencies, blocked status and all acceptance checkboxes remain unchanged; fixture evidence is not an MVP acceptance pass.

Synthetic implementation: newest-first pages cover a small 36-month fictional history with durable records, source cursors, window ledgers and separate classification state. Pause, restart, interrupted commit, duplicate boundaries, rate limits, malformed pages, stale cursors and changed versions have explicit handling. Partial WhatsApp and unavailable dates remain gaps. Implementation: [adapters](../../../src/adapters.mjs), [store](../../../src/store.mjs), [engine](../../../src/engine.mjs). Evidence: [adapter tests](../../../tests/adapters.test.mjs), full restart/reconciliation and failure cases in [journey tests](../../../tests/journey.test.mjs).

Acceptance gaps: this is 72 small rows per full fixture source, not realistic three-year source volume. Actual scheduled refresh, Mac outages, real provider pagination and plan-based classification remain unverified. Exhausting available fixture pages never certifies the entire requested date window as complete.

Additional synthetic verification: [external CLI tests](../../../tests/cli.test.mjs) reconcile all ten sources to 636 committed and 36 excluded fixture records with no pending classification, across the available 36-month history and deliberately partial 12-month WhatsApp history. [Journey regressions](../../../tests/journey.test.mjs) revoke in-flight imports on pause/disable, reject concurrent stale commits and prevent disabled records starving active-source classification.


## Additional implementation evidence, 2026-09-30

The separate assisted-local install/runtime and six Mac-schema readers are now implemented, with source consent before lazy discovery/read, real/synthetic store isolation, atomic interrupted history checkpoints and visible unsupported shapes. See [assisted build evidence](../../../docs/evidence/assisted-local-build.md). Tickets 22 and 24 also have persistent CLI/chat run reporting and a stable local dashboard, described in [reporting evidence](../../../docs/evidence/local-reporting-result.md). Automated records are fictional. No actual source permission/read, provider history, full scheduled plan throughput or customer readiness is claimed. Browser visual inspection was blocked by tooling policy. Original dependency status and all acceptance boxes remain unresolved.
