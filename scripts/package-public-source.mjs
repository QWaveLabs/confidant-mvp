// Source-only handoff. Never copy the private .git history, brains or run reports.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, lstatSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';

const root = fileURLToPath(new URL('..', import.meta.url));
const version = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).version;
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Expected a numeric source package version.');
const stagingIndex = process.argv.indexOf('--staging-id');
const staging = stagingIndex < 0 ? '' : process.argv[stagingIndex + 1];
if (stagingIndex >= 0 && (typeof staging !== 'string' || !/^[a-z0-9-]{1,40}$/.test(staging))) throw new Error('Invalid source staging identifier.');
const output = resolve(root, '.confidant/share/public-source-v' + version + (staging ? '-' + staging : ''));
if (existsSync(output)) throw new Error('Public source staging already exists. Review it; do not silently replace it.');
const listing = spawnSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8', timeout: 60000 });
if (listing.status !== 0) throw new Error('Tracked source inventory unavailable. No source package created.');
const files = listing.stdout.split('\0').filter(Boolean);
const roots = ['src/', 'scripts/', 'tests/', 'plugins/', 'docs/', '.scratch/confidant-mvp/', '.agents/skills/'];
const top = ['.gitignore', 'AGENTS.md', 'README.md', 'CUSTOMER_PROMPT.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'package.json'];
const prepared = []; let bytes = 0; let redacted = 0;
const operatorHome = homedir() + '/';
const privatePath = new RegExp(operatorHome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^\\s`"<>]+', 'g');
const privateUuid = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const credential = /\b(?:sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{24,}|gh[pousr]_[A-Za-z0-9_]{30,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{24,})\b|-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----/;
for (const name of files) {
  if (name.includes('..') || !top.includes(name) && !roots.some(prefix => name.startsWith(prefix)) || /\.(?:sqlite|db|log|zip)$/.test(name)) throw new Error('Unexpected tracked file; review the source inventory.');
  const path = resolve(root, name); if (lstatSync(path).isSymbolicLink()) throw new Error('Source symlink requires review.');
  const buffer = readFileSync(path); bytes += buffer.length;
  if (buffer.length > 1_000_000 || bytes > 3_000_000 || buffer.includes(0)) throw new Error('Unexpected binary or oversized source.');
  let text = buffer.toString('utf8');
  if (credential.test(text)) throw new Error(`Credential-shaped source refused: ${name}`);
  if (name.startsWith('docs/') || name.startsWith('.scratch/')) {
    const original = text;
    text = text.replaceAll(root.replace(/\/$/, ''), '[local installer]').replace(privatePath, '[private local path]');
    text = text.replace(privateUuid, '[redacted operator/test identifier]');
    if (text !== original) redacted++;
  }
  if (text.includes(operatorHome)) throw new Error(`Private home path still present: ${name}`);
  prepared.push({ name, text });
}
mkdirSync(output, { recursive: true, mode: 0o700 });
for (const { name, text } of prepared) { const path = resolve(output, name); mkdirSync(dirname(path), { recursive: true, mode: 0o700 }); writeFileSync(path, text, { mode: 0o644 }); }
const digest = createHash('sha256').update(prepared.map(file => file.name + '\0' + file.text).join('\0')).digest('hex');
writeFileSync(resolve(output, 'SOURCE-HANDOFF.json'), JSON.stringify({ sourceOnly: true, files: prepared.length, bytes, redactedTechnicalDocuments: redacted, includesCustomerData: false, includesPrivateGitHistory: false, contentSha256: digest, completeMvpReady: false }, null, 2) + '\n');
console.log(JSON.stringify({ output, files: prepared.length, redactedTechnicalDocuments: redacted, contentSha256: digest, sourceOnly: true, deployment: false, publication: false }));
