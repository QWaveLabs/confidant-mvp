---
id: CMVP-001
title: Confidant assisted pilot MVP
type: spec
status: ready-for-agent
labels:
  - ready-for-agent
created: 2026-09-29
---

# Confidant assisted pilot MVP

## Problem Statement

Confidant's current install takes too long, is hard to understand and maintain, and sometimes misses steps while gathering and sorting a person's history. A customer cannot quickly tell what was actually imported, what is still processing, or what was unavailable. The product's useful output, timely follow-ups, opportunities, relationship reminders, and coaching, is buried under the setup work.

A high-volume founder or executive wants one conversation that learns their working context across their communications, helps them act on it every day, and improves as they correct it. They should get value quickly, while a much larger historical import continues honestly in the background. A claim that installing a plugin alone can access three years of every service or Mac database would mislead them: local permissions, service sign-ins, source history limits, and Dot execution capabilities still need proof.

## Solution

Create a new, small Confidant in a separate private repository for assisted Mac pilots. Dot is the intended chat and scheduled notification surface. A private Dot-facing integration guides setup, reads a local Confidant brain through narrow tools, and produces a concise daily action brief, urgent alerts, weekly coaching, and evidence-linked answers. A local Mac component handles permissions, extraction, durable import state, and searchable storage. Obsidian is not required.

The user answers a few questions about their role, goals, important people and projects, preferred categories, and exclusions. They approve Mac access and connect the available account plugins once. The product imports a recent slice first and targets a useful first brief within about ten minutes of the first successful source connection. It then works newest-first through up to 36 months of available, authorized history, refreshes current data, and shows source-by-source receipts and gaps. This time target is a pilot objective, not a claim that three years will finish in ten minutes.

The initial integration covers iMessage/SMS, WhatsApp, call history, Apple Notes call transcripts where Apple supplies them, eligible email plugins, Fathom, Fireflies, and supporting Calendar and Contacts. The user should not have to export files or copy API keys after initial permissions and sign-ins. Local content is filtered for exclusions before it reaches Dot. A connected service plugin may expose a result to Dot during retrieval, before Confidant can filter it, so that boundary must be explained and controlled separately. Processing uses the customer's ChatGPT plan, with no separate OpenAI API key or metered API bill. Since plan limits and unattended Dot/plugin behavior are uncertain, those are explicit feasibility and pilot release gates. A missing source or unfinished backfill stays visible and is never represented as complete.

## User Stories

1. As a pilot customer, I want to start from one guided conversation, so that setup feels manageable.
2. As a pilot customer, I want to know what access Confidant needs and why, so that I can make an informed choice.
3. As a pilot customer, I want to grant Mac permissions once, so that local sources keep refreshing without repeat setup.
4. As a pilot customer, I want to connect available service plugins through their normal sign-in flows, so that I do not copy API keys.
5. As a pilot customer, I want to set exclusions and understand where they apply, so that private material stays out of my Confidant brain and I know what a connected service plugin may still show Dot.
6. As a pilot customer, I want Confidant to ask about my role, goals, projects, and important relationships, so that its first categories and suggestions fit my work.
7. As a pilot customer, I want to refine those answers later in chat, so that the brain can adapt without reinstalling.
8. As a pilot customer, I want setup to resume exactly after a permission change, restart, or interruption, so that I do not repeat completed steps.
9. As a pilot customer, I want a useful recent view quickly, so that I can judge the product before historical processing finishes.
10. As a pilot customer, I want to see which sources were verified by a real read, so that a sign-in is not mistaken for a successful import.
11. As a pilot customer, I want an understandable progress view for each source, so that I know what is imported, pending, blocked, excluded, and unavailable.
12. As a pilot customer, I want my incoming and outgoing iMessage and SMS history imported where it exists on my Mac, so that follow-ups reflect both sides of a conversation.
13. As a pilot customer, I want available WhatsApp history imported from my Mac, so that important conversations are included.
14. As a pilot customer, I want phone and FaceTime call history included as call metadata, so that Confidant remembers contact timing without inventing what was said.
15. As a pilot customer, I want Apple Notes call transcripts included when Apple has created them, so that recorded calls can inform my brain.
16. As a pilot customer, I want a visible gap when a call has no Apple transcript, so that I never mistake metadata for a call summary.
17. As a pilot customer, I want my received and sent Gmail or Outlook mail imported when a suitable plugin is available, so that commitments and opportunities in email are covered.
18. As a pilot customer, I want my Fathom and Fireflies meetings imported through connected plugins, so that meeting commitments enter the same brain.
19. As a pilot customer, I want Calendar and Contacts used to identify events and people, so that related records are joined accurately.
20. As a pilot customer, I want all available authorized records from the last 36 months considered, so that older context is not silently ignored.
21. As a pilot customer, I want imports to survive shutdowns and connection failures, so that work resumes without duplicates or missing pages.
22. As a pilot customer, I want every imported record classified or given a visible pending, excluded, or failed reason, so that coverage claims are trustworthy.
23. As a pilot customer, I want readable and searchable pages for People, Projects, Commitments, Opportunities, and Goals, so that I can inspect what Confidant knows.
24. As a pilot customer, I want each important fact and suggestion linked to its source, so that I can check and correct it.
25. As a pilot customer, I want to ask questions in chat about people, projects, and recent work, so that I can use my history without searching each source.
26. As a pilot customer, I want meeting prep on demand, so that I see prior interactions and open commitments before a conversation.
27. As a pilot customer, I want one short daily brief ordered by action value, so that I know what deserves attention today.
28. As a pilot customer, I want follow-ups, opportunities, and relationship reminders in that brief, so that valuable work does not slip away.
29. As a pilot customer, I want an urgent alert only when evidence supports a genuinely time-sensitive action, so that I am not interrupted by noise.
30. As a pilot customer, I want one weekly coaching observation about my work patterns, so that I can improve how I follow through.
31. As a pilot customer, I want to see why an item matters now and what next action is suggested, so that I can decide quickly.
32. As a pilot customer, I want to mark an item done, irrelevant, or wrong, so that future briefs become more useful.
33. As a pilot customer, I want a factual correction to be reviewed before it replaces a sourced fact, so that one bad suggestion does not corrupt the brain.
34. As a pilot customer, I want Confidant to avoid repeating dismissed or already completed suggestions, so that feedback changes what I see.
35. As a pilot customer, I want an optional follow-up draft for my review, so that I can act faster while deciding whether anything is sent.
36. As a pilot customer, I want Confidant never to send a message on my behalf without my approval, so that I retain control of outbound communication.
37. As a pilot customer, I want ChatGPT/Dot notifications for the pilot, so that proactive work reaches me where I already chat.
38. As a pilot customer, I want the last successful refresh time shown, so that I can interpret suggestions when my Mac or connection has been offline.
39. As a pilot customer, I want to pause and resume backfill, so that I can control a long import.
40. As a pilot customer, I want to delete or export my local brain, so that I control my data.
41. As an assisted-pilot operator, I want a source verification and coverage report, so that I can help a customer without claiming unsupported connections.
42. As an assisted-pilot operator, I want to see a failed step and the safe retry action, so that I can recover setup without guessing.
43. As an assisted-pilot operator, I want a clear feasibility result for each third-party plugin and Dot scheduled flow, so that I know whether the pilot meets its promise.
44. As the product team, I want to measure time to first useful brief and suggestion feedback, so that I can decide what to simplify or improve.
45. As the product team, I want the existing Confidant release untouched, so that current users can keep using it while this MVP is developed.

## Implementation Decisions

- **Project boundary.** Build in a new repository. Treat the existing Confidant as read-only prior art. Reuse proven parser contracts, fixture patterns, or wording selectively after review; do not copy its installer or nine scheduled agents wholesale. No customer records or credentials enter the repository.
- **Pilot surface and first proof.** Target a private, desktop Dot-facing plugin or local integration, with Dot providing chat, scheduled work, and ChatGPT notifications. Before depending on this design, prove on an eligible pilot account that Dot can invoke the private local integration, use a connected third-party plugin, and run the scheduled flow while the Mac is available. Packaging a private plugin does not by itself prove this orchestration. If the proof fails, do not label the pilot Dot-integrated or silently switch the product promise; bring the constraint back for a scope decision.
- **Eligibility and setup.** Restrict the assisted pilot to Mac users with eligible Dot access and required local permissions. Explain that ChatGPT desktop and the Mac must remain available for local refreshes. The setup is a short guided flow, with one-time Full Disk Access or service consent where needed. It is not described as literal one-click access to all data.
- **Privacy boundary.** Store raw imported content and the searchable brain locally with access limited to the Mac user. Collect exclusions before content processing. For Mac sources, filter excluded records before sending bounded excerpts to Dot. For cloud sources, request source-side or query-level filtering where a connected plugin supports it, then exclude matching records from Confidant storage and further classification. A cloud plugin may show results to Dot before Confidant can filter them. Explain this before connection; if pre-read filtering is unavailable and the customer does not consent to that exposure, leave the source blocked rather than claiming the exclusion is enforced. Do not log raw private content for support by default. Support a local export of the brain and complete deletion of local records, derived views, and job state; allow connected sources to be disabled without silently resuming them.
- **Local architecture.** A small local worker owns Mac source adapters, durable job state, coverage receipts, normalization, deduplication, local search, and refresh. Connected service plugins remain the account-authenticated path for cloud sources; if the Dot orchestration proof succeeds, their paged results pass through the same normalization and coverage checks. Expose narrow read/progress/feedback operations to the Dot integration. Keep source reads, AI categorization, and notification composition separate so a failed model step cannot make source coverage appear complete.
- **Data contract.** Each normalized record has a stable source identity, source timestamp and direction where applicable, participants, available content or metadata, provenance, privacy state, import state, and processing state. Store links back to the originating item when the source permits. Keep raw source facts distinct from inferred entities and suggestions. Model output must not overwrite source facts without a reviewable correction.
- **Brain shape.** Use a simple local store suitable for three years of records and searchable views. Materialize readable People, Projects, Commitments, Opportunities, and Goals views; Obsidian is optional. The relationships between entities are stored for reasoning and navigation, but a graph visualization is not part of this MVP.
- **Source contract.** Each adapter can probe access, read bounded pages in date order, return stable IDs and cursor evidence, and report the oldest verified date, newest verified date, counts, and gaps. A source is connected only after a successful read. Importing older pages never advances a durable cursor before normalized records and coverage state are committed.
- **Required source set.** Include local Messages for incoming and outgoing iMessage/SMS; available Mac WhatsApp history; phone/FaceTime call metadata; Apple Notes call transcripts only when Apple supplied them; Gmail and Outlook mail through available account plugins; Fathom and Fireflies meetings through their plugins; Calendar and Contacts for context. Email providers without a suitable plugin can be marked unsupported for this pilot. Calls without transcripts remain metadata only.
- **Plugin source feasibility.** Verify that each connected email, Fathom, and Fireflies plugin can enumerate and page through the requested history and provide useful stable identifiers. Plugin existence or search capability is not proof of complete historical access. A direct Fathom or Fireflies fallback is allowed only if it can be connected without extra customer key copying or later manual steps. If a required recorder cannot meet this, mark the capability as blocked and revisit the pilot scope before release.
- **Historical coverage.** Target a rolling 36-month window of all available authorized data, newest first. Process small idempotent batches and keep a source and time-window ledger with pending, processing, committed, excluded, failed, unavailable, and unknown states. Record why any item cannot be classified. Retry bounded failures and resume after interruption. Never claim complete coverage while a source, date range, or record remains unresolved.
- **Time to value.** Import and categorize a recent slice first, aiming for an evidence-backed brief within about ten minutes after the first successful source connection on representative pilot Macs. Continue the rest of the 36-month work in the background. Report both first-value time and historical progress; there is no fixed full-backfill deadline.
- **AI and cost boundary.** Use the customer's ChatGPT plan for AI categorization and briefing. Do not require a separate OpenAI API key, silently switch to a metered API, or imply that plan usage guarantees unattended bulk throughput. Keep deterministic extraction and state management local. A bounded Dot job may classify a batch and checkpoint its result only if the product surface permits it. Do not design the local worker as though the customer's plan were an unrestricted API entitlement; a separate paid-app plan-usage integration requires its own eligibility or approval. Prove the intended path with a long-running, interrupted 36-month fixture before calling backfill automatic.
- **Onboarding model.** Ask for role, goals, high-priority people and projects, category preferences, daily brief time, and exclusions. Seed only a small set of categories and improve them through chat feedback. Do not require the user to design a taxonomy before the first brief.
- **Proactive output.** Replace the existing spread of scheduled agents with one daily action brief, urgent alerts, and one weekly coaching observation. Refresh available sources before the brief and aim for lightweight refreshes about every three hours while the Mac and integration are available; show the actual last-refresh time because scheduling may slip. Brief items have a concrete suggested next action, evidence links, timing rationale, freshness indicator, and confidence. Rank follow-ups, opportunities, and relationship reminders together, deduplicate them, and suppress low-quality repeats. An urgent alert needs stronger evidence and time sensitivity than a daily brief item.
- **Feedback loop.** Capture done, irrelevant, wrong, and factual-correction feedback against a specific suggestion and its evidence. Use the first three to adjust local ranking, timing, and suppression. Review factual corrections before changing the brain. Improvement changes preferences and scores, not executable code or scheduled-task prompts.
- **Outbound boundary.** Confidant may draft a follow-up in chat. Sending email, iMessage, or another outbound message requires the customer's explicit approval for that draft and recipient. The pilot's proactive delivery channel is ChatGPT/Dot notification; email or iMessage delivery can be considered separately after the core pilot works.
- **Operational state.** Provide a plain-language install and health view with real connection receipts, last refresh, source coverage, failed step, retry action, and overall backfill state. A paused, offline, or blocked state must never look complete. The operator can inspect status without opening private raw content.

## Testing Decisions

- **Primary seam.** Test the external product journey through one simulated full setup: guided answers and exclusions, fake Mac source databases, paged fake service-plugin results, interrupted and resumed 36-month import, local brain queries, scheduled brief generation, notifications, and feedback. Assert observable receipts, coverage, citations, suggestion behavior, and outbound approval rather than internal function calls. This is the highest practical seam and the main automated acceptance suite.
- **Prior art.** The existing Confidant uses a synthetic end-to-end install test with temporary Mac-like data, fake home directories, and mocked recorder data. Carry forward that fixture idea and contract tests for normalized records, while keeping this new implementation independent.
- **Connection and history cases.** Exercise every required source with both incoming and outgoing records where relevant. Include empty sources, permission denial, unsupported plugin, missing Apple transcript, only partial WhatsApp history, plugin pagination, duplicates, malformed items, changed source data, and a Mac or app that goes offline. Assert no false connected or complete state and no cursor advance past uncommitted records.
- **Privacy and safety cases.** Assert Mac-source exclusions prevent local categorization and Dot-bound excerpts. For cloud plugins, verify source-side filters when claimed, block an unfiltered source if the customer declines that exposure, and omit excluded results from the Confidant brain and later classification. Assert source content stays out of logs and repository artifacts, and no outbound message is sent by a brief, alert, draft, or feedback path without an approval step. Verify export and deletion of all local records, derived views, and job state, plus disabled-source behavior.
- **Signal quality cases.** Use annotated synthetic situations to check that the daily brief prioritizes actionable follow-ups, opportunities, and relationship reminders with evidence and timing, suppresses repeats, and shows a useful correction after done/irrelevant/wrong feedback. Check that coaching describes a real work pattern with citations, not an invented personal judgment.
- **Live feasibility gate.** On an eligible assisted-pilot account, demonstrate Dot calling the private local integration, accessing each intended connected service plugin, running a scheduled refresh/brief while the Mac is online, and delivering a ChatGPT notification. Verify where exclusions can be applied before cloud-plugin results reach Dot and show the exact consent or blocked behavior where they cannot. Record unsupported behavior and plan limits. Do not substitute a manually run chat for this proof.
- **Import and speed gate.** Run a three-year synthetic dataset through pause, restart, rate-limit, and retry scenarios and reconcile every imported record against the coverage ledger. On representative assisted-pilot Macs, measure setup time and first useful brief time. The roughly ten-minute first-value target is judged after the first successful connection, and missed targets are reported rather than hidden.
- **Pilot release gate.** Each required source must either pass a genuine read and historical-coverage check or be reported with the exact user-visible gap. The private Dot flow, scheduled work, plan-only processing, evidence-linked daily brief, feedback, and safe outbound boundary must pass with pilot data before calling the MVP ready. If a required source or plan-only backfill cannot work within these constraints, revise the promise with the user before release.

## Out of Scope

- Changing, replacing, or migrating existing Confidant customers or the existing release.
- A public marketplace listing or claim of official plugin approval. Public submission of a Mac-local product is a separate review decision.
- Obsidian as a required dependency, a separate web dashboard, an HTML guide as the primary interface, or a visual relationship graph.
- Screenpipe and continuous screen capture. It remains a possible full-install option after this MVP.
- A separate standalone desktop interface, iMessage-native chat or notification delivery, and automatic outbound messages.
- Separate OpenAI API keys, metered API backfill, local-model transcription, or a separate call transcription service.
- Slack, Plaud, or meeting recorder services beyond Fathom and Fireflies for the first pilot.
- Recovering call content that was never recorded or transcribed, or promising that a source contains a full 36 months when its provider or local database does not.
- Self-service public onboarding before assisted pilots prove setup and source reliability.

## Further Notes

- **Feasibility is intentionally visible.** Dot eligibility, private-plugin execution inside Dot, third-party plugin enumeration, scheduled access to a local Mac, and ChatGPT-plan-only long-running processing are assumptions to prove, not published capabilities promised by this spec.
- **Terms.** A *source receipt* is proof of a successful read with a timestamp and coverage facts. A *coverage gap* names an unavailable or unverified source or time range. A *record* is a source item; a *brain fact* is a derived, evidence-linked interpretation; a *suggestion* is a proposed next action. These terms keep import completion separate from classification and recommendation quality.
- **Relevant product guidance.** [Dot getting started](https://help.openai.com/en/articles/20001530-getting-started-with-your-dot), [Dot computer and app connections](https://learn.chatgpt.com/docs/dots/computers-and-apps), [private plugin packaging](https://developers.openai.com/plugins/build/plugins), [scheduled tasks](https://learn.chatgpt.com/docs/automations), and [ChatGPT plan usage conditions](https://developers.openai.com/siwc/token-sharing-open-source).
- **Later marketplace path.** [OpenAI's public submission guidance](https://developers.openai.com/plugins/guides/submit-claude-plugin) calls for partner discussion for products whose core value needs arbitrary local computer or app access. A successful private pilot does not imply automatic public listing approval.
- **Apple limitation.** [Apple's call recording guidance](https://support.apple.com/guide/iphone/record-and-transcribe-a-call-iph57c6590e9/27/ios/27) describes conditions for recording and transcription. Confidant reads an Apple-provided transcript if it exists and otherwise reports the missing content.
