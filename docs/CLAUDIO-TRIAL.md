# Claudio's assisted local trial

The trial builds Claudio's own second brain on his Mac and delivers two daily Codex conversations: a morning brief and an end-of-day check-in. One quiet background task refreshes approved sources every three hours. This is an assisted local preview with unresolved live gates, not acceptance of the complete MVP.

## What setup does

Use `v0.3.0-preview` after its publication is confirmed, with [the task-install specification](specs/003-codex-task-install.md), CUSTOMER_PROMPT.md and install skill in a local Codex conversation. Verify the tag and published full commit first. Codex checks the actual runtime, chooses a dedicated private brain location, resumes saved answers where possible, and gathers role, goals, priority people/projects, categories, morning time, evening time, timezone and exclusions. No existing brain or vault is migrated or edited.

Codex presents one concrete agreement covering the assisted preview, named source reads and these three tasks. After Claudio agrees, it installs the tasks through the available native automation tool in the same conversation, without separate technical approval prompts for every task. A new source, changed cadence or privacy exposure outside that agreement still needs its own authorization.

| Task | Behavior |
| --- | --- |
| Morning brief | Up to three defensible priorities and relevant commitments, with references, timing rationale and visible source freshness. Uses Claudio's chosen morning time. |
| End-of-day check-in | Meaningful changes, completed work, open follow-through and useful feedback. Uses Claudio's chosen evening time. No invented completion or personality judgment. |
| Quiet refresh | Every three hours, checks a bounded newest slice from each approved available source for new or changed data, and classifies a bounded batch through the current permitted chat plan. Saves progress and stops safely on limits. Routine runs remain quiet. |

There are at most two planned user-facing runs daily. Evidence-supported coaching can appear in those runs; there is no separate weekly coaching task. The background task requests failure-only notifications, so host-reported failures may still notify. A background failure or permission problem is also recorded for the next brief/check-in and status view. If the host cannot honor that notification policy, it remains a disclosed installation gap rather than a promise.

Resume uses the privately recorded task IDs. Codex verifies ownership and actual saved settings before updating a matching task; it does not search-and-replace unrelated schedules. A successful configuration receipt is distinct from a first observed run, local invocation, notification and throughput proof. Times or timezone that cannot be verified remain unknown. No wake, unlock, login item or offline disconnection is part of setup.

Codex runs the local `tasks-configure` helper after the agreement, using the saved morning time plus the chosen evening time and observed client timezone. The client timezone must match the saved choice. `tasks-status` inspects owned native settings read-only. For each safe pending role, `tasks-attempt` saves an in-progress marker and returns exact automation tool arguments; Codex then calls the available native tool, views the saved task and reconciles status again. The helper does not install tasks by itself. Unknown outcomes, duplicate owned roles, chat conflicts and manual setting drift block replacement. Saved pauses remain paused. These technical steps belong to Codex, not Claudio.

## First useful result and continuing history

For an approved source, import a recent bounded slice, classify one small batch in the permitted chat plan and commit its unchanged batch plus validated outputs. Show a useful cited brief and exact source gaps. Keep older history visibly pending and continue only within permissions, plan limits and available Mac/app access. Stop safely on unsupported schemas, missing permissions or exhausted limits; a first brief is not a completed historical brain.

The worker stores durable cursors and checkpoints. Customer classification never uses the developer's synthetic classifier or fixture labels. Approved source text is untrusted data, never an instruction to execute. Missing transcripts, ambiguous speakers and historical promises stay uncertain. No account API/key, paid AI fallback or manual source export is substituted for an unsupported source.

A current freshness scan keeps the saved historical position intact. Its recent bounded slice can update new or changed records, but does not prove every edit or account was reviewed. Older backfill remains a separate pending operation, and the last successful scan remains visible if a later attempt fails.

## Known limits

| Capability | Current honest limit |
| --- | --- |
| Messages | Reviewed message/handle/chat schemas and bounded attributed-string decoding; actual Mac permissions/schema/sync remain unverified. No attachment or audio content. Unmapped named exclusions block affected reads; aliases are literal and not inferred. |
| WhatsApp | Supported locally synced history only. Unsupported events/media and unresolved identifiers remain gaps. No complete three-year promise or manual export fallback. |
| Calls | Timing, direction, parties and duration only. Content is unknown. |
| Apple Notes transcripts | Apple text directly linked to Call Recordings audio attachments only. Protobuf-only links, missing transcripts and speaker/caller attribution remain gaps. No audio transcription. |
| Calendar | Historical base non-floating event times. All-day/floating conversions, recurrence expansion and future coverage remain unverified. |
| Contacts | Timestamped cards in the rolling window and approved discovered local accounts. Account-level selection, older unchanged cards and cross-account identity merges are not established. Exclude the whole source if its boundary is unsuitable. |
| Gmail / Outlook / Fathom / Fireflies | Each remains blocked without its own genuinely reviewed plugin access, pagination, stable identities, available dates, privacy and allowed scheduled use. A normalization seam is not a connector. |
| Classification | Normal batches are bounded to 12 records with exact quotes and deadline precision validated. Six fictional records were checkpointed in a real scheduled chat. Representative interrupted 36-month plan processing, usage limits and customer entitlement remain unverified. |
| Task execution / notifications | Native tasks must be installed and their saved settings inspected on Claudio's account. IDs are not execution proof. Notification visibility, physical offline behavior and unattended bulk throughput remain unverified. |
| Privacy / sends | Literal matching is not semantic secrecy or complete identity resolution. Approved excerpts can reach the current chat plan; cloud pre-read filtering is not assumed. No live-send tool exists. |
| Optional reports | Durable records and private HTML reports are available as diagnostics. Automatic opening stays off for this flow. Actual rendered inspection remains unverified after a tooling-policy block; one development open attempt recorded a skip. |

## Controls and handoff

Pause local work, disable an individual source or change exclusions in this conversation. Source disable blocks future reads and classification; re-enabling needs fresh consent. External tasks are separate from the local pause state, so Codex verifies any requested pause or cancellation with the automation tool. Export stays private. Local deletion requires approval and does not erase chat/plugin history, backups or outside copies.

The handoff gives Claudio his verified daily times/timezone, owned task IDs and saved settings, actual source receipts, last refresh, classification progress and pending blockers. The private brain path is available for support; a dashboard path is optional. Claudio does not need to open an HTML page, change a system scheduler or copy terminal commands to finish setup.

The user approved an assisted local pilot with gaps visible. That scope permits Claudio's separately agreed observations on his own Mac; it does not turn developer fixtures into live proof. Required live gates and original ticket acceptance remain unresolved until their evidence exists. Development never installs these tasks on Rob's account or reads his sources.

Quiet activation safeguard: a newly created background role starts PAUSED. Codex verifies its actual failure-only policy, then activates that same owned ID once under the setup agreement. If the policy or activation is unobserved, it remains pending and cannot count as installed. Preexisting or later manual pauses are preserved.
