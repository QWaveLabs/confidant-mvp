# 19: Send evidence-based urgent alerts

**What to build:** A customer gets a separate ChatGPT alert only when a sourced, time-sensitive action would be harmed by waiting for the next daily brief.

**Blocked by:** 17: Rank the daily action brief.

**Status:** blocked

- [ ] Annotated urgent and nonurgent examples show a stricter evidence and timing threshold than the daily brief.
- [ ] An alert includes a concrete action, why it cannot wait, source citations, and the last successful refresh time.
- [ ] The scheduler deduplicates alerts and avoids interrupting the customer for stale data or an already completed or dismissed action when such feedback exists.
- [ ] If the Mac or Dot connection is unavailable, the product reports the delivery gap instead of claiming the alert was sent.

## Verification status

**Synthetic implementation status:** implemented and verified on 2026-09-30. This status applies to the fictional implementation described below; original and live acceptance remains blocked and unchecked.

Scope update, 2026-09-30: this is gate-independent synthetic prototype work authorized by the user. Scheduled tasks are an accepted alternative to Dot, but actual scheduling, notifications, plan-based AI and live source/provider access remain unverified. No vault is created or opened. Original dependencies, blocked status and all acceptance checkboxes remain unchanged; fixture evidence is not an MVP acceptance pass.

Synthetic implementation: urgent candidates require a fresh source, stronger confidence, a source-backed timed deadline within 24 hours and an unsuppressed action. Alerts contain evidence and timing rationale; fake delivery IDs suppress repeat delivery. Implementation: [urgent thresholds](../../../src/signals.mjs), [deadline validation](../../../src/engine.mjs). Evidence: urgent versus stale-source and invalid-deadline cases in [journey tests](../../../tests/journey.test.mjs).

Acceptance gaps: actual scheduler delivery, visible alerts and disconnected-Mac delivery gaps remain unverified. Broader annotated urgent/nonurgent quality evaluation is outstanding. Synthetic candidate generation and fake notification receipts are not evidence that any customer was notified.

Additional synthetic verification: [journey regressions](../../../tests/journey.test.mjs) reject an invented hour on the correct source date and reject a timed deadline derived from date-only evidence; date-only deadlines cannot generate urgent alerts.


## Additional implementation evidence, 2026-09-30

The separate assisted-local install/runtime and six Mac-schema readers are now implemented, with source consent before lazy discovery/read, real/synthetic store isolation, atomic interrupted history checkpoints and visible unsupported shapes. See [assisted build evidence](../../../docs/evidence/assisted-local-build.md). Tickets 22 and 24 also have persistent CLI/chat run reporting and a stable local dashboard, described in [reporting evidence](../../../docs/evidence/local-reporting-result.md). Automated records are fictional. No actual source permission/read, provider history, full scheduled plan throughput or customer readiness is claimed. Browser visual inspection was blocked by tooling policy. Original dependency status and all acceptance boxes remain unresolved.
