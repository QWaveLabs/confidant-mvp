# 09: Import WhatsApp history

**What to build:** Available WhatsApp conversations on the Mac appear in the same local brain and cited chat path as Messages, while missing older local history remains a visible gap.

**Blocked by:** 07: Resume and reconcile 36 months.

**Status:** blocked

- [ ] After relevant consent, bounded reads import incoming and outgoing synthetic WhatsApp messages with stable source references and participant identity.
- [ ] Excluded chats or people are filtered before content reaches Dot, and accepted records can support a cited chat answer.
- [ ] Missing app data, denied Mac access, and incomplete older history are reported with their actual verified date range rather than a false 36-month claim.
- [ ] Repeated imports and later refreshes do not create duplicate messages or skip changed records.

## Verification status

**Synthetic implementation status:** implemented and verified on 2026-09-30. This status applies to the fictional implementation described below; original and live acceptance remains blocked and unchecked.

Scope update, 2026-09-30: this is gate-independent synthetic prototype work authorized by the user. Scheduled tasks are an accepted alternative to Dot, but actual scheduling, notifications, plan-based AI and live source/provider access remain unverified. No vault is created or opened. Original dependencies, blocked status and all acceptance checkboxes remain unchanged; fixture evidence is not an MVP acceptance pass.

Synthetic implementation: incoming/outgoing WhatsApp fixture pages retain source identity and pass through consent, exclusions, cited query and version reconciliation. Partial-history scenarios expose the available dates; the trial deliberately has only 12 fixture months. Implementation: [adapters](../../../src/adapters.mjs), [fixture rows](../../../tests/fixtures/sources.mjs), [engine](../../../src/engine.mjs). Evidence: partial-history, cursor and duplicate cases in [adapter tests](../../../tests/adapters.test.mjs), partial coverage in [journey tests](../../../tests/journey.test.mjs).

Acceptance gaps: real Mac WhatsApp schema, permission access, available local history and a private-chat cited answer remain unverified. The invented SQLite fixture is not a WhatsApp database reader.


## Additional implementation evidence, 2026-09-30

The separate assisted-local install/runtime and six Mac-schema readers are now implemented, with source consent before lazy discovery/read, real/synthetic store isolation, atomic interrupted history checkpoints and visible unsupported shapes. See [assisted build evidence](../../../docs/evidence/assisted-local-build.md). Tickets 22 and 24 also have persistent CLI/chat run reporting and a stable local dashboard, described in [reporting evidence](../../../docs/evidence/local-reporting-result.md). Automated records are fictional. No actual source permission/read, provider history, full scheduled plan throughput or customer readiness is claimed. Browser visual inspection was blocked by tooling policy. Original dependency status and all acceptance boxes remain unresolved.
