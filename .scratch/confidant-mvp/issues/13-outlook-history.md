# 13: Import Outlook mail

**What to build:** Received and sent Outlook messages from the connected plugin enter the same cited brain and history ledger as other sources, subject to the provider's positive capability proof.

**Blocked by:** 05: Prove cloud-plugin history access, positive Outlook result; 07: Resume and reconcile 36 months.

**Status:** blocked

- [ ] Existing plugin sign-in is sufficient after customer consent; no manual mailbox export or copied API key is required.
- [ ] Paged received and sent messages in the available 36-month window retain stable identifiers, direction, source links, and verified date coverage.
- [ ] The documented source-side filtering or consent boundary is enforced, and excluded results do not enter Confidant storage or later classification.
- [ ] A cited answer uses an included Outlook thread, while duplicate pages, connection expiry, and unavailable older mail show accurate receipts and retry states.

## Verification status

**Synthetic implementation status:** implemented and verified on 2026-09-30. This status applies to the fictional implementation described below; original and live acceptance remains blocked and unchecked.

Scope update, 2026-09-30: this is gate-independent synthetic prototype work authorized by the user. Scheduled tasks are an accepted alternative to Dot, but actual scheduling, notifications, plan-based AI and live source/provider access remain unverified. No vault is created or opened. Original dependencies, blocked status and all acceptance checkboxes remain unchanged; fixture evidence is not an MVP acceptance pass.

Synthetic implementation: fictional received and sent Outlook envelopes use the same bounded receipt, privacy, classification and cited query contract. A proof for another provider cannot authorize Outlook normalization. Implementation: [cloud adapter](../../../src/adapters.mjs), [engine](../../../src/engine.mjs). Evidence: provider isolation in [adapter tests](../../../tests/adapters.test.mjs), ten-source fixture reconciliation in [journey tests](../../../tests/journey.test.mjs).

Acceptance gaps: no callable Outlook provider tool was available in the inspected session. Actual sign-in, historical pagination, stable links, exposure boundary, connection expiry and date coverage remain unverified. Outlook's ticket 05 gate is blocked independently.
