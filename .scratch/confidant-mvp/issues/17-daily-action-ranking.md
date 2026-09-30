# 17: Rank the daily action brief

**What to build:** A customer receives one concise daily brief that orders follow-ups, opportunities, and relationship reminders by action value instead of receiving several disconnected agents' outputs.

**Blocked by:** 16: Browse the local brain and prepare for meetings.

**Status:** blocked

- [ ] The brief combines the three signal types into one ranked list with a concrete next action, source evidence, why-now rationale, and last-refresh time for each item.
- [ ] Annotated synthetic examples prioritize a real open commitment above stale or weak signals, deduplicate related records, and omit unsupported claims.
- [ ] The brief handles sparse or partially imported history honestly and does not label a source complete because a daily run succeeded.
- [ ] Scheduled generation and ChatGPT notification work when the Mac is available; missed or offline runs show a clear stale state rather than a fabricated fresh brief.

## Verification status

**Synthetic implementation status:** implemented and verified on 2026-09-30. This status applies to the fictional implementation described below; original and live acceptance remains blocked and unchecked.

Scope update, 2026-09-30: this is gate-independent synthetic prototype work authorized by the user. Scheduled tasks are an accepted alternative to Dot, but actual scheduling, notifications, plan-based AI and live source/provider access remain unverified. No vault is created or opened. Original dependencies, blocked status and all acceptance checkboxes remain unchanged; fixture evidence is not an MVP acceptance pass.

Synthetic implementation: follow-ups, opportunities and Contacts-based relationship reminders share a deterministic ranked list with citations, why-now rationale, freshness and duplicate suppression. Sparse history is disclosed; the fake notification seam records delivery attempts without sending live notifications. Implementation: [action ranking](../../../src/signals.mjs). Evidence: first-action ordering, partial coverage, feedback and daily fake deduplication in [journey tests](../../../tests/journey.test.mjs).

Acceptance gaps: real daily scheduled generation, visible ChatGPT notification and missed-run detection are unverified. Fixture ranking is a test rule, not proof of plan-based AI reasoning or useful ranking on customer data. A successful fake delivery does not imply source completeness.


## Additional implementation evidence, 2026-09-30

The separate assisted-local install/runtime and six Mac-schema readers are now implemented, with source consent before lazy discovery/read, real/synthetic store isolation, atomic interrupted history checkpoints and visible unsupported shapes. See [assisted build evidence](../../../docs/evidence/assisted-local-build.md). Tickets 22 and 24 also have persistent CLI/chat run reporting and a stable local dashboard, described in [reporting evidence](../../../docs/evidence/local-reporting-result.md). Automated records are fictional. No actual source permission/read, provider history, full scheduled plan throughput or customer readiness is claimed. Browser visual inspection was blocked by tooling policy. Original dependency status and all acceptance boxes remain unresolved.


## Native task handoff addition, 2026-09-30

The user approved a schedule-first assisted install: two daily Codex heartbeat roles and one quiet three-hour refresh, created by Codex through the native tool during customer setup. The owned native-settings helper, atomic install attempts, pause/duplicate/unknown-outcome safeguards and separate bounded freshness scans are implemented. See [task evidence](../../../docs/evidence/codex-task-install-result.md) and [scope specification](../../../docs/specs/003-codex-task-install.md). Automated source and task settings remain fictional; no new task installation or live source read was performed on Rob or Claudio. Required gates and original acceptance stay unresolved. Weekly coaching is optional within a daily review in this approved assisted flow, rather than a separate scheduled task.
