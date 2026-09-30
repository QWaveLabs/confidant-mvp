import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { BrainStore } from '../src/store.mjs';
import { ConfidantEngine } from '../src/engine.mjs';
import { CodexTaskInstallation, parseNativeAutomation } from '../src/codex-tasks.mjs';
import { ActionService } from '../src/signals.mjs';

const profile = { role: 'Fictional operator', goals: ['Review sourced promises'], people: [], projects: [], categories: ['People', 'Projects', 'Commitments', 'Opportunities', 'Goals'], briefTime: '08:30', timezone: 'America/New_York', exclusions: { sources: [], people: [], chats: [], topics: [] } };
function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'confidant-native-test-')); const brain = join(directory, 'brain'); const codexHome = join(directory, 'codex');
  let store = new BrainStore(brain, { mode: 'assisted-local' }); const engine = new ConfidantEngine(store, {}, { mode: 'assisted-local' }); engine.configure(profile);
  const installer = () => new CodexTaskInstallation(store, { codexHome });
  t.after(() => { store.close(); rmSync(directory, { recursive: true, force: true }); });
  return { directory, brain, codexHome, get store() { return store; }, engine, installer,
    reopen() { store.close(); store = new BrainStore(brain, { mode: 'assisted-local' }); return installer(); } };
}
const configure = installer => installer.configure({ eveningTime: '17:45', appTimezone: profile.timezone, approved: true });
function nativeText(args, id, { target = 'fictional-install-chat', status = args.status, policy = args.notificationPolicy, prompt = args.prompt } = {}) {
  const values = { version: 1, id, kind: args.kind, name: args.name, prompt, status, rrule: args.rrule, target_thread_id: target };
  if (policy !== null && policy !== undefined) values.notification_policy = policy;
  return Object.entries(values).map(([key, value]) => `${key} = ${JSON.stringify(value)}`).join('\n') + '\n';
}
function writeNative(f, args, overrides = {}, id = args.id ?? args.name.toLowerCase().replaceAll(' ', '-')) {
  const folder = join(f.codexHome, 'automations', id); mkdirSync(folder, { recursive: true });
  const path = join(folder, 'automation.toml'); writeFileSync(path, nativeText(args, id, overrides)); return { id, path };
}
function installAll(f) {
  configure(f.installer()); const receipts = [];
  for (const taskId of ['morning-brief', 'evening-review', 'source-refresh']) {
    const attempt = f.installer().attempt(taskId); receipts.push(writeNative(f, attempt.toolArgs)); const observed = f.installer().reconcile();
    if (observed.tasks.find(task => task.taskId === taskId).stagedPaused) { const activation = f.installer().attempt(taskId); writeNative(f, activation.toolArgs); f.installer().reconcile(); }
  }
  return receipts;
}

test('task configuration requires completed assisted setup, agreement and observed client timezone, without native writes', t => {
  const f = fixture(t); const installer = f.installer();
  assert.throws(() => installer.configure({ eveningTime: '17:00', appTimezone: profile.timezone }), /agreement/);
  assert.throws(() => installer.configure({ eveningTime: '17:00', appTimezone: 'UTC', approved: true }), /timezone/);
  assert.throws(() => installer.configure({ eveningTime: '08:30', appTimezone: profile.timezone, approved: true }), /distinct/);
  assert.equal(f.store.get('codexTasks'), null);
  const plan = configure(installer); assert.equal(plan.installed, false); assert.equal(plan.dailyTasks, 2); assert.equal(plan.backgroundTasks, 1);
  assert.ok(plan.tasks.every(task => task.action === 'create' && task.toolArgs.kind === 'heartbeat'));
  assert.equal(plan.tasks[2].toolArgs.status, 'PAUSED');
  assert.match(plan.instruction, /tasks-attempt/);
  assert.ok(!readdirSync(f.directory).includes('codex'));
});

test('actual saved fixture settings give configuration receipts, resume IDs, preserve unrelated tasks and never assert runtime proof', t => {
  const f = fixture(t); const unrelated = join(f.codexHome, 'automations', 'unrelated-other-task'); mkdirSync(unrelated, { recursive: true });
  const otherPath = join(unrelated, 'automation.toml'); writeFileSync(otherPath, 'Fictional unrelated settings must stay unread and unchanged.');
  const receipts = installAll(f); const result = f.reopen().reconcile();
  assert.equal(result.installed, true); assert.equal(result.active, true); assert.equal(result.runVerified, false); assert.equal(result.nextRunVerified, false);
  assert.deepEqual(result.tasks.map(task => task.automationId), receipts.map(receipt => receipt.id));
  assert.ok(result.tasks.every(task => task.action === 'reuse' && !task.toolArgs));
  assert.equal(result.tasks[2].rule, 'FREQ=HOURLY;INTERVAL=3');
  assert.equal(readFileSync(otherPath, 'utf8'), 'Fictional unrelated settings must stay unread and unchanged.');
  assert.equal(f.store.get('codexTasks').observations['source-refresh'].notificationPolicy, 'failed_runs_only');
});

test('interrupted first installation blocks further creation until the original chat target is observed', t => {
  const f = fixture(t); configure(f.installer()); const first = f.installer().attempt('morning-brief');
  const resumed = f.reopen(); const partial = resumed.reconcile();
  assert.equal(partial.tasks[0].action, 'blocked'); assert.equal(partial.tasks[1].action, 'blocked');
  assert.throws(() => resumed.attempt('morning-brief'), /No safe/);
  writeNative(f, first.toolArgs);
  const confirmed = resumed.reconcile(); assert.equal(confirmed.tasks[0].action, 'reuse');
  assert.equal(confirmed.tasks[1].action, 'create'); assert.equal(confirmed.tasks[1].toolArgs.targetThreadId, 'fictional-install-chat');
});

test('reconfiguration atomically retains a pending attempt recorded by another installer', t => {
  const f = fixture(t); configure(f.installer());
  const secondStore = new BrainStore(f.brain, { mode: 'assisted-local' });
  try {
    const originalTransaction = secondStore.transaction.bind(secondStore); let interleaved = false;
    secondStore.transaction = callback => {
      if (!interleaved) { interleaved = true; f.installer().attempt('morning-brief'); }
      return originalTransaction(callback);
    };
    const second = new CodexTaskInstallation(secondStore, { codexHome: f.codexHome }); const result = configure(second);
    assert.equal(result.tasks[0].action, 'blocked'); assert.ok(secondStore.get('codexTasks').attempts['morning-brief']);
    assert.throws(() => second.attempt('morning-brief'), /No safe/);
  } finally { secondStore.close(); }
});

test('saved pauses survive authorized timing updates while manual setting drift stays blocked', t => {
  const f = fixture(t); const receipts = installAll(f);
  const actual = parseNativeAutomation(readFileSync(receipts[0].path, 'utf8'));
  writeNative(f, actual, { status: 'PAUSED' }, actual.id);
  assert.equal(f.installer().reconcile().tasks[0].action, 'keep-paused');
  f.engine.answer('briefTime', '08:45'); configure(f.installer());
  const update = f.installer().attempt('morning-brief'); assert.equal(update.toolArgs.mode, 'update'); assert.equal(update.toolArgs.status, 'PAUSED'); assert.equal(update.toolArgs.targetThreadId, actual.targetThreadId);
  writeNative(f, update.toolArgs); assert.equal(f.installer().reconcile().tasks[0].action, 'keep-paused');
  const evening = parseNativeAutomation(readFileSync(receipts[1].path, 'utf8'));
  writeNative(f, { ...evening, rrule: 'FREQ=DAILY;BYHOUR=20;BYMINUTE=0' }, {}, evening.id);
  assert.equal(f.installer().reconcile().tasks[1].action, 'blocked');
});

test('duplicate owned roles, chat-target conflicts, missing saved IDs and ownership removal cannot cause replacement', t => {
  const f = fixture(t); const receipts = installAll(f);
  const morning = parseNativeAutomation(readFileSync(receipts[0].path, 'utf8'));
  const duplicate = writeNative(f, morning, {}, 'confidant-mvp-morning-brief-2');
  assert.equal(f.installer().reconcile().tasks[0].action, 'blocked'); rmSync(join(f.codexHome, 'automations', duplicate.id), { recursive: true });
  writeNative(f, morning, { target: 'other-fictional-chat' }, morning.id);
  assert.ok(f.installer().reconcile().tasks.every(task => task.action === 'blocked'));
  writeNative(f, morning, { prompt: 'A manual edit removed ownership.' }, morning.id);
  assert.equal(f.installer().reconcile().state, 'native settings unavailable or unsafe');
  writeNative(f, morning, {}, morning.id); rmSync(join(f.codexHome, 'automations', morning.id), { recursive: true });
  assert.equal(f.installer().reconcile().tasks[0].action, 'blocked');
});

test('a saved background task without the requested quiet policy stays partial and allows only one observed repair attempt', t => {
  const f = fixture(t); configure(f.installer()); const attempt = f.installer().attempt('source-refresh');
  assert.equal(attempt.toolArgs.status, 'PAUSED');
  const saved = writeNative(f, attempt.toolArgs, { policy: null });
  const partial = f.installer().reconcile(); assert.equal(partial.tasks[2].settingsVerified, false); assert.equal(partial.tasks[2].action, 'update');
  const update = f.installer().attempt('source-refresh'); assert.equal(update.toolArgs.id, saved.id); assert.equal(update.toolArgs.notificationPolicy, 'failed_runs_only');
  assert.equal(f.installer().reconcile().tasks[2].action, 'blocked');
  assert.equal(update.toolArgs.status, 'PAUSED');
  writeNative(f, update.toolArgs); const observed = f.installer().reconcile(); assert.equal(observed.tasks[2].stagedPaused, true); assert.equal(observed.installed, false);
  const activation = f.installer().attempt('source-refresh'); assert.equal(activation.toolArgs.status, 'ACTIVE');
  assert.equal(f.installer().reconcile().tasks[2].action, 'blocked'); // Unknown activation never counts as successful.
  writeNative(f, activation.toolArgs); assert.equal(f.installer().reconcile().tasks[2].action, 'reuse');
});

test('a manually paused verified background task remains paused after initial safe activation', t => {
  const f = fixture(t); const receipts = installAll(f); const background = parseNativeAutomation(readFileSync(receipts[2].path, 'utf8'));
  writeNative(f, background, { status: 'PAUSED' }, background.id);
  const observed = f.installer().reconcile(); assert.equal(observed.tasks[2].action, 'keep-paused'); assert.equal(observed.tasks[2].toolArgs, undefined);
});

test('native inventory refuses unsafe owned files and malformed settings without writing them', t => {
  const f = fixture(t); configure(f.installer()); const first = f.installer().attempt('morning-brief'); const saved = writeNative(f, first.toolArgs);
  const original = readFileSync(saved.path, 'utf8');
  assert.throws(() => parseNativeAutomation(original + 'status = "ACTIVE"\n'), /Duplicate/);
  f.installer().reconcile(); rmSync(saved.path); const target = join(f.directory, 'unrelated-file'); writeFileSync(target, original); symlinkSync(target, saved.path);
  assert.equal(f.installer().reconcile().state, 'native settings unavailable or unsafe'); assert.equal(readFileSync(target, 'utf8'), original);
});

test('external assisted CLI persists pending install state and exposes native tool arguments without reading sources or writing schedules', t => {
  const f = fixture(t); f.store.close(); const cli = fileURLToPath(new URL('../src/cli.mjs', import.meta.url));
  const call = args => spawnSync(process.execPath, ['--experimental-sqlite', cli, ...args, '--assisted-local', '--data', f.brain, '--codex-home', f.codexHome], { encoding: 'utf8', timeout: 15000 });
  const configured = call(['tasks-configure', '--evening-time', '17:45', '--app-timezone', profile.timezone, '--approve-codex-tasks']); assert.equal(configured.status, 0, configured.stderr);
  const attempt = call(['tasks-attempt', '--task', 'morning-brief']); assert.equal(attempt.status, 0, attempt.stderr);
  assert.equal(JSON.parse(attempt.stdout).toolArgs.kind, 'heartbeat');
  const unknown = call(['tasks-status']); assert.equal(unknown.status, 0, unknown.stderr); assert.equal(JSON.parse(unknown.stdout).tasks[0].action, 'blocked');
  const health = call(['health']); assert.deepEqual(JSON.parse(health.stdout).sources, []);
  assert.equal(JSON.parse(call(['feedback-status']).stdout).feedback.length, 0);
  assert.ok(!readdirSync(f.directory).includes('codex'));
});

test('evening feedback is explicitly sourced and failed freshness stays visible despite a recent successful receipt', t => {
  const f = fixture(t); const at = new Date().toISOString();
  f.store.saveSource({ id: 'messages', kind: 'local', authorized: true, connected: true, lastRefresh: at, from: at, to: at, exhausted: false,
    gaps: [], failedStep: null, freshness: { at, completeCoverage: false, lastAttempt: { at, status: 'failed', failure: { code: 'permission_denied' } } } });
  f.store.putRecord({ source: 'messages', id: 'fictional-feedback-record', timestamp: at, direction: 'outbound', participants: ['Example Person'], content: 'I will send the fictional proposal.', sourceRef: 'confidant://source/messages/fictional-feedback-record', metadata: { fixture: false } });
  const batch = f.engine.nextBatch();
  f.engine.commitClassifications(batch, [{ recordKey: batch[0].recordKey, facts: [{ category: 'Commitments', label: 'Send the fictional proposal', quote: 'I will send the fictional proposal.', confidence: 0.95 }] }], { processor: 'synthetic-contract-test' });
  const actions = new ActionService(f.engine); const suggestion = actions.suggestions()[0]; assert.equal(suggestion.fresh, false);
  assert.equal(actions.brief().coverage[0].freshness.lastAttempt.status, 'failed'); actions.feedback(suggestion.id, 'done');
  f.store.close(); const cli = fileURLToPath(new URL('../src/cli.mjs', import.meta.url));
  const call = () => spawnSync(process.execPath, ['--experimental-sqlite', cli, 'feedback-status', '--assisted-local', '--data', f.brain], { encoding: 'utf8', timeout: 15000 });
  const result = call(); assert.equal(result.status, 0, result.stderr); const saved = JSON.parse(result.stdout);
  assert.equal(saved.feedback[0].type, 'done'); assert.equal(saved.feedback[0].facts[0].citation, 'confidant://source/messages/fictional-feedback-record');
  assert.ok(!result.stdout.includes('I will send')); assert.match(saved.limitation, /not independently observed/);
  f.reopen(); f.store.saveSource({ ...f.store.source('messages'), disabled: true, authorized: false }); f.store.close();
  assert.deepEqual(JSON.parse(call().stdout).feedback, []);
});

test('two independent installer attempts cannot both authorize creation of the same native role', async t => {
  const f = fixture(t); configure(f.installer()); f.store.close(); const cli = fileURLToPath(new URL('../src/cli.mjs', import.meta.url));
  const invoke = () => new Promise(resolve => { const child = spawn(process.execPath, ['--experimental-sqlite', cli, 'tasks-attempt', '--task', 'morning-brief', '--assisted-local', '--data', f.brain, '--codex-home', f.codexHome]); let out = ''; let error = ''; child.stdout.on('data', chunk => out += chunk); child.stderr.on('data', chunk => error += chunk); child.on('close', code => resolve({ code, out, error })); });
  const results = await Promise.all([invoke(), invoke()]); assert.deepEqual(results.map(item => item.code).sort(), [0, 1]);
  assert.match(results.find(item => item.code === 1).error, /No safe native task mutation|already awaiting/);
  assert.equal(JSON.parse(results.find(item => item.code === 0).out).pendingNativeObservation, true);
});

test('a new installer connection waits for a bounded existing write before initializing its storage', async t => {
  const f = fixture(t); configure(f.installer()); const cli = fileURLToPath(new URL('../src/cli.mjs', import.meta.url));
  f.store.db.exec('BEGIN IMMEDIATE'); f.store.set('fictionalHeldWrite', true);
  let child; const result = new Promise(resolve => {
    child = spawn(process.execPath, ['--experimental-sqlite', cli, 'tasks-attempt', '--task', 'morning-brief', '--assisted-local', '--data', f.brain, '--codex-home', f.codexHome]);
    let out = ''; let error = ''; child.stdout.on('data', chunk => out += chunk); child.stderr.on('data', chunk => error += chunk);
    child.on('close', code => resolve({ code, out, error }));
  });
  try { await new Promise(resolve => setTimeout(resolve, 300)); }
  finally { f.store.db.exec('COMMIT'); }
  const saved = await result; assert.equal(saved.code, 0, saved.error);
  assert.equal(JSON.parse(saved.out).pendingNativeObservation, true);
  assert.ok(f.store.get('codexTasks').attempts['morning-brief']);
});
