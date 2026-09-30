# 16: Browse the local brain and prepare for meetings

**What to build:** A customer can inspect searchable People, Projects, Commitments, Opportunities, and Goals views, then ask for a concise meeting brief grounded in the records already imported.

**Blocked by:** 06: Show a useful recent brief quickly.

**Status:** blocked

- [ ] Each of the five views is readable locally, searchable, and separates sourced facts from inferred relationships or suggestions.
- [ ] Dot can answer a person or project question with citations to included records and a clear unknown when evidence is insufficient.
- [ ] An on-demand meeting brief shows relevant prior interactions and open commitments with source links, even while older backfill is pending.
- [ ] Excluded content never appears in a view, search result, or meeting brief; an ambiguous entity link remains reviewable instead of silently merged.

## Verification status

**Synthetic implementation status:** implemented and verified on 2026-09-30. This status applies to the fictional implementation described below; original and live acceptance remains blocked and unchecked.

Scope update, 2026-09-30: this is gate-independent synthetic prototype work authorized by the user. Scheduled tasks are an accepted alternative to Dot, but actual scheduling, notifications, plan-based AI and live source/provider access remain unverified. No vault is created or opened. Original dependencies, blocked status and all acceptance checkboxes remain unchanged; fixture evidence is not an MVP acceptance pass.

Synthetic implementation: local queries, five category views and meeting preparation provide fixture citations and separate recommendations from source facts. Setup goals retain setup provenance; insufficient query evidence returns unknown, and exclusion tightening removes excluded records and derived facts. Implementation: [query, views and preparation](../../../src/engine.mjs), [CLI](../../../src/cli.mjs). Evidence: cited queries, setup goals, preparation and exclusion cases in [journey tests](../../../tests/journey.test.mjs).

Acceptance gaps: a working private Dot or scheduled-chat integration and the quality of real person/project answers remain unverified. Ambiguous real identity matching needs source-specific evaluation. The evaluator requires no Obsidian vault; the optional vault generator is not being run under the latest user instruction.

Additional synthetic verification: [MVP child-process tests](../../../plugins/confidant/tests/mvp.test.mjs) return a cited Project Atlas query and an unknown answer after privacy tightening through the actual local stdio transport. Host installation and real ChatGPT use remain unverified.


## Additional implementation evidence, 2026-09-30

The separate assisted-local install/runtime and six Mac-schema readers are now implemented, with source consent before lazy discovery/read, real/synthetic store isolation, atomic interrupted history checkpoints and visible unsupported shapes. See [assisted build evidence](../../../docs/evidence/assisted-local-build.md). Tickets 22 and 24 also have persistent CLI/chat run reporting and a stable local dashboard, described in [reporting evidence](../../../docs/evidence/local-reporting-result.md). Automated records are fictional. No actual source permission/read, provider history, full scheduled plan throughput or customer readiness is claimed. Browser visual inspection was blocked by tooling policy. Original dependency status and all acceptance boxes remain unresolved.
