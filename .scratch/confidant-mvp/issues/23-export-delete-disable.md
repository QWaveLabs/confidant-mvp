# 23: Export, delete, or disable local data

**What to build:** A customer can take a copy of their local brain, erase the local Confidant data, or disable a source and its scheduled work without a later surprise refresh.

**Blocked by:** 03: Guide and resume first setup; 07: Resume and reconcile 36 months.

**Status:** blocked

- [ ] Export includes local records, derived views, and source/coverage context in a usable format without requiring Obsidian.
- [ ] Deletion removes local records, derived views, and job state; a later scheduled run does not recreate them unless the customer starts setup again.
- [ ] Disabling a source prevents future reads and cancels or updates associated scheduled Dot work, while other authorized sources continue normally.
- [ ] The customer is told that local deletion does not automatically erase content already processed in Dot or retained by third-party plugins, with clear connection-revocation guidance.

## Verification status

**Synthetic implementation status:** implemented and verified on 2026-09-30. This status applies to the fictional implementation described below; original and live acceptance remains blocked and unchecked.

Scope update, 2026-09-30: this is gate-independent synthetic prototype work authorized by the user. Scheduled tasks are an accepted alternative to Dot, but actual scheduling, notifications, plan-based AI and live source/provider access remain unverified. No vault is created or opened. Original dependencies, blocked status and all acceptance checkboxes remain unchanged; fixture evidence is not an MVP acceptance pass.

Synthetic implementation: JSON export includes records, derived facts and source/coverage context without a vault. Local deletion removes the evaluation brain and job state and leaves a tombstone requiring explicit new setup. Source disablement prevents later imports, while exclusions purge included derived data. Implementation: [export and deletion](../../../src/store.mjs), [disablement](../../../src/engine.mjs), [CLI](../../../src/cli.mjs). Evidence: export/deletion/tombstone and disable assertions in [journey tests](../../../tests/journey.test.mjs).

Acceptance gaps: actual external scheduled-task cancellation and provider connection revocation are not implemented or verified. Files copied outside the managed evaluation remain outside deletion control, as does any future ChatGPT/provider retention. Privacy tightening of managed exports, in-flight disablement and protection of unowned files now have passing regression tests; no live scheduler is connected. No vault is created or opened.

Additional synthetic verification: [journey regressions](../../../tests/journey.test.mjs) verify in-flight pause/disable cancellation, rejection of unrelated directories/symlinks, preservation of unowned files and purge of managed exports/classification artifacts after tighter exclusions. [MVP tests](../../../plugins/confidant/tests/mvp.test.mjs) prove export purge and confirmed deletion across real local tool calls; [external CLI tests](../../../tests/cli.test.mjs) prove export removal and the deletion tombstone.


## Additional implementation evidence, 2026-09-30

The separate assisted-local install/runtime and six Mac-schema readers are now implemented, with source consent before lazy discovery/read, real/synthetic store isolation, atomic interrupted history checkpoints and visible unsupported shapes. See [assisted build evidence](../../../docs/evidence/assisted-local-build.md). Tickets 22 and 24 also have persistent CLI/chat run reporting and a stable local dashboard, described in [reporting evidence](../../../docs/evidence/local-reporting-result.md). Automated records are fictional. No actual source permission/read, provider history, full scheduled plan throughput or customer readiness is claimed. Browser visual inspection was blocked by tooling policy. Original dependency status and all acceptance boxes remain unresolved.


## Native task handoff addition, 2026-09-30

The user approved a schedule-first assisted install: two daily Codex heartbeat roles and one quiet three-hour refresh, created by Codex through the native tool during customer setup. The owned native-settings helper, atomic install attempts, pause/duplicate/unknown-outcome safeguards and separate bounded freshness scans are implemented. See [task evidence](../../../docs/evidence/codex-task-install-result.md) and [scope specification](../../../docs/specs/003-codex-task-install.md). Automated source and task settings remain fictional; no new task installation or live source read was performed on Rob or Claudio. Required gates and original acceptance stay unresolved. Weekly coaching is optional within a daily review in this approved assisted flow, rather than a separate scheduled task.
