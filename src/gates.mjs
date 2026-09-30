import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The ticket map is the contract. A completed synthetic test never lifts a live gate.
export const dependencies = Object.freeze({
  '01': [], '02': ['01'], '03': ['02'], '04': ['01', '02'], '05': ['01'],
  '06': ['03', '04'], '07': ['06'], '08': ['07'], '09': ['07'], '10': ['07'],
  '11': ['07', '10'], '12': ['05', '07'], '13': ['05', '07'], '14': ['05', '07'],
  '15': ['05', '07'], '16': ['06'], '17': ['16'], '18': ['17'], '19': ['17'],
  '20': ['17'], '21': ['17'], '22': ['07'], '23': ['03', '07'],
  '24': Array.from({ length: 16 }, (_, i) => String(i + 8).padStart(2, '0')),
});
export const providers = Object.freeze({ '12': 'gmail', '13': 'outlook', '14': 'fathom', '15': 'fireflies' });
export const ticketIds = Object.freeze(Array.from({ length: 24 }, (_, i) => String(i + 1).padStart(2, '0')));
const gateRequirements = Object.freeze({
  '01': ['dotLocalInvocation', 'scheduledLocalInvocation', 'visibleChatGPTNotification', 'offlineUnavailable'],
  '04': ['scheduledPlanOnlyClassification', 'interrupted36MonthResume', 'validatedCitations', 'visiblePlanLimits'],
});
const scheduledTaskRequirements = ['scheduledTaskLocalInvocation', 'visibleScheduledTaskNotification', 'offlineUnavailable'];
const providerRequirements = Object.freeze([
  'dotAccess', 'historicalEnumeration', 'pagination', 'stableIdentifiers', 'verifiedDateRange', 'privacyBoundary',
]);

function verifiedGate(evidence, requirements) {
  if (!evidence || evidence.status !== 'pass' || evidence.mode !== 'live-pilot' || evidence.consent !== true) return false;
  if (typeof evidence.observedAt !== 'string' || !Number.isFinite(Date.parse(evidence.observedAt))) return false;
  if (evidence.reviewedByOperator !== true) return false;
  return requirements.every(name => evidence.checks?.[name]?.passed === true
    && typeof evidence.checks[name].artifact === 'string' && evidence.checks[name].artifact.trim().length > 0);
}

export function evaluate(tickets, evidence = {}) {
  const verified = {
    '01': verifiedGate(evidence['01'], evidence['01']?.surface === 'scheduled-task' ? scheduledTaskRequirements : gateRequirements['01']),
    '04': verifiedGate(evidence['04'], gateRequirements['04']),
  };
  const providerPasses = Object.fromEntries(Object.values(providers).map(name => [
    name, verifiedGate(evidence['05']?.[name], evidence['05']?.[name]?.surface === 'scheduled-task' ? providerRequirements.map(check => check === 'dotAccess' ? 'pluginAccess' : check) : providerRequirements),
  ]));
  const completed = new Set();
  const invalidCompletions = [];
  const blocked = [];
  const frontier = [];
  for (const id of ticketIds) {
    const ticket = tickets.find(item => item.id === id);
    const unmet = dependencies[id].filter(parent => !completed.has(parent)
      && !(parent === '05' && providers[id] && providerPasses[providers[id]] && verified['01']));
    if (id !== '01' && !verified['01']) unmet.push('01 live integration gate');
    if (dependencies[id].includes('04') && !verified['04']) unmet.push('04 live plan gate');
    if (providers[id] && !providerPasses[providers[id]]) unmet.push(`05 ${providers[id]} live history gate`);
    const ownGatePassed = id === '01' || id === '04' ? verified[id]
      : id === '05' ? Object.values(providerPasses).every(Boolean) : true;
    if (!ticket) unmet.push('ticket missing');
    if (ticket?.status === 'complete' && (!ownGatePassed || unmet.length > 0)) invalidCompletions.push(id);
    if (ticket?.status === 'complete' && ownGatePassed && unmet.length === 0) completed.add(id);
    else if (unmet.length > 0) blocked.push({ id, reasons: [...new Set(unmet)] });
    else frontier.push(id);
  }
  return {
    ready: completed.size === 24 && verified['01'] && verified['04'] && Object.values(providerPasses).every(Boolean),
    completed: [...completed], frontier, blocked, invalidCompletions,
    liveGates: { ...verified, providers: providerPasses },
    warning: 'Evidence is an operator-reviewed receipt, not automatic proof. Do not store customer content or credentials in this report.',
  };
}

export function readTickets(root) {
  const directory = resolve(root, '.scratch/confidant-mvp/issues');
  return readdirSync(directory).filter(name => /^\d{2}-.+\.md$/.test(name)).sort().map(name => {
    const text = readFileSync(resolve(directory, name), 'utf8');
    const status = text.match(/\*\*Status:\*\* (.+)/)?.[1]?.trim();
    if (!status) throw new Error(`Missing status: ${name}`);
    return { id: name.slice(0, 2), title: text.match(/^# (.+)/m)?.[1], status };
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const tickets = readTickets(root);
  const evidence = JSON.parse(readFileSync(resolve(root, 'docs/evidence/gates.json'), 'utf8'));
  const report = evaluate(tickets, evidence);
  console.log(JSON.stringify({ product: 'Confidant MVP', ...report }, null, 2));
  if (report.invalidCompletions.length) process.exitCode = 1;
}
