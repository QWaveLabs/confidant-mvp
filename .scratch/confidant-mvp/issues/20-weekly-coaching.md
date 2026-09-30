# 20: Give weekly work-pattern coaching

**What to build:** A customer gets one weekly, practical observation about how they followed through at work, grounded in multiple records rather than an invented personal judgment.

**Blocked by:** 17: Rank the daily action brief.

**Status:** blocked

- [ ] A scheduled weekly run produces at most one clear observation with cited evidence, a useful improvement suggestion, and an honest coverage/freshness note.
- [ ] Synthetic examples distinguish a supported recurring work pattern from a one-off event or insufficient data.
- [ ] The observation respects any relevant feedback already available and does not repeat a dismissed claim without new evidence.
- [ ] An offline or missed run remains visible and does not claim that fresh analysis occurred.

## Verification status

**Synthetic implementation status:** implemented and verified on 2026-09-30. This status applies to the fictional implementation described below; original and live acceptance remains blocked and unchecked.

Scope update, 2026-09-30: this is gate-independent synthetic prototype work authorized by the user. Scheduled tasks are an accepted alternative to Dot, but actual scheduling, notifications, plan-based AI and live source/provider access remain unverified. No vault is created or opened. Original dependencies, blocked status and all acceptance checkboxes remain unchanged; fixture evidence is not an MVP acceptance pass.

Synthetic implementation: coaching requires at least three distinct recent sourced commitments and independent record evidence. Duplicate mentions of the same promise are insufficient; observations disclose coverage and can be dismissed, with weekly fake-delivery deduplication. Implementation: [coaching service](../../../src/signals.mjs). Evidence: the repeated single-promise fixture must return no observation in [journey tests](../../../tests/journey.test.mjs).

Acceptance gaps: useful coaching quality on real work evidence and behavior after further new evidence still need evaluation. Positive fixture coaching, weekly fake deduplication and dismissal now have dedicated passing tests. Real weekly scheduling, notification and missed/offline-run reporting remain unverified.

Additional synthetic verification: [journey tests](../../../tests/journey.test.mjs) add three distinct quoted promises and obtain one cautious, cited observation, exactly one fake weekly delivery across repeated attempts, and no observation after dismissal. The duplicate single-promise negative case remains tested.


## Additional implementation evidence, 2026-09-30

The separate assisted-local install/runtime and six Mac-schema readers are now implemented, with source consent before lazy discovery/read, real/synthetic store isolation, atomic interrupted history checkpoints and visible unsupported shapes. See [assisted build evidence](../../../docs/evidence/assisted-local-build.md). Tickets 22 and 24 also have persistent CLI/chat run reporting and a stable local dashboard, described in [reporting evidence](../../../docs/evidence/local-reporting-result.md). Automated records are fictional. No actual source permission/read, provider history, full scheduled plan throughput or customer readiness is claimed. Browser visual inspection was blocked by tooling policy. Original dependency status and all acceptance boxes remain unresolved.
