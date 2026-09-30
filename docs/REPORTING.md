# Durable local run reporting

The reporting layer creates a self-contained local dashboard and one timestamped report per run. It reads only approved structured summaries supplied by its caller. It does not read sources, schedule tasks, connect accounts, send messages, open a vault or make network calls. Synthetic examples, observed runtime facts and unknown evidence have separate labels. The live MVP gates remain unresolved.

## API

```js
import { createReporter } from './src/reporting.mjs';

const reporter = createReporter({
  directory: dedicatedIgnoredDirectory,
  now: () => new Date().toISOString(), // Actual wall clock, independent of fixture time.
  allowedLinkHosts: ['chatgpt.com'],
  excludedTerms: [],
  openPolicy: { enabled: false, cooldownMs: 60000 },
  // Optional injected sessionProbe and opener; no default system/browser calls.
});

const run = await reporter.startRun({
  taskId: 'daily-brief', taskName: 'Daily brief',
  mode: 'synthetic', status: 'running', // Or queued.
});
let status = 'failed';
let result = {};
let error = null;
try {
  result = await buildApprovedSummary();
  status = 'completed'; // partial, failed and skipped are also terminal outcomes.
} catch {
  error = { code: 'task_failed', summary: 'The task did not finish.', action: 'Inspect the saved checkpoint before retrying.' };
} finally {
  const receipt = await reporter.finalizeRun({ runId: run.runId, status, result, error });
  // saved:true is returned only after successful file writes.
  // Keep reporting failures distinct from the task's original outcome.
}
```

`startRun` returns `runId`, `taskId`, status, saved state, dashboard/archive paths and a browser receipt. An existing queued run can become running by supplying its same `runId`, `taskId` and `status: 'running'`. Terminal runs cannot restart or be finalized twice. IDs allow letters, digits, underscores and hyphens, maximum 80 characters.

`dashboard()` returns the latest task runs, each task's latest finalized result, retained section snapshots, source snapshots, recent history, total run count and `dashboardPath`. It refreshes the stable page without opening a browser. A newer queued/running run does not erase its task's earlier result. Finalizing an older overlapping run does not overwrite the newer result.

`purgeReports()` deletes owned run records, archives, latest page and browser cooldown metadata. Pending runs are revoked and cannot recreate their reports. It preserves the directory ownership marker and refuses unrelated files. Call it when tightening exclusions or deleting the brain; this deliberately removes all old summaries instead of attempting to identify private fragments. Moved copies, backups and content already displayed in browser tabs/history require separate removal.

## Structured result contract

Only these fields are accepted. Unknown keys, raw records/excerpts/archive payloads, obvious credentials and configured excluded text are refused. Invalid final result/error input becomes a generic failed report, with `validationRejected: true`; rejected values are never persisted. Invalid identity or inaccessible storage throws without claiming a successful save.

```js
{
  summary: 'Approved concise outcome',
  found: [], changed: [], completed: [],
  recommendations: [], drafts: [], actions: [], errors: [],
  attention: [], priorities: [], commitments: [],
  coverage: [],
  sectionUpdatedAt: { attention: '2026-09-30T12:00:00Z' },
  links: [{ label: 'Evidence', url: 'https://chatgpt.com/c/example' }]
}
```

Each list item uses `{title, detail?, updatedAt?, dueAt?, links?, requiresApproval?, status?}`. Summaries are capped at 1,600 characters, item titles at 250 and detail at 4,000. Lists allow at most 50 items; priorities allow at most three. The entire structured result is capped at 128,000 bytes. Long detail wraps and scrolls within its card; print output shows all text. A `dueAt` may be a strict `YYYY-MM-DD` date or an ISO timestamp. Date-only evidence remains displayed as a date, without inventing an hour.

An omitted result section retains that task's latest supplied section. An explicit empty array clears that result section and retains its clearing timestamp. Approvals and blockers therefore do not disappear when a newer unrelated result omits attention. Errors are displayed under attention and in a separate recovery section. Recommendations, drafts and actions taken remain separate; a draft never implies a send. Source snapshots are independently retained until a newer row for that source or a report purge, including when a task supplies empty coverage.

Coverage rows use `{source, status, fetched?, reviewed?, incorporated?, updatedAt?, oldest?, newest?, gaps?, completeCoverage?}`. Status is `fresh`, `partial`, `stale`, `blocked` or `unknown`. Counts are nonnegative integers or null for unknown, and must describe records in the stated source scope. Fetching, reviewing and incorporating remain independent measurements. Each source retains its latest supplied snapshot across tasks, selected by source update time then run sequence. A later task with no coverage does not erase it. `completeCoverage` defaults false and is rejected for nonfresh or gapped rows; its caller must substantiate any true value. Completing a process never certifies source coverage or real-data readiness.

Task mode is `synthetic`, `runtime` or `unknown`. Use synthetic for fixture-derived content; runtime for observed local operations such as exits and checkpoint duration. Avoid labelling fixture conclusions as runtime facts. Source freshness timestamps may come from a fixture clock, and that source must remain clearly synthetic.

## Scheduler and links

Optional scheduler context uses `{verified: true, lastRunAt?, nextRunAt?, reference?: {label, url}}`. Supply it only from observed scheduler metadata. Unverified context cannot contain times; absence displays next run unknown. The module never derives cadence or invents a next run. Actual reporting start/finish times do not establish a scheduled trigger.

Evidence links require HTTPS, an explicitly allowlisted hostname, no credentials and no credential-like query parameters. JavaScript, data, file and other schemes are rejected. Generated local run/archive links follow a fixed internal path format. All displayed strings and attributes are escaped, and the page has no script, remote fonts, images or trackers.

## Optional browser behavior

Automatic opening defaults disabled. When configured, `sessionProbe()` must report `{available: true, locked: false, online: true, browserAvailable: true}`. Missing, unknown, offline, locked or unavailable state produces a skipped receipt; no wake/unlock is attempted. The optional `opener({path, reuse: true, wake: false, unlock: false})` receives the same stable latest page every time.

An adapter must return `{status: 'opened', reused: boolean}` only after an actual successful browser operation. `{status: 'skipped'}`, ambiguous responses and exceptions become accurate skipped/failed receipts. Adapter errors are generic, without leaking private system details. A persisted cross-process cooldown prevents a burst of tabs. Reuse is requested, but the adapter must substantiate it; this module cannot guarantee reuse in an unsupported browser. A successful saved report does not imply it opened, and opening is not notification delivery.

## Storage and recovery

Use a dedicated empty or reporter-owned directory. Directories are user-only (700), files user-only (600). Selected symlinks, invalid persisted records and unowned files are refused. Per-run JSON records are canonical; aggregate HTML is rebuilt from all records, retaining every task and the latest source/section snapshots. Writes flush a temporary file and atomically rename it, with parent directory flushing where supported. A filesystem lock serializes real processes. No database, dependency, source read or API key is required.

Each run archive is updated while its lifecycle/browser receipt is being finalized; it is not an immutable snapshot of every intermediate state. A dedicated panel preserves that run's own output, even when an overlapping newer result is already the task's latest. All final run records/archives remain, while the dashboard lists the recent 30 runs. Earlier archive snapshots link to reports that existed at their creation.

A terminated writer can leave `.report-lock/owner.json` with its process ID. Lock acquisition times out rather than removing another writer's lock. Verify that writer has stopped before manual recovery; never remove an active lock. Interrupted atomic writes may leave a temporary file requiring inspection. These failures do not produce a saved/opened success receipt. The module does not guarantee recovery from arbitrary filesystem corruption or physical storage loss.

## Verification

Run `node --test tests/reporting.test.mjs`. Tests use only temporary fictional summaries and mocked browser callbacks. They cover all run states, independent overlapping processes, retained task/section/source results, archive links, long content and HTML injection, approved links and date precision, rejected private input, browser skips/failures/cooldown, privacy purge and protection of unrelated storage. Real browser inspection is a separate integration check.
