# 21: Draft follow-ups with approval

**What to build:** A customer can request an evidence-linked follow-up draft from a suggestion, inspect the recipient and text, and explicitly approve any send action. Nothing leaves their account merely because a brief or draft was generated.

**Blocked by:** 17: Rank the daily action brief.

**Status:** blocked

- [ ] A draft cites the suggestion and source facts that motivated it, and labels any unsupported detail for user review rather than inventing it.
- [ ] The customer can edit, discard, or approve the exact recipient and message; approval of one draft does not authorize later drafts.
- [ ] Automated tests with a fake outbound tool prove briefs, alerts, drafts, retries, and feedback never send without that specific approval.
- [ ] No live email or iMessage is sent as part of implementation testing without the customer's explicit approval for that message.

## Verification status

**Synthetic implementation status:** implemented and verified on 2026-09-30. This status applies to the fictional implementation described below; original and live acceptance remains blocked and unchecked.

Scope update, 2026-09-30: this is gate-independent synthetic prototype work authorized by the user. Scheduled tasks are an accepted alternative to Dot, but actual scheduling, notifications, plan-based AI and live source/provider access remain unverified. No vault is created or opened. Original dependencies, blocked status and all acceptance checkboxes remain unchanged; fixture evidence is not an MVP acceptance pass.

Synthetic implementation: suggestion-linked drafts include evidence, exact recipient/text approval and revisions. Editing revokes approval; sending is exposed only through a fake outbound test seam, which persists an attempted send and prevents automatic retry of an unknown outcome. Implementation: [draft lifecycle](../../../src/signals.mjs). Evidence: approval rejection, exact recipient, one fake send, repeat-send rejection and edited approval invalidation in [journey tests](../../../tests/journey.test.mjs).

Acceptance gaps: installation into the customer's chat and live outbound integration remain unverified. Exact approval is verified through local stdio tools, and unknown fake-send outcomes cannot retry; reconciliation of a real external outcome is outside this evaluator. No live email or Messages sender is connected or exercised. Test approval grants no permission for a real message.

Additional synthetic verification: [MVP child-process tests](../../../plugins/confidant/tests/mvp.test.mjs) create and approve an exact recipient/text draft through local tools and prove the tool list contains no send operation. [Journey tests](../../../tests/journey.test.mjs) prove an unknown fake-send outcome cannot retry or reuse its approval.


## Additional implementation evidence, 2026-09-30

The separate assisted-local install/runtime and six Mac-schema readers are now implemented, with source consent before lazy discovery/read, real/synthetic store isolation, atomic interrupted history checkpoints and visible unsupported shapes. See [assisted build evidence](../../../docs/evidence/assisted-local-build.md). Tickets 22 and 24 also have persistent CLI/chat run reporting and a stable local dashboard, described in [reporting evidence](../../../docs/evidence/local-reporting-result.md). Automated records are fictional. No actual source permission/read, provider history, full scheduled plan throughput or customer readiness is claimed. Browser visual inspection was blocked by tooling policy. Original dependency status and all acceptance boxes remain unresolved.
