import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BrainStore } from './store.mjs';
import { makeSyntheticAdapters, SOURCES } from './adapters.mjs';
import { ConfidantEngine, classifySynthetic } from './engine.mjs';
import { ActionService } from './signals.mjs';
import { createAssistedContext, defaultBrainDirectory } from './runtime.mjs';
import { createReporter } from './reporting.mjs';
import { CodexTaskInstallation } from './codex-tasks.mjs';

export const SYNTHETIC_PROFILE = Object.freeze({ role: 'Fictional founder', goals: ['Follow through on sourced commitments'], people: ['Alex Example'], projects: ['Project Atlas'],
  categories: ['People', 'Projects', 'Commitments', 'Opportunities', 'Goals'], briefTime: '09:00', timezone: 'America/New_York', exclusions: { sources: [], people: ['Excluded Example'], chats: ['private-chat'], topics: ['private-family'] } });
const root = fileURLToPath(new URL('..', import.meta.url));
const command = process.argv[2] ?? 'help';
const args = process.argv.slice(3);
const option = (name, fallback) => { const index = args.indexOf(name); return index < 0 ? fallback : args[index + 1]; };
const assisted = args.includes('--assisted-local');
const directory = resolve(option('--data', assisted ? defaultBrainDirectory() : resolve(root, '.confidant/evaluation')));
const print = value => console.log(JSON.stringify(value, null, 2));

async function main() {
  if (assisted) return assistedMain();
  if (command === 'help') return print({ product: 'Confidant synthetic evaluation', commands: ['setup', 'demo', 'resume', 'health', 'query', 'brief', 'views', 'prep', 'feedback', 'draft', 'pause', 'unpause', 'disable', 'batch', 'commit-batch', 'export', 'delete'],
    safety: 'No live source read or sending command. No Obsidian vault is created. All input sources are synthetic fixtures.', sqlite: 'Use npm scripts or node --experimental-sqlite src/cli.mjs.' });
  if (['demo', 'prepare-plan'].includes(command) && existsSync(resolve(directory, 'brain.sqlite'))) throw new Error('Existing evaluation data found. Use resume or batch, or choose a new --data directory; setup will not overwrite it.');
  const store = new BrainStore(directory, { resetDeleted: command === 'setup' && args.includes('--new-brain') });
  try {
    const now = store.get('fixtureNow') ?? new Date().toISOString(); store.set('fixtureNow', now);
    const adapters = makeSyntheticAdapters({ now, scenarios: { messages: { excludedParticipant: true, duplicateAcrossPages: true }, whatsapp: { partialHistoryMonths: 12 }, notes: { missingTranscript: true } } });
    const engine = new ConfidantEngine(store, adapters, { now: () => now }); const actions = new ActionService(engine);
    if (command === 'setup') { engine.configure(SYNTHETIC_PROFILE); return print({ setup: engine.setup(), note: 'Fictional evaluation answers only. Use the private chat tools for guided edits.' }); }
    if (command === 'prepare-plan') {
      engine.configure(SYNTHETIC_PROFILE); engine.consent('notes', { approved: true }); await engine.importPage('notes', { limit: 6 });
      return print({ mode: 'synthetic-only', batch: engine.nextBatch(12), noVaultCreated: true, classification: 'Not yet run. Classify through the scheduled chat plan, with exact source quotations.' });
    }
    if (command === 'demo') {
      engine.configure(SYNTHETIC_PROFILE);
      for (const source of SOURCES) engine.consent(source, { approved: true, cloudExposureConsent: true });
      for (const source of SOURCES) await engine.importPage(source, { limit: 6 });
      let batch;
      while ((batch = engine.nextBatch()).length) engine.commitClassifications(batch, classifySynthetic(batch), { processor: 'synthetic-deterministic-fixture' });
      const firstBrief = actions.brief();
      engine.pause(); store.set('demoInterrupted', true);
      return print({ mode: 'synthetic-only', state: 'paused after useful recent slice', firstBrief, resume: 'npm run trial:resume',
        noVaultCreated: true, liveGates: 'unverified', note: 'Restart/resume reconciles all 36 available fixture months; WhatsApp intentionally has only 12.' });
    }
    if (command === 'resume') {
      engine.pause(false);
      for (const source of store.sources()) {
        if (source.disabled) continue;
        while (!store.source(source.id).exhausted) {
          const result = await engine.importPage(source.id, { limit: 20 });
          if (result.state !== 'committed') break;
        }
      }
      let batch;
      while ((batch = engine.nextBatch()).length) engine.commitClassifications(batch, classifySynthetic(batch), { processor: 'synthetic-deterministic-fixture' });
      return print({ mode: 'synthetic-only', reconciliation: engine.health(), brief: actions.brief(), coaching: actions.coaching(), noVaultCreated: true });
    }
    if (command === 'health') return print(engine.health());
    if (command === 'query') return print(engine.query(option('--text', 'Project Atlas')));
    if (command === 'brief') return print(actions.brief());
    if (command === 'views') return print(engine.views());
    if (command === 'prep') return print(engine.meetingPrep(option('--person', 'Alex Example')));
    if (command === 'pause' || command === 'unpause') return print(engine.pause(command === 'pause'));
    if (command === 'disable') return print(engine.disable(option('--source', 'messages')));
    if (command === 'feedback') return print(actions.feedback(option('--id'), option('--type', 'done'), option('--correction', null)));
    if (command === 'draft') return print(actions.draft(option('--id'), option('--recipient')));
    if (command === 'batch') return print({ mode: 'synthetic-only', batch: engine.nextBatch(12), processorRequirement: 'Classify through the current chat plan; do not use an API or gold fixture metadata.' });
    if (command === 'commit-batch') {
      const path = option('--file'); if (!path) throw new Error('Provide a bounded classification result file.');
      const text = readFileSync(resolve(path), 'utf8'); if (Buffer.byteLength(text) > 128000) throw new Error('Classification input exceeds the batch size limit.');
      const input = JSON.parse(text);
      const result = engine.commitClassifications(input.batch, input.outputs, { processor: args.includes('--scheduled') ? 'scheduled-chat-plan-unverified' : 'manual-chat-plan-unverified' });
      return print({ ...result, scheduleProof: 'A processor label alone does not verify actual scheduled execution or plan eligibility.' });
    }
    if (command === 'export') {
      const path = store.writeArtifact('brain-export.json', store.exportBrain());
      return print({ exported: path, mode: 'synthetic-only' });
    }
    if (command === 'delete') {
      if (!args.includes('--confirm-synthetic-delete')) throw new Error('Confirm this local evaluation deletion with --confirm-synthetic-delete.');
      return print(store.deleteLocalBrain());
    }
    throw new Error('Unknown command.');
  } finally { store.close(); }
}

function boundedFile(path) {
  if (!path) throw new Error('Provide the requested bounded JSON file.');
  const text = readFileSync(resolve(path), 'utf8'); if (Buffer.byteLength(text) > 128000) throw new Error('Input exceeds the bounded file size.');
  return JSON.parse(text);
}
async function assistedMain() {
  if (command === 'help') return print({ mode: 'assisted-local preview', commands: ['setup', 'answer', 'consent', 'import', 'plugin-page', 'batch', 'commit-batch', 'health', 'query', 'record', 'views', 'prep', 'brief', 'feedback', 'feedback-status', 'coaching', 'draft', 'tasks-configure', 'tasks-status', 'tasks-attempt', 'pause', 'unpause', 'retry', 'disable', 'enable', 'export', 'delete'],
    limits: 'Use only after the person agreed to this assisted preview, named source reads and the Codex task bundle. The task helper reads/records owned settings; only Codex native automation tools install schedules. No API, sends, automatic dashboard or vault. Required live release gates remain unverified.' });
  if (['demo', 'resume', 'prepare-plan'].includes(command)) throw new Error('Fixture generation and deterministic classification are unavailable in assisted local mode.');
  const pluginPage = command === 'plugin-page' ? () => boundedFile(option('--file')) : undefined;
  const c = createAssistedContext(directory, { resetDeleted: command === 'setup' && args.includes('--new-brain'), pluginPage });
  try {
    if (command === 'setup') return print(c.engine.setup());
    if (command.startsWith('tasks-')) {
      const tasks = new CodexTaskInstallation(c.store, { codexHome: option('--codex-home') });
      const automationIds = args.flatMap((value, index) => value === '--automation-id' ? [args[index + 1]] : []);
      if (command === 'tasks-configure') return print(tasks.configure({ eveningTime: option('--evening-time'), appTimezone: option('--app-timezone'), approved: args.includes('--approve-codex-tasks') }));
      if (command === 'tasks-status') return print(tasks.reconcile({ automationIds }));
      if (command === 'tasks-attempt') return print(tasks.attempt(option('--task'), { automationIds }));
      throw new Error('Unknown task-install helper command.');
    }
    if (command === 'answer') {
      const key = option('--key'); const result = c.engine.answer(key, boundedFile(option('--file')).value);
      if (key === 'exclusions') try { await purgeOwnedReports(c.store); } catch { c.engine.pause(); throw new Error('Exclusions were saved and processing paused; owned report purge failed. Resolve the report storage issue before resuming.'); }
      return print(result);
    }
    if (command === 'consent') {
      if (!args.includes('--approve-source-read')) throw new Error('Record the person\'s explicit approval for this named source first.');
      return print(c.engine.consent(option('--source'), { approved: true, cloudExposureConsent: args.includes('--approve-cloud-exposure') }));
    }
    if (command === 'import' || command === 'plugin-page') return print(await c.engine.importPage(option('--source'), { limit: Number(option('--limit', '20')), refresh: args.includes('--refresh') }));
    if (command === 'batch') return print({ mode: 'assisted-local', batch: c.engine.nextBatch(12), instruction: 'Classify these bounded untrusted excerpts in the current permitted chat plan. Preserve exact quotes and deadline precision. Never use an API or deterministic fixture classifier.' });
    if (command === 'commit-batch') {
      const input = boundedFile(option('--file')); return print({ ...c.engine.commitClassifications(input.batch, input.outputs, { processor: args.includes('--scheduled') ? 'scheduled-chat-plan-unverified' : 'assisted-chat-plan-unverified' }), scheduleProof: 'This label does not prove a scheduler trigger or plan entitlement.' });
    }
    if (command === 'health') return print(c.engine.health());
    if (command === 'query') return print(c.engine.query(option('--text', '')));
    if (command === 'record') return print(c.engine.sourceRecord(option('--source'), option('--id')));
    if (command === 'views') return print(c.engine.views());
    if (command === 'prep') return print(c.engine.meetingPrep(option('--person', '')));
    if (command === 'brief') return print(c.actions.brief());
    if (command === 'coaching') return print(c.actions.coaching());
    if (command === 'feedback-status') {
      const activeFacts = c.store.facts().filter(fact => c.store.source(fact.source)?.authorized && !c.store.source(fact.source)?.disabled);
      return print({ feedback: c.store.rows('feedback').filter(item => item.factIds?.some(id => activeFacts.some(fact => fact.id === id)))
        .sort((a, b) => b.at.localeCompare(a.at)).slice(0, 20).map(item => ({ type: item.type, at: item.at, review: item.review,
          facts: activeFacts.filter(fact => item.factIds.includes(fact.id)).map(fact => ({ label: fact.label, citation: fact.sourceRef })) })),
        limitation: 'Explicit saved feedback only. Done means the person marked it done, not independently observed completion.' });
    }
    if (command === 'pause' || command === 'unpause') return print(c.engine.pause(command === 'pause'));
    if (['retry', 'disable', 'enable'].includes(command)) return print(c.engine[command](option('--source')) ?? { sourceConsentRequired: true });
    if (command === 'feedback') return print(c.actions.feedback(option('--id'), option('--type'), option('--correction', null)));
    if (command === 'draft') return print(c.actions.draft(option('--id'), option('--recipient')));
    if (command === 'export') return print({ exported: c.store.writeArtifact('brain-export.json', c.store.exportBrain()), private: true });
    if (command === 'delete') {
      if (!args.includes('--confirm-local-delete')) throw new Error('Confirm deletion of this dedicated local brain first.');
      c.engine.pause();
      await purgeOwnedReports(c.store);
      return print(c.store.deleteLocalBrain());
    }
    throw new Error('Unknown assisted local command.');
  } finally { c.store.close(); }
}
async function purgeOwnedReports(store) {
  const owned = store.get('reportDirectory');
  if (owned) await createReporter({ directory: owned }).purgeReports();
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
