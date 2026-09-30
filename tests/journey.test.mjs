import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, symlinkSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BrainStore } from '../src/store.mjs';
import { makeSyntheticAdapters, SOURCES } from '../src/adapters.mjs';
import { ConfidantEngine, classifySynthetic } from '../src/engine.mjs';
import { ActionService } from '../src/signals.mjs';
import { SYNTHETIC_PROFILE } from '../src/cli.mjs';

const NOW = '2026-09-29T12:00:00.000Z';
function fixture(t, scenarios = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'confidant-journey-'));
  let store = new BrainStore(directory); const adapters = makeSyntheticAdapters({ now: NOW, scenarios });
  let engine = new ConfidantEngine(store, adapters, { now: () => NOW });
  t.after(() => { store.close(); rmSync(directory, { recursive: true, force: true }); });
  return { directory, adapters, get store() { return store; }, get engine() { return engine; },
    restart() { store.close(); store = new BrainStore(directory); engine = new ConfidantEngine(store, adapters, { now: () => NOW }); } };
}
function classifyAll(engine) { let batch; while ((batch = engine.nextBatch()).length) engine.commitClassifications(batch, classifySynthetic(batch), { processor: 'synthetic-deterministic-fixture' }); }
async function importAll(engine, source) { while (!engine.store.source(source).exhausted) { const result = await engine.importPage(source, { limit: 11 }); if (result.state !== 'committed') throw new Error('Unexpected source failure.'); } }

test('full setup, recent brief, interrupted 36-month import, citations, feedback, fake notifications, and complete deletion', async t => {
  const f = fixture(t, { messages: { excludedParticipant: true, duplicateAcrossPages: true }, whatsapp: { partialHistoryMonths: 12 }, notes: { missingTranscript: true } });
  assert.equal(f.engine.setup().nextQuestion, 'role');
  assert.throws(() => f.engine.consent('messages', { approved: true }), /Finish setup/);
  f.engine.answer('role', SYNTHETIC_PROFILE.role); f.restart();
  assert.equal(f.engine.setup().nextQuestion, 'goals');
  for (const [key, value] of Object.entries(SYNTHETIC_PROFILE)) if (key !== 'role') f.engine.answer(key, value);
  assert.throws(() => f.engine.consent('gmail', { approved: true }), /Cloud pre-read privacy/);
  for (const source of SOURCES) f.engine.consent(source, { approved: true, cloudExposureConsent: true });
  assert.ok(f.store.sources().every(source => !source.connected));
  for (const source of SOURCES) await f.engine.importPage(source, { limit: 6 });
  classifyAll(f.engine);
  const recent = new ActionService(f.engine).brief();
  assert.ok(recent.items.length > 0); assert.equal(recent.items[0].kind, 'follow-up');
  assert.ok(recent.items.every(item => item.evidence.every(evidence => evidence.citation.startsWith('fixture://'))));
  assert.ok(recent.coverage.every(source => source.complete === false));
  f.engine.pause(); const cursor = f.store.source('fathom').cursor;
  assert.equal((await f.engine.importPage('fathom')).state, 'paused'); assert.equal(f.store.source('fathom').cursor, cursor);
  f.restart(); assert.equal(f.engine.health().paused, true); f.engine.pause(false);
  for (const source of SOURCES) await importAll(f.engine, source);
  const pending = f.engine.nextBatch(); assert.ok(pending.length);
  assert.throws(() => f.engine.commitClassifications(pending, classifySynthetic(pending), { interruptBeforeCommit: true }), /interruption/);
  assert.ok(pending.every(item => f.store.record(item.recordKey).processing === 'pending'));
  f.restart(); classifyAll(f.engine);
  const health = f.engine.health();
  for (const source of health.sources) {
    assert.equal(source.counts.processing.pending ?? 0, 0);
    const expected = source.id === 'whatsapp' ? 24 : 72;
    assert.equal((source.counts.coverage.committed ?? 0) + (source.counts.coverage.excluded ?? 0), expected);
    assert.equal(source.complete, false, 'No requested-window claim outside verified dates.');
    assert.equal(source.connected, true); assert.equal(source.exhausted, true);
  }
  const exported = f.store.exportBrain();
  assert.ok(!JSON.stringify(exported.records).includes('Excluded Example'));
  assert.ok(!JSON.stringify(f.engine.nextBatch()).includes('Excluded Example'));
  assert.equal(f.engine.query('Excluded Example').unknown, true);
  assert.ok(health.sources.find(source => source.id === 'whatsapp').gaps.some(gap => gap.code === 'partial_history'));
  assert.ok(health.sources.find(source => source.id === 'notes').gaps.some(gap => gap.code === 'missing_apple_transcript'));
  assert.ok(f.engine.query('Alex Example').answer.every(answer => answer.citation));
  assert.ok(f.engine.views().Goals[0].sourceRef === 'setup://goals');
  assert.ok(f.engine.meetingPrep('Alex Example').interactions.answer.length);
  const actions = new ActionService(f.engine); let notifications = 0; let sends = 0;
  const fakeNotification = { mode: 'synthetic-test', notify: async () => { notifications++; } };
  await actions.deliverSynthetic('daily', fakeNotification); await actions.deliverSynthetic('daily', fakeNotification); assert.equal(notifications, 1);
  const top = actions.brief().items[0];
  const draft = actions.draft(top.id, 'alex@example.invalid');
  const outbound = { mode: 'synthetic-test', send: async payload => { sends++; return { fake: true, id: payload.idempotencyKey }; } };
  await assert.rejects(actions.sendFakeDraft(draft.id, outbound), /approval/); assert.equal(sends, 0);
  assert.throws(() => actions.approveDraft(draft.id, { recipient: 'wrong@example.invalid', text: draft.text }), /exact/);
  actions.approveDraft(draft.id, draft); await actions.sendFakeDraft(draft.id, outbound); assert.equal(sends, 1);
  await assert.rejects(actions.sendFakeDraft(draft.id, outbound), /approval/); assert.equal(sends, 1);
  actions.feedback(top.id, 'done'); assert.ok(!actions.brief().items.some(item => item.id === top.id));
  assert.equal(actions.coaching().observation, null, 'Same promise across sources must not invent a recurring pattern.');
  f.engine.disable('gmail'); await assert.rejects(f.engine.importPage('gmail'), /not enabled/);
  assert.equal(f.store.exportBrain().records.length, exported.records.length);
  const deletion = f.store.deleteLocalBrain(); assert.equal(deletion.deleted, true); assert.ok(!existsSync(join(f.directory, 'brain.sqlite')));
  assert.throws(() => new BrainStore(f.directory), /deleted/);
  f.store.close();
});

test('source failures, empty reads, bounded retries, and interruption never advance uncommitted cursor', async t => {
  const f = fixture(t, { messages: { rateLimitAtPage: 1, rateLimitOnce: true }, whatsapp: { denied: true }, calls: { offline: true }, contacts: { empty: true }, notes: { malformedAtPage: 0 } });
  f.engine.configure(SYNTHETIC_PROFILE);
  for (const source of ['messages', 'whatsapp', 'calls', 'contacts', 'notes']) f.engine.consent(source, { approved: true });
  await assert.rejects(f.engine.importPage('messages', { limit: 5, interruptBeforeCommit: true }), /interruption/);
  assert.equal(f.store.source('messages').cursor, null); assert.deepEqual(f.store.counts('messages').coverage, {});
  await f.engine.importPage('messages', { limit: 5 }); const cursor = f.store.source('messages').cursor;
  assert.equal((await f.engine.importPage('messages', { limit: 5 })).state, 'failed'); assert.equal(f.store.source('messages').cursor, cursor);
  f.restart(); assert.equal((await f.engine.importPage('messages', { limit: 5 })).state, 'committed');
  for (const source of ['whatsapp', 'calls', 'notes']) {
    for (let i = 0; i < 3; i++) await f.engine.importPage(source);
    assert.equal((await f.engine.importPage(source)).state, 'blocked after bounded retries');
    assert.equal(f.store.source(source).cursor, null); assert.equal(f.store.source(source).connected, false);
    assert.ok(f.store.source(source).failedStep.action); assert.ok(!JSON.stringify(f.engine.health()).includes('I will send'));
  }
  await f.engine.importPage('contacts'); assert.equal(f.store.source('contacts').connected, true); assert.equal(f.store.source('contacts').oldest, null);
});

test('changed source data refreshes idempotently and stale model results cannot overwrite source facts', async t => {
  const f = fixture(t); f.engine.configure(SYNTHETIC_PROFILE); f.engine.consent('messages', { approved: true });
  await f.engine.importPage('messages', { limit: 10 }); const oldBatch = f.engine.nextBatch();
  const changed = makeSyntheticAdapters({ now: NOW, scenarios: { messages: { changedLatest: true } } });
  f.engine.adapters.messages = changed.messages;
  assert.equal((await f.engine.importPage('messages', { limit: 10 })).failure.code, 'stale_cursor');
  assert.equal(f.engine.retry('messages').cursor, null);
  await f.engine.importPage('messages', { limit: 10 });
  assert.throws(() => f.engine.commitClassifications(oldBatch, classifySynthetic(oldBatch)), /Stale/);
  await importAll(f.engine, 'messages'); classifyAll(f.engine);
  const before = f.store.exportBrain().records.length; await f.engine.importPage('messages', { refresh: true, limit: 100 });
  assert.equal(f.store.exportBrain().records.length, before); assert.equal(before, 72);
});

test('bounded freshness updates new and changed records without consuming unfinished history', async t => {
  const f = fixture(t); f.engine.configure(SYNTHETIC_PROFILE); f.engine.consent('messages', { approved: true });
  await f.engine.importPage('messages', { limit: 5 }); classifyAll(f.engine);
  const original = f.adapters.messages.readPage.bind(f.adapters.messages);
  f.adapters.messages.readPage = async () => { throw Object.assign(new Error('Fictional history failure'), { code: 'offline' }); };
  assert.equal((await f.engine.importPage('messages')).state, 'failed');
  f.adapters.messages.readPage = original;
  const before = f.store.source('messages'); const windows = f.store.windows('messages');
  const latest = f.store.records({ source: 'messages', limit: 1 })[0];
  const { key, fingerprint, processing, ...rawLatest } = latest;
  const changed = { ...rawLatest, content: 'A fictional latest message was corrected, with no commitment.' };
  const newRecord = { ...changed, id: 'new-fictional-record', timestamp: '2026-09-30T11:00:00.000Z', content: 'New fictional context only.', sourceRef: 'fixture://messages/new-fictional-record' };
  const requests = [];
  f.engine.now = () => '2026-09-30T12:00:00.000Z';
  f.adapters.messages.readPage = async request => {
    requests.push(request);
    if (request.cursor === null && request.to !== before.to) return { items: [newRecord, changed], nextCursor: before.cursor, exhausted: false,
      gaps: [{ code: 'fixture_partial_refresh', reason: 'More fictional records remain outside this page.' }] };
    return original(request);
  };
  const result = await f.engine.importPage('messages', { refresh: true, limit: 2 });
  const after = f.store.source('messages');
  for (const field of ['cursor', 'from', 'to', 'exhausted', 'seen', 'oldest', 'newest', 'failedStep', 'attempts', 'status']) assert.deepEqual(after[field], before[field], field);
  assert.equal(requests[0].cursor, null); assert.equal(requests[0].to, '2026-09-30T12:00:00.000Z');
  assert.equal(result.changed, 2); assert.equal(result.refresh, true); assert.equal(result.freshness.pageExhausted, false);
  assert.equal(after.freshness.completeCoverage, false); assert.equal(after.lastRefresh, f.engine.now());
  assert.equal(f.store.record(latest.key).content, changed.content); assert.equal(f.store.record(latest.key).processing, 'pending');
  assert.equal(f.store.record('messages:new-fictional-record').content, newRecord.content);
  assert.equal(f.store.facts().filter(fact => fact.recordKey === latest.key).length, 0, 'Changed source text invalidates prior derived facts.');
  assert.deepEqual(f.store.windows('messages').map(window => [window.key, window.state, window.from, window.to]),
    windows.map(window => [window.key, window.state, window.from, window.to]));
  assert.equal((await f.engine.importPage('messages', { refresh: true, limit: 2 })).changed, 0, 'Repeat freshness scan deduplicates stable identities.');
  assert.equal((await f.engine.importPage('messages', { limit: 5 })).state, 'committed');
  assert.equal(requests.at(-1).cursor, before.cursor); assert.equal(requests.at(-1).to, before.to);
  await importAll(f.engine, 'messages'); classifyAll(f.engine);
  assert.equal(f.store.exportBrain().records.length, 73);
  assert.equal(f.store.source('messages').exhausted, true);
  assert.equal(f.engine.health().sources[0].complete, false, 'Finishing/classifying old history cannot erase partial current freshness.');
  assert.ok(f.store.source('messages').gaps.some(gap => gap.code === 'fixture_partial_refresh'));
});

test('freshness failures preserve successful receipts and history, and interruption or revocation cannot commit', async t => {
  const f = fixture(t); f.engine.configure(SYNTHETIC_PROFILE); f.engine.consent('messages', { approved: true });
  await f.engine.importPage('messages', { limit: 5 });
  const original = f.adapters.messages.readPage.bind(f.adapters.messages);
  f.engine.now = () => '2026-09-30T12:00:00.000Z';
  await f.engine.importPage('messages', { refresh: true, limit: 5 });
  const successful = f.store.source('messages'); const records = f.store.exportBrain().records; const windows = f.store.windows('messages');
  await assert.rejects(f.engine.importPage('messages', { refresh: true, limit: 7, interruptBeforeCommit: true }), /interruption/);
  assert.deepEqual(f.store.source('messages'), successful); assert.deepEqual(f.store.exportBrain().records, records);
  assert.deepEqual(f.store.windows('messages'), windows);
  f.engine.now = () => '2026-09-30T15:00:00.000Z';
  f.adapters.messages.readPage = async () => { throw Object.assign(new Error('Fictional offline fixture'), { code: 'offline' }); };
  assert.equal((await f.engine.importPage('messages', { refresh: true })).state, 'failed');
  const failed = f.store.source('messages');
  for (const field of ['cursor', 'from', 'to', 'exhausted', 'seen', 'oldest', 'newest', 'attempts', 'failedStep', 'lastRefresh']) assert.deepEqual(failed[field], successful[field], field);
  for (const field of ['at', 'from', 'to', 'fetched', 'changed', 'status', 'pageExhausted']) assert.deepEqual(failed.freshness[field], successful.freshness[field], field);
  assert.equal(failed.freshness.lastAttempt.status, 'failed'); assert.equal(failed.freshness.lastAttempt.failure.code, 'offline');
  assert.equal(failed.freshness.lastAttempt.at, f.engine.now());
  let release;
  f.adapters.messages.readPage = async request => { await new Promise(resolve => { release = resolve; }); return original(request); };
  const pending = f.engine.importPage('messages', { refresh: true, limit: 8 });
  f.engine.disable('messages'); const revoked = f.store.source('messages'); release();
  assert.match((await pending).state, /cancelled/); assert.deepEqual(f.store.source('messages'), revoked);
  assert.deepEqual(f.store.exportBrain().records, records); assert.deepEqual(f.store.windows('messages'), windows);
});

test('classified freshness remains incomplete even when previous historical receipts were complete', async t => {
  const f = fixture(t); f.engine.configure(SYNTHETIC_PROFILE); f.engine.consent('messages', { approved: true });
  const history = f.store.source('messages');
  const item = (id, timestamp) => ({ id, source: 'messages', timestamp, direction: 'incoming', participants: ['Alex Example'],
    content: 'Fictional context only.', sourceRef: `fixture://messages/${id}`, metadata: { fixture: true } });
  f.adapters.messages.readPage = async () => ({ items: [item('oldest', history.from), item('newest', history.to)], nextCursor: null, exhausted: true, gaps: [] });
  await f.engine.importPage('messages'); classifyAll(f.engine);
  assert.equal(f.engine.health().sources[0].complete, true, 'The fixture supplies both requested endpoints and no declared gaps.');
  f.engine.now = () => '2026-09-30T12:00:00.000Z';
  f.adapters.messages.readPage = async () => ({ items: [item('current', f.engine.now())], nextCursor: 'fictional-current-continuation', exhausted: false, gaps: [] });
  await f.engine.importPage('messages', { refresh: true }); classifyAll(f.engine);
  assert.equal(f.store.source('messages').exhausted, true); assert.equal(f.store.source('messages').to, history.to);
  assert.deepEqual(f.store.source('messages').gaps, []);
  assert.equal(f.store.counts('messages').processing.pending ?? 0, 0);
  assert.equal(f.engine.health().sources[0].complete, false, 'No pending records or source gaps can erase the separately partial freshness receipt.');
});

test('invalid model facts, invented deadlines, source exclusion tightening, and reviewed corrections stay safe', async t => {
  const f = fixture(t); f.engine.configure(SYNTHETIC_PROFILE); f.engine.consent('messages', { approved: true }); await f.engine.importPage('messages', { limit: 6 });
  const batch = f.engine.nextBatch(); const good = classifySynthetic(batch);
  const invented = structuredClone(good); invented.find(item => item.facts.length).facts[0].quote = 'unsupported statement';
  assert.throws(() => f.engine.commitClassifications(batch, invented), /exact source quote/);
  const deadline = structuredClone(good); const commitment = deadline.flatMap(item => item.facts).find(fact => fact.category === 'Commitments'); commitment.dueAt = '2030-01-01T10:00:00Z';
  assert.throws(() => f.engine.commitClassifications(batch, deadline), /Deadline/);
  const wrongHour = structuredClone(good); const timed = wrongHour.flatMap(item => item.facts).find(fact => fact.category === 'Commitments');
  timed.dueAt = new Date(Date.parse(timed.dueAt) - 3600000).toISOString();
  assert.throws(() => f.engine.commitClassifications(batch, wrongHour), /Deadline time/);
  f.engine.commitClassifications(batch, good); const actions = new ActionService(f.engine); const item = actions.suggestions().find(value => value.kind === 'follow-up');
  const raw = f.store.record(f.store.facts().find(fact => fact.id === item.factIds[0]).recordKey).content;
  const correction = actions.feedback(item.id, 'correction', 'Check the proposal owner');
  assert.ok(!f.store.facts().some(fact => fact.label === 'Check the proposal owner'));
  actions.reviewCorrection(correction.id, true); assert.ok(f.store.facts().some(fact => fact.reviewedCorrection));
  assert.ok(f.store.exportBrain().records.some(record => record.content === raw));
  const next = actions.suggestions().find(value => value.kind === 'follow-up'); if (next) actions.draft(next.id, 'alex@example.invalid');
  const exportPath = f.store.writeArtifact('brain-export.json', f.store.exportBrain());
  const batchPath = f.store.writeArtifact('classification-batch.json', { batch });
  f.engine.answer('exclusions', { people: ['Alex Example'], sources: [], chats: [], topics: [] });
  assert.equal(f.store.exportBrain().records.length, 0); assert.equal(f.store.facts().length, 0);
  assert.equal(f.store.rows('drafts').length, 0); assert.equal(f.store.rows('feedback').length, 0);
  assert.equal(existsSync(exportPath), false); assert.equal(existsSync(batchPath), false);
  assert.equal(f.engine.query('Project Atlas').unknown, true);
});

test('disable, pause, and concurrent imports revoke pending reads and model checkpoints', async t => {
  const f = fixture(t); f.engine.configure(SYNTHETIC_PROFILE); f.engine.consent('messages', { approved: true });
  const original = f.adapters.messages.readPage.bind(f.adapters.messages); let release;
  f.adapters.messages.readPage = async params => { await new Promise(resolve => { release = resolve; }); return original(params); };
  const pending = f.engine.importPage('messages', { limit: 6 });
  f.engine.disable('messages'); release();
  assert.match((await pending).state, /cancelled/); assert.equal(f.store.source('messages').authorized, false);
  assert.equal(f.store.exportBrain().records.length, 0);
  f.engine.enable('messages'); f.engine.consent('messages', { approved: true });
  f.adapters.messages.readPage = async () => { await new Promise(resolve => { release = resolve; }); throw Object.assign(new Error('synthetic'), { code: 'offline' }); };
  const failure = f.engine.importPage('messages'); f.engine.disable('messages'); release();
  assert.match((await failure).state, /cancelled/); assert.equal(f.store.source('messages').disabled, true);
  f.engine.enable('messages'); f.engine.consent('messages', { approved: true }); f.adapters.messages.readPage = original;
  const results = await Promise.all([f.engine.importPage('messages', { limit: 6 }), f.engine.importPage('messages', { limit: 6 })]);
  assert.equal(results.filter(result => result.state === 'committed').length, 1); assert.equal(f.store.source('messages').seen, 6);
  const batch = f.engine.nextBatch(); f.engine.disable('messages');
  assert.throws(() => f.engine.commitClassifications(batch, classifySynthetic(batch)), /disabled/);
  f.engine.enable('messages'); f.engine.consent('messages', { approved: true });
  f.adapters.messages.readPage = async params => { await new Promise(resolve => { release = resolve; }); return original(params); };
  const paused = f.engine.importPage('messages'); f.engine.pause(); release(); assert.match((await paused).state, /cancelled/);
});

test('disabled sources cannot starve enabled classification or search', async t => {
  const f = fixture(t); f.engine.configure(SYNTHETIC_PROFILE);
  for (const source of ['messages', 'gmail']) { f.engine.consent(source, { approved: true, cloudExposureConsent: true }); await importAll(f.engine, source); }
  f.engine.disable('gmail'); classifyAll(f.engine);
  assert.equal(f.store.counts('messages').processing.pending ?? 0, 0);
  assert.ok(f.store.counts('gmail').processing.pending > 0);
  assert.ok(f.engine.query('Project Atlas', { limit: 1 }).answer.length);
});

test('storage rejects unrelated directories and symlinks without altering them; deletion removes only owned artifacts', t => {
  const parent = mkdtempSync(join(tmpdir(), 'confidant-boundary-')); t.after(() => rmSync(parent, { recursive: true, force: true }));
  const unrelated = join(parent, 'brain-export.json'); writeFileSync(unrelated, 'unrelated'); const before = statSync(parent).mode;
  assert.throws(() => new BrainStore(parent), /empty/); assert.equal(readFileSync(unrelated, 'utf8'), 'unrelated'); assert.equal(statSync(parent).mode, before);
  const link = join(parent, 'linked'); symlinkSync(parent, link); assert.throws(() => new BrainStore(link), /symlinks/);
  const f = fixture(t); const unowned = join(f.directory, 'brain-export.json'); writeFileSync(unowned, 'unrelated');
  assert.throws(() => f.store.writeArtifact('brain-export.json', {}), /unowned/);
  f.store.deleteLocalBrain(); assert.equal(readFileSync(unowned, 'utf8'), 'unrelated');
});

test('a date-only deadline cannot invent an hour or produce an urgent alert', async t => {
  const f = fixture(t); f.engine.configure(SYNTHETIC_PROFILE); f.engine.consent('messages', { approved: true }); await f.engine.importPage('messages', { limit: 6 });
  for (const record of f.store.records()) if (record.content?.includes('I will send')) { const { key, fingerprint, processing, ...raw } = record; raw.content = raw.content.replace(/\d{4}-\d{2}-\d{2}T[0-9:.]+Z/g, '2026-09-30'); f.store.putRecord(raw); }
  const batch = f.engine.nextBatch(); const outputs = classifySynthetic(batch);
  const invented = structuredClone(outputs); invented.flatMap(item => item.facts).find(fact => fact.category === 'Commitments').dueAt = '2026-09-30T01:00:00Z';
  assert.throws(() => f.engine.commitClassifications(batch, invented), /precision/);
  f.engine.commitClassifications(batch, outputs); assert.equal(new ActionService(f.engine).urgentAlerts().length, 0);
  assert.ok(f.store.facts().some(fact => fact.deadlinePrecision === 'date'));
});

test('fresh urgent actions require stronger timing evidence, stale sources do not alert, and edited drafts revoke approval', async t => {
  const f = fixture(t); f.engine.configure(SYNTHETIC_PROFILE); f.engine.consent('messages', { approved: true }); await f.engine.importPage('messages', { limit: 6 }); classifyAll(f.engine);
  const actions = new ActionService(f.engine); assert.ok(actions.urgentAlerts().length);
  const item = actions.suggestions().find(value => value.kind === 'follow-up'); const draft = actions.draft(item.id, 'alex@example.invalid');
  actions.approveDraft(draft.id, draft); actions.editDraft(draft.id, { recipient: draft.recipient, text: draft.text + ' Please review.' });
  await assert.rejects(actions.sendFakeDraft(draft.id, { mode: 'synthetic-test', send: async () => { throw new Error('Must not reach send.'); } }), /approval/);
  const source = f.store.source('messages'); f.store.saveSource({ ...source, lastRefresh: '2026-09-28T00:00:00Z' });
  assert.equal(actions.urgentAlerts().length, 0); assert.equal(actions.brief().items[0].fresh, false);
  await assert.rejects(actions.sendFakeDraft(draft.id, { mode: 'live', send: async () => {} }), /fake/);
});

test('three distinct sourced promises support cautious weekly coaching, deduplicated delivery and dismissal', async t => {
  const f = fixture(t); f.engine.configure(SYNTHETIC_PROFILE); f.engine.consent('notes', { approved: true }); await f.engine.importPage('notes', { limit: 6 });
  for (let index = 0; index < 3; index++) f.store.putRecord({ id: `distinct-${index}`, source: 'notes', timestamp: new Date(Date.parse(NOW) - (index + 1) * 3600000).toISOString(),
    content: `[Synthetic] I will complete task ${index + 1} for Project Atlas.`, participants: ['Alex Example'], direction: null,
    sourceRef: `fixture://notes/distinct-${index}`, metadata: { fixture: true, appleTranscriptSupplied: true }, version: '1' });
  const batch = f.engine.nextBatch(); const outputs = batch.map(record => ({ recordKey: record.recordKey, facts: record.recordKey.includes('distinct-') ? [{
    category: 'Commitments', label: record.excerpt.slice(12), quote: record.excerpt.slice(12), confidence: 0.96, inference: false, person: 'Alex Example', project: 'Project Atlas',
  }] : [] }));
  f.engine.commitClassifications(batch, outputs); const actions = new ActionService(f.engine);
  assert.ok(actions.coaching().observation); assert.equal(actions.coaching().evidence.length, 3);
  let notices = 0; const fake = { mode: 'synthetic-test', notify: async () => { notices++; } };
  await actions.deliverSynthetic('weekly', fake); await actions.deliverSynthetic('weekly', fake); assert.equal(notices, 1);
  actions.dismissCoaching(); assert.equal(actions.coaching().observation, null);
});

test('feedback lowers similar ranking and fake send unknown outcomes cannot retry or reuse approval', async t => {
  const f = fixture(t); f.engine.configure(SYNTHETIC_PROFILE); f.engine.consent('notes', { approved: true }); await f.engine.importPage('notes', { limit: 6 }); classifyAll(f.engine);
  const actions = new ActionService(f.engine); const item = actions.suggestions().find(value => value.kind === 'follow-up');
  actions.feedback(item.id, 'wrong'); assert.ok(!actions.suggestions().some(value => value.id === item.id));
  const sourceRecord = f.store.records({ source: 'notes' }).find(record => record.content?.includes('I will send'));
  const { key, fingerprint, processing, ...raw } = sourceRecord; raw.version = 'changed'; raw.content += ' [Synthetic update]'; f.store.putRecord(raw); classifyAll(f.engine);
  const changed = actions.suggestions().find(value => value.id === item.id); assert.ok(changed); assert.ok(changed.score < item.score);
  const draft = actions.draft(changed.id, 'alex@example.invalid'); actions.approveDraft(draft.id, draft);
  let attempts = 0; const fake = { mode: 'synthetic-test', send: async () => { attempts++; throw new Error('synthetic lost receipt'); } };
  await assert.rejects(actions.sendFakeDraft(draft.id, fake), /outcome unknown/);
  await assert.rejects(actions.sendFakeDraft(draft.id, fake), /approval/); assert.equal(attempts, 1);
  assert.equal(f.store.rows('drafts').find(value => value.id === draft.id).status, 'outcome unknown');
});
