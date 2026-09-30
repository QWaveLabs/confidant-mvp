# 04: Plan-only classification feasibility

**Live result: unverified. Synthetic checkpoint workflow: implemented and tested.** Scheduled tasks are now an accepted alternative to Dot. See [accepted scope](2026-09-29-scope-update.md) and [scheduled attempt](scheduled-task-result.md).

The private evaluation server supplies at most 12 included pending records to a chat host. Each output must reconcile one record identity, cite an exact quote, use a supported category, and preserve deadline precision. Stale, excluded, disabled, duplicate, oversized and unsupported outputs are rejected. Raw source records remain immutable. Atomic SQLite checkpoints survive model/process interruptions; changed input returns to pending classification.

The CLI `prepare-plan` command prepares six fictional Notes records without classifying them. `batch` and `commit-batch` allow classification through the current permitted chat plan. A processor label alone cannot prove scheduling, plan eligibility or execution. `demo` and `resume` explicitly use a deterministic fixture classifier, never masquerading as AI.

Observed automated evidence: full fictional setup, recent brief, pause/restart, interrupted 36-month source and classification commits, retries, deduplication and reconciliation; private stdio setup/checkpoint/query flow; external CLI setup/resume of all ten sources. These use small fixtures, not representative founder volume or unattended AI. Full suite: 41 passed, zero failed. No customer records, model API or account tokens were used.

A temporary native Codex scheduled task is configured to run a fresh local probe and classify a bounded Notes fixture batch in this chat. The actual heartbeat continuation subsequently classified and checkpointed six fictional records, with durable restart verification; [the observed result](scheduled-task-result.md) records the exact scope. The task is now paused. Even if that small batch succeeds, long-running interrupted plan-only history processing, realistic throughput, limits, notification and physical offline behavior remain separate required observations.

## Required remaining evidence

1. Verify the accepted private host, eligible account and source permissions without storing credentials.
2. Observe an actual scheduled task invoking the local operation, producing quoted model output, and committing a durable checkpoint through the plan-backed surface.
3. Process an interrupted 36-month synthetic dataset at representative volume through that same scheduled plan path, including rate limits, pause, restart, duplicates and malformed output.
4. Reconcile counts and record actual elapsed time, scheduler and plan limits, notification delivery and offline outcomes.

The [official plan usage overview](https://developers.openai.com/siwc/token-sharing-open-source) describes eligibility and consent for particular app integrations. It does not establish commercial-pilot entitlement or unattended throughput. No copied customer keys, metered API, manual exports or token reuse are implemented.

The original near-term product was a fictional Claudio trial with these gates blocked. The user subsequently [approved an assisted local pilot with gaps visible](2026-09-30-assisted-pilot-scope.md), limited to separately approved sources and bounded chat classification. This does not pass gate 04 or promise unattended history processing. A provider or processing failure needs an explicit pilot promise decision, not a hidden API fallback.
