---
name: confidant-probe-status
description: Check the synthetic local Confidant probe during an explicitly authorized private Dot feasibility test.
---

Use only the `confidant_probe_status` tool from Confidant Probe. Provide the
non-sensitive challenge agreed for this test. Do not put a name, email address,
message, transcript, account identifier, or other private content in a challenge.

Report the returned challenge, observed time, instance ID, and call sequence.
Describe the result as a synthetic local probe response. Its gate fields remain
unverified because a server cannot establish which product invoked it or whether
a notification became visible. Do not claim a successful source read, connected
service, production worker, or completed import.

If the tool is absent, disconnected, or returns an error, report unavailable
with the actual error or missing capability. Do not reuse an earlier result or
invent a successful response.

Do not read files, communications, or other plugins. Do not install anything,
connect accounts, change permissions, create a schedule, send a message, or
start a tunnel as part of this status check. A scheduled test may run only after
the user separately authorizes its exact timing and notification destination.
