# 24: Prove assisted-pilot readiness

**What to build:** The product team can demonstrate the complete assisted Mac pilot, identify exact source gaps, and decide honestly whether it is ready for customers. This is the integration and release gate, not a substitute for each ticket's own tests.

**Blocked by:** 08: Add Calendar and Contacts context; 09: Import WhatsApp history; 10: Import phone and FaceTime call metadata; 11: Import Apple Notes call transcripts; 12: Import Gmail mail; 13: Import Outlook mail; 14: Import Fathom meetings; 15: Import Fireflies meetings; 16: Browse the local brain and prepare for meetings; 17: Rank the daily action brief; 18: Learn from suggestion feedback; 19: Send evidence-based urgent alerts; 20: Give weekly work-pattern coaching; 21: Draft follow-ups with approval; 22: Show health and safe retry; 23: Export, delete, or disable local data.

**Status:** blocked

- [ ] One synthetic full-install test covers setup, exclusions, every required source, a useful first brief, interrupted and resumed 36-month import, source citations, scheduled work, feedback, export/deletion, and no unauthorized outbound action.
- [ ] Every imported synthetic record reconciles to classified, pending, excluded, failed, or unavailable status; no cursor or coverage range is falsely complete.
- [ ] With explicit pilot consent, live checks prove private Dot invocation, scheduled local access, ChatGPT notifications, plan-only processing, and each provider's history/consent boundary.
- [ ] On representative pilot Macs, measure setup and first useful brief time against the roughly ten-minute target after first verified connection, and report misses.
- [ ] Publish a plain-language coverage and limitation report for assisted pilots. A failed Dot, plan-only, privacy, or required-source gate blocks release until the product promise is explicitly revised.
- [ ] The existing Confidant repository and release remain unchanged; public marketplace submission is a separate later decision.

## Verification status

**Synthetic implementation status:** implemented and verified on 2026-09-30. This status applies to the fictional implementation described below; original and live acceptance remains blocked and unchecked.

Scope update, 2026-09-30: this is gate-independent synthetic prototype work authorized by the user. Scheduled tasks are an accepted alternative to Dot, but actual scheduling, notifications, plan-based AI and live source/provider access remain unverified. No vault is created or opened. Original dependencies, blocked status and all acceptance checkboxes remain unchanged; fixture evidence is not an MVP acceptance pass.

Synthetic implementation: [journey tests](../../../tests/journey.test.mjs) cover fictional setup, all ten fixture sources, a recent brief, restart and interrupted 36-month reconciliation, citations, exclusions, feedback, fake notifications, exact fake-send approval, export and deletion. [Adapter tests](../../../tests/adapters.test.mjs) cover source contracts and marked read-only SQLite fixtures; [gate tests](../../../tests/gates.test.mjs) reject synthetic evidence as a live pass. [CLI](../../../src/cli.mjs) labels the trial synthetic-only and creates no vault.

Acceptance gaps: no full unattended scheduled trial, visible ChatGPT notification, eligible plan-based classification, actual Mac source read or provider historical/privacy proof is claimed. Representative Mac timing and broader signal-quality evaluation remain outstanding; positive coaching, dismissal and fake weekly deduplication are now verified in fixtures. This supports a bounded fictional Claudio evaluation, not assisted-pilot readiness for customer data. The original repository/release is outside this work; no marketplace submission is authorized.

Additional synthetic verification: [MVP child-process tests](../../../plugins/confidant/tests/mvp.test.mjs) exercise the private local tool journey without a send tool. [External CLI tests](../../../tests/cli.test.mjs) independently reconcile 636 committed plus 36 excluded records across all ten fixture sources, export and delete, without a vault. The final full synthetic suite was observed passing on 2026-09-30: 41 tests passed, 0 failed. Real scheduled host execution and customer-source acceptance remain separate.


Scheduled observation, 2026-09-30: native heartbeat `confidant-mvp-synthetic-scheduled-test`, trigger `2026-09-30T04:14:26.964Z`, invoked a fresh private local probe and model-classified/checkpointed six included fictional Notes records. Independent restart verification reconciled six records and six exact-quoted facts; three missing transcripts produced no facts. The temporary task is paused. [Observed scope and remaining proof](../../../docs/evidence/scheduled-task-result.md) are recorded separately. No separate platform run ID, actual user notification receipt, physical offline behavior, full interrupted 36-month model run, commercial app entitlement, plan limits or provider history proof was observed. All original live statuses and acceptance checkboxes remain blocked/unchecked.


## Additional implementation evidence, 2026-09-30

The separate assisted-local install/runtime and six Mac-schema readers are now implemented, with source consent before lazy discovery/read, real/synthetic store isolation, atomic interrupted history checkpoints and visible unsupported shapes. See [assisted build evidence](../../../docs/evidence/assisted-local-build.md). Tickets 22 and 24 also have persistent CLI/chat run reporting and a stable local dashboard, described in [reporting evidence](../../../docs/evidence/local-reporting-result.md). Automated records are fictional. No actual source permission/read, provider history, full scheduled plan throughput or customer readiness is claimed. Browser visual inspection was blocked by tooling policy. Original dependency status and all acceptance boxes remain unresolved.


## Native task handoff addition, 2026-09-30

The user approved a schedule-first assisted install: two daily Codex heartbeat roles and one quiet three-hour refresh, created by Codex through the native tool during customer setup. The owned native-settings helper, atomic install attempts, pause/duplicate/unknown-outcome safeguards and separate bounded freshness scans are implemented. See [task evidence](../../../docs/evidence/codex-task-install-result.md) and [scope specification](../../../docs/specs/003-codex-task-install.md). Automated source and task settings remain fictional; no new task installation or live source read was performed on Rob or Claudio. Required gates and original acceptance stay unresolved. Weekly coaching is optional within a daily review in this approved assisted flow, rather than a separate scheduled task.
