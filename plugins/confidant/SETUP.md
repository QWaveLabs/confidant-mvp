# Private synthetic bridge probe

This is a local packaging candidate for ticket 01. It is not installed, Dot
verified, scheduled, or ready for pilot communications. Node 22 or newer must
be available to the eventual local host. No package installation is required
to run its local tests.

The single tool accepts a non-sensitive challenge and returns a fresh time,
process instance ID, and per-process call sequence. Every live gate stays
unverified in its result. It never opens a source, reads a file, connects to a
service, calls AI, sends an outbound message, or creates an automation. Its
only output is a bounded MCP response on stdout.

## Local verification

From this repository, run:

```sh
node --test plugins/confidant/tests/probe.test.mjs
```

The tests speak to a real child process over newline-delimited JSON-RPC.
They exercise discovery, fresh results, rejected requests, termination, and
restart. These are local transport tests, not Dot or notification evidence.
The server implements the MCP stdio tools subset for versions 2025-11-25 and
2025-06-18. It negotiates a supported handshake version if asked for another;
a client that cannot use that version must disconnect. Other transports,
resources, model sampling, and task APIs are not implemented.

## Reviewable private setup

The portable manifest is `plugin.json`; `mcp.json` starts `server.mjs` through
stdio using the installed plugin root. `marketplace.example.json` is an inert
template, not an installed marketplace. With explicit permission, an operator
can copy that template to the repository's `.agents/plugins/marketplace.json`,
restart the desktop app, and inspect the local plugin in the directory. This
does not establish that Dot has the same integration available.

[OpenAI's packaging guide](https://developers.openai.com/plugins/build/plugins)
describes portable packages and local marketplaces, with surface availability
that can vary. [OpenAI's private testing guide](https://developers.openai.com/plugins/deploy/connect-chatgpt)
also describes a Secure MCP Tunnel reaching a private stdio or HTTP server in
developer mode. That route requires its own consent and eligible connection;
no tunnel, public endpoint, developer setting, or account connection has been
created here. No deployment or marketplace submission is needed for this
local candidate.

## Proposed live test after explicit authorization

The operator must first verify Dot eligibility, the actual private connection,
local-computer permission, and ChatGPT notification settings. The connected
Mac and desktop app must be available. Record the connection method and tool
discovery evidence; do not assume a Codex-local install makes the tool
available to Dot.

Use a unique challenge for each run. A challenge is a test marker, not a
credential or an authentication guarantee. These prompts are proposals, not
instructions to execute now.

Manual connection probe:

> Call the Confidant Probe tool confidant_probe_status with challenge
> CMVP-001-MANUAL-[replace-with-safe-nonce]. Report the returned challenge,
> observed time, instance ID, and call sequence. Do not read communications,
> files, or other plugins. If the tool is unavailable, report that exact gap.

One-time scheduled probe, with exact time and destination agreed separately:

> At [agreed time and timezone], call the Confidant Probe tool
> confidant_probe_status with challenge
> CMVP-001-SCHEDULE-[replace-with-safe-nonce]. Notify me in ChatGPT with the
> returned challenge, observed time, instance ID, and call sequence. If the
> Mac or tool is unavailable, notify me that it is unavailable. Do not reuse an
> earlier response. Do not read communications, files, or other plugins.

The square brackets must be replaced before use because they are outside the
tool's allowed challenge format. Record the scheduler's actual trigger time,
tool-call activity and arguments, result time, and the visible ChatGPT
notification. A manually invoked tool or a locally generated timestamp cannot
prove the scheduled gate. The server cannot authenticate the scheduler or
validate notification delivery itself.

With separately agreed timing, repeat using a distinct offline challenge and
an intentionally disconnected Mac. Record the actual unavailable result and
verify it contains no cached successful read. Cancel any test schedule after
the agreed run. Preserve only synthetic markers and technical evidence,
never account credentials or communications.

If the tool cannot be connected on the chosen surface, leave ticket 01
blocked and request a product scope decision. If an authorized live run is
attempted and fails, record the actual observed failure separately. Absence
of a test is not a failed test.

## Separate MVP server

The repository also contains `mvp-server.mjs`, a separate, locally tested stdio transport with 24 narrow tools, including local source receipts and durable run reports. It defaults to the isolated synthetic evaluation. Only an explicit `--assisted-local --data <private-brain-outside-installer>` selects approved local-source mode; that mode requires separate source consent. Keep the whole source tree together. The inert `mvp-mcp.example.json` is a configuration example, not an installed integration. `mcp.json` still starts the minimal probe. See [Claudio's guide](../../docs/CLAUDIO-TRIAL.md) for the approved assisted-local pilot and [install skill](../../.agents/skills/confidant-install/SKILL.md) for its CLI flow. Scheduled tasks are an accepted alternative to Dot, but notification, local permissions, bulk plan processing and provider history remain independent proofs. Starting either server does not create a schedule, connect a provider, send a message, open a tunnel or create a vault.
