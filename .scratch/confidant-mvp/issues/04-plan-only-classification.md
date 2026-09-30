# 04: Checkpoint plan-only classification

**What to build:** A scheduled Dot run classifies a bounded batch of sourced records using the customer's permitted ChatGPT plan path, and a later run resumes from the durable checkpoint. The customer sees what was processed and what is pending.

**Blocked by:** 01: Prove the private Dot bridge; 02: Answer from one sourced Messages record.

**Status:** blocked

- [ ] A live scheduled run classifies a small sourced batch without a separate OpenAI API key, metered API charge, or a manual chat prompt for each batch.
- [ ] An interrupted, offline, or rate-limited run leaves uncommitted items pending and resumes without duplicates or silent omissions.
- [ ] Model output is validated and linked to source evidence; it cannot overwrite raw source facts without review.
- [ ] The customer can see processed, pending, and failed counts and any plan or scheduling limit encountered.
- [ ] If plan-only unattended processing is unavailable for this pilot, record the constraint and halt dependent tickets for a scope decision.

## Verification status

**Synthetic implementation status:** implemented and verified on 2026-09-30. This status applies to the fictional implementation described below; original and live acceptance remains blocked and unchecked.

Scope update, 2026-09-30: this is gate-independent synthetic prototype work authorized by the user. Scheduled tasks are an accepted alternative to Dot, but actual scheduling, notifications, plan-based AI and live source/provider access remain unverified. No vault is created or opened. Original dependencies, blocked status and all acceptance checkboxes remain unchanged; fixture evidence is not an MVP acceptance pass.

Synthetic implementation: bounded pending batches omit gold fixture labels. Validated outputs must match current source versions and exact source quotations; derived facts are separate from raw records. Atomic commits and interruption handling preserve pending records and processing counts. The deterministic fixture classifier parses source text and is explicitly synthetic. Implementation: [engine](../../../src/engine.mjs), [store](../../../src/store.mjs), [batch CLI](../../../src/cli.mjs). Evidence: stale output, invalid quotation, deadline and interrupted-commit cases in [journey tests](../../../tests/journey.test.mjs).

Acceptance gaps: no actual unattended classification through the customer's eligible ChatGPT plan has been proved, including plan limits, offline behavior and rate limits. A processor label or deterministic fixture run does not pass this hard gate. See [plan-only evidence](../../../docs/evidence/04-plan-only-classification.md).

Additional synthetic verification: [MVP child-process tests](../../../plugins/confidant/tests/mvp.test.mjs) obtain a bounded classification batch, reject an invented quotation and commit validated fixture outputs. [Journey regression tests](../../../tests/journey.test.mjs) reject invented deadline hours/precision and checkpoints after disablement. These outputs remain deterministic fixture classification, not scheduled plan-based AI.


Scheduled observation, 2026-09-30: native heartbeat `confidant-mvp-synthetic-scheduled-test`, trigger `2026-09-30T04:14:26.964Z`, invoked a fresh private local probe and model-classified/checkpointed six included fictional Notes records. Independent restart verification reconciled six records and six exact-quoted facts; three missing transcripts produced no facts. The temporary task is paused. [Observed scope and remaining proof](../../../docs/evidence/scheduled-task-result.md) are recorded separately. No separate platform run ID, actual user notification receipt, physical offline behavior, full interrupted 36-month model run, commercial app entitlement, plan limits or provider history proof was observed. All original live statuses and acceptance checkboxes remain blocked/unchecked.
