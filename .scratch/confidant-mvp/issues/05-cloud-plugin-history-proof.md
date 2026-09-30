# 05: Prove cloud-plugin history access

**What to build:** A pilot operator can see a separate verified history and privacy capability result for Gmail, Outlook, Fathom, and Fireflies before promising automated import from any of them.

**Blocked by:** 01: Prove the private Dot bridge.

**Status:** blocked-by-01

**Evidence:** [Provider inventory and privacy proof gaps](../../../docs/evidence/05-cloud-history.md). Gmail and Fathom tools are visible with pagination parameters, but history and Dot behavior are unverified. Outlook and Fireflies are unavailable in this session's tool inventory. No provider was read or connected; each implementation gate remains unresolved.

- [ ] For each provider, test whether Dot can access a connected plugin, enumerate older items, page through results, and retain stable identifiers and verifiable date coverage.
- [ ] Record a distinct pass, fail, or unavailable result for each provider; a working search or plugin listing alone is not treated as complete historical enumeration.
- [ ] Verify where exclusions can be applied before plugin results reach Dot. Where that is impossible, record the exposure and the customer consent or blocked-source behavior.
- [ ] For Fathom and Fireflies, test a direct fallback only if it requires no extra key copying or later customer intervention after initial connection.
- [ ] A provider implementation ticket starts only after its own positive proof, or after an explicit decision to change the product promise.

## Verification status

**Synthetic implementation status:** implemented and verified on 2026-09-30. This status applies to the fictional implementation described below; original and live acceptance remains blocked and unchecked.

Scope update, 2026-09-30: this is gate-independent synthetic prototype work authorized by the user. Scheduled tasks are an accepted alternative to Dot, but actual scheduling, notifications, plan-based AI and live source/provider access remain unverified. No vault is created or opened. Original dependencies, blocked status and all acceptance checkboxes remain unchanged; fixture evidence is not an MVP acceptance pass.

Synthetic implementation: cloud adapters page canonical fictional envelopes, and live normalization rejects a provider unless that exact provider has separately reviewed history, pagination, stable-identifier, date and privacy proof. Implementation: [provider proof boundary](../../../src/adapters.mjs). Evidence: provider-specific rejection cases in [adapter tests](../../../tests/adapters.test.mjs); [metadata inventory](../../../docs/evidence/05-cloud-history.md).

Acceptance gaps: Gmail and Fathom tool descriptions were visible; their historical enumeration and privacy behavior remain unverified. Outlook and Fireflies were unavailable in the inspected session inventory, which is not a permanent provider verdict. No live account, history query or direct fallback was tested. Each provider gate remains independently blocked; fixture import does not pass it.
