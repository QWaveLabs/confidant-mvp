import { mkdirSync, readdirSync, readFileSync, writeFileSync, renameSync, rmSync, lstatSync, existsSync, chmodSync, openSync, fsyncSync, closeSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { renderDashboard } from './report-template.mjs';

export const RUN_STATUSES = Object.freeze(['queued', 'running', 'completed', 'partial', 'failed', 'skipped']);
const terminal = new Set(['completed', 'partial', 'failed', 'skipped']);
const modes = ['synthetic', 'runtime', 'unknown'];
const sections = ['found', 'changed', 'completed', 'recommendations', 'drafts', 'actions', 'errors', 'attention', 'priorities', 'commitments'];
const identifier = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(value);
const credential = /\b(?:sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{15,})\b|-----BEGIN [^\n]*PRIVATE KEY-----|\b(?:password|api[_ -]?key|authorization|access[_ -]?token|token|credential|private[_ -]?key|secret)\s*[:=]\s*\S+/i;
const object = (value, allowed) => {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype || Object.keys(value).some(key => !allowed.includes(key))) throw new Error('Unsupported structured report fields.');
};
const timestamp = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,9})?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value.slice(0, 10)).toISOString().slice(0, 10) !== value.slice(0, 10)) throw new Error('Report timestamp must be valid ISO with a timezone.');
  return new Date(value).toISOString();
};
const deadline = value => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    if (!Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) throw new Error('Invalid date-only deadline.');
    return value;
  }
  return timestamp(value);
};

export function validateReportLink(value, allowedLinkHosts = []) {
  if (typeof value !== 'string' || value.length > 2000 || /[\x00-\x20\\]/.test(value)) throw new Error('Unsupported report link.');
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || !allowedLinkHosts.map(host => host.toLowerCase()).includes(url.hostname.toLowerCase())) throw new Error('Report link host or protocol is not allowed.');
  if (credential.test(value) || /(?:token|key|secret|password|auth|credential|signature)=/i.test(url.search)) throw new Error('Credential-bearing links are forbidden.');
  return url.href;
}

function validator({ allowedLinkHosts, excludedTerms }) {
  const text = (value, maximum = 4000) => {
    if (typeof value !== 'string' || value.length > maximum || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value) || credential.test(value) || excludedTerms.some(term => term && value.toLowerCase().includes(term.toLowerCase()))) throw new Error('Report text is unapproved, private or too long.');
    return value;
  };
  const link = value => { object(value, ['label', 'url']); return { label: text(value.label, 120), url: validateReportLink(value.url, allowedLinkHosts) }; };
  const links = values => { if (!Array.isArray(values) || values.length > 8) throw new Error('Too many report links.'); return values.map(link); };
  const item = value => {
    object(value, ['title', 'detail', 'updatedAt', 'dueAt', 'links', 'requiresApproval', 'status']);
    if (!value.title?.trim()) throw new Error('Report item title required.');
    const result = { title: text(value.title, 250) };
    if (value.detail !== undefined) result.detail = text(value.detail);
    if (value.status !== undefined) result.status = text(value.status, 80);
    if (value.updatedAt !== undefined) result.updatedAt = timestamp(value.updatedAt);
    if (value.dueAt !== undefined) result.dueAt = deadline(value.dueAt);
    if (value.links !== undefined) result.links = links(value.links);
    if (value.requiresApproval !== undefined) { if (typeof value.requiresApproval !== 'boolean') throw new Error('Approval flag must be boolean.'); result.requiresApproval = value.requiresApproval; }
    return result;
  };
  const result = value => {
    object(value, ['summary', ...sections, 'coverage', 'sectionUpdatedAt', 'links']);
    const clean = { summary: value.summary === undefined ? '' : text(value.summary, 1600), sectionUpdatedAt: {}, suppliedSections: Object.keys(value).filter(key => [...sections, 'coverage', 'summary'].includes(key)) };
    for (const key of sections) {
      const values = value[key] ?? [];
      if (!Array.isArray(values) || values.length > (key === 'priorities' ? 3 : 50)) throw new Error('Report section exceeds its bound.');
      clean[key] = values.map(item);
    }
    if (value.links !== undefined) clean.links = links(value.links);
    if (value.sectionUpdatedAt !== undefined) {
      object(value.sectionUpdatedAt, [...sections, 'coverage', 'summary']);
      for (const [key, at] of Object.entries(value.sectionUpdatedAt)) clean.sectionUpdatedAt[key] = timestamp(at);
    }
    const coverage = value.coverage ?? [];
    if (!Array.isArray(coverage) || coverage.length > 40) throw new Error('Coverage section exceeds its bound.');
    clean.coverage = coverage.map(row => {
      object(row, ['source', 'status', 'fetched', 'reviewed', 'incorporated', 'updatedAt', 'oldest', 'newest', 'gaps', 'completeCoverage']);
      if (!['fresh', 'partial', 'stale', 'blocked', 'unknown'].includes(row.status)) throw new Error('Unknown source freshness.');
      const output = { source: text(row.source, 100), status: row.status, completeCoverage: row.completeCoverage === true };
      if (row.completeCoverage !== undefined && typeof row.completeCoverage !== 'boolean') throw new Error('Coverage completion must be boolean.');
      if (output.completeCoverage && row.status !== 'fresh') throw new Error('Nonfresh coverage cannot claim completion.');
      for (const key of ['fetched', 'reviewed', 'incorporated']) {
        const count = row[key] ?? null;
        if (count !== null && (!Number.isSafeInteger(count) || count < 0)) throw new Error('Coverage counts must be nonnegative integers or unknown.');
        output[key] = count;
      }
      for (const key of ['updatedAt', 'oldest', 'newest']) output[key] = row[key] == null ? null : timestamp(row[key]);
      if (!Array.isArray(row.gaps ?? []) || (row.gaps ?? []).length > 20) throw new Error('Too many coverage gaps.');
      output.gaps = (row.gaps ?? []).map(gap => text(gap, 400));
      if (output.completeCoverage && output.gaps.length) throw new Error('Gapped coverage cannot claim completion.');
      return output;
    });
    if (Buffer.byteLength(JSON.stringify(clean)) > 128000) throw new Error('Structured report exceeds the total size bound.');
    return clean;
  };
  const error = value => {
    if (value == null) return null;
    object(value, ['code', 'summary', 'action']);
    return { code: text(value.code ?? 'task_failed', 80), summary: text(value.summary ?? 'Task did not complete.', 500), ...(value.action === undefined ? {} : { action: text(value.action, 500) }) };
  };
  const scheduler = value => {
    if (value == null) return { verified: false };
    object(value, ['verified', 'lastRunAt', 'nextRunAt', 'reference']);
    if (value.verified !== true) { if (Object.keys(value).some(key => key !== 'verified')) throw new Error('Unverified scheduler cannot publish run times.'); return { verified: false }; }
    return { verified: true, ...(value.lastRunAt ? { lastRunAt: timestamp(value.lastRunAt) } : {}), ...(value.nextRunAt ? { nextRunAt: timestamp(value.nextRunAt) } : {}), ...(value.reference ? { reference: link(value.reference) } : {}) };
  };
  return { text, result, error, scheduler };
}

export function createReporter({ directory, now = () => new Date().toISOString(), allowedLinkHosts = [], excludedTerms = [], openPolicy = {}, sessionProbe, opener, lockTimeoutMs = 5000 } = {}) {
  if (typeof directory !== 'string' || !directory || !Array.isArray(allowedLinkHosts) || allowedLinkHosts.some(host => typeof host !== 'string' || !/^[A-Za-z0-9.-]+$/.test(host)) || !Array.isArray(excludedTerms) || excludedTerms.some(term => typeof term !== 'string')) throw new Error('A dedicated report directory and valid privacy policy are required.');
  allowedLinkHosts = allowedLinkHosts.map(host => host.toLowerCase());
  object(openPolicy, ['enabled', 'cooldownMs']);
  if (openPolicy.enabled !== undefined && typeof openPolicy.enabled !== 'boolean') throw new Error('Browser opening must be explicitly configured.');
  const root = resolve(directory); const lock = join(root, '.report-lock');
  const check = validator({ allowedLinkHosts, excludedTerms });
  const clock = () => timestamp(now());
  const cooldownMs = openPolicy.cooldownMs ?? 60000;
  if (!Number.isFinite(cooldownMs) || cooldownMs < 1000 || !Number.isFinite(lockTimeoutMs) || lockTimeoutMs < 100) throw new Error('Invalid reporting policy timing.');
  const assertPath = (path, kind = 'file') => {
    if (!existsSync(path)) return;
    const stat = lstatSync(path);
    if (stat.isSymbolicLink() || (kind === 'directory' ? !stat.isDirectory() : !stat.isFile())) throw new Error('Report paths must not be symlinks or unrelated objects.');
  };
  const atomic = (path, value) => {
    assertPath(path);
    const temporary = `${path}.${randomUUID()}.tmp`;
    try {
      const file = openSync(temporary, 'wx', 0o600);
      try { writeFileSync(file, value); fsyncSync(file); } finally { closeSync(file); }
      renameSync(temporary, path); chmodSync(path, 0o600);
      const parent = openSync(dirname(path), 'r');
      try { fsyncSync(parent); } catch (error) { if (!['EINVAL', 'ENOTSUP'].includes(error.code)) throw error; } finally { closeSync(parent); }
    }
    finally { if (existsSync(temporary)) rmSync(temporary); }
  };
  const json = path => { assertPath(path); return JSON.parse(readFileSync(path, 'utf8')); };
  assertPath(root, 'directory');
  const owner = join(root, '.report-owner.json');
  if (existsSync(root)) {
    const names = readdirSync(root);
    if (names.length && !existsSync(owner)) throw new Error('Report directory must be empty or owned by this reporter.');
    if (existsSync(owner)) { if (json(owner).kind !== 'confidant-reporting-v1') throw new Error('Unrecognized report directory.'); }
    const allowed = new Set(['.report-owner.json', '.report-lock', 'runs', 'archives', 'latest.html', 'metadata.json']);
    // Another locked writer can be between creating and renaming an atomic file.
    // Recognize only its exact root artifact pattern; never read or remove it here.
    const writing = existsSync(lock);
    const transient = name => writing && /^(?:latest\.html|metadata\.json)\.[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.tmp$/.test(name);
    if (names.some(name => !allowed.has(name) && !transient(name))) throw new Error('Unowned file in report directory.');
    for (const name of names.filter(transient)) assertPath(join(root, name));
    for (const name of ['runs', 'archives', '.report-lock']) assertPath(join(root, name), 'directory');
    for (const name of ['latest.html', 'metadata.json']) assertPath(join(root, name));
  } else mkdirSync(root, { recursive: true, mode: 0o700 });
  chmodSync(root, 0o700);
  // Exclusive creation is safe when two first-run processes arrive together.
  if (!existsSync(owner)) { try { writeFileSync(owner, JSON.stringify({ kind: 'confidant-reporting-v1' }), { flag: 'wx', mode: 0o600 }); } catch (error) { if (error.code !== 'EEXIST') throw error; } }
  for (const name of ['runs', 'archives']) { assertPath(join(root, name), 'directory'); mkdirSync(join(root, name), { recursive: true, mode: 0o700 }); chmodSync(join(root, name), 0o700); }
  const withLock = async fn => {
    const begin = Date.now();
    for (;;) {
      try { mkdirSync(lock, { mode: 0o700 }); writeFileSync(join(lock, 'owner.json'), JSON.stringify({ pid: process.pid, acquiredAt: clock() }), { mode: 0o600, flag: 'wx' }); break; }
      catch (error) { if (error.code !== 'EEXIST') throw error; assertPath(lock, 'directory'); if (Date.now() - begin > lockTimeoutMs) throw new Error('Report lock unavailable; inspect a crashed writer before recovery.'); await new Promise(done => setTimeout(done, 15)); }
    }
    try { return await fn(); } finally { rmSync(lock, { recursive: true }); }
  };
  const runPath = id => { if (!identifier(id)) throw new Error('Invalid report run identity.'); return join(root, 'runs', `${id}.json`); };
  const metadataPath = join(root, 'metadata.json');
  const metadata = () => {
    const value = existsSync(metadataPath) ? json(metadataPath) : { nextSequence: 1, lastBrowserAttempt: null };
    object(value, ['nextSequence', 'lastBrowserAttempt']);
    if (!Number.isSafeInteger(value.nextSequence) || value.nextSequence < 1) throw new Error('Invalid report sequence metadata.');
    if (value.lastBrowserAttempt !== null) timestamp(value.lastBrowserAttempt);
    return value;
  };
  const archivePath = run => `archives/${run.queuedAt.replace(/[:.]/g, '-')}_${run.runId}.html`;
  const readRun = (path, { privacyCheck = true } = {}) => {
    const run = json(path);
    object(run, ['schema', 'runId', 'taskId', 'taskName', 'sequence', 'status', 'mode', 'queuedAt', 'startedAt', 'finishedAt', 'updatedAt', 'scheduler', 'result', 'error', 'archive', 'browser', 'durationMs']);
    if (run.schema !== 1 || !identifier(run.runId) || path !== runPath(run.runId) || !identifier(run.taskId) || !Number.isSafeInteger(run.sequence) || run.sequence < 1 || !RUN_STATUSES.includes(run.status) || !modes.includes(run.mode)) throw new Error('Unowned or invalid report record.');
    timestamp(run.queuedAt); timestamp(run.updatedAt);
    for (const key of ['startedAt', 'finishedAt']) if (run[key] !== null) timestamp(run[key]);
    if (privacyCheck) { check.text(run.taskName, 160); check.scheduler(run.scheduler); check.error(run.error); }
    if (run.archive !== archivePath(run)) throw new Error('Unowned report archive path.');
    if (run.result !== null) {
      const { suppliedSections, ...body } = run.result;
      if (!Array.isArray(suppliedSections) || suppliedSections.some(key => ![...sections, 'coverage', 'summary'].includes(key))) throw new Error('Invalid stored report sections.');
      if (privacyCheck) { const normalized = check.result(body); normalized.suppliedSections = suppliedSections; run.result = normalized; }
    }
    object(run.browser, ['status', 'reason', 'at', 'reused']);
    if (!['opened', 'skipped', 'failed'].includes(run.browser.status)) throw new Error('Invalid stored browser receipt.');
    if (privacyCheck && run.browser.reason !== undefined) check.text(run.browser.reason, 400);
    timestamp(run.browser.at);
    if (run.durationMs !== undefined && run.durationMs !== null && (!Number.isFinite(run.durationMs) || run.durationMs < 0)) throw new Error('Invalid stored runtime.');
    return run;
  };
  const ownedRuns = ({ forPurge = false } = {}) => {
    const names = readdirSync(join(root, 'runs'));
    if (names.some(name => !/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}\.json$/.test(name))) throw new Error('Unowned file in report runs.');
    return names.map(name => readRun(join(root, 'runs', name), { privacyCheck: !forPurge }));
  };
  const snapshot = () => {
    const runs = ownedRuns().sort((a, b) => b.sequence - a.sequence);
    const tasks = new Map();
    for (const run of runs) {
      if (!tasks.has(run.taskId)) tasks.set(run.taskId, { taskId: run.taskId, taskName: run.taskName, latestRun: run, latestResult: null, sections: {} });
      if (!tasks.get(run.taskId).latestResult && terminal.has(run.status)) tasks.get(run.taskId).latestResult = run;
      if (terminal.has(run.status)) for (const key of run.result?.suppliedSections ?? []) if (!tasks.get(run.taskId).sections[key]) tasks.get(run.taskId).sections[key] = run;
    }
    const sources = new Map();
    for (const run of runs) for (const row of run.result?.coverage ?? []) {
      const candidate = { ...row, taskName: run.taskName, mode: run.mode, resultAt: run.result.sectionUpdatedAt?.coverage ?? run.finishedAt ?? run.updatedAt, sequence: run.sequence };
      const previous = sources.get(row.source); const at = row.updatedAt ?? candidate.resultAt; const previousAt = previous?.updatedAt ?? previous?.resultAt;
      if (!previous || at > previousAt || (at === previousAt && candidate.sequence > previous.sequence)) sources.set(row.source, candidate);
    }
    return { generatedAt: clock(), tasks: [...tasks.values()], sources: [...sources.values()], history: runs.slice(0, 30), totalRuns: runs.length };
  };
  const render = run => {
    const view = snapshot();
    atomic(join(root, 'latest.html'), renderDashboard(view, { allowedLinkHosts }));
    if (run) atomic(join(root, run.archive), renderDashboard(view, { archive: true, archiveRun: run, allowedLinkHosts }));
    return view;
  };
  const receipt = run => ({ runId: run.runId, taskId: run.taskId, status: run.status, saved: true, dashboardPath: join(root, 'latest.html'), archivePath: join(root, run.archive), browser: run.browser });
  async function startRun(input) {
    object(input, ['taskId', 'taskName', 'runId', 'status', 'mode', 'scheduler']);
    if (!identifier(input.taskId) || !identifier(input.runId ?? 'valid') || !['queued', 'running'].includes(input.status ?? 'running') || !modes.includes(input.mode ?? 'synthetic')) throw new Error('Invalid task/run metadata.');
    const name = check.text(input.taskName ?? input.taskId, 160); const schedule = check.scheduler(input.scheduler);
    return withLock(() => {
      const at = clock(); const id = input.runId ?? randomUUID(); const path = runPath(id);
      if (existsSync(path)) {
        const existing = readRun(path);
        if (existing.taskId !== input.taskId || existing.status !== 'queued' || input.status !== 'running') throw new Error('Existing run cannot be restarted or changed.');
        existing.status = 'running'; existing.startedAt = at; existing.updatedAt = at;
        atomic(path, JSON.stringify(existing)); render(existing); return receipt(existing);
      }
      const meta = metadata(); const run = { schema: 1, runId: id, taskId: input.taskId, taskName: name, sequence: meta.nextSequence++, status: input.status ?? 'running', mode: input.mode ?? 'synthetic', queuedAt: at, startedAt: (input.status ?? 'running') === 'running' ? at : null, finishedAt: null, updatedAt: at, scheduler: schedule, result: null, error: null,
        archive: `archives/${at.replace(/[:.]/g, '-')}_${id}.html`, browser: { status: 'skipped', reason: 'Run has not finalized.', at } };
      atomic(metadataPath, JSON.stringify(meta)); atomic(path, JSON.stringify(run)); render(run); return receipt(run);
    });
  }
  async function browserResult(runId) {
    const at = clock(); const skipped = reason => ({ status: 'skipped', reason, at });
    if (openPolicy.enabled !== true) return skipped('Automatic browser opening is disabled.');
    if (typeof sessionProbe !== 'function' || typeof opener !== 'function') return skipped('No safe session probe and browser opener configured.');
    let session;
    try { session = await sessionProbe(); } catch { return skipped('Session state is unavailable.'); }
    if (!session || session.available !== true) return skipped('No interactive session is available.');
    if (session.locked !== false) return skipped('Session is locked or lock state is unknown; no wake or unlock attempted.');
    if (session.online !== true) return skipped('Session is offline or connectivity is unknown.');
    if (session.browserAvailable !== true) return skipped('No usable default browser is available.');
    const reserved = await withLock(() => {
      if (!existsSync(runPath(runId))) return false;
      const meta = metadata();
      if (meta.lastBrowserAttempt && Date.parse(at) - Date.parse(meta.lastBrowserAttempt) < cooldownMs) return false;
      meta.lastBrowserAttempt = at; atomic(metadataPath, JSON.stringify(meta)); return true;
    });
    if (!reserved) return skipped('Opening suppressed by the stable-page cooldown or report deletion.');
    try {
      const outcome = await opener({ path: join(root, 'latest.html'), reuse: true, wake: false, unlock: false });
      if (outcome?.status === 'opened') return { status: 'opened', reused: outcome.reused === true, at: clock() };
      if (outcome?.status === 'skipped') return skipped('Browser adapter skipped opening the saved report.');
      return { status: 'failed', reason: 'Browser adapter did not confirm opening.', at: clock() };
    } catch { return { status: 'failed', reason: 'Browser opening failed; the report is still saved.', at: clock() }; }
  }
  async function finalizeRun(input) {
    object(input, ['runId', 'status', 'result', 'error']);
    if (!identifier(input.runId) || !terminal.has(input.status)) throw new Error('A valid terminal status and existing run ID are required.');
    let result, error, rejected = false;
    try { result = check.result(input.result ?? {}); error = check.error(input.error); }
    catch { rejected = true; result = check.result({}); error = { code: 'invalid_report', summary: 'Unapproved or invalid structured reporting input was refused.', action: 'Provide bounded approved summaries, never raw records, excluded text or credentials.' }; }
    const first = await withLock(() => {
      const path = runPath(input.runId); if (!existsSync(path)) throw new Error('Run is missing or was purged; it cannot be recreated.');
      const run = readRun(path); if (terminal.has(run.status)) throw new Error('A finalized run cannot be finalized again.');
      const at = clock(); Object.assign(run, { status: rejected ? 'failed' : input.status, result, error, finishedAt: at, updatedAt: at, durationMs: run.startedAt ? Math.max(0, Date.parse(at) - Date.parse(run.startedAt)) : null, browser: { status: 'skipped', reason: 'Browser opening has not been attempted.', at } });
      atomic(path, JSON.stringify(run)); render(run); return run;
    });
    const browser = await browserResult(first.runId);
    return withLock(() => {
      const path = runPath(first.runId);
      if (!existsSync(path)) return { runId: first.runId, taskId: first.taskId, status: first.status, saved: false, purged: true, browser: { status: 'skipped', reason: 'Report was purged during finalization.', at: clock() } };
      const run = readRun(path); run.browser = browser; atomic(path, JSON.stringify(run)); render(run); return { ...receipt(run), validationRejected: rejected };
    });
  }
  async function dashboard() { return withLock(() => { const view = render(); return { ...view, dashboardPath: join(root, 'latest.html') }; }); }
  async function purgeReports() {
    return withLock(() => {
      let removed = 0;
      const runs = ownedRuns({ forPurge: true }); const ownedArchives = new Set(runs.map(run => run.archive.slice('archives/'.length)));
      if (readdirSync(join(root, 'archives')).some(name => !ownedArchives.has(name))) throw new Error('Unowned file in report archives.');
      for (const name of ['runs', 'archives']) for (const file of readdirSync(join(root, name))) {
        const path = join(root, name, file); assertPath(path); rmSync(path); removed++;
      }
      for (const name of ['latest.html', 'metadata.json']) { const path = join(root, name); if (existsSync(path)) { assertPath(path); rmSync(path); removed++; } }
      return { purged: true, removed, externalCopies: 'Browser history, already displayed tabs, moved copies and backups require separate removal.' };
    });
  }
  return { startRun, finalizeRun, dashboard, purgeReports, directory: root };
}
