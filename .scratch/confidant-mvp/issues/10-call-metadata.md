# 10: Import phone and FaceTime call metadata

**What to build:** A customer can see when a phone or FaceTime call occurred and with whom, without Confidant claiming to know what an unrecorded call contained.

**Blocked by:** 07: Resume and reconcile 36 months.

**Status:** blocked

- [ ] Authorized Mac call history imports bounded call metadata with stable source references, direction where available, participants, and timestamps.
- [ ] A cited brain answer can use call timing, while content and commitments from a metadata-only call remain unknown.
- [ ] Permission denial, absent history, and unavailable older dates appear as source gaps rather than successful full coverage.
- [ ] Repeat import and refresh preserve one call identity without duplicates or invented transcripts.

## Verification status

**Synthetic implementation status:** implemented and verified on 2026-09-30. This status applies to the fictional implementation described below; original and live acceptance remains blocked and unchecked.

Scope update, 2026-09-30: this is gate-independent synthetic prototype work authorized by the user. Scheduled tasks are an accepted alternative to Dot, but actual scheduling, notifications, plan-based AI and live source/provider access remain unverified. No vault is created or opened. Original dependencies, blocked status and all acceptance checkboxes remain unchanged; fixture evidence is not an MVP acceptance pass.

Synthetic implementation: fictional phone and FaceTime calls expose identity, timing, direction and participants, with content always null. Imported metadata is queryable through fixture citations; no classifier recovers speech or invents transcript content. Implementation: [call normalization](../../../src/adapters.mjs), [source fixture](../../../tests/fixtures/sources.mjs), [query](../../../src/engine.mjs). Evidence: metadata-only and missing-history assertions in [adapter tests](../../../tests/adapters.test.mjs), shared import ledger in [journey tests](../../../tests/journey.test.mjs).

Acceptance gaps: real call-history schema, permission path, actual oldest dates and a sourced private-chat answer have not been demonstrated. Shared stable/version identity tests do not certify live call extraction.


## Additional implementation evidence, 2026-09-30

The separate assisted-local install/runtime and six Mac-schema readers are now implemented, with source consent before lazy discovery/read, real/synthetic store isolation, atomic interrupted history checkpoints and visible unsupported shapes. See [assisted build evidence](../../../docs/evidence/assisted-local-build.md). Tickets 22 and 24 also have persistent CLI/chat run reporting and a stable local dashboard, described in [reporting evidence](../../../docs/evidence/local-reporting-result.md). Automated records are fictional. No actual source permission/read, provider history, full scheduled plan throughput or customer readiness is claimed. Browser visual inspection was blocked by tooling policy. Original dependency status and all acceptance boxes remain unresolved.
