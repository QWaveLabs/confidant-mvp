# 02: Answer from one sourced Messages record

**What to build:** A synthetic iMessage or SMS record can move from a Mac-like Messages source into a local brain and answer a Dot question with a verifiable source reference. This is the first complete local-data path.

**Blocked by:** 01: Prove the private Dot bridge.

**Status:** blocked

- [ ] A bounded read imports incoming and outgoing synthetic Messages records with stable identity, timestamps, participants, and source references.
- [ ] A preconfigured exclusion prevents a matching record from appearing in the local brain or any Dot-bound content.
- [ ] The customer sees a source receipt only after a successful read; denied access or malformed records are shown as gaps or failures, not as connected or complete.
- [ ] Dot answers a question from an included record with a source citation and does not present an unsupported inference as a source fact.
- [ ] The simulated path uses no real customer data and leaves the existing Confidant repository unchanged.

## Verification status

**Synthetic implementation status:** implemented and verified on 2026-09-30. This status applies to the fictional implementation described below; original and live acceptance remains blocked and unchecked.

Scope update, 2026-09-30: this is gate-independent synthetic prototype work authorized by the user. Scheduled tasks are an accepted alternative to Dot, but actual scheduling, notifications, plan-based AI and live source/provider access remain unverified. No vault is created or opened. Original dependencies, blocked status and all acceptance checkboxes remain unchanged; fixture evidence is not an MVP acceptance pass.

Synthetic implementation: fictional incoming and outgoing Messages records have stable identity, timestamps, participants and fixture citations. Exclusions are applied before storage and bounded classification batches; successful reads create receipts, and included records support cited queries with an explicit unknown result. Implementation: [adapters](../../../src/adapters.mjs), [engine](../../../src/engine.mjs), [store](../../../src/store.mjs). Evidence: [adapter tests](../../../tests/adapters.test.mjs), [journey tests](../../../tests/journey.test.mjs).

Acceptance gaps: the invented SQLite fixture schema does not verify the Mac Messages schema or permission path. A local query result is not a demonstrated private Dot or scheduled-chat answer. No customer source was read; ticket 01 remains unresolved.

Additional synthetic verification: [MVP child-process tests](../../../plugins/confidant/tests/mvp.test.mjs) import included Messages fixtures, reject unsupported model quotations and return cited query results through real local stdio transport. This closes the local tool-to-brain-to-query path, without proving a host chat or Mac database connection.


## Additional implementation evidence, 2026-09-30

The separate assisted-local install/runtime and six Mac-schema readers are now implemented, with source consent before lazy discovery/read, real/synthetic store isolation, atomic interrupted history checkpoints and visible unsupported shapes. See [assisted build evidence](../../../docs/evidence/assisted-local-build.md). Tickets 22 and 24 also have persistent CLI/chat run reporting and a stable local dashboard, described in [reporting evidence](../../../docs/evidence/local-reporting-result.md). Automated records are fictional. No actual source permission/read, provider history, full scheduled plan throughput or customer readiness is claimed. Browser visual inspection was blocked by tooling policy. Original dependency status and all acceptance boxes remain unresolved.
