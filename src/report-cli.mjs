import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync, lstatSync, chmodSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createReporter } from './reporting.mjs';
import { createMacBrowserAdapter } from './browser.mjs';
import { BrainStore } from './store.mjs';
import { defaultBrainDirectory } from './runtime.mjs';

const root = fileURLToPath(new URL('..', import.meta.url)); const command = process.argv[2] ?? 'help'; const args = process.argv.slice(3);
const option = (key, fallback) => { const i = args.indexOf(key); return i < 0 ? fallback : args[i + 1]; };
const directory = resolve(option('--reports', resolve(root, '.confidant/reports')));
const configPath = resolve(directory, '..', '.reporting-config.json');
const output = value => console.log(JSON.stringify(value, null, 2));
function input(path) { const text = readFileSync(resolve(path), 'utf8'); if (Buffer.byteLength(text) > 128000) throw new Error('Report input exceeds its bound.'); return JSON.parse(text); }
function config() {
  if (!existsSync(configPath)) return { openAfterRun: true };
  if (lstatSync(configPath).isSymbolicLink()) throw new Error('Reporting configuration must not be a symlink.');
  const value = input(configPath);
  if (value.identity !== 'confidant-reporting-config-v1' || typeof value.openAfterRun !== 'boolean') throw new Error('Unrecognized reporting configuration.');
  return value;
}
function reporter() {
  const browser = createMacBrowserAdapter(); const cfg = config();
  let excludedTerms = [];
  const coreFlags = args.includes('--') ? args.slice(args.indexOf('--') + 1) : args;
  const dataIndex = coreFlags.indexOf('--data'); const assisted = coreFlags.includes('--assisted-local');
  const data = resolve(dataIndex >= 0 ? coreFlags[dataIndex + 1] : assisted ? defaultBrainDirectory() : resolve(root, '.confidant/evaluation'));
  if (existsSync(join(data, 'brain.sqlite'))) {
    const store = new BrainStore(data, { mode: assisted ? 'assisted-local' : 'synthetic' });
    try { const policy = store.get('profile', {}).exclusions ?? {}; excludedTerms = [...(policy.people ?? []), ...(policy.chats ?? []), ...(policy.topics ?? []), ...Object.values(policy.peopleAliases ?? {}).flat()]; store.set('reportDirectory', directory); }
    finally { store.close(); }
  }
  return createReporter({ directory, excludedTerms, allowedLinkHosts: ['github.com', 'chatgpt.com', 'chat.openai.com', 'app.fathom.video', 'fathom.video', 'app.fireflies.ai'],
    openPolicy: { enabled: args.includes('--no-open') ? false : cfg.openAfterRun }, ...browser });
}
export function technicalResult(value, { operation = 'operation', at = new Date().toISOString() } = {}) {
  const health = value?.reconciliation ?? value;
  const sources = Array.isArray(health?.sources) ? health.sources : Array.isArray(value?.coverage) ? value.coverage : null;
  const result = { summary: `${operation} returned a local runtime result. Process outcome and source coverage are separate.`, completed: [{ title: 'Local operation finished', detail: 'No notification or outbound message is implied.', updatedAt: at }] };
  if (sources) result.coverage = sources.map(source => {
    const counts = source.counts ?? {}; const pending = counts.processing?.pending ?? source.pending ?? null; const incorporated = counts.processing?.classified ?? null;
    const lastRefresh = source.lastRefresh ?? null; const failure = source.failedStep || source.disabled;
    return { source: source.id ?? source.source, status: failure ? 'blocked' : !source.connected ? 'unknown' : lastRefresh && Date.now() - Date.parse(lastRefresh) > 6 * 3600000 ? 'stale' : source.complete ? 'fresh' : 'partial',
      fetched: counts.coverage ? (counts.coverage.committed ?? 0) + (counts.coverage.excluded ?? 0) : null,
      reviewed: incorporated, incorporated, updatedAt: lastRefresh, oldest: source.oldest ?? null, newest: source.newest ?? null, completeCoverage: source.complete === true,
      gaps: [...(source.gaps ?? []).map(gap => typeof gap === 'string' ? gap : gap.reason ?? gap.code), ...(pending ? [`${pending} fetched records still await review and incorporation.`] : []), ...(failure ? ['Source disabled or blocked; safe retry requires review.'] : [])].slice(0, 20) };
  });
  if (value?.processed !== undefined) result.changed = [{ title: `${value.processed} record classifications committed`, detail: `${value.facts ?? 0} validated facts saved. Other history may still be pending.`, updatedAt: at }];
  if (value?.changed !== undefined) result.changed = [{ title: `${value.changed} source records committed`, detail: `${value.excluded ?? 0} items excluded on this page. Classification is a separate step.`, updatedAt: at }];
  if (value?.state === 'failed' || value?.state?.startsWith('blocked')) result.attention = [{ title: 'Source operation needs review', detail: value.failure?.reason ?? 'Bounded retries stopped. Check source health before retrying.', updatedAt: at }];
  return result;
}
async function main() {
  if (command === 'help') return output({ commands: ['start', 'finish', 'run', 'generate', 'open', 'config', 'demo', 'purge'], defaultReports: directory,
    examples: ['npm run report -- run --task source-health -- health', 'npm run report -- generate --no-open', 'npm run report -- config --open off'], privacy: 'Structured approved summaries only. No raw records, excerpts, credentials or excluded data.' });
  if (command === 'config') {
    const state = option('--open'); if (!['on', 'off'].includes(state)) throw new Error('Choose --open on or off.'); config();
    mkdirSync(dirname(configPath), { recursive: true, mode: 0o700 }); const temp = configPath + '.' + randomUUID();
    writeFileSync(temp, JSON.stringify({ identity: 'confidant-reporting-config-v1', openAfterRun: state === 'on' }) + '\n', { mode: 0o600 }); renameSync(temp, configPath); chmodSync(configPath, 0o600);
    return output({ openAfterRun: state === 'on', saved: true });
  }
  const r = reporter();
  if (command === 'start') return output(await r.startRun({ taskId: option('--task', 'manual'), taskName: option('--name', option('--task', 'Manual task')), mode: option('--mode', 'unknown'), status: option('--status', 'running'), ...(option('--scheduler') ? { scheduler: input(option('--scheduler')) } : {}) }));
  if (command === 'finish') return output(await r.finalizeRun({ runId: option('--run'), status: option('--status', 'completed'), ...(option('--file') ? input(option('--file')) : { result: { summary: 'No structured result supplied.' } }) }));
  if (command === 'generate') { const view = await r.dashboard(); return output({ saved: true, dashboardPath: view.dashboardPath, tasks: view.tasks.length, runs: view.history.length, browser: { status: 'skipped', reason: 'Generate only; use open or a finalized run to request opening.' } }); }
  if (command === 'purge') { if (!args.includes('--confirm-report-delete')) throw new Error('Confirm deletion of owned report history.'); return output(await r.purgeReports()); }
  if (command === 'open') {
    const view = await r.dashboard(); const run = await r.startRun({ taskId: 'report-view', taskName: 'Open saved dashboard', mode: 'runtime' });
    return output(await r.finalizeRun({ runId: run.runId, status: 'completed', result: { summary: 'Saved dashboard opening requested; the browser receipt below is the result.' } }));
  }
  if (command === 'run') {
    const separator = args.indexOf('--'); const flags = separator < 0 ? [] : args.slice(separator + 1);
    const operation = flags[0];
    if (!['setup', 'health', 'import', 'plugin-page', 'commit-batch', 'brief', 'pause', 'unpause', 'retry', 'disable', 'enable'].includes(operation)) throw new Error('Choose a bounded supported core operation after the argument separator.');
    const started = await r.startRun({ taskId: option('--task', operation), taskName: option('--name', option('--task', operation)), mode: flags.includes('--assisted-local') ? 'runtime' : 'synthetic' });
    let stdout = ''; let stderr = ''; let overflow = false;
    const code = await new Promise(resolveExit => {
      const child = spawn(process.execPath, ['--experimental-sqlite', resolve(root, 'src/cli.mjs'), ...flags], { stdio: ['ignore', 'pipe', 'pipe'] });
      const collect = (which, chunk) => { if (Buffer.byteLength(stdout) + Buffer.byteLength(stderr) + chunk.length > 2_000_000) { overflow = true; child.kill('SIGTERM'); return; } if (which === 'out') stdout += chunk; else stderr += chunk; };
      child.stdout.on('data', chunk => collect('out', chunk)); child.stderr.on('data', chunk => collect('err', chunk)); child.on('error', () => resolveExit(1)); child.on('close', code => resolveExit(code));
    });
    let value; try { value = JSON.parse(stdout); } catch { value = null; }
    const failed = code !== 0 || overflow || !value; const state = value?.state;
    const status = failed || state === 'failed' || state?.startsWith('blocked') ? 'failed' : ['paused', 'already exhausted'].includes(state) || state?.startsWith('cancelled') ? 'skipped' : value?.sources?.some(source => !source.complete) || value?.coverage?.some(source => !source.complete) || state === 'committed' && value.exhausted === false ? 'partial' : 'completed';
    const receipt = await r.finalizeRun({ runId: started.runId, status, ...(failed ? { error: { code: 'local_operation_failed', summary: 'Local operation failed. Private command output was not copied into the dashboard.', action: 'Inspect local source health or permissions and retry from the saved checkpoint.' } } : { result: technicalResult(value, { operation }) }) });
    output(receipt); if (status === 'failed') process.exitCode = 1;
    return;
  }
  if (command === 'demo') {
    for (const status of ['completed', 'partial', 'failed', 'skipped']) {
      const start = await r.startRun({ taskId: `demo-${status}`, taskName: `Fictional ${status} example`, mode: 'synthetic' });
      await r.finalizeRun({ runId: start.runId, status, result: { summary: `Fictional ${status} result. No customer sources were accessed.`, attention: status === 'partial' ? [{ title: 'Fictional provider history remains blocked', detail: 'This is a fixture, not a live connector failure.' }] : [], ...(status === 'completed' ? { priorities: [{ title: 'Review the fictional Atlas proposal', detail: 'Recommendation only; nothing was sent.' }], commitments: [{ title: 'Fictional date-only commitment', dueAt: '2026-10-01' }], found: [{ title: 'Demo source result', detail: 'Synthetic data explicitly labeled; runtime save and duration are real.' }], actions: [{ title: 'Saved local demonstration report' }] } : {}) }, ...(status === 'failed' ? { error: { code: 'fictional_permission_denied', summary: 'Fictional source permission denied.', action: 'Demonstration only; no permission change is needed.' } } : {}) });
    }
    const starts = await Promise.all(['a', 'b'].map(key => r.startRun({ taskId: `demo-overlap-${key}`, taskName: `Fictional overlapping task ${key}`, mode: 'synthetic' })));
    await Promise.all(starts.map(start => r.finalizeRun({ runId: start.runId, status: 'completed', result: { summary: 'Overlapping demonstration checkpoint saved; every task retained.' } })));
    const view = await r.dashboard(); return output({ saved: true, dashboardPath: view.dashboardPath, tasks: view.tasks.length, mode: 'synthetic content, actual persistence' });
  }
  throw new Error('Unknown reporting command.');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(() => { console.error('Reporting operation failed. Check dedicated storage and bounded approved input; private input was not logged.'); process.exitCode = 1; });
