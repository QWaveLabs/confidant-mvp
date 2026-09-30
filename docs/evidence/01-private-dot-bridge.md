# Ticket 01: private integration evidence

Current scope: the user accepted scheduled tasks as a Dot alternative and authorized independent synthetic evaluation work. [Scope update](2026-09-29-scope-update.md) and [scheduled result](scheduled-task-result.md) supersede the original no-schedule/not-implemented inspection below. The temporary native task subsequently triggered a fresh local response and a six-record scheduled chat checkpoint; the task is paused. Notification and physical offline behavior remain unverified. The additional private evaluation MCP server is locally tested, not installed. The observations below describe the earlier inspection and minimal probe, not the full current implementation.

**Result:** blocked, live behavior unverified. **Inspection:** September 29, 2026, America/New_York.
**Data:** synthetic probe and tool/documentation metadata only. No customer
communications were read, no plugin was installed, and no live connection,
schedule, tunnel, notification, deployment, or submission was created.

## Observed evidence

| Requirement | Observed evidence | Gate result |
| --- | --- | --- |
| Private local operation | A packaged stdio probe exposes only `confidant_probe_status`. Child-process tests discover and call it using distinct safe challenges. | Local candidate verified; Dot invocation unverified |
| Fresh operation result | Response includes challenge, actual response time, new process instance ID, and per-process sequence. Live proof fields always say `unverified`. | Local response verified; caller and scheduler identity unverified |
| Scheduled Dot invocation | No callable Dot scheduling interface was found in the session inventory. The visible Codex automation tool governs Codex schedules; its existence does not prove a Dot flow. No automation was created. | Unverified, not attempted |
| Visible ChatGPT notification | No authorized scheduled probe or notification was attempted. | Unverified, not attempted |
| Offline connected Mac | Killing the child process prevents a successful response and restarting gives a new instance. No actual Dot-connected Mac was disconnected for a scheduled test. | Local connection loss verified; Dot offline behavior unverified |
| Eligible account and local permission | No account-specific eligibility or Dot local-computer permission was established. | Unverified |

The root agent's native app inspection was rejected by the computer-control
tool with: “Computer Use is not allowed to use the app com.openai.codex for
safety reasons.” The rejection prevents that inspection path in this session.
It is not a Dot execution failure, does not prove the account is ineligible,
and was not bypassed.

## Package and local verification

The candidate lives under [plugins/confidant](../../plugins/confidant/SETUP.md).
It contains the portable manifest, stdio configuration, one probe skill, a
small dependency-free server, an inert marketplace template, and local tests.
The server implements the MCP handshake-era stdio tools subset for
2025-11-25 and 2025-06-18. Host transport support and installed path resolution
still require a real private-connection test.

```sh
node --test plugins/confidant/tests/probe.test.mjs
```

Observed on Node v23.2.0: **6 tests passed, 0 failed**, approximately 7.4 seconds.
They cover package references, real child-process tool discovery and fresh
responses, rejected private/unbounded input and unsupported source/send
operations, initialization/version negotiation, connection loss and restart,
and oversized input. This is a local probe suite, not the complete pilot
acceptance suite and not a live Dot pass.

## Product guidance and remaining proof

Dot uses supported enabled plugins, subject to account permissions and the
execution environment. Its computer permission is separate from Codex and
Work Sync, and local work needs the Mac online with the app open.
[OpenAI computer and app guidance](https://learn.chatgpt.com/docs/dots/computers-and-apps)

Dot recurring work needs an agreed schedule and destination. A completed task
alone does not establish delivery.
[OpenAI Dot task guidance](https://learn.chatgpt.com/docs/dots/tasks-and-memory)

The [setup proposal](../../plugins/confidant/SETUP.md) contains reviewable manual,
scheduled, and offline probes. Passing ticket 01 requires an explicitly
authorized eligible pilot, actual Dot tool-call activity for the private
integration, a later scheduler-triggered call with a distinct challenge, a
visible ChatGPT notification, and actual unavailable behavior while the Mac
is disconnected. Store only redacted technical observations and synthetic
markers. Keep this gate unresolved if any required observation is absent.

**Dependency decision:** keep real acceptance blocked. The user authorized gate-independent synthetic work for Claudio. Packaging or a manual local demo cannot pass this gate. An absent live test is not an observed failure.
