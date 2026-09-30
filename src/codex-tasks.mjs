// Native automation settings are read-only here. Only Codex's automation tool writes them.
import { existsSync, lstatSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { hash } from './store.mjs';
import { scheduleProposals } from './schedules.mjs';

const taskIds = ['morning-brief', 'evening-review', 'source-refresh'];
const safeId = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,199}$/.test(value) && !value.includes('..');
const normalizeRule = rule => typeof rule === 'string' ? rule.replace(/^RRULE:/, '').split(';').filter(Boolean).sort().join(';') : null;
const fingerprint = automation => hash({ kind: automation.kind, name: automation.name, prompt: automation.prompt, rrule: normalizeRule(automation.rrule), notificationPolicy: automation.notificationPolicy ?? null });

export function parseNativeAutomation(text) {
  if (Buffer.byteLength(text) > 128000 || text.includes('\0')) throw new Error('Native task settings are oversized or invalid.');
  const wanted = new Set(['id', 'kind', 'name', 'prompt', 'status', 'rrule', 'target_thread_id', 'notification_policy', 'notificationPolicy']);
  const values = {}; const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^([A-Za-z_]+)\s*=\s*(.*)$/); if (!match || !wanted.has(match[1])) continue;
    if (Object.hasOwn(values, match[1])) throw new Error('Duplicate native task settings.');
    let value = match[2];
    if (value.startsWith('"""')) {
      value = value.slice(3); if (value === '') value = '';
      while (!value.includes('"""') && i + 1 < lines.length) value += '\n' + lines[++i];
      const end = value.indexOf('"""'); if (end < 0 || value.slice(end + 3).trim()) throw new Error('Unsupported native task string.');
      // App-written triple strings are accepted only without TOML escape ambiguity.
      const body = value.slice(0, end); if (body.includes('\\')) throw new Error('Unsupported escaped multiline native task string.');
      values[match[1]] = body.replace(/^\n/, '');
    } else { try { values[match[1]] = JSON.parse(value); } catch { throw new Error('Unsupported native task settings format.'); } }
  }
  const notificationPolicy = values.notification_policy ?? values.notificationPolicy ?? null;
  if (!safeId(values.id) || values.kind !== 'heartbeat' || !['ACTIVE', 'PAUSED'].includes(values.status)
    || typeof values.name !== 'string' || typeof values.prompt !== 'string' || typeof values.rrule !== 'string'
    || !safeId(values.target_thread_id) || ![null, 'failed_runs_only'].includes(notificationPolicy)) throw new Error('Unsupported or incomplete native heartbeat settings.');
  return { id: values.id, kind: values.kind, name: values.name, prompt: values.prompt, status: values.status,
    rrule: values.rrule, targetThreadId: values.target_thread_id, notificationPolicy };
}

export class CodexTaskInstallation {
  constructor(store, { codexHome = process.env.CODEX_HOME || join(homedir(), '.codex'), now = () => new Date().toISOString() } = {}) {
    if (store.get('mode') !== 'assisted-local') throw new Error('Task installation is available only for an approved assisted-local brain.');
    this.store = store; this.codexHome = resolve(codexHome); this.now = now;
  }
  configure({ eveningTime, appTimezone, approved = false }) {
    this.store.transaction(() => {
      const profile = this.store.get('profile', {});
      if (['role', 'goals', 'people', 'projects', 'categories', 'briefTime', 'timezone', 'exclusions'].some(key => profile[key] === undefined)) throw new Error('Finish setup before installing Codex tasks.');
      if (!approved) throw new Error('The setup agreement must authorize installing the two daily tasks and quiet background refresh.');
      if (appTimezone !== profile.timezone) throw new Error('Chosen timezone must match the observed Codex client timezone; do not silently change Mac or task timing.');
      const previous = this.store.get('codexTasks', {});
      const config = { ...previous, installationId: previous.installationId ?? randomUUID(), morningTime: profile.briefTime, eveningTime,
        timezone: profile.timezone, appTimezone, approved: true, configuredAt: this.now(), observations: previous.observations ?? {}, attempts: previous.attempts ?? {}, activationPending: previous.activationPending ?? {} };
      scheduleProposals({ brain: this.store.directory, ...config }); // Validate before mutating.
      this.store.set('codexTasks', config);
    });
    return this.reconcile();
  }
  config() {
    const config = this.store.get('codexTasks');
    if (!config?.approved) throw new Error('Configure the approved Codex task bundle first.');
    const profile = this.store.get('profile', {});
    if (profile.briefTime !== config.morningTime || profile.timezone !== config.timezone) throw new Error('Daily time or timezone changed; obtain approval and configure the bundle again.');
    return config;
  }
  inventory(config, extraIds = []) {
    if (extraIds.some(id => !safeId(id))) throw new Error('Invalid native automation ID.');
    const directory = join(this.codexHome, 'automations');
    if (!existsSync(directory)) return { tasks: [], available: true };
    if (lstatSync(directory).isSymbolicLink()) throw new Error('Native automation inventory symlinks require review.');
    const ownedIds = new Set([...extraIds, ...Object.values(config.observations).map(item => item.automationId).filter(Boolean)]);
    const marker = `Confidant MVP installation ${config.installationId}.`;
    const candidates = readdirSync(directory).filter(name => safeId(name) && (ownedIds.has(name) || /^confidant-mvp-(morning-brief|evening-review|background-refresh)(-[a-z0-9-]+)?$/.test(name)));
    if (candidates.length > 30) throw new Error('Too many candidate Confidant tasks; inspect owned IDs before continuing.');
    const tasks = [];
    for (const id of candidates) {
      const folder = join(directory, id); const path = join(folder, 'automation.toml');
      if (lstatSync(folder).isSymbolicLink() || !existsSync(path) || lstatSync(path).isSymbolicLink() || lstatSync(path).size > 128000) throw new Error('Unsafe or incomplete candidate native task settings.');
      const task = parseNativeAutomation(readFileSync(path, 'utf8'));
      if (task.id !== id) throw new Error('Native task ID does not match its settings directory.');
      if (task.prompt.startsWith(marker)) tasks.push(task);
      else if (ownedIds.has(id)) throw new Error('Previously owned task no longer has this installation identity; preserve it and request review.');
    }
    return { tasks, available: true };
  }
  reconcile({ automationIds = [] } = {}) {
    return this.store.transaction(() => this.reconcileLocked({ automationIds }));
  }
  reconcileLocked({ automationIds = [] } = {}) {
    const config = this.config(); const expected = scheduleProposals({ brain: this.store.directory, ...config });
    let inventory;
    try { inventory = this.inventory(config, automationIds); }
    catch { return { installed: false, state: 'native settings unavailable or unsafe', helperCreatedSchedules: false, tasks: taskIds.map(taskId => ({ taskId, action: 'blocked', reason: 'Native settings could not be safely inspected. No task may be recreated or overwritten.' })), runVerified: false, nextRunVerified: false }; }
    const targets = [...new Set(inventory.tasks.map(task => task.targetThreadId))];
    const targetConflict = targets.length > 1 || (config.targetThreadId && targets.some(id => id !== config.targetThreadId));
    const knownTarget = config.targetThreadId ?? (targets.length === 1 ? targets[0] : null);
    const unboundAttempt = !knownTarget && Object.values(config.attempts).length > 0;
    const observedAt = this.now();
    const tasks = expected.map(spec => {
      const matches = inventory.tasks.filter(task => task.prompt.includes(`Task ID ${spec.taskId}.`));
      const prior = config.observations[spec.taskId]; const attempt = config.attempts[spec.taskId];
      if (targetConflict || matches.length > 1) return { taskId: spec.taskId, action: 'blocked', reason: 'Owned task duplicates or chat-target conflict; preserve them and resolve the precise conflict.' };
      if (!matches.length) return { taskId: spec.taskId, name: spec.name, audience: spec.audience,
        action: attempt || prior || unboundAttempt ? 'blocked' : 'create', reason: attempt || prior || unboundAttempt ? 'Prior installation outcome or original chat target is unresolved. Inspect before any creation.' : 'No owned task observed.',
        ...(attempt || prior || unboundAttempt ? {} : { toolArgs: { ...spec.createArgs, ...(knownTarget ? { targetThreadId: knownTarget } : {}) } }), settingsVerified: false };
      const actual = matches[0]; const actualFingerprint = fingerprint(actual); const desiredFingerprint = fingerprint(spec.createArgs);
      const verified = actualFingerprint === desiredFingerprint;
      const drift = prior?.acceptedFingerprint && actualFingerprint !== prior.acceptedFingerprint && !verified;
      const stagedActivation = spec.taskId === 'source-refresh' && config.activationPending?.[spec.taskId] === true;
      const needsActivation = stagedActivation && actual.status === 'PAUSED' && verified;
      config.observations[spec.taskId] = { automationId: actual.id, status: actual.status, name: actual.name, rrule: actual.rrule,
        notificationPolicy: actual.notificationPolicy, targetThreadId: actual.targetThreadId, observedAt, settingsVerified: verified,
        acceptedFingerprint: verified ? actualFingerprint : prior?.acceptedFingerprint ?? null, observedFingerprint: actualFingerprint };
      if ((verified && (!needsActivation || !attempt?.activating)) || attempt?.operation === 'create') delete config.attempts[spec.taskId];
      if (verified && actual.status === 'ACTIVE' && stagedActivation) delete config.activationPending[spec.taskId];
      const unresolvedUpdate = (!verified || needsActivation) && attempt?.operation === 'update' && (!verified || attempt.activating);
      const safeUpdateStatus = spec.taskId === 'source-refresh' && !verified ? 'PAUSED' : needsActivation ? 'ACTIVE' : actual.status;
      return { taskId: spec.taskId, name: actual.name, audience: spec.audience, automationId: actual.id, status: actual.status,
        rule: actual.rrule, timezone: config.timezone, settingsVerified: verified, runVerified: false, nextRunVerified: false,
        stagedPaused: needsActivation, action: drift || unresolvedUpdate ? 'blocked' : needsActivation ? 'update' : verified ? actual.status === 'PAUSED' ? 'keep-paused' : 'reuse' : 'update',
        ...(drift || unresolvedUpdate ? { reason: 'Saved task differs from accepted settings or an update has not been observed; preserve edits and resolve explicitly.' }
          : !verified || needsActivation ? { toolArgs: { ...spec.createArgs, mode: 'update', id: actual.id, status: safeUpdateStatus, targetThreadId: actual.targetThreadId } } : {}) };
    });
    if (!targetConflict && targets.length === 1) config.targetThreadId = targets[0];
    config.lastInspectedAt = observedAt;
    this.store.set('codexTasks', config);
    return { installed: tasks.every(task => task.settingsVerified && !['update', 'blocked'].includes(task.action)), active: tasks.every(task => task.settingsVerified && task.status === 'ACTIVE'),
      dailyTasks: 2, backgroundTasks: 1, tool: 'mcp__codex_app__automation_update', tasks,
      targetThreadId: config.targetThreadId ?? null, helperCreatedSchedules: false, runVerified: false, nextRunVerified: false,
      timezoneEvidence: 'Chosen timezone matches client context; native saved rules contain no independently verified next-run timezone.',
      instruction: 'Before any native create/update, Codex must run tasks-attempt for that role to atomically record the attempt, call the native tool with its returned arguments, then inspect again. Background starts PAUSED until quiet policy verification and guarded activation. This CLI never writes scheduler settings.' };
  }
  attempt(taskId, { automationIds = [] } = {}) {
    if (!taskIds.includes(taskId)) throw new Error('Unknown Confidant task role.');
    return this.store.transaction(() => {
      const plan = this.reconcileLocked({ automationIds }); const task = plan.tasks.find(item => item.taskId === taskId);
      if (!['create', 'update'].includes(task.action)) throw new Error('No safe native task mutation is pending for this role.');
      const config = this.config();
      if (config.attempts[taskId]) throw new Error('A native task mutation is already awaiting observation.');
      if (taskId === 'source-refresh' && task.action === 'create') { config.activationPending[taskId] = true; task.toolArgs.status = 'PAUSED'; }
      config.attempts[taskId] = { operation: task.action, activating: task.stagedPaused === true, at: this.now() };
      this.store.set('codexTasks', config);
      return { taskId, tool: plan.tool, toolArgs: task.toolArgs, pendingNativeObservation: true, installed: false };
    });
  }
}
