# 11: Import Apple Notes call transcripts

**What to build:** A call recorded and transcribed by Apple can inform the brain and link to its call evidence, while a call without an Apple transcript shows a content gap.

**Blocked by:** 07: Resume and reconcile 36 months; 10: Import phone and FaceTime call metadata.

**Status:** blocked

- [ ] After relevant Mac consent, an Apple-provided transcript is imported from Notes with provenance and linked to the correct call when that match is supported by evidence.
- [ ] A cited answer or commitment can use transcript content without treating a weak call match as certain.
- [ ] A recording or call with no Apple transcript is marked missing content; the product does not run a separate transcription service or recover unrecorded speech.
- [ ] Partial sync, denied Notes access, and repeat imports produce honest coverage and no duplicate transcript facts.

## Verification status

**Synthetic implementation status:** implemented and verified on 2026-09-30. This status applies to the fictional implementation described below; original and live acceptance remains blocked and unchecked.

Scope update, 2026-09-30: this is gate-independent synthetic prototype work authorized by the user. Scheduled tasks are an accepted alternative to Dot, but actual scheduling, notifications, plan-based AI and live source/provider access remain unverified. No vault is created or opened. Original dependencies, blocked status and all acceptance checkboxes remain unchanged; fixture evidence is not an MVP acceptance pass.

Synthetic implementation: Notes fixtures accept transcript content only when explicitly marked as Apple-supplied; absent transcripts produce null content and a visible gap. Fixture call provenance is retained, and existing transcript text can yield cited facts through the shared engine. Implementation: [Notes adapter](../../../src/adapters.mjs), [fixture provenance](../../../tests/fixtures/sources.mjs). Evidence: missing transcript cases in [adapter tests](../../../tests/adapters.test.mjs), Notes coverage gap in [journey tests](../../../tests/journey.test.mjs).

Acceptance gaps: real Apple Notes extraction, accurate matching to actual calls, partial sync and Notes permissions are unverified. Fixture call IDs are supplied test data, not proof of a call-matching algorithm. No transcription service is integrated.


## Additional implementation evidence, 2026-09-30

The separate assisted-local install/runtime and six Mac-schema readers are now implemented, with source consent before lazy discovery/read, real/synthetic store isolation, atomic interrupted history checkpoints and visible unsupported shapes. See [assisted build evidence](../../../docs/evidence/assisted-local-build.md). Tickets 22 and 24 also have persistent CLI/chat run reporting and a stable local dashboard, described in [reporting evidence](../../../docs/evidence/local-reporting-result.md). Automated records are fictional. No actual source permission/read, provider history, full scheduled plan throughput or customer readiness is claimed. Browser visual inspection was blocked by tooling policy. Original dependency status and all acceptance boxes remain unresolved.
