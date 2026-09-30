# 18: Learn from suggestion feedback

**What to build:** A customer can respond to a specific suggestion, and the next brief changes accordingly while source facts remain protected.

**Blocked by:** 17: Rank the daily action brief.

**Status:** blocked

- [ ] Done, irrelevant, and wrong feedback is saved against the suggestion and its evidence, and later briefs suppress or rerank similar suggestions appropriately.
- [ ] A factual correction enters a reviewable state before it changes a brain fact; original source evidence remains inspectable.
- [ ] Feedback changes local preferences, ranking, timing, or suppression without automatically editing executable code or scheduled-task prompts.
- [ ] A repeated run does not reissue an item already marked done or dismissed unless new evidence justifies it.

## Verification status

**Synthetic implementation status:** implemented and verified on 2026-09-30. This status applies to the fictional implementation described below; original and live acceptance remains blocked and unchecked.

Scope update, 2026-09-30: this is gate-independent synthetic prototype work authorized by the user. Scheduled tasks are an accepted alternative to Dot, but actual scheduling, notifications, plan-based AI and live source/provider access remain unverified. No vault is created or opened. Original dependencies, blocked status and all acceptance checkboxes remain unchanged; fixture evidence is not an MVP acceptance pass.

Synthetic implementation: evidence-bound done, irrelevant, wrong and correction feedback is saved locally. Exact-evidence suppression and similarity penalties affect later ranking; reviewed corrections change a derived interpretation while raw source content stays unchanged. Implementation: [feedback and review](../../../src/signals.mjs), [store](../../../src/store.mjs). Evidence: done suppression and reviewed correction assertions in [journey tests](../../../tests/journey.test.mjs).

Acceptance gaps: feedback usefulness across realistic customer evidence, repeated customer sessions and actual scheduled briefs still needs evaluation. The local suppression, reviewed correction and changed-evidence ranking cases are now verified with fictional records. No autonomous code or task-prompt rewriting is implemented.

Additional synthetic verification: [journey tests](../../../tests/journey.test.mjs) prove wrong-feedback suppression, then lower ranking for a similar action after changed source evidence. Done feedback also traverses the actual local stdio interface in [MVP tests](../../../plugins/confidant/tests/mvp.test.mjs).


## Additional implementation evidence, 2026-09-30

The separate assisted-local install/runtime and six Mac-schema readers are now implemented, with source consent before lazy discovery/read, real/synthetic store isolation, atomic interrupted history checkpoints and visible unsupported shapes. See [assisted build evidence](../../../docs/evidence/assisted-local-build.md). Tickets 22 and 24 also have persistent CLI/chat run reporting and a stable local dashboard, described in [reporting evidence](../../../docs/evidence/local-reporting-result.md). Automated records are fictional. No actual source permission/read, provider history, full scheduled plan throughput or customer readiness is claimed. Browser visual inspection was blocked by tooling policy. Original dependency status and all acceptance boxes remain unresolved.
