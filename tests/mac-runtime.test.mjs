import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { makeMacAdapters, decodeAttributedBody } from '../src/mac-sources.mjs';
import { createAssistedContext } from '../src/runtime.mjs';
import { BrainStore } from '../src/store.mjs';
import { SYNTHETIC_PROFILE } from '../src/cli.mjs';

const NOW = '2026-09-30T12:00:00.000Z'; const FROM = '2023-09-30T12:00:00.000Z';
const seconds = value => Date.parse(value) / 1000 - 978307200;
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'confidant-mac-contract-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const paths = Object.fromEntries(['messages', 'whatsapp', 'calls', 'notes', 'calendar', 'contacts'].map(id => [id, [join(root, id + '.sqlite')]]));
  for (const [id, [path]] of Object.entries(paths)) {
    const db = new DatabaseSync(path); const s = seconds('2026-09-29T12:00:00.000Z');
    if (id === 'messages') {
      db.exec('CREATE TABLE message(guid TEXT,date INTEGER,is_from_me INTEGER,handle_id INTEGER,text TEXT,attributedBody BLOB,associated_message_type INTEGER,item_type INTEGER,date_retracted INTEGER); CREATE TABLE handle(id TEXT); CREATE TABLE chat(guid TEXT); CREATE TABLE chat_message_join(message_id INTEGER,chat_id INTEGER); CREATE TABLE chat_handle_join(chat_id INTEGER,handle_id INTEGER);');
      db.prepare('INSERT INTO handle VALUES(?)').run('Fictional Excluded'); db.prepare('INSERT INTO handle VALUES(?)').run('Alex Example'); db.exec("INSERT INTO chat VALUES('fictional-group'); INSERT INTO chat_handle_join VALUES(1,1); INSERT INTO chat_handle_join VALUES(1,2);");
      for (let month = 0; month < 36; month++) {
        const date = new Date(NOW); date.setUTCMonth(date.getUTCMonth() - month); date.setUTCDate(20);
        const text = month === 0 ? 'Project Atlas. I will send the proposal by 2026-10-01.' : `Fictional archive month ${month}`;
        db.prepare('INSERT INTO message VALUES(?,?,?,?,?,NULL,0,0,0)').run(`fake-${month}`, Math.round(seconds(date.toISOString()) * 1e9), month % 2, 2, text);
      }
      db.prepare('INSERT INTO message VALUES(?,?,?,?,?,NULL,0,0,0)').run('fake-excluded-group', s * 1e9, 0, 2, 'Never classify the private family topic');
      db.prepare('INSERT INTO chat_message_join VALUES(?,?)').run(37, 1);
    } else if (id === 'whatsapp') {
      db.exec('CREATE TABLE ZWAMESSAGE(Z_PK INTEGER PRIMARY KEY,ZMESSAGEDATE REAL,ZCHATSESSION INTEGER,ZISFROMME INTEGER,ZTEXT TEXT,ZFROMJID TEXT,ZSTANZAID TEXT,ZMESSAGETYPE INTEGER); CREATE TABLE ZWACHATSESSION(Z_PK INTEGER PRIMARY KEY,ZCONTACTJID TEXT,ZPARTNERNAME TEXT,ZSESSIONTYPE INTEGER);');
      db.exec("INSERT INTO ZWACHATSESSION VALUES(1,'15555550100@s.whatsapp.net','Alex Example',0)");
      db.prepare('INSERT INTO ZWAMESSAGE VALUES(1,?,1,0,?,?,?,0)').run(s, 'Fictional WhatsApp question about Project Atlas', '15555550100@s.whatsapp.net', 'fake-wa');
    } else if (id === 'calls') {
      db.exec('CREATE TABLE ZCALLRECORD(Z_PK INTEGER PRIMARY KEY,ZDATE REAL,ZADDRESS BLOB,ZORIGINATED INTEGER,ZNAME TEXT,ZDURATION REAL,ZCALLTYPE INTEGER,ZANSWERED INTEGER,ZUNIQUE_ID TEXT);');
      db.prepare('INSERT INTO ZCALLRECORD VALUES(1,?,?,1,?,90,16,1,?)').run(s, Buffer.from('+15555550100'), 'Alex Example', 'fake-call');
    } else if (id === 'notes') {
      db.exec('CREATE TABLE ZICCLOUDSYNCINGOBJECT(Z_PK INTEGER PRIMARY KEY,ZIDENTIFIER TEXT,ZFOLDER INTEGER,ZTITLE2 TEXT,ZTYPEUTI TEXT,ZCREATIONDATE1 REAL,ZTITLE1 TEXT,ZNOTE INTEGER,ZADDITIONALINDEXABLETEXT TEXT,ZMARKEDFORDELETION INTEGER);');
      db.exec("INSERT INTO ZICCLOUDSYNCINGOBJECT VALUES(1,'fake-folder',NULL,'Call Recordings',NULL,NULL,NULL,NULL,NULL,0)");
      db.prepare('INSERT INTO ZICCLOUDSYNCINGOBJECT VALUES(2,?,1,NULL,NULL,?,?,NULL,NULL,0)').run('fake-note', s, 'Call with Alex Example');
      db.exec("INSERT INTO ZICCLOUDSYNCINGOBJECT VALUES(3,'fake-attachment',NULL,NULL,'com.apple.m4a-audio',NULL,NULL,2,'Project Atlas. Speaker unknown.',0)");
      db.prepare('INSERT INTO ZICCLOUDSYNCINGOBJECT VALUES(4,?,1,NULL,NULL,?,?,NULL,NULL,0)').run('fake-no-transcript', s - 86400, 'Call without transcript');
    } else if (id === 'calendar') {
      db.exec('CREATE TABLE CalendarItem(start_date REAL,summary TEXT,description TEXT,UUID TEXT,all_day INTEGER,start_tz TEXT,has_recurrences INTEGER); CREATE TABLE Participant(owner_id INTEGER,email TEXT);');
      db.prepare('INSERT INTO CalendarItem VALUES(?,?,?,?,0,?,0)').run(s, 'Fictional Atlas meeting', 'Review the proposal', 'fake-event', 'UTC');
      db.prepare('INSERT INTO CalendarItem VALUES(?,?,?,?,1,?,0)').run(s, 'All day unsupported', '', 'fake-allday', 'UTC');
      db.exec("INSERT INTO Participant VALUES(1,'alex@example.invalid')");
    } else {
      db.exec('CREATE TABLE ZABCDRECORD(Z_PK INTEGER PRIMARY KEY,ZMODIFICATIONDATE REAL,ZFIRSTNAME TEXT,ZLASTNAME TEXT,ZUNIQUEID TEXT); CREATE TABLE ZABCDEMAILADDRESS(ZOWNER INTEGER,ZADDRESS TEXT);');
      db.prepare('INSERT INTO ZABCDRECORD VALUES(1,?,?,?,?)').run(s, 'Alex', 'Example', 'fake-contact');
      db.exec("INSERT INTO ZABCDEMAILADDRESS VALUES(1,'alex@example.invalid')");
    }
    db.close();
  }
  return { root, paths };
}

test('read-only real-schema adapter seams require approval, preserve source databases, and keep content gaps visible', async t => {
  const { paths } = fixture(t); let approved = false;
  const adapters = makeMacAdapters({ paths, authorized: () => approved });
  await assert.rejects(adapters.messages.readPage({ from: FROM, to: NOW }), /approval/); approved = true;
  for (const [id, adapter] of Object.entries(adapters)) {
    const before = readFileSync(paths[id][0]); const page = await adapter.readPage({ from: FROM, to: NOW, limit: 10 });
    assert.deepEqual(readFileSync(paths[id][0]), before); assert.ok(page.items.length); assert.ok(page.items.every(item => item.metadata.fixture === false));
    assert.ok(page.items.every(item => item.sourceRef.startsWith('confidant://source/')));
    if (id === 'calls') assert.equal(page.items[0].content, null);
    if (id === 'notes') { assert.equal(page.items[0].metadata.appleTranscriptSupplied, true); assert.equal(page.items[1].content, null); assert.equal(page.items[0].metadata.speakerIdentity, 'unknown'); }
    if (id === 'calendar') { assert.equal(page.items.length, 1); assert.ok(page.gaps.some(gap => gap.code === 'unsupported_rows')); }
  }
  const body = Buffer.concat([Buffer.from('NSString'), Buffer.from([0x2b, 5]), Buffer.from('Hello')]); assert.equal(decodeAttributedBody(body), 'Hello');
  assert.equal(decodeAttributedBody(Buffer.from('bad')), null);
});

test('assisted-mode full setup resumes interrupted 36-month Mac-shaped synthetic history, filters group participants, validates model checkpoints and blocks cloud', async t => {
  const { root, paths } = fixture(t); const directory = join(root, 'brain');
  let c = createAssistedContext(directory, { paths, now: () => NOW }); t.after(() => c.store.close());
  assert.equal(c.engine.setup().nextQuestion, 'role'); c.engine.answer('role', 'Fictional schema-test founder'); c.store.close();
  c = createAssistedContext(directory, { paths, now: () => NOW }); assert.equal(c.engine.setup().nextQuestion, 'goals');
  c.engine.configure({ ...SYNTHETIC_PROFILE, exclusions: { sources: [], people: ['Fictional Excluded'], peopleAliases: { 'Fictional Excluded': ['+15555559999'] }, chats: [], topics: ['private family'] } });
  for (const id of Object.keys(paths)) c.engine.consent(id, { approved: true });
  await assert.rejects(c.engine.importPage('messages', { limit: 5, interruptBeforeCommit: true }), /interruption/);
  assert.equal(c.store.source('messages').cursor, null); assert.equal(c.store.records().length, 0);
  assert.equal((await c.engine.importPage('messages', { limit: 5 })).state, 'committed'); c.engine.pause(); c.store.close();
  c = createAssistedContext(directory, { paths, now: () => NOW }); assert.equal(c.engine.health().paused, true); c.engine.pause(false);
  for (const id of Object.keys(paths)) while (!c.store.source(id).exhausted) assert.equal((await c.engine.importPage(id, { limit: 7 })).state, 'committed');
  assert.equal(c.store.counts('messages').coverage.committed, 36); assert.equal(c.store.counts('messages').coverage.excluded, 1);
  assert.equal(c.engine.query('Never classify').unknown, true); assert.ok(!JSON.stringify(c.engine.nextBatch()).includes('private family'));
  const batch = c.engine.nextBatch(); const outputs = batch.map(item => ({ recordKey: item.recordKey, facts: [] }));
  assert.throws(() => c.engine.commitClassifications(batch, outputs, { interruptBeforeCommit: true }), /interruption/);
  assert.equal(c.engine.commitClassifications(batch, outputs, { processor: 'schema-test-empty-not-AI' }).processed, batch.length);
  assert.throws(() => new BrainStore(directory), /selected mode/);
  c.engine.consent('gmail', { approved: true, cloudExposureConsent: true }); assert.equal((await c.engine.importPage('gmail')).state, 'failed'); assert.equal(c.store.source('gmail').connected, false);
  assert.equal(c.engine.health().readyForCustomerData, false);
  c.engine.disable('messages'); await assert.rejects(c.engine.importPage('messages'), /not enabled/);
  c.engine.answer('exclusions', { sources: ['contacts'], people: [], chats: [], topics: [] });
  assert.equal(c.store.source('contacts').authorized, false); assert.equal(c.store.source('contacts').disabled, true);
  await assert.rejects(c.engine.importPage('contacts', { refresh: true }), /not enabled/);
});

test('changed source timestamps invalidate a saved page rather than silently skipping records', async t => {
  const { paths } = fixture(t); const adapter = makeMacAdapters({ paths, authorized: () => true }).messages;
  const first = await adapter.readPage({ from: FROM, to: NOW, limit: 1 }); assert.equal(first.exhausted, false);
  const db = new DatabaseSync(paths.messages[0]); db.prepare('UPDATE message SET date=? WHERE guid=?').run(seconds('2026-09-29T23:00:00.000Z') * 1e9, 'fake-20'); db.close();
  await assert.rejects(adapter.readPage({ from: FROM, to: NOW, limit: 1, cursor: first.nextCursor }), error => error.code === 'stale_cursor');
  const reset = await adapter.readPage({ from: FROM, to: NOW, limit: 100 }); assert.equal(reset.items.length, 37); assert.equal(reset.exhausted, true);
});

test('new unresolved named exclusions revoke source reads, purge uncertain data and require safe aliases plus fresh consent', async t => {
  const { root, paths } = fixture(t); const c = createAssistedContext(join(root, 'privacy-brain'), { paths, now: () => NOW }); t.after(() => c.store.close());
  c.engine.configure({ ...SYNTHETIC_PROFILE, exclusions: { people: [], sources: [], topics: [], chats: [] } }); c.engine.consent('messages', { approved: true }); await c.engine.importPage('messages', { limit: 3 });
  assert.ok(c.store.records().length);
  c.engine.answer('exclusions', { people: ['Unknown Excluded Person'], sources: [], topics: [], chats: [] });
  assert.equal(c.store.source('messages').authorized, false); assert.equal(c.store.source('messages').disabled, true); assert.equal(c.store.records().length, 0);
  await assert.rejects(c.engine.importPage('messages', { refresh: true }), /not enabled/);
  assert.throws(() => c.engine.consent('whatsapp', { approved: true }), /aliases/);
  c.engine.answer('exclusions', { people: ['Unknown Excluded Person'], peopleAliases: { 'Unknown Excluded Person': ['+15555559999'] }, sources: [], topics: [], chats: [] });
  c.engine.enable('messages'); c.engine.consent('messages', { approved: true }); assert.equal((await c.engine.importPage('messages', { refresh: true })).state, 'committed');
  c.engine.answer('exclusions', { people: ['Private contact'], peopleAliases: { 'Private contact': ['+1 (555) 555-0100'] }, sources: [], topics: [], chats: [] });
  c.engine.consent('calls', { approved: true }); await c.engine.importPage('calls'); assert.equal(c.store.counts('calls').coverage.excluded, 1);
  c.engine.consent('whatsapp', { approved: true }); await c.engine.importPage('whatsapp'); assert.equal(c.store.counts('whatsapp').coverage.excluded, 1);
});

test('assisted external CLI setup is resumable, rejects fixture execution and never reads sources on setup', t => {
  const directory = mkdtempSync(join(tmpdir(), 'confidant-assisted-cli-')); t.after(() => rmSync(directory, { recursive: true, force: true }));
  const cli = fileURLToPath(new URL('../src/cli.mjs', import.meta.url));
  const run = (command, flags = []) => spawnSync(process.execPath, ['--experimental-sqlite', cli, command, '--assisted-local', '--data', join(directory, 'brain'), ...flags], { encoding: 'utf8', env: {}, timeout: 10000 });
  assert.equal(JSON.parse(run('setup').stdout).nextQuestion, 'role');
  const input = join(directory, 'answer.json'); writeFileSync(input, JSON.stringify({ value: 'Fictional test only' }));
  assert.equal(JSON.parse(run('answer', ['--key', 'role', '--file', input]).stdout).nextQuestion, 'goals');
  assert.equal(JSON.parse(run('health').stdout).sources.length, 0);
  assert.equal(run('demo').status, 1); assert.equal(run('import', ['--source', 'messages']).status, 1);
  assert.match(run('plugin-page', ['--source', 'gmail', '--file', '/not/a/consented/file.json']).stderr, /not enabled/);
});
