# 03: Guide and resume first setup

**What to build:** A pilot customer can complete a short conversation about their work and privacy, grant the necessary Mac access, and resume from the exact step reached after interruption. Live extraction begins only after the relevant consent.

**Blocked by:** 02: Answer from one sourced Messages record.

**Status:** blocked

- [ ] Setup asks for role, goals, important people and projects, category preferences, brief time, and people, chats, topics, or sources to exclude.
- [ ] The customer sees where Mac-source exclusions are enforced and the separate exposure boundary for cloud plugins before connecting them.
- [ ] The flow requests only required one-time permissions and account sign-ins; after consent it does not require manual exports or copied API keys.
- [ ] A source is marked connected only after a successful read, and permission denial has a clear retry action.
- [ ] Restarting after a permission change or app interruption resumes the recorded step without repeating completed answers or reading live content before consent.

## Verification status

**Synthetic implementation status:** implemented and verified on 2026-09-30. This status applies to the fictional implementation described below; original and live acceptance remains blocked and unchecked.

Scope update, 2026-09-30: this is gate-independent synthetic prototype work authorized by the user. Scheduled tasks are an accepted alternative to Dot, but actual scheduling, notifications, plan-based AI and live source/provider access remain unverified. No vault is created or opened. Original dependencies, blocked status and all acceptance checkboxes remain unchanged; fixture evidence is not an MVP acceptance pass.

Synthetic implementation: durable setup records role, goals, people, projects, categories, brief time, timezone and exclusions. Fixture consent is required after setup; cloud fixture consent models the separate pre-read exposure boundary. A receipt follows a successful read, and restart resumes recorded answers. Implementation: [engine](../../../src/engine.mjs), [CLI fictional profile](../../../src/cli.mjs). Evidence: setup restart, cloud consent and denied-read assertions in [journey tests](../../../tests/journey.test.mjs).

Acceptance gaps: real Mac permission prompts, provider sign-ins, interruption during permission changes and the complete guided private-chat setup have not been demonstrated. Fixture consent grants no live-source authorization. No vault creation or opening is part of the current trial.

Additional synthetic verification: [MVP child-process tests](../../../plugins/confidant/tests/mvp.test.mjs) exercise each guided answer, consent-before-import guards and pause state after process restart. [External CLI tests](../../../tests/cli.test.mjs) exercise fresh fictional setup and resume without creating a vault.


## Additional implementation evidence, 2026-09-30

The separate assisted-local install/runtime and six Mac-schema readers are now implemented, with source consent before lazy discovery/read, real/synthetic store isolation, atomic interrupted history checkpoints and visible unsupported shapes. See [assisted build evidence](../../../docs/evidence/assisted-local-build.md). Tickets 22 and 24 also have persistent CLI/chat run reporting and a stable local dashboard, described in [reporting evidence](../../../docs/evidence/local-reporting-result.md). Automated records are fictional. No actual source permission/read, provider history, full scheduled plan throughput or customer readiness is claimed. Browser visual inspection was blocked by tooling policy. Original dependency status and all acceptance boxes remain unresolved.
