import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { SOURCES, makeSyntheticAdapters, normalizeRecord, normalizePluginPage, createFixtureSqliteAdapter } from '../src/adapters.mjs';
import { FIXTURE_NOW, fixtureRecords } from './fixtures/sources.mjs';

async function collect(adapter, options = {}) {
  const items = [];
  const pages = [];
  let cursor = null;
  do {
    const page = await adapter.readPage({ ...options, cursor });
    items.push(...page.items);
    pages.push(page);
    cursor = page.nextCursor;
  } while (cursor);
  return { items, pages };
}

test('all ten sources page through 36 months newest first with stable evidence and honest access probes', async () => {
  const adapters = makeSyntheticAdapters();
  assert.deepEqual(Object.keys(adapters), SOURCES);
  for (const source of SOURCES) {
    const adapter = adapters[source];
    assert.equal(adapter.kind, ['gmail', 'outlook', 'fathom', 'fireflies'].includes(source) ? 'cloud' : 'local');
    const probe = await adapter.probe();
    assert.equal(probe.available, true);
    assert.equal(probe.verifiedRead, false);
    const { items, pages } = await collect(adapter, { limit: 11 });
    assert.equal(items.length, 72);
    assert.equal(new Set(items.map(item => item.id)).size, 72);
    assert.equal(new Set(items.map(item => item.metadata.monthOffset)).size, 36);
    assert.ok(pages.length > 1);
    assert.equal(pages.at(-1).exhausted, true);
    assert.equal(pages.at(-1).nextCursor, null);
    assert.deepEqual(items.map(item => item.timestamp), items.map(item => item.timestamp).sort().reverse());
    assert.equal(adapter.sourceHistory.oldest, items.at(-1).timestamp);
    assert.equal(adapter.sourceHistory.newest, items[0].timestamp);
    for (const item of items) {
      assert.equal(item.source, source);
      assert.equal(item.metadata.fixture, true);
      assert.ok(item.sourceRef.startsWith(`fixture://${source}/`));
      assert.equal(item.version, '1');
    }
    if (['messages', 'whatsapp', 'calls', 'gmail', 'outlook'].includes(source)) {
      assert.deepEqual(new Set(items.map(item => item.direction)), new Set(['incoming', 'outgoing']));
    }
  }
});

test('cursor resumes exactly after interruption and refuses cross-source or changed-window reuse', async () => {
  const first = makeSyntheticAdapters().messages;
  const page = await first.readPage({ limit: 9 });
  const restarted = makeSyntheticAdapters().messages;
  const next = await restarted.readPage({ cursor: page.nextCursor, limit: 9 });
  assert.ok(!next.items.some(item => page.items.some(previous => previous.id === item.id)));
  assert.equal(next.items[0].id, (await collect(first)).items[9].id);
  await assert.rejects(makeSyntheticAdapters().whatsapp.readPage({ cursor: page.nextCursor, limit: 9 }), error => error.code === 'stale_cursor');
  await assert.rejects(restarted.readPage({ cursor: page.nextCursor, from: '2026-01-01T00:00:00Z' }), error => error.code === 'stale_cursor');
  const changed = makeSyntheticAdapters({ scenarios: { messages: { changedLatest: true } } }).messages;
  await assert.rejects(changed.readPage({ cursor: page.nextCursor }), error => error.code === 'stale_cursor');
  const updated = await changed.readPage({ limit: 1 });
  assert.equal(updated.items[0].id, page.items[0].id);
  assert.equal(updated.items[0].version, '2');
  assert.notEqual(updated.items[0].content, page.items[0].content);
});

test('rate limits keep the same resumable cursor; denied, offline and malformed pages cannot return receipts', async () => {
  const adapter = makeSyntheticAdapters({ scenarios: { gmail: { rateLimitAtPage: 1, rateLimitOnce: true } } }).gmail;
  const first = await adapter.readPage({ limit: 10 });
  await assert.rejects(adapter.readPage({ cursor: first.nextCursor, limit: 10 }), error => error.code === 'rate_limited' && error.retryable);
  const retried = await adapter.readPage({ cursor: first.nextCursor, limit: 10 });
  assert.equal(retried.items[0].id, fixtureRecords('gmail')[10].id);
  for (const [scenario, code] of [[{ denied: true }, 'permission_denied'], [{ offline: true }, 'offline']]) {
    const unavailable = makeSyntheticAdapters({ scenarios: { messages: scenario } }).messages;
    await assert.rejects(unavailable.probe(), error => error.code === code);
    await assert.rejects(unavailable.readPage(), error => error.code === code);
  }
  const bad = makeSyntheticAdapters({ scenarios: { fathom: { malformedAtPage: 1 } } }).fathom;
  const good = await bad.readPage({ limit: 10 });
  await assert.rejects(bad.readPage({ cursor: good.nextCursor, limit: 10 }), error => error.code === 'malformed_page' && !error.retryable);
});

test('duplicate page boundaries stay bounded and reconcile without omissions', async () => {
  const adapter = makeSyntheticAdapters({ scenarios: { whatsapp: { duplicateAcrossPages: true } } }).whatsapp;
  const { items, pages } = await collect(adapter, { limit: 7 });
  assert.ok(items.length > 72);
  assert.equal(new Set(items.map(item => item.id)).size, 72);
  assert.ok(pages.every(page => page.items.length <= 7));
  assert.deepEqual(new Set(items.map(item => item.id)), new Set(fixtureRecords('whatsapp').map(item => item.id)));
});

test('partial history and absent Apple transcripts remain explicit while calls never contain invented speech', async () => {
  const adapters = makeSyntheticAdapters({ scenarios: { whatsapp: { partialHistoryMonths: 4 }, notes: { missingTranscript: true } } });
  const whatsapp = await collect(adapters.whatsapp);
  assert.equal(whatsapp.items.length, 8);
  assert.equal(whatsapp.pages[0].gaps[0].code, 'partial_history');
  assert.equal(whatsapp.pages[0].gaps[0].availableMonths, 4);
  const notes = await collect(adapters.notes);
  assert.equal(notes.items.filter(item => item.content === null).length, 36);
  assert.equal(notes.pages[0].gaps.filter(gap => gap.code === 'missing_apple_transcript').length, 36);
  assert.ok(notes.items.filter(item => item.content !== null).every(item => item.metadata.appleTranscriptSupplied === true));
  const calls = await collect(adapters.calls);
  assert.ok(calls.items.every(item => item.content === null && item.metadata.contentAvailable === false));
  const invented = normalizeRecord('calls', { ...calls.items[0], content: 'Caller promised an invented action.' });
  assert.equal(invented.content, null);
});

test('date windows, empty sources and returned-object mutation do not invent coverage or corrupt later pages', async () => {
  const adapters = makeSyntheticAdapters({ scenarios: { contacts: { empty: true } } });
  const empty = await adapters.contacts.readPage();
  assert.deepEqual(empty.items, []);
  assert.equal(empty.oldest, null);
  assert.equal(empty.newest, null);
  assert.equal(empty.exhausted, true);
  const from = '2026-08-01T00:00:00Z';
  const to = FIXTURE_NOW;
  const page = await adapters.messages.readPage({ from, to });
  assert.equal(page.items.length, 4);
  page.items[0].content = 'Changed outside adapter';
  assert.notEqual((await adapters.messages.readPage({ from, to })).items[0].content, 'Changed outside adapter');
  for (const options of [{ limit: 0 }, { limit: 101 }, { from: 'bad' }, { from: to, to: from }, { cursor: 'bad' }]) {
    await assert.rejects(adapters.messages.readPage(options), error => ['invalid_page_request', 'invalid_cursor'].includes(error.code));
  }
});

test('live plugin normalization requires a separate reviewed proof for exactly that provider', () => {
  const page = { items: fixtureRecords('gmail').slice(0, 2), nextCursor: 'next-fixture', exhausted: false, gaps: [] };
  const synthetic = normalizePluginPage({ source: 'gmail', page });
  assert.equal(synthetic.fixture, true);
  assert.equal(synthetic.items.length, 2);
  assert.throws(() => normalizePluginPage({ source: 'gmail', page, mode: 'live' }), error => error.code === 'provider_proof_required');
  const proof = { provider: 'gmail', status: 'pass', mode: 'live-pilot', consent: true, reviewedByOperator: true, observedAt: FIXTURE_NOW,
    checks: Object.fromEntries(['historicalEnumeration', 'pagination', 'stableIdentifiers', 'verifiedDateRange', 'privacyBoundary'].map(name => [name, { passed: true, artifact: 'synthetic-test-of-validator-only' }])) };
  const accepted = normalizePluginPage({ source: 'gmail', page, mode: 'live', providerProof: { gmail: proof } });
  assert.equal(accepted.fixture, false);
  const outlook = { ...page, items: fixtureRecords('outlook').slice(0, 2) };
  assert.throws(() => normalizePluginPage({ source: 'outlook', page: outlook, mode: 'live', providerProof: { gmail: proof } }), error => error.code === 'provider_proof_required');
  assert.throws(() => normalizePluginPage({ source: 'outlook', page: outlook, mode: 'live', providerProof: { outlook: proof } }), error => error.code === 'provider_proof_required');
  assert.throws(() => normalizePluginPage({ source: 'gmail', page: { ...page, nextCursor: null } }), error => error.code === 'malformed_page');
  assert.throws(() => normalizePluginPage({ source: 'gmail', page: { ...page, items: [{ ...page.items[0], metadata: {} }] } }), error => error.code === 'synthetic_only');
  assert.throws(() => makeSyntheticAdapters({ cloudMode: 'live' }), error => error.code === 'synthetic_only');
});

test('explicit SQLite fixture readers verify all six local source contracts without changing source databases', { timeout: 10000 }, async t => {
  const directory = await mkdtemp(join(tmpdir(), 'confidant-adapter-fixtures-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const script = fileURLToPath(new URL('./fixtures/sqlite-contract.mjs', import.meta.url));
  for (const source of SOURCES.filter(source => !['gmail', 'outlook', 'fathom', 'fireflies'].includes(source))) {
    const result = spawnSync(process.execPath, ['--experimental-sqlite', script, join(directory, `${source}.sqlite`), source], { encoding: 'utf8', timeout: 5000 });
    assert.equal(result.status, 0, result.stderr);
    const receipt = JSON.parse(result.stdout);
    assert.deepEqual(receipt, { source, records: 72, readonly: true, synthetic: true });
  }
  await assert.rejects(createFixtureSqliteAdapter({ id: 'messages', path: 'relative.sqlite' }), error => error.code === 'explicit_path_required');
  await assert.rejects(createFixtureSqliteAdapter({ id: 'gmail', path: join(directory, 'gmail.sqlite') }), error => error.code === 'not_local_source');
});

test('fixture labels distinguish commitments, opportunities, excluded people and version changes', () => {
  const messages = fixtureRecords('messages', { scenario: { excludedParticipant: true } });
  assert.ok(messages[1].content.includes('I will send Project Atlas proposal by '));
  assert.equal(messages[1].metadata.expectedSignals[0].kind, 'commitment');
  assert.deepEqual(messages[1].participants, ['Excluded Example']);
  const whatsapp = fixtureRecords('whatsapp');
  assert.ok(whatsapp[0].content.includes('Can you introduce me to Project Atlas? Needed by '));
  assert.equal(whatsapp[0].metadata.expectedSignals[0].kind, 'opportunity');
  assert.ok(fixtureRecords('calls').every(record => record.content === null && record.metadata.expectedSignals.length === 0));
});
