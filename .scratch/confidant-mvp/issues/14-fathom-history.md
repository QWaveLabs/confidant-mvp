# 14: Import Fathom meetings

**What to build:** Meetings available through the customer's connected Fathom plugin become cited brain context and commitments, with honest historical coverage.

**Blocked by:** 05: Prove cloud-plugin history access, positive Fathom result; 07: Resume and reconcile 36 months.

**Status:** blocked

- [ ] The connected plugin enumerates and pages through available meetings without a copied API key or manual export; any allowed direct fallback needs no additional customer intervention after initial connection.
- [ ] A meeting transcript or summary is linked to the original meeting, and a concrete commitment can be traced to the relevant evidence.
- [ ] A plugin result exposed to Dot before Confidant filtering follows the documented consent boundary; excluded meetings are omitted from local storage and later classification.
- [ ] Missing transcripts, limited date range, duplicates, and connection expiry appear in per-source coverage and retry status.

## Verification status

**Synthetic implementation status:** implemented and verified on 2026-09-30. This status applies to the fictional implementation described below; original and live acceptance remains blocked and unchecked.

Scope update, 2026-09-30: this is gate-independent synthetic prototype work authorized by the user. Scheduled tasks are an accepted alternative to Dot, but actual scheduling, notifications, plan-based AI and live source/provider access remain unverified. No vault is created or opened. Original dependencies, blocked status and all acceptance checkboxes remain unchanged; fixture evidence is not an MVP acceptance pass.

Synthetic implementation: fictional Fathom meeting/transcript records have stable fixture references and can support quoted commitments; pagination, duplicates, gaps and cloud exposure consent use the shared contract. Implementation: [adapters](../../../src/adapters.mjs), [fixture meetings](../../../tests/fixtures/sources.mjs), [source-bound facts](../../../src/engine.mjs). Evidence: [adapter tests](../../../tests/adapters.test.mjs), ten-source fixture journey in [journey tests](../../../tests/journey.test.mjs).

Acceptance gaps: actual meeting enumeration, source URLs, transcripts, connection expiry, date coverage and pre-read exclusions remain unverified. Visible Fathom tool descriptions are metadata evidence only. No eligible direct fallback was connected or tested; Fathom's ticket 05 gate stays blocked.
