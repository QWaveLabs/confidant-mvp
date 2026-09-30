# 01: Prove the private Dot bridge

**What to build:** An eligible pilot customer can enable a private Confidant integration, ask Dot for a local status value, and receive a scheduled ChatGPT notification from that same integration. This establishes the real product surface before building on it.

**Blocked by:** None (can start immediately).

**Status:** blocked-unverified

**Evidence:** [Private bridge probe and remaining live proof](../../../docs/evidence/01-private-dot-bridge.md). The synthetic package passes local transport checks. Dot invocation, scheduled execution, notifications, and the connected Mac's offline behavior remain unverified; no live proof was obtained. Production dependencies remain blocked; the later user-authorized synthetic evaluator is a separate test harness.

- [ ] On an eligible pilot account, Dot invokes a private local Confidant operation while the connected Mac and desktop app are available; record the exact setup and observed result.
- [ ] A scheduled run invokes that operation without a manual chat prompt and delivers a visible ChatGPT notification.
- [ ] An offline or disconnected Mac produces a truthful unavailable state rather than a successful read.
- [ ] If either live proof fails, record the limitation and halt dependent tickets until the product scope is explicitly revised; a packaging-only or manually run demo does not pass.

## Verification status

**Synthetic implementation status:** implemented and verified on 2026-09-30. This status applies to the fictional implementation described below; original and live acceptance remains blocked and unchecked.

Scope update, 2026-09-30: this is gate-independent synthetic prototype work authorized by the user. Scheduled tasks are an accepted alternative to Dot, but actual scheduling, notifications, plan-based AI and live source/provider access remain unverified. No vault is created or opened. Original dependencies, blocked status and all acceptance checkboxes remain unchanged; fixture evidence is not an MVP acceptance pass.

Synthetic implementation: the private package exposes one challenge-bound status operation with fresh instance, time and sequence values. It explicitly preserves scheduled execution, notification and offline-Mac proof as unverified. Implementation: [probe server](../../../plugins/confidant/server.mjs), [package setup](../../../plugins/confidant/SETUP.md). Evidence: [local transport tests](../../../plugins/confidant/tests/probe.test.mjs) and [bridge evidence](../../../docs/evidence/01-private-dot-bridge.md).

Acceptance gaps: the user now permits scheduled tasks as an alternative to Dot for the trial. Neither actual unattended local invocation nor visible ChatGPT notification nor disconnected-Mac behavior has been proved. Unavailable app tooling is not a failed Dot run. The original live gate stays blocked/unverified.

Additional synthetic verification: the separate [MVP stdio server](../../../plugins/confidant/mvp-server.mjs) and [child-process tests](../../../plugins/confidant/tests/mvp.test.mjs) demonstrate the evaluation tool surface locally. Installing or invoking it from a real ChatGPT scheduled task is still unverified.


Scheduled observation, 2026-09-30: native heartbeat `confidant-mvp-synthetic-scheduled-test`, trigger `2026-09-30T04:14:26.964Z`, invoked a fresh private local probe and model-classified/checkpointed six included fictional Notes records. Independent restart verification reconciled six records and six exact-quoted facts; three missing transcripts produced no facts. The temporary task is paused. [Observed scope and remaining proof](../../../docs/evidence/scheduled-task-result.md) are recorded separately. No separate platform run ID, actual user notification receipt, physical offline behavior, full interrupted 36-month model run, commercial app entitlement, plan limits or provider history proof was observed. All original live statuses and acceptance checkboxes remain blocked/unchecked.


## Native task handoff addition, 2026-09-30

The user approved a schedule-first assisted install: two daily Codex heartbeat roles and one quiet three-hour refresh, created by Codex through the native tool during customer setup. The owned native-settings helper, atomic install attempts, pause/duplicate/unknown-outcome safeguards and separate bounded freshness scans are implemented. See [task evidence](../../../docs/evidence/codex-task-install-result.md) and [scope specification](../../../docs/specs/003-codex-task-install.md). Automated source and task settings remain fictional; no new task installation or live source read was performed on Rob or Claudio. Required gates and original acceptance stay unresolved. Weekly coaching is optional within a daily review in this approved assisted flow, rather than a separate scheduled task.
