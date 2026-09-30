# 22: Show health and safe retry

**What to build:** A customer and assisted-pilot operator can tell what actually connected, how fresh it is, where import stopped, and which safe action will resume it without reading private content.

**Blocked by:** 07: Resume and reconcile 36 months.

**Status:** blocked

- [ ] The health view distinguishes successful source receipts from account sign-ins, and shows last refresh, verified date range, processed count, pending work, gaps, and failed step by source.
- [ ] A denied permission, expired plugin connection, malformed page, offline Mac, and paused backfill each produce a distinct plain-language status and recovery action.
- [ ] A safe retry resumes from durable state and never marks an unprocessed record or time window complete.
- [ ] An operator can use the report to assist setup without opening raw messages, mail, or transcripts.

## Verification status

**Synthetic implementation status:** implemented and verified on 2026-09-30. This status applies to the fictional implementation described below; original and live acceptance remains blocked and unchecked.

Scope update, 2026-09-30: this is gate-independent synthetic prototype work authorized by the user. Scheduled tasks are an accepted alternative to Dot, but actual scheduling, notifications, plan-based AI and live source/provider access remain unverified. No vault is created or opened. Original dependencies, blocked status and all acceptance checkboxes remain unchanged; fixture evidence is not an MVP acceptance pass.

Synthetic implementation: health exposes source receipts, refresh times, verified bounds, record/processing counts, window states, gaps and recovery actions without raw communication content. Retries preserve durable cursor state and stop after a bounded failure count. Implementation: [health and recovery](../../../src/engine.mjs), [ledger](../../../src/store.mjs). Evidence: denied/offline/malformed/empty-source cases and interrupted retries in [journey tests](../../../tests/journey.test.mjs).

Acceptance gaps: real permission loss, expired plugin sessions, an offline connected Mac and operator-assisted setup have not been exercised. Recovery wording for a known error code is not a successful live recovery. Actual scheduled lateness and actionable support reporting need pilot verification.

Additional synthetic verification: [MVP child-process tests](../../../plugins/confidant/tests/mvp.test.mjs) preserve pause state through process restart and reject health access after deletion. [External CLI tests](../../../tests/cli.test.mjs) independently verify durable pause, full reconciliation and deletion tombstone behavior.


## Additional implementation evidence, 2026-09-30

The separate assisted-local install/runtime and six Mac-schema readers are now implemented, with source consent before lazy discovery/read, real/synthetic store isolation, atomic interrupted history checkpoints and visible unsupported shapes. See [assisted build evidence](../../../docs/evidence/assisted-local-build.md). Tickets 22 and 24 also have persistent CLI/chat run reporting and a stable local dashboard, described in [reporting evidence](../../../docs/evidence/local-reporting-result.md). Automated records are fictional. No actual source permission/read, provider history, full scheduled plan throughput or customer readiness is claimed. Browser visual inspection was blocked by tooling policy. Original dependency status and all acceptance boxes remain unresolved.
