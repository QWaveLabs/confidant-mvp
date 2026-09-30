import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMacBrowserAdapter } from '../src/browser.mjs';
import { technicalResult } from '../src/report-cli.mjs';
import { scheduleProposals } from '../src/schedules.mjs';

test('external reporting CLI persists successful and failed runtime operations without copying private output', t => {
  const directory = mkdtempSync(join(tmpdir(), 'confidant-report-cli-')); t.after(() => rmSync(directory, { recursive: true, force: true }));
  const cli = fileURLToPath(new URL('../src/report-cli.mjs', import.meta.url)); const reports = join(directory, 'reports'); const data = join(directory, 'brain');
  const run = args => spawnSync(process.execPath, ['--experimental-sqlite', cli, ...args], { env: {}, encoding: 'utf8', timeout: 10000 });
  const result = run(['run', '--reports', reports, '--no-open', '--task', 'health-check', '--', 'health', '--data', data]);
  assert.equal(result.status, 0, result.stderr); const receipt = JSON.parse(result.stdout); assert.equal(receipt.saved, true); assert.equal(receipt.browser.status, 'skipped');
  const failed = run(['run', '--reports', reports, '--no-open', '--task', 'failed-source', '--', 'import', '--source', 'messages', '--data', data]);
  assert.equal(failed.status, 1); assert.equal(JSON.parse(failed.stdout).status, 'failed');
  const html = readFileSync(join(reports, 'latest.html'), 'utf8'); assert.ok(html.includes('health-check')); assert.ok(html.includes('failed-source')); assert.ok(!html.includes('Source access is not enabled.'));
  assert.ok(existsSync(receipt.archivePath));
  assert.equal(JSON.parse(run(['config', '--reports', reports, '--open', 'off']).stdout).openAfterRun, false);
  assert.equal(JSON.parse(run(['generate', '--reports', reports, '--data', data]).stdout).tasks, 2);
});

test('technical summaries keep fetched, classified and incorporated counts distinct and omit raw records/quotes', () => {
  const summary = technicalResult({ sources: [{ id: 'messages', connected: true, complete: false, lastRefresh: new Date().toISOString(), counts: { coverage: { committed: 10, excluded: 2 }, processing: { classified: 4, pending: 6 } }, gaps: [{ code: 'older_pending', reason: 'Older history pending.' }] }], records: [{ content: 'Do not expose this private message.' }] });
  assert.equal(summary.coverage[0].fetched, 12); assert.equal(summary.coverage[0].reviewed, 4); assert.equal(summary.coverage[0].incorporated, 4); assert.equal(summary.coverage[0].status, 'partial'); assert.equal(summary.coverage[0].completeCoverage, false);
  assert.ok(!JSON.stringify(summary).includes('private message'));
});

test('browser adapter reads session metadata, rechecks lock/offline state, and confirms tab reuse without launching a browser', async () => {
  let locked = false; let online = true; let browserCalls = 0; let script = '';
  const run = (file, args) => {
    if (file.endsWith('ioreg')) return { status: 0, stdout: '<mock/>' };
    if (file.endsWith('plutil')) return { status: 0, stdout: JSON.stringify({ IOConsoleLocked: locked, IOConsoleUsers: [{ kCGSSessionOnConsoleKey: true }] }) };
    if (file.endsWith('scutil')) return { status: 0, stdout: `Network interfaces: ${online ? 'en0' : 'none'}` };
    if (file.endsWith('pgrep')) return { status: 0, stdout: '123' };
    if (args.includes('JavaScript')) return { status: 0, stdout: 'Google Chrome.app\n' };
    browserCalls++; script = args.at(-1); return { status: 0, stdout: 'reused\n' };
  };
  const browser = createMacBrowserAdapter({ platform: 'darwin', run });
  assert.equal((await browser.sessionProbe()).browserAvailable, true);
  locked = true; assert.equal((await browser.opener({ path: '/tmp/private reports/latest.html', wake: false, unlock: false })).status, 'skipped'); assert.equal(browserCalls, 0);
  locked = false; online = false; assert.equal((await browser.opener({ path: '/tmp/report.html', wake: false, unlock: false })).status, 'skipped'); assert.equal(browserCalls, 0);
  online = true; assert.deepEqual(await browser.opener({ path: '/tmp/private reports/latest.html', wake: false, unlock: false }), { status: 'opened', reused: true });
  assert.equal(browserCalls, 1); assert.ok(script.includes('if URL of t is reportURL')); assert.ok(script.includes('file:///tmp/private%20reports/latest.html'));
  assert.equal((await createMacBrowserAdapter({ platform: 'linux', run: () => { throw new Error('Must not execute'); } }).sessionProbe()).available, false);
});

test('native task bundle has two daily briefs and one quiet current-plan refresh without requiring a browser', () => {
  const tasks = scheduleProposals({ brain: '/tmp/private-brain', briefTime: '08:30', eveningTime: '17:45', timezone: 'America/New_York' });
  assert.deepEqual(tasks.map(task => task.taskId), ['morning-brief', 'evening-review', 'source-refresh']);
  assert.equal(tasks[0].proposedRule, 'FREQ=DAILY;BYHOUR=8;BYMINUTE=30');
  assert.equal(tasks[1].proposedRule, 'FREQ=DAILY;BYHOUR=17;BYMINUTE=45');
  assert.equal(tasks[2].createArgs.notificationPolicy, 'failed_runs_only');
  assert.equal(tasks[2].createArgs.status, 'PAUSED');
  assert.ok(tasks.every(task => task.createArgs.kind === 'heartbeat' && !task.prompt.includes('report-cli.mjs')));
  assert.ok(tasks[2].prompt.includes('--refresh --limit 20')); assert.ok(tasks[2].prompt.includes('12-record batch'));
  assert.throws(() => scheduleProposals({ brain: '/tmp/brain', briefTime: '28:30', eveningTime: '17:00', timezone: 'UTC' }));
});
