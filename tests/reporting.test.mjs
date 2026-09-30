import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, readFileSync, readdirSync, statSync, existsSync, writeFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createReporter, validateReportLink } from '../src/reporting.mjs';

const NOW = '2026-09-30T12:00:00.000Z';
function fixture(t, options = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'confidant-reporting-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return { directory, reporter: createReporter({ directory, now: () => NOW, ...options }) };
}
const result = title => ({ summary: `${title} is a fictional evaluation outcome.`, priorities: [{ title }], coverage: [{ source: 'Fictional Notes', status: 'partial', fetched: 12, reviewed: 7, incorporated: 4, updatedAt: NOW, gaps: ['Three transcripts missing.'] }] });

test('all outcomes persist with task IDs, stable latest, per-run archives and retained earlier results', async t => {
  const { directory, reporter } = fixture(t);
  for (const status of ['completed', 'partial', 'failed', 'skipped']) {
    const start = await reporter.startRun({ taskId: status, taskName: `${status} task`, mode: 'runtime' });
    const saved = await reporter.finalizeRun({ runId: start.runId, status, result: result(status), ...(status === 'failed' ? { error: { code: 'offline', summary: 'Source is offline.', action: 'Retry later.' } } : {}) });
    assert.equal(saved.status, status); assert.equal(saved.saved, true); assert.equal(saved.browser.status, 'skipped');
    assert.ok(existsSync(saved.archivePath));
  }
  const queued = await reporter.startRun({ taskId: 'queued-task', status: 'queued' });
  const running = await reporter.startRun({ taskId: 'running-task' });
  assert.equal(queued.status, 'queued'); assert.equal(running.status, 'running');
  const newer = await reporter.startRun({ taskId: 'completed', status: 'queued' });
  const view = await reporter.dashboard(); const completed = view.tasks.find(task => task.taskId === 'completed');
  assert.equal(completed.latestRun.runId, newer.runId); assert.equal(completed.latestResult.status, 'completed');
  assert.equal(view.tasks.length, 6); assert.equal(view.totalRuns, 7);
  const promoted = await reporter.startRun({ taskId: 'queued-task', runId: queued.runId, status: 'running' }); assert.equal(promoted.status, 'running');
  const html = readFileSync(join(directory, 'latest.html'), 'utf8');
  for (const phrase of ['Needs your attention', 'Your top three priorities', 'Commitments to review', 'Recommendations', 'Drafts awaiting review', 'Actions taken', 'Fetched', 'Reviewed', 'Incorporated', 'Schedule not verified', 'Earlier result retained', 'Customer-source']) assert.ok(html.includes(phrase), phrase);
  assert.match(html, /Coverage partial or unverified/);
  assert.ok(html.includes('Task <code>completed</code>'));
  for (const archive of readdirSync(join(directory, 'archives'))) {
    const page = readFileSync(join(directory, 'archives', archive), 'utf8'); assert.match(page, /href="\.\.\/latest.html"/);
    for (const match of page.matchAll(/href="(\.\.\/archives\/[^"#]+)"/g)) assert.ok(existsSync(join(directory, 'archives', match[1])), match[1]);
  }
  assert.equal(statSync(directory).mode & 0o777, 0o700);
  for (const name of ['latest.html', 'metadata.json', '.report-owner.json']) assert.equal(statSync(join(directory, name)).mode & 0o777, 0o600);
});

test('two overlapping real writers retain both tasks and do not overwrite a newer result with an older finalization', { timeout: 15000 }, async t => {
  const { directory, reporter } = fixture(t);
  const moduleUrl = pathToFileURL(join(import.meta.dirname, '../src/reporting.mjs')).href;
  const script = `import {createReporter} from ${JSON.stringify(moduleUrl)}; import {once} from 'node:events'; const reporter=createReporter({directory:process.argv[1]}); const run=await reporter.startRun({taskId:process.argv[2],taskName:process.argv[2]}); process.stdout.write('started\\n'); await once(process.stdin,'data'); await reporter.finalizeRun({runId:run.runId,status:'completed',result:{summary:process.argv[2]+' retained',found:[{title:process.argv[2]+' finding'}]}}); process.stdin.pause();`;
  const children = ['task-a', 'task-b'].map(id => spawn(process.execPath, ['--input-type=module', '-e', script, directory, id], { stdio: ['pipe', 'pipe', 'pipe'] }));
  t.after(() => children.forEach(child => { if (child.exitCode === null) child.kill(); }));
  await Promise.all(children.map(child => new Promise((done, reject) => { let text = ''; child.stderr.on('data', error => reject(new Error(String(error)))); child.stdout.on('data', data => { text += data; if (text.includes('started')) done(); }); child.on('exit', code => { if (code !== 0) reject(new Error('Child exited before overlap.')); }); })));
  assert.equal((await reporter.dashboard()).tasks.filter(task => task.latestRun.status === 'running').length, 2);
  const exits = children.map(child => once(child, 'exit')); children.forEach(child => child.stdin.write('finish\n'));
  for (const [code] of await Promise.all(exits)) assert.equal(code, 0);
  let view = await reporter.dashboard(); assert.deepEqual(new Set(view.tasks.map(task => task.taskId)), new Set(['task-a', 'task-b']));
  assert.ok(view.tasks.every(task => task.latestResult.result.found.length === 1));
  const old = await reporter.startRun({ taskId: 'same-task' }); const newest = await reporter.startRun({ taskId: 'same-task' });
  await reporter.finalizeRun({ runId: newest.runId, status: 'completed', result: { summary: 'Newer result' } });
  const oldSaved = await reporter.finalizeRun({ runId: old.runId, status: 'partial', result: { summary: 'Older result', found: [{ title: 'Older own finding' }] } });
  view = await reporter.dashboard(); assert.equal(view.tasks.find(task => task.taskId === 'same-task').latestResult.runId, newest.runId);
  const oldPage = readFileSync(oldSaved.archivePath, 'utf8'); assert.ok(oldPage.includes('Older result')); assert.ok(oldPage.includes('Older own finding')); assert.ok(oldPage.includes("This timestamped run's own output"));
  assert.equal(view.totalRuns, 4);
});

test('initializing beside a locked atomic report write preserves its transient file and rejects unrelated or unsafe files', t => {
  const { directory } = fixture(t); const lock = join(directory, '.report-lock');
  const temporary = join(directory, 'metadata.json.11111111-1111-4111-8111-111111111111.tmp');
  mkdirSync(lock); writeFileSync(temporary, 'Unfinished fictional atomic write');
  assert.doesNotThrow(() => createReporter({ directory }));
  assert.equal(readFileSync(temporary, 'utf8'), 'Unfinished fictional atomic write');
  const unrelated = join(directory, 'unrelated.tmp'); writeFileSync(unrelated, 'Unrelated');
  assert.throws(() => createReporter({ directory }), /Unowned/); rmSync(unrelated);
  rmSync(lock, { recursive: true }); assert.throws(() => createReporter({ directory }), /Unowned/);
  mkdirSync(lock); rmSync(temporary); symlinkSync(join(directory, '.report-owner.json'), temporary);
  assert.throws(() => createReporter({ directory }), /symlinks/);
});

test('escaped long content is readable; only allowlisted safe links render, scheduler claims require verification', async t => {
  const { directory, reporter } = fixture(t, { allowedLinkHosts: ['example.com'] });
  const start = await reporter.startRun({ taskId: 'injection', taskName: '<img src=x onerror=alert(1)>', scheduler: { verified: true, lastRunAt: NOW, nextRunAt: '2026-10-01T12:00:00Z', reference: { label: 'Verified schedule', url: 'https://example.com/schedule' } } });
  const saved = await reporter.finalizeRun({ runId: start.runId, status: 'partial', result: { summary: '<script>alert(1)</script>', attention: [{ title: 'Decision <required>', detail: 'Long approved summary\n' + 'x'.repeat(3500), requiresApproval: true, links: [{ label: '<Evidence>', url: 'https://example.com/evidence?a=1&b=2' }] }], drafts: [{ title: 'Draft needs approval', requiresApproval: true }], links: [{ label: 'Chat evidence', url: 'https://example.com/chat' }], sectionUpdatedAt: { attention: NOW } } });
  const html = readFileSync(saved.dashboardPath, 'utf8');
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;')); assert.ok(!html.includes('<script>')); assert.ok(!html.includes('<img'));
  assert.ok(html.includes('a=1&amp;b=2')); assert.ok(html.includes('Approval required')); assert.ok(html.includes('overflow-wrap:anywhere')); assert.ok(html.includes('@media(max-width:600px)')); assert.ok(html.includes('Verified schedule'));
  assert.ok(html.includes('Chat evidence')); assert.ok(html.slice(html.indexOf('<section id="attention"'), html.indexOf('<section id="priorities"')).includes('Draft needs approval'));
  assert.ok(!/<(?:script|link|iframe|img)\b/i.test(html));
  for (const link of ['javascript:alert(1)', 'data:text/html,unsafe', 'file:///tmp/private', 'https://evil.example/path', 'https://example.com/?token=private', 'https://name:password@example.com/']) assert.throws(() => validateReportLink(link, ['example.com']));
  await assert.rejects(reporter.startRun({ taskId: 'unverified', scheduler: { verified: false, nextRunAt: NOW } }), /Unverified scheduler/);
});

test('section omissions retain attention and each source latest snapshot; date-only deadlines never invent a time', async t => {
  const { reporter } = fixture(t);
  const first = await reporter.startRun({ taskId: 'brief' });
  await reporter.finalizeRun({ runId: first.runId, status: 'partial', result: { attention: [{ title: 'Approval pending' }], commitments: [{ title: 'Review a dated promise', dueAt: '2026-10-02' }], coverage: [{ source: 'Notes', status: 'partial', fetched: 10, reviewed: 5, incorporated: 3, updatedAt: NOW }] } });
  const second = await reporter.startRun({ taskId: 'brief' }); await reporter.finalizeRun({ runId: second.runId, status: 'completed', result: { summary: 'Brief regenerated' } });
  const other = await reporter.startRun({ taskId: 'refresh' }); await reporter.finalizeRun({ runId: other.runId, status: 'partial', result: { coverage: [{ source: 'Notes', status: 'fresh', fetched: 11, reviewed: 6, incorporated: 4, updatedAt: '2026-09-30T13:00:00Z' }] } });
  const older = await reporter.startRun({ taskId: 'older-source-task' }); await reporter.finalizeRun({ runId: older.runId, status: 'completed', result: { coverage: [{ source: 'Notes', status: 'stale', fetched: 2, updatedAt: '2026-09-29T12:00:00Z' }] } });
  const view = await reporter.dashboard(); assert.equal(view.sources.length, 1); assert.equal(view.sources[0].fetched, 11); assert.equal(view.sources[0].status, 'fresh');
  const html = readFileSync(view.dashboardPath, 'utf8'); assert.ok(html.includes('Approval pending')); assert.ok(html.includes('2026-10-02 (date only)')); assert.ok(!html.includes('Due Oct 2'));
  const clear = await reporter.startRun({ taskId: 'brief' }); await reporter.finalizeRun({ runId: clear.runId, status: 'completed', result: { attention: [] } });
  assert.ok(!readFileSync((await reporter.dashboard()).dashboardPath, 'utf8').includes('Approval pending'));
  const invalid = await reporter.startRun({ taskId: 'invalid-date' }); assert.equal((await reporter.finalizeRun({ runId: invalid.runId, status: 'completed', result: { commitments: [{ title: 'Invalid', dueAt: '2026-02-30' }] } })).validationRejected, true);
});

test('invalid, raw, excluded and credential input becomes a safe failed report without persisting private text', async t => {
  const { directory, reporter } = fixture(t, { excludedTerms: ['Private Person'] });
  const bad = [{ records: [{ content: 'raw archive' }] }, { summary: 'Private Person was excluded.' }, { summary: 'api_key=123456789-unapproved' }, { summary: 'x'.repeat(1601) }, { priorities: Array(4).fill({ title: 'Too many' }) }, { coverage: [{ source: 'Notes', status: 'partial', completeCoverage: true }] }];
  for (let index = 0; index < bad.length; index++) {
    const start = await reporter.startRun({ taskId: `bad-${index}` });
    const saved = await reporter.finalizeRun({ runId: start.runId, status: 'completed', result: bad[index] });
    assert.equal(saved.status, 'failed'); assert.equal(saved.validationRejected, true);
    assert.ok(!readFileSync(saved.archivePath, 'utf8').includes('Private Person'));
  }
  for (const file of readdirSync(join(directory, 'runs'))) {
    const text = readFileSync(join(directory, 'runs', file), 'utf8'); assert.ok(!/raw archive|Private Person|123456789-unapproved/.test(text));
  }
});

test('configured browser uses one stable page with reuse intent, accurate receipts and cooldown', async t => {
  let calls = 0; const requests = [];
  const { directory, reporter } = fixture(t, { openPolicy: { enabled: true }, sessionProbe: async () => ({ available: true, locked: false, online: true, browserAvailable: true }), opener: async request => { calls++; requests.push(request); return { status: 'opened', reused: true }; } });
  const first = await reporter.startRun({ taskId: 'one' }); const saved = await reporter.finalizeRun({ runId: first.runId, status: 'completed' });
  assert.equal(saved.saved, true); assert.equal(saved.browser.status, 'opened'); assert.equal(saved.browser.reused, true);
  const second = await reporter.startRun({ taskId: 'two' }); const suppressed = await reporter.finalizeRun({ runId: second.runId, status: 'completed' });
  assert.equal(calls, 1); assert.equal(suppressed.browser.status, 'skipped'); assert.match(suppressed.browser.reason, /cooldown/);
  assert.deepEqual(requests[0], { path: join(directory, 'latest.html'), reuse: true, wake: false, unlock: false });
});

test('offline, locked, unavailable and missing browser/session probes never invoke an opener', async t => {
  for (const session of [{ available: false }, { available: true, locked: true }, { available: true, locked: false, online: false }, { available: true, locked: false, online: true, browserAvailable: false }, { available: true }]) {
    let calls = 0; const { reporter } = fixture(t, { openPolicy: { enabled: true }, sessionProbe: async () => session, opener: async () => { calls++; return { status: 'opened' }; } });
    const run = await reporter.startRun({ taskId: 'safe-skip' }); const saved = await reporter.finalizeRun({ runId: run.runId, status: 'skipped' });
    assert.equal(saved.saved, true); assert.equal(saved.browser.status, 'skipped'); assert.equal(calls, 0);
  }
  const { reporter } = fixture(t, { openPolicy: { enabled: true } }); const run = await reporter.startRun({ taskId: 'missing-adapter' });
  const saved = await reporter.finalizeRun({ runId: run.runId, status: 'failed' }); assert.equal(saved.browser.status, 'skipped');
  const html = readFileSync(saved.dashboardPath, 'utf8'); assert.ok(html.slice(html.indexOf('<section id="attention"'), html.indexOf('<section id="priorities"')).includes('Task failed. Review this run before retrying.'));
});

test('opener failures and ambiguous responses never claim opened, while saving the failure report', async t => {
  for (const opener of [async () => { throw new Error('Private browser error must not leak.'); }, async () => undefined, async () => ({ status: 'skipped' })]) {
    const { reporter } = fixture(t, { openPolicy: { enabled: true }, sessionProbe: async () => ({ available: true, locked: false, online: true, browserAvailable: true }), opener });
    const run = await reporter.startRun({ taskId: 'browser-failure' }); const saved = await reporter.finalizeRun({ runId: run.runId, status: 'failed', error: { code: 'task_failed', summary: 'Task did not finish.' } });
    assert.equal(saved.saved, true); assert.notEqual(saved.browser.status, 'opened'); assert.ok(existsSync(saved.dashboardPath));
    assert.ok(!readFileSync(saved.archivePath, 'utf8').includes('Private browser error'));
  }
});

test('purge removes all summaries and archives, revokes pending runs and prevents resurrection', async t => {
  const { directory, reporter } = fixture(t); const first = await reporter.startRun({ taskId: 'private-summary' });
  await reporter.finalizeRun({ runId: first.runId, status: 'completed', result: { summary: 'Approved fictional summary' } });
  const pending = await reporter.startRun({ taskId: 'pending' }); const purge = await reporter.purgeReports();
  assert.equal(purge.purged, true); assert.equal(existsSync(join(directory, 'latest.html')), false); assert.deepEqual(readdirSync(join(directory, 'runs')), []); assert.deepEqual(readdirSync(join(directory, 'archives')), []);
  await assert.rejects(reporter.finalizeRun({ runId: pending.runId, status: 'completed' }), /purged/);
  assert.equal((await reporter.dashboard()).tasks.length, 0);
});

test('privacy tightening can purge old approved summaries and never deletes an unowned child artifact', async t => {
  const { directory, reporter } = fixture(t); const run = await reporter.startRun({ taskId: 'policy' });
  await reporter.finalizeRun({ runId: run.runId, status: 'completed', result: { summary: 'Fictional Person was previously included.' } });
  const tightened = createReporter({ directory, excludedTerms: ['Fictional Person'] });
  await tightened.purgeReports(); assert.equal(existsSync(join(directory, 'latest.html')), false);
  writeFileSync(join(directory, 'runs', 'unrelated.txt'), 'Do not delete');
  await assert.rejects(tightened.purgeReports(), /Unowned/); assert.equal(readFileSync(join(directory, 'runs', 'unrelated.txt'), 'utf8'), 'Do not delete');
});

test('unsafe archive tampering and failed HTML saves cannot produce a saved success receipt', async t => {
  const { directory, reporter } = fixture(t); const run = await reporter.startRun({ taskId: 'save-failure' });
  const recordPath = join(directory, 'runs', run.runId + '.json'); const record = JSON.parse(readFileSync(recordPath, 'utf8')); record.archive = '../../unrelated.html'; writeFileSync(recordPath, JSON.stringify(record));
  await assert.rejects(reporter.finalizeRun({ runId: run.runId, status: 'failed' }), /Unowned report archive/);
  record.archive = 'archives/' + NOW.replace(/[:.]/g, '-') + '_' + run.runId + '.html'; writeFileSync(recordPath, JSON.stringify(record));
  const target = join(directory, 'unrelated.txt'); writeFileSync(target, 'Untouched'); rmSync(join(directory, 'latest.html')); symlinkSync(target, join(directory, 'latest.html'));
  await assert.rejects(reporter.finalizeRun({ runId: run.runId, status: 'completed' }), /symlinks/);
  assert.equal(readFileSync(target, 'utf8'), 'Untouched');
});

test('unowned directories and symlinks are refused without changing unrelated files or permissions', t => {
  const parent = mkdtempSync(join(tmpdir(), 'confidant-report-boundary-')); t.after(() => rmSync(parent, { recursive: true, force: true }));
  const unrelated = join(parent, 'private.txt'); writeFileSync(unrelated, 'Unrelated data'); const mode = statSync(parent).mode;
  assert.throws(() => createReporter({ directory: parent }), /empty or owned/); assert.equal(readFileSync(unrelated, 'utf8'), 'Unrelated data'); assert.equal(statSync(parent).mode, mode);
  const link = join(parent, 'link'); symlinkSync(parent, link); assert.throws(() => createReporter({ directory: link }), /symlinks/);
});
