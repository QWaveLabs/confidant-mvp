# Durable local reporting evidence, 2026-09-30

Implemented persistent structured run records and a stable local HTML home plus timestamped run archives. The current developer home is `.confidant/reports/latest.html`; run JSON lives in its private `runs/` directory and HTML history in `archives/`. These are ignored by Git. Claudio's reports use an approved private directory outside the installer.

## Observed behavior

A real local report demonstration saved completed, partial, failed and skipped fictional task outcomes, then saved two overlapping fictional tasks without erasing prior tasks. The content is clearly synthetic; persistence, runtime timestamps, IDs, file writes and statuses are actual runtime observations. An additional report-view operation persisted its actual browser skip. Home sections retain per-task latest supplied results, source health retains the latest supplied snapshot per source, and each archive contains its particular run's own output even when a newer overlapping result exists.

The 12 reporting tests passed, including two overlapping independent Node processes, archived own-run evidence, safe links/long escaped content, exact date-only deadlines, queued/running states, stale-section retention, malicious/raw/excluded/credential input refusal, failed save behavior, symlink/unowned-file protection, safe purge and mocked browser reuse/cooldown/offline/locked/unavailable failures. CLI and chat integration tests separately exercise core results, failed imports, summary-only counts, privacy tightening and report deletion.

Counts mean included/excluded fetched record identities, classified records reviewed, and classified records incorporated into the usable brain. Duplicate fetched attempts may differ from deduplicated stored counts; the technical wrapper reports reconciled coverage counts rather than pretending attempt counts are unique imports. Pending classification and gaps remain distinct. Real provider coverage and automated scheduling are not inferred.

## Actual browser attempt and inspection gap

A metadata-only session probe observed an unlocked online Mac and the running default Google Chrome process. A saved report opening attempt returned **skipped**, indicating no usable default-browser window; no opened or tab-reused success is claimed. The updated browser adapter rechecks session lock/availability immediately before any UI opening, supports Chrome/Safari stable-URL reuse, and otherwise records skips/failures. Real successful automatic tab reuse has not been observed; mocked checks are separate.

The browser inspection tool first found no matching report tab, then rejected the file URL under its browser security policy. The rejection explicitly forbids workarounds or alternate surfaces. No local-server/proxy/browser-policy bypass was attempted. Therefore actual rendered desktop/mobile layout, actual archive navigation in a browser and successful browser opening remain **unverified**. The user can manually open the saved local file and its archive links for the remaining visual check.

No accounts, communications, vaults, existing task cadences, emails/iMessages, deployment or public plugin listing were used. Existing old Confidant stays usable. All required feasibility gates remain unresolved.

## Commands

```sh
npm run report -- run --task source-health --no-open -- health
npm run report -- generate --no-open
npm run report -- open
npm run report -- config --open off
```

Use `--reports <private-directory>` consistently for every task. `start` / `finish` allow multi-step scheduled results with bounded approved summaries. Existing Codex chats do not publish automatically, and no prior task prompt/cadence was modified. Any future integration requires the user's authorization. No next scheduled run is claimed without verified scheduler metadata.

Final observed build passed (37 source/test/plugin files checked). The final full suite passed 63 tests, 0 failed. An earlier run on this Desktop workspace hit child-process filesystem/startup timeouts; the later complete run after the final consent/pagination fixes passed. No timeout is treated as live-source evidence.

The final source-only release added a packaging utility and passed build with 38 files checked. The exact sanitized handoff package independently passed all 63 tests, 0 failures or skips, in approximately 4.3 seconds. See [publication evidence](public-preview.md).
