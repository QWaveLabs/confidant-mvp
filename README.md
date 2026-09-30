# Confidant MVP

A guided assisted local second brain and one private dashboard for durable task results. This repository is independent of the earlier Confidant release. Customer brains, reports, exports and credentials are never part of source control.

**Release state: assisted preview code, required live gates unresolved.** A native scheduled chat has invoked the local probe and checkpointed six fictional records. That is not a full 36-month unattended throughput pass, notification/offline-Mac proof, customer-plan entitlement or provider-history verification. See [gate evidence](docs/evidence/gates.json), [live observations](docs/evidence/scheduled-task-result.md), and the [24-ticket map](.scratch/confidant-mvp/ticket-map.md). No required ticket is represented as accepted merely because synthetic tests pass.

Public assisted preview: [v0.2.0-preview](https://github.com/QWaveLabs/confidant-mvp/tree/v0.2.0-preview). This is a source-only handoff, without private development Git history or local run data.

## Guided install on the person's Mac

Use [CUSTOMER_PROMPT.md](CUSTOMER_PROMPT.md) with this release's pinned URL/commit. The new [install skill](.agents/skills/confidant-install/SKILL.md) gathers setup/exclusions, resumes a recognized private brain, requests separate source approvals, imports a recent bounded slice, classifies through the current permitted chat plan, and reports actual results. Obsidian is optional and no vault is created automatically. Rob's vault creation remains deferred.

[Claudio's trial guide](docs/CLAUDIO-TRIAL.md) describes actual-source assisted setup and its current limits. Synthetic and assisted-local brains have different identities and cannot be mixed. The assisted mode requires `--assisted-local` and keeps its brain outside this installer repository. No live-send command, metered AI API or account-key fallback exists.

## One local dashboard

[Reporting documentation](docs/REPORTING.md) covers structured records, task/run IDs, durable archives, concurrency, privacy and configurable safe browser opening. The default developer report is `.confidant/reports/latest.html`; Claudio should use a private reports directory beside his private brain. All tasks publishing to the same reports directory share one stable home page. Existing Codex chats/tasks are not scraped or automatically imported; their future runs need the reporting wrapper or chat report tools, after approved schedule changes.

```sh
npm run report -- run --task source-health --no-open -- health
npm run report -- generate --no-open
npm run report -- open
npm run report -- config --open off
```

The first command runs real CLI persistence/status logic against the developer's synthetic evaluation brain. It does not read accounts. With an approved assisted brain, pass its private paths and `--assisted-local` to the underlying core command. `report start` / `report finish` cover multi-step scheduled classification and non-CLI task results. Next scheduled times remain unknown unless observed scheduler evidence is supplied. Completed processes never imply complete source coverage.

HTML has no external fonts, scripts or tracking. Chrome/Safari can reuse the stable local file tab in an already running usable default-browser session; unsupported, locked, offline or unknown sessions save a skip. Opening is never equated with merely saving the file. Current development visual inspection was blocked by the browser tool's local-file security policy and remains explicitly unverified; the actual opening attempt saved a skip.

## Developer checks

Node 22.5+ with its SQLite flag, no npm dependencies:

```sh
npm run build
npm test
npm run status
npm run report:demo -- --no-open
```

Automated tests use temporary fictional Mac-shaped SQLite databases and plugin envelopes. They cover full setup, interrupted 36-month reconciliation, exclusions, exact quotations/deadlines, feedback, local controls, all reporting outcomes, real overlapping writers, privacy purge, archive links and mocked browser receipts. They never read customer communications or create a lasting vault. `trial` is the separate legacy synthetic demonstration, not a customer install command.

[Local reader evidence](docs/evidence/assisted-local-build.md), [reporting evidence](docs/evidence/local-reporting-result.md) and [additive reporting scope](docs/specs/002-local-run-reporting.md) distinguish implementation from unverified live acceptance.

## Privacy and license

Private directories are 700, files 600. Local readers are read-only and require source approval; literal exclusions precede storage and plan-bound batches. Literal matching and incomplete identity resolution do not guarantee semantic exclusions. Cloud privacy exposure requires separate consent or verified pre-read filtering, and each provider's own genuine reviewed history proof. Reports accept approved bounded summaries/counts, escape content, refuse raw record fields/known credential patterns/excluded terms and allow only validated links. Copies in chats, browser display or separately moved files are outside local purge.

MIT, copyright 2026 QWave Labs. See [LICENSE](LICENSE) and [prior-art notice](THIRD_PARTY_NOTICES.md). No marketplace plugin submission or deployment is part of this build.
