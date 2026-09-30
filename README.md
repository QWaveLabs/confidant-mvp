# Confidant MVP

A guided local second brain that helps you start and finish your day in Codex. During setup, Codex installs a morning brief, an end-of-day check-in and one quiet background refresh, using the times, timezone and sources you approve. Your brain stays on your Mac, outside this repository.

**Release state: assisted local preview, required live gates unresolved.** A native scheduled chat has invoked a local probe and checkpointed six fictional records. That narrow observation does not prove customer-plan entitlement, notification delivery, offline behavior, complete cloud history or unattended three-year processing. See [gate evidence](docs/evidence/gates.json), [the observed scheduled test](docs/evidence/scheduled-task-result.md) and [the ticket map](.scratch/confidant-mvp/ticket-map.md).

## Set up in one Codex conversation

Use [CUSTOMER_PROMPT.md](CUSTOMER_PROMPT.md) on your own Mac. Codex follows the [install skill](.agents/skills/confidant-install/SKILL.md), gathers your working context and exclusions, asks which sources it may read, and helps with the permissions those sources actually need. It resumes a recognized private brain rather than overwriting an existing install. No Obsidian vault is required or created automatically.

Agree once to the concrete setup plan, including both daily times, your timezone, the three-hour refresh and the permitted source reads. Codex then does the technical installation through the available native automation tool in that same conversation. It reuses its saved owned task IDs when you resume. It leaves unrelated tasks, earlier Confidant installs and their schedules alone.

| Task | What you receive |
| --- | --- |
| Morning brief | Up to three useful priorities, relevant commitments and the evidence or freshness limits behind them. Runs at your chosen morning time. |
| End-of-day check-in | What changed or was completed, open follow-through and a concise request for useful feedback. Runs at your chosen evening time. |
| Quiet brain refresh | Every three hours, checks a bounded recent slice for new or changed data from approved available sources and saves a small classification checkpoint through the permitted chat plan. Routine progress stays quiet. |

These are at most two planned user-facing runs per day. Coaching belongs inside those conversations when supported by evidence, rather than a separate weekly task. Background refresh does not open an HTML page or send routine progress messages. It requests failure-only notifications; host-reported failures may still notify. Failed or blocked work stays visible for the next brief/check-in and in local status, and notification behavior must be verified in the actual host.

Codex verifies the settings the scheduler actually saved and records anything it cannot inspect. A returned task ID means a task was configured, not that it ran, reached your Mac or delivered a notification. If the current scheduler cannot support the agreed timing or quiet behavior, setup reports that limit and leaves the unsupported role pending. The [task-install specification](docs/specs/003-codex-task-install.md) describes this boundary.

The local `tasks-configure`, `tasks-status` and `tasks-attempt` helpers save the agreement, inspect owned settings and prepare exact native tool arguments. They never write the scheduler. Codex calls the available automation tool, reads the saved task back, then reconciles its actual settings. An interrupted or unknown installation outcome stays blocked for review rather than creating a duplicate.

## An assisted pilot with visible limits

[Claudio's trial guide](docs/CLAUDIO-TRIAL.md) explains the actual-source flow and current limits. Supported local readers use read-only database access, saved pagination and bounded classification batches. Synthetic demonstration data is separate from the assisted-local brain and never becomes your history. No live-send command, metered AI API, copied account key or manual export fallback exists.

Cloud sources stay blocked until each provider's own plugin access, historical pagination, privacy and permitted scheduled use have genuine reviewed evidence. Local permissions and actual Mac schemas also need observation on your machine. A recent useful brief does not mean your full historical brain is complete. Plan limits or an unavailable Mac can delay work, so last refresh, pending counts and source gaps remain visible.

## Optional local reports

The existing [reporting tools](docs/REPORTING.md) provide durable run records, coverage counts and a private local HTML view when wanted. They are optional diagnostics, not a dashboard you must keep open. The schedule-first install leaves automatic browser opening off and does not require a browser. Saving a report never proves it was displayed.

Reports distinguish fetched, reviewed and incorporated counts, task completion and source coverage. Existing Codex history is not scraped into the brain. Customer reports, exports, credentials and automation receipts stay outside source control. Actual rendered browser inspection remains unverified after a tooling-policy block; one development opening attempt recorded a skip.

## Developer checks

Node 22.5+ with its SQLite flag, no npm dependencies:

```sh
npm run build
npm test
npm run status
```

Tests use temporary fictional databases and plugin envelopes. They cover setup, interrupted reconciliation, exclusions, quoted facts, deadlines, feedback, safe drafts, durable reporting and mocked host behavior. The `trial` and `report:demo` commands are developer demonstrations, not customer setup. Build and test never read customer sources, create tasks, open a browser or create a lasting vault.

Use the pinned [v0.3.0-preview](https://github.com/QWaveLabs/confidant-mvp/tree/v0.3.0-preview) source release and verify its full commit before installing. [Task-install evidence](docs/evidence/codex-task-install-result.md) distinguishes tested code from unobserved customer self-installation and runtime checks. The earlier [v0.2.0-preview release](https://github.com/QWaveLabs/confidant-mvp/tree/v0.2.0-preview) predates this flow. Private development history and local data must never be published.

## Privacy and license

Private directories are 700, files 600. Explicit source consent precedes reads. Literal exclusions apply before storage and classification; incomplete identity resolution cannot guarantee semantic secrecy. Unresolved named exclusions block affected source reads until safe identifiers or whole-source exclusion resolve them. Cloud results may reach the chat before local filtering, so separate exposure consent or verified pre-read filtering is required.

Pause, source disable, export and local deletion are available. External task cancellation must be verified separately. Local purge does not erase chat/plugin history, backups or separately moved copies. Recommendations and unsent drafts stay distinct from actions actually taken.

MIT, copyright 2026 QWave Labs. See [LICENSE](LICENSE) and [prior-art notice](THIRD_PARTY_NOTICES.md). No marketplace plugin submission or deployment is part of this build.
