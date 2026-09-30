# 08: Add Calendar and Contacts context

**What to build:** Authorized event and contact data improves the identity and timing of a cited brain answer, while each supporting source has its own verified coverage receipt.

**Blocked by:** 07: Resume and reconcile 36 months.

**Status:** blocked

- [ ] A guided connection reads available Calendar and Contacts data after consent, without manual export or copied API keys.
- [ ] A synthetic meeting and contact resolve to the correct person and event in a cited answer; ambiguous identities remain visibly uncertain.
- [ ] Each source reports a genuine read, oldest and newest verified dates, and any permission or history gap.
- [ ] Changed events and contacts refresh without duplicate people or stale meeting facts.

## Verification status

**Synthetic implementation status:** implemented and verified on 2026-09-30. This status applies to the fictional implementation described below; original and live acceptance remains blocked and unchecked.

Scope update, 2026-09-30: this is gate-independent synthetic prototype work authorized by the user. Scheduled tasks are an accepted alternative to Dot, but actual scheduling, notifications, plan-based AI and live source/provider access remain unverified. No vault is created or opened. Original dependencies, blocked status and all acceptance checkboxes remain unchanged; fixture evidence is not an MVP acceptance pass.

Synthetic implementation: Calendar and Contacts fixtures use the shared paged record, receipt and cited query path. Context enters local views and meeting preparation; identities stay provisional rather than being silently merged. Explicit read-only SQLite readers accept only marked fixture databases. Implementation: [local adapter contracts](../../../src/adapters.mjs), [views and preparation](../../../src/engine.mjs). Evidence: six-source SQLite and paging cases in [adapter tests](../../../tests/adapters.test.mjs), cited preparation in [journey tests](../../../tests/journey.test.mjs).

Acceptance gaps: real Calendar/Contacts schemas, required permission setup, ambiguous real identity resolution and changed event/contact refresh have not been proved against Mac data. Fixture schema and generic version reconciliation are not source-specific live verification.


## Additional implementation evidence, 2026-09-30

The separate assisted-local install/runtime and six Mac-schema readers are now implemented, with source consent before lazy discovery/read, real/synthetic store isolation, atomic interrupted history checkpoints and visible unsupported shapes. See [assisted build evidence](../../../docs/evidence/assisted-local-build.md). Tickets 22 and 24 also have persistent CLI/chat run reporting and a stable local dashboard, described in [reporting evidence](../../../docs/evidence/local-reporting-result.md). Automated records are fictional. No actual source permission/read, provider history, full scheduled plan throughput or customer readiness is claimed. Browser visual inspection was blocked by tooling policy. Original dependency status and all acceptance boxes remain unresolved.
