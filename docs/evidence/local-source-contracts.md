# Synthetic source adapter evidence

**Scope:** a small synthetic evaluation repository for the scheduled-task
option. Dot is no longer required by the user's revised direction. This
evidence proves fixture behavior, not actual Mac extraction, live plugin
history, scheduled AI processing, or a trustworthy customer pilot.
**Observed:** 2026-09-30 UTC, Node v23.2.0.

## Implemented contract

`makeSyntheticAdapters({now, months, scenarios})` returns a map for Messages,
WhatsApp, calls, Apple Notes transcripts, Calendar, Contacts, Gmail, Outlook,
Fathom, and Fireflies. The default clock is fixed; a caller may provide its
evaluation clock. Each adapter exposes an access probe, bounded newest-first
pages, stable source IDs, source links, versions, known fixture dates, and
explicit gaps. A probe deliberately says `verifiedRead:false`; only the
caller's successful page-read receipt can establish a source read.

Pages contain at most the requested 1 to 100 records. A cursor binds the
source, date window, snapshot, and offset. Retrying the same unchanged source
window preserves its position. Cross-source, changed-window, and changed-data
cursors fail visibly, requiring the caller to restart and reconcile that
window rather than silently skipping changed data. Adapters never advance
durable import state; the importing worker owns commit order and receipts.

Normalized records carry source ID, timestamp, direction where applicable,
participants, content or metadata, source reference, and a separate version.
Call records always have null content. A Notes record without the explicit
Apple-supplied transcript marker has null content and a visible transcript
gap. The synthetic fixture's gold `metadata.expectedSignals` labels exist
for evaluation; they are not evidence of AI classification and must not be
used as classifier inputs.

## Source limitations

| Source | Fixture behavior verified | Live capability remaining |
| --- | --- | --- |
| Messages | Both incoming and outgoing records, stable identity, bounded SQLite fixture pages | Actual Messages schema, attributed text, permissions and coverage |
| WhatsApp | Both directions, explicit partial older history gap, duplicates | Actual WhatsApp database/version, encryption/access and sync coverage |
| Phone and FaceTime calls | Direction, duration/type metadata, source references, null content | Actual available call-history schema and dates |
| Apple Notes | Apple-supplied transcript marker, supported call reference, absent transcript gap | Actual Notes extraction, Apple transcript availability and supported call matching |
| Calendar | Invented event context and source dates | Actual Calendar permissions, event identity and refresh |
| Contacts | Invented consistent contact identity and source dates | Actual Contacts permissions, identity ambiguity and refresh |
| Gmail and Outlook | Canonical supplied page validation, IDs and dates | Each plugin's connected read, actual output contract, history enumeration, sent/received range and pre-read privacy |
| Fathom and Fireflies | Canonical supplied meeting/transcript page validation | Each connected plugin's output contract, historical coverage, transcript availability and pre-read privacy |

No production adapter discovers paths in the user's home folder or opens an
account. `createFixtureSqliteAdapter({id,path})` accepts only an explicit
absolute file path and checks the canonical `confidant_fixture_meta` and
`confidant_fixture_records` tables and fixture marker. These are invented
tables, not Mac application schemas. It opens the file read-only, loads the
small canonical fixture snapshot, closes it, and pages that snapshot. This
snapshot-loading implementation is for bounded evaluation fixtures, not a
claim of streaming a large customer database.

The current runtime needs `--experimental-sqlite` for `node:sqlite`; tests
launch isolated children with that flag. SQLite's read-only option is
documented by [Node's official SQLite reference](https://nodejs.org/download/release/v22.17.0/docs/api/sqlite.html).
An unsupported runtime reports `sqlite_runtime_unavailable` without trying an
alternative database reader or creating a missing database.

## Provider and privacy gates

`normalizePluginPage` never invokes a connector. Synthetic mode requires
explicitly tagged invented fixture rows. Live mode requires the exact
provider's separate operator-reviewed, consented history/pagination/identity/
date/privacy proof, selected from a map by that provider ID. A Gmail result
cannot lift the Outlook, Fathom, or Fireflies gate. Canonical envelopes are
defined for this repository and are not assertions about unobserved live
plugin schemas. Consent and source-side filtering belong to the caller before
retrieval; local normalization cannot undo content already exposed by a
connected plugin.

## Verification and storage

```sh
node --test tests/adapters.test.mjs
```

The adapter suite contains nine external-behavior tests. It reconciles 72
records per source across 36 months, resumes after interruption, verifies a
one-time rate limit, rejects denied/offline/malformed sources, reconciles
bounded overlapping pages, distinguishes empty reads from unavailable reads,
checks changed versions and date-window integrity, preserves transcript gaps,
and enforces provider-specific proof. Six small temporary SQLite databases
are also read through the explicit adapter, checked byte-for-byte unchanged,
and removed after the test. No persistent vault is created or opened.

**Trust conclusion:** suitable for evaluating synthetic import behavior.
Actual source access, permission boundaries, cloud history, and scheduled
plan classification remain separate unresolved pilot gates.
