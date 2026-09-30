import { mkdirSync, existsSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';

export const VAULT_NAME = 'Confidant Test Vault';
const marker = 'confidant_generated: synthetic-test';
export function writeGenerated(path, content) {
  const digest = value => createHash('sha256').update(value).digest('hex');
  if (existsSync(path)) {
    const previous = readFileSync(path, 'utf8');
    const match = previous.match(/^---\nconfidant_generated: synthetic-test\nprivate_data: false\nconfidant_content_hash: ([a-f0-9]+)\n---\n\n([\s\S]*)$/);
    if (!match || digest(match[2]) !== match[1]) throw new Error('Refusing to overwrite a handwritten or edited generated note.');
  }
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  writeFileSync(path, `---\n${marker}\nprivate_data: false\nconfidant_content_hash: ${digest(content + '\n')}\n---\n\n${content}\n`, { mode: 0o600 });
  chmodSync(path, 0o600);
}

export function createTestVault(root, { now = new Date().toISOString() } = {}) {
  const vault = resolve(root, VAULT_NAME);
  mkdirSync(vault, { recursive: true, mode: 0o700 });
  chmodSync(vault, 0o700);
  const configuration = resolve(vault, '.obsidian');
  mkdirSync(configuration, { recursive: true, mode: 0o700 });
  if (!existsSync(resolve(configuration, 'app.json'))) {
    writeFileSync(resolve(configuration, 'app.json'), '{}\n', { mode: 0o600 });
  }
  for (const directory of ['People', 'Projects', 'Commitments', 'Opportunities', 'Goals', 'Daily Briefs', 'Sources', '_System']) {
    mkdirSync(resolve(vault, directory), { recursive: true, mode: 0o700 });
  }
  writeGenerated(resolve(vault, 'Home.md'), `# Confidant Test Vault\n\nThis is your separate Confidant MVP test vault. All example content is synthetic. No customer communications have been imported.\n\nCreated at ${now}.\n\n## Start here\n\n- [[_System/Test Setup|Test setup and exclusions]]\n- [[_System/Coverage|Source coverage and privacy gaps]]\n- [[_System/Scheduled Test|Scheduled task proof]]\n- [[People/Index|People]]\n- [[Projects/Index|Projects]]\n- [[Commitments/Index|Commitments]]\n- [[Opportunities/Index|Opportunities]]\n- [[Goals/Index|Goals]]\n\n## Current state\n\nThe private local probe is tested. The scheduled run is pending real execution, and plan-only classification and provider history remain unverified. This vault is a test surface, not a completed import or a ready MVP.\n\nThe existing Confidant vault and automations are separate. Obsidian is optional for the future product, but enabled here at your request.`);
  writeGenerated(resolve(vault, '_System/Test Setup.md'), `# Test setup\n\nUse synthetic fixtures only. No live source reads are authorized by this test setup.\n\n## Fictional profile for the upcoming full setup test\n\n- Role: founder of a fictional company.\n- Goal: follow through on sourced commitments.\n- Important person: Maya Chen, fictional contact.\n- Project: Cedar, fictional project.\n- Categories: People, Projects, Commitments, Opportunities, Goals.\n- Brief timezone: America/New_York.\n- Exclusions: a fictional private chat, the participant excluded@example.invalid, and the topic private-family.\n\n## Privacy boundary\n\nLocal records must be filtered before classification or any model-bound excerpt. Cloud plugin results may reach the chat before local filtering. Source-side filtering must be verified, or separate exposure consent obtained, before cloud reads. No such live cloud consent or verification has occurred.\n\nPermission denial, restart, empty history, missing transcripts, and source outages must remain visible. A sign-in or synthetic fixture is not a successful customer-source receipt.`);
  writeGenerated(resolve(vault, '_System/Coverage.md'), `# Source coverage\n\nNo live source has a successful read receipt. Counts and historical date ranges are unknown.\n\n| Source | Live status | Test preparation |\n| --- | --- | --- |\n| Messages | Not read | Incoming/outgoing synthetic fixtures in preparation |\n| WhatsApp | Not read | Partial-history synthetic fixture in preparation |\n| Phone and FaceTime | Not read | Metadata only; call content remains unknown |\n| Apple Notes | Not read | Only Apple-supplied transcript fixture, no transcription |\n| Calendar | Not read | Synthetic context fixture in preparation |\n| Contacts | Not read | Synthetic identity fixture in preparation |\n| Gmail | History unverified | Tool descriptions visible, no live retrieval |\n| Outlook | Unavailable in this session | No callable provider tool |\n| Fathom | History unverified | Tool descriptions visible, no live retrieval |\n| Fireflies | Unavailable in this session | No callable provider tool |\n\n## Release checks\n\nScheduled local access, visible notification, scheduled plan-only classification, complete setup, and interrupted 36-month reconciliation are pending. A source with unresolved records, pages, or dates must never be labelled complete.`);
  writeGenerated(resolve(vault, '_System/Scheduled Test.md'), `# Scheduled test\n\nYou authorized testing scheduled tasks as an alternative to Dot.\n\nThe test will invoke the private synthetic probe from a native scheduled task in the current chat. Its receipt will be saved here after actual execution. It reads no communications, connects no service accounts, and sends no email or iMessage.\n\nA scheduled task being registered is not proof that it ran. A local probe response alone is not proof of notification delivery.\n\n## Current evidence\n\n- Manual local transport: tested.\n- Actual scheduled trigger: pending.\n- Fresh private-operation result: pending.\n- Visible chat notification: pending.\n- Plan-only batch classification: pending.\n- Offline Mac behavior: unverified; the test will not disconnect your Mac.\n\nIf the Mac or integration is unavailable, report that gap instead of reusing a previous result.`);
  for (const name of ['People', 'Projects', 'Commitments', 'Opportunities', 'Goals']) {
    writeGenerated(resolve(vault, name, 'Index.md'), `# ${name}\n\nNo customer facts are stored here. Evidence-linked synthetic views will be populated by the tested import path.\n\n[[Home|Back to Home]]`);
  }
  return vault;
}
