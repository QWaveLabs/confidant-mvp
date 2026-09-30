# Ticket 05: cloud-plugin history evidence

**Result:** blocked by unverified ticket 01. **Inspection:** September 29, 2026, America/New_York.
The results below are tool-schema inventory evidence in the coding session,
not reads or account-history tests. No provider tool was invoked, no account
was connected, and no real customer communication or transcript was read.

| Provider | Session capability evidence | Distinct provider result | Implementation ticket |
| --- | --- | --- | --- |
| Gmail | `mcp__codex_apps__gmail_search_email_ids` accepts `query`, `max_results`, and `next_page_token`. The read tool declares an immutable Gmail `message_id` and selectable representations. | **Unverified.** Tools visible; Dot access, pagination results, complete date range, sent/received coverage, privacy enforcement, and stable-ID behavior not tested. | 12 blocked |
| Outlook | No Outlook capability appears in the available tool inventory. Outlook Email is listed as an optional uninstalled plugin. | **Unavailable in this session.** No install, sign-in, Dot access, or history test. This is not provider-wide unavailability or a failed live read. | 13 blocked |
| Fathom | `mcp__codex_apps__fathom_list_meetings` accepts `created_after`, `created_before`, `cursor`, `max_pages`, recorder/team filters, and summary/action-item options. Its schema documents recording IDs and source URLs; `cursor` refers to the prior `next_cursor`. | **Unverified.** Tools visible; actual Dot access, cursor continuity, oldest/newest dates, stable-ID behavior, transcript availability, and privacy enforcement not tested. | 14 blocked |
| Fireflies | No Fireflies capability appears in the available tool inventory. No installation or account connection was attempted. | **Unavailable in this session.** This does not establish whether another eligible pilot account can install an appropriate plugin. | 15 blocked |

The inventory above records schema field names only. Account names, email
addresses, link IDs, credentials, and source content are intentionally absent.
Tool availability in a coding chat is not evidence that Dot can use that
plugin or that a complete historical enumeration is possible.

## Exclusion boundary

Gmail's schema supports search operators such as `after:`, `before:`, `from:`,
`to:`, and negation in `query`. That is a candidate for supported query-level
filtering, not proof that every person, chat, or topic exclusion can be applied
before a response reaches Dot. Fathom's list schema has date, recorder, and
team filters, with no documented general person/topic exclusion parameter.
Neither filter semantics nor exact pre-read exclusion behavior was exercised.

Every provider therefore has **pre-read privacy enforcement unverified**.
Before a provider read, record the pilot's exact exclusions, supported
source/query filters, and consent to any results that can reach Dot before
local filtering. If the pilot declines that exposure, keep the source blocked.
Do not infer consent from an installed plugin or an existing sign-in.

## Proof required before provider implementation

After ticket 01 passes and the pilot explicitly authorizes that provider,
test a bounded history window with known safe records and enough items to
force at least two pages. Preserve cursor evidence, stable IDs, source dates,
direction where relevant, duplicate handling, and source links without
committing private content. Continue through the requested available window
and reconcile page/item receipts. An exhausted cursor in a known limited
window must not be presented as 36-month coverage.

Verify the same operation through Dot, not only through coding-session tools.
Then test the documented exclusion/consent boundary and report the actual
oldest and newest verified dates and unavailable ranges. Until then, record
unknown counts and dates, never invented zeros or full coverage.

Fathom and Fireflies direct fallbacks remain **unverified, not attempted**.
Only consider a fallback that uses the authorized initial connection without
new copied keys or later manual customer steps. No direct API credentials,
exports, or API calls were used to substitute for the required plugin proof.

**Dependency decision:** tickets 12, 13, 14, and 15 remain blocked, each
independently, until its positive live proof or an explicit product scope
decision. None of these inventory results is a provider pass.
