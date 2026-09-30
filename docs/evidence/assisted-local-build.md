# Assisted local build evidence, 2026-09-30

## Implemented

The current MVP now includes a separate assisted-local mode, a guided resumable install skill, read-only local readers and source receipts. It does not reuse the older installer/tasks wholesale. Prior source at QWaveLabs/confidant was reviewed read-only in an ignored reference clone; MIT notice is retained. No existing Confidant repo was altered.

Separate store identities prevent opening a real brain as the synthetic evaluation or mixing fixture adapters. Real brains must be outside the source repository. Setup does not discover/read source databases. Path discovery occurs lazily after approval for the named source; contact discovery is separate. Each page opens the approved SQLite database read-only with query_only and a read transaction; only normalized records and their cursor/window ledger commit atomically. Per-database high-water key and date/key pagination bind source/path-set/window, bounded to 100 items (normal model batch 12). Multiple Contacts databases retain independent identities. Database/WAL metadata changes between or during pages invalidate the cursor and require safe restart instead of silently skipping timestamp-edited rows. Changed path sets reject stale cursors; safe retries never advance missing pages.

Messages handles second/nanosecond Apple epochs, plain/known attributed bodies, direction and group participants, avoiding attachment/audio reads. WhatsApp records local supported history with a visible older/media gap. Calls force content null. Notes only reads Apple-supplied transcript text directly attached to a recognized Call Recordings note, and retains missing/link/speaker gaps. Calendar explicitly leaves floating/all-day/recurrence/future coverage unsupported. Contacts leaves older unchanged cards and identity merging unverified. Unsupported schemas never silently turn into successful empty sources.

Cloud adapters remain blocked unless automatically supplied authorized plugin results have that provider's own genuine reviewed history/privacy proof. Named people exclusions require approved identifier aliases for identifier-only sources; unresolved names added later revoke reads and remove uncertain source data until resolved and re-approved.

No live provider invocation, API key, metered call, manual export or alternate transcription was added.

CLI and optional private MCP tools expose actual-mode setup, approval, bounded import, plan batch/checkpoint, local cited receipt retrieval, views/prep/brief/feedback/drafts, health/retry, pause/disable, export/delete and reporting. No live send tool exists. Proposed schedules are generated as inert specs only, require approval and use the available native automation tool. No cadence was changed.

## Observed automated evidence

`tests/mac-runtime.test.mjs` passed all five final reader/runtime tests: six realistic temporary Mac-shaped schemas preserve database bytes, require approval and expose gaps; an assisted-mode setup resumes an interrupted 36-month Messages history with group exclusions and classification rollback/restart; external actual-mode CLI setup resumes and rejects deterministic fixtures. The records are fictional even though they use real schema shapes. Synthetic-empty classification in this test is a checkpoint assertion, not AI evidence.

`tests/report-integration.test.mjs` and private stdio tests verify reporting integration, excluded-text rejection and history purge. The final complete suite passed 63 tests, 0 failed, and the build passed. Earlier Desktop filesystem/startup timeouts are recorded separately from this passing result. Automated tests do not open real customer databases or create a lasting vault.

## Unobserved live acceptance

No real Mac source read, source permission grant, provider history check, commercial plan entitlement, interrupted high-volume scheduled classification, physical offline-Mac behavior, notification visibility or representative first-value timing was performed in this build. The earlier native scheduled six-record fictional checkpoint remains only that narrow observation. Ticket 01, ticket 04 and all provider-specific ticket 05 gates remain unresolved; original acceptance boxes are not checked.

The user explicitly approved an assisted local pilot today, with these gaps visible. This changes the handoff scope, not the original complete-MVP gate results. Source publication is separate from customer-readiness or a plugin marketplace submission. Rob's vault remains deferred.
