import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import { SYNTHETIC_PROFILE } from '../../../src/cli.mjs';
import { classifySynthetic } from '../../../src/engine.mjs';

function client(t, directory) {
  const child = spawn(process.execPath, ['--experimental-sqlite', fileURLToPath(new URL('../mvp-server.mjs', import.meta.url)), '--data', directory, '--reports', join(directory, 'reports')], { env: {}, stdio: ['pipe', 'pipe', 'pipe'] });
  let buffer = ''; let id = 0; const waiting = new Map();
  t.after(() => { if (child.exitCode === null) child.kill(); });
  child.stderr.on('data', () => {}); // Node's experimental SQLite warning is not protocol output.
  child.stdout.on('data', chunk => {
    buffer += chunk.toString(); let newline;
    while ((newline = buffer.indexOf('\n')) !== -1) {
      const value = JSON.parse(buffer.slice(0, newline)); buffer = buffer.slice(newline + 1);
      waiting.get(value.id)?.(value); waiting.delete(value.id);
    }
  });
  child.on('exit', () => { for (const resolve of waiting.values()) resolve({ unavailable: true }); waiting.clear(); });
  const send = (method, params) => new Promise(resolve => { const next = ++id; waiting.set(next, resolve); child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: next, method, params }) + '\n'); });
  return { child, send,
    async init() { const response = await send('initialize', { protocolVersion: '2025-11-25', clientInfo: { name: 'synthetic-test', version: '1' }, capabilities: {} }); child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n'); return response; },
    call: (name, args = {}) => send('tools/call', { name: 'confidant_' + name, arguments: args }),
    async close() { const closed = once(child, 'close'); child.stdin.end(); await closed; },
  };
}
test('real stdio journey supports guided setup, quoted answers, checkpoint resume, feedback, draft review, privacy export purge, and deletion', { timeout: 15000 }, async t => {
  const directory = mkdtempSync(join(tmpdir(), 'confidant-mcp-')); t.after(() => rmSync(directory, { recursive: true, force: true }));
  let c = client(t, directory); await c.init();
  assert.equal((await c.call('setup')).result.structuredContent.nextQuestion, 'role');
  assert.equal((await c.call('consent', { source: 'messages', approved: true })).result.isError, true);
  for (const [key, value] of Object.entries(SYNTHETIC_PROFILE)) assert.equal((await c.call('answer', { key, value })).result.isError, undefined);
  await c.call('consent', { source: 'messages', approved: true });
  await c.call('import', { source: 'messages', limit: 6 });
  await c.call('consent', { source: 'gmail', approved: true, cloudExposureConsent: true });
  await c.call('import', { source: 'gmail', limit: 6 });
  const batch = (await c.call('batch')).result.structuredContent.batch;
  assert.ok(batch.length); assert.ok(!JSON.stringify(batch).includes('expectedSignals')); assert.ok(!JSON.stringify(batch).includes('Excluded Example'));
  const outputs = classifySynthetic(batch); // Test-only fixture processor, never evidence of live AI.
  const bad = structuredClone(outputs); bad.find(item => item.facts.length).facts[0].quote = 'invented';
  assert.equal((await c.call('checkpoint', { batch, outputs: bad })).result.isError, true);
  assert.equal((await c.call('checkpoint', { batch, outputs })).result.structuredContent.processed, batch.length);
  const brief = (await c.call('brief')).result.structuredContent; assert.ok(brief.items.length);
  assert.ok((await c.call('query', { text: 'Project Atlas' })).result.structuredContent.answer.every(item => item.citation));
  const draft = (await c.call('draft', { id: brief.items[0].id, recipient: 'alex@example.invalid' })).result.structuredContent;
  const approved = await c.call('draft_review', { id: draft.id, action: 'approve', text: draft.text, recipient: draft.recipient }); assert.equal(approved.result.structuredContent.status, 'approved');
  const listing = (await c.send('tools/list', {})).result.tools;
  assert.equal(listing.length, 24); assert.ok(!listing.some(tool => /send|live|api/.test(tool.name)));
  assert.equal((await c.call('send', { id: draft.id })).error.code, -32602);
  await c.call('feedback', { id: brief.items[0].id, type: 'done' });
  await c.call('control', { action: 'pause' }); await c.close();
  c = client(t, directory); await c.init(); assert.equal((await c.call('health')).result.structuredContent.paused, true);
  await c.call('control', { action: 'resume' });
  const exported = (await c.call('export')).result.structuredContent.path; assert.ok(existsSync(exported));
  await c.call('answer', { key: 'exclusions', value: { people: ['Alex Example'] } }); assert.equal(existsSync(exported), false);
  assert.equal((await c.call('query', { text: 'Project Atlas' })).result.structuredContent.unknown, true);
  assert.equal((await c.call('delete', { confirmation: 'wrong' })).result.isError, true);
  assert.equal((await c.call('delete', { confirmation: 'delete my synthetic evaluation brain' })).result.structuredContent.deleted, true);
  assert.equal((await c.call('health')).result.isError, true);
  await c.close();
});
test('stdio rejects unknown properties and out-of-bound batches without reading sources', { timeout: 10000 }, async t => {
  const directory = mkdtempSync(join(tmpdir(), 'confidant-mcp-boundary-')); t.after(() => rmSync(directory, { recursive: true, force: true }));
  const c = client(t, directory);
  assert.equal((await c.send('tools/list', {})).error.code, -32600); await c.init();
  for (const [name, args] of [['import', { source: 'messages', limit: 101 }], ['query', { text: 'safe', secret: 'never-echo-this' }], ['checkpoint', { batch: Array(13).fill({}), outputs: Array(13).fill({}) }]]) {
    const result = await c.call(name, args); assert.equal(result.result.isError, true); assert.ok(!JSON.stringify(result).includes('never-echo-this'));
  }
  assert.equal(existsSync(join(directory, 'brain.sqlite')), false);
  assert.equal((await c.send('resources/read', { uri: 'file:///anything' })).error.code, -32601);
  await c.close();
});
test('chat reporting tools persist partial outcomes, refuse excluded text, and purge history on tightened exclusions', { timeout: 10000 }, async t => {
  const directory = mkdtempSync(join(tmpdir(), 'confidant-mcp-reports-')); t.after(() => rmSync(directory, { recursive: true, force: true }));
  const c = client(t, directory); await c.init();
  for (const [key, value] of Object.entries(SYNTHETIC_PROFILE)) assert.ok(!(await c.call('answer', { key, value })).result.isError);
  assert.equal((await c.call('report_home', { openAfterRun: false })).result.structuredContent.automaticOpening, false);
  const start = (await c.call('report_start', { taskId: 'daily-brief', taskName: 'Fictional daily brief' })).result.structuredContent;
  const done = (await c.call('report_finish', { runId: start.runId, status: 'partial', result: { summary: 'Fictional import checkpoint saved; older source history pending.', priorities: [{ title: 'Review fictional Project Atlas' }] } })).result.structuredContent;
  assert.equal(done.saved, true); assert.equal(done.browser.status, 'skipped');
  const privateStart = (await c.call('report_start', { taskId: 'bad-report', taskName: 'Privacy check' })).result.structuredContent;
  const refused = (await c.call('report_finish', { runId: privateStart.runId, status: 'completed', result: { summary: 'Excluded Example must never appear' } })).result.structuredContent;
  assert.equal(refused.status, 'failed'); assert.equal(refused.validationRejected, true);
  assert.ok(!readFileSync(done.dashboardPath, 'utf8').includes('Excluded Example'));
  await c.call('answer', { key: 'exclusions', value: { people: ['Project Atlas'], sources: [], topics: [], chats: [] } });
  assert.equal((await c.call('report_home')).result.structuredContent.runs, 0);
  assert.ok(!readFileSync(done.dashboardPath, 'utf8').includes('Review fictional Project Atlas'));
  await c.close();
});
