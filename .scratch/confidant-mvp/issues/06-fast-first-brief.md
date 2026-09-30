# 06: Show a useful recent brief quickly

**What to build:** After the first verified connection, a pilot customer receives a small, cited action brief from recent records while older history is still pending. This proves early value before the full backfill is built.

**Blocked by:** 03: Guide and resume first setup; 04: Checkpoint plan-only classification.

**Status:** blocked

- [ ] The first brief offers at least one concrete next action only when evidence supports it, with a source citation and a reason it matters now.
- [ ] The customer sees which source and date range informed the brief, and older history is shown as pending rather than complete.
- [ ] Measure elapsed time from the first successful source read to the first useful brief on a representative pilot Mac; target about ten minutes and report a miss honestly.
- [ ] If recent data contains no defensible action, the brief says so and still shows a useful sourced summary instead of inventing one.

## Verification status

**Synthetic implementation status:** implemented and verified on 2026-09-30. This status applies to the fictional implementation described below; original and live acceptance remains blocked and unchecked.

Scope update, 2026-09-30: this is gate-independent synthetic prototype work authorized by the user. Scheduled tasks are an accepted alternative to Dot, but actual scheduling, notifications, plan-based AI and live source/provider access remain unverified. No vault is created or opened. Original dependencies, blocked status and all acceptance checkboxes remain unchanged; fixture evidence is not an MVP acceptance pass.

Synthetic implementation: a recent fixture slice produces evidence-linked next actions, why-now text, freshness and per-source pending coverage before older pages resume. An empty action list says no defensible action was found. Timing is explicitly labelled synthetic fixture timing. Implementation: [brief service](../../../src/signals.mjs), [recent-slice CLI](../../../src/cli.mjs). Evidence: first ranked brief and incomplete historical coverage assertions in [journey tests](../../../tests/journey.test.mjs).

Acceptance gaps: the ten-minute target has not been measured from a real successful connection on a representative pilot Mac. The fixed fixture clock does not measure performance or business usefulness. A useful sourced summary for genuinely sparse customer data and actual chat delivery still need evaluation.

Additional synthetic verification: [external CLI tests](../../../tests/cli.test.mjs) launch a fresh process, observe a useful recent fixture brief and a durable paused state, then resume. Its timing remains fixture-only.


## Additional implementation evidence, 2026-09-30

The separate assisted-local install/runtime and six Mac-schema readers are now implemented, with source consent before lazy discovery/read, real/synthetic store isolation, atomic interrupted history checkpoints and visible unsupported shapes. See [assisted build evidence](../../../docs/evidence/assisted-local-build.md). Tickets 22 and 24 also have persistent CLI/chat run reporting and a stable local dashboard, described in [reporting evidence](../../../docs/evidence/local-reporting-result.md). Automated records are fictional. No actual source permission/read, provider history, full scheduled plan throughput or customer readiness is claimed. Browser visual inspection was blocked by tooling policy. Original dependency status and all acceptance boxes remain unresolved.
