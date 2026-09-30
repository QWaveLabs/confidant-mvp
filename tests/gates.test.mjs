import test from 'node:test';
import assert from 'node:assert/strict';
import { dependencies, evaluate, readTickets, ticketIds } from '../src/gates.mjs';
import { fileURLToPath } from 'node:url';

const completeTickets = () => ticketIds.map(id => ({ id, status: 'complete' }));
const live = names => ({ status: 'pass', mode: 'live-pilot', consent: true,
  observedAt: '2026-09-30T03:00:00Z', reviewedByOperator: true,
  checks: Object.fromEntries(names.map(name => [name, { passed: true, artifact: `synthetic-test-only:${name}` }])) });
const passingEvidence = () => ({
  '01': live(['dotLocalInvocation', 'scheduledLocalInvocation', 'visibleChatGPTNotification', 'offlineUnavailable']),
  '04': live(['scheduledPlanOnlyClassification', 'interrupted36MonthResume', 'validatedCitations', 'visiblePlanLimits']),
  '05': Object.fromEntries(['gmail', 'outlook', 'fathom', 'fireflies'].map(name => [name,
    live(['dotAccess', 'historicalEnumeration', 'pagination', 'stableIdentifiers', 'verifiedDateRange', 'privacyBoundary'])])),
});

test('claiming every ticket complete never bypasses absent real gates', () => {
  const report = evaluate(completeTickets());
  assert.equal(report.ready, false);
  assert.equal(report.invalidCompletions.length, 24);
  assert.deepEqual(report.completed, []);
  assert.deepEqual(report.frontier, ['01']);
});
test('synthetic tests and manual probes cannot satisfy a live scheduled gate', () => {
  for (const mode of ['synthetic', 'manual-chat', 'metadata-only']) {
    const evidence = passingEvidence(); evidence['01'].mode = mode;
    assert.equal(evaluate(completeTickets(), evidence).ready, false);
  }
});
test('operator consent, observation, artifacts, and every required proof are mandatory', () => {
  for (const mutate of [e => { e.consent = false; }, e => { e.reviewedByOperator = false; },
    e => { e.observedAt = 'unknown'; }, e => { delete e.checks.scheduledLocalInvocation; },
    e => { e.checks.visibleChatGPTNotification.artifact = ' '; }]) {
    const evidence = passingEvidence(); mutate(evidence['01']);
    assert.equal(evaluate(completeTickets(), evidence).liveGates['01'], false);
  }
});
test('provider gates are independent and release never ignores missing history', () => {
  const evidence = passingEvidence(); evidence['05'].fireflies.status = 'unavailable';
  const report = evaluate(completeTickets(), evidence);
  assert.equal(report.ready, false);
  assert.equal(report.liveGates.providers.gmail, true);
  assert.equal(report.liveGates.providers.fireflies, false);
  assert.ok(report.blocked.find(item => item.id === '15').reasons.includes('05 fireflies live history gate'));
});
test('plan gate remains necessary after a successful Dot proof', () => {
  const evidence = passingEvidence(); evidence['04'].status = 'unverified';
  const report = evaluate(completeTickets(), evidence);
  assert.equal(report.ready, false);
  assert.ok(report.blocked.find(item => item.id === '06').reasons.includes('04 live plan gate'));
});
test('24 real ticket files retain exact map dependencies and explicit status', () => {
  const tickets = readTickets(fileURLToPath(new URL('..', import.meta.url)));
  assert.equal(tickets.length, 24);
  assert.deepEqual(tickets.map(item => item.id), ticketIds);
  assert.deepEqual(dependencies['24'], Array.from({ length: 16 }, (_, i) => String(i + 8).padStart(2, '0')));
});
test('missing ticket prevents release even with operator-reviewed evidence', () => {
  const tickets = completeTickets().filter(item => item.id !== '09');
  assert.equal(evaluate(tickets, passingEvidence()).ready, false);
});
test('all prerequisites are evaluated in ticket order, not JavaScript numeric-key order', () => {
  const report = evaluate(completeTickets(), passingEvidence());
  assert.equal(report.ready, true);
  assert.deepEqual(report.completed, ticketIds);
  assert.deepEqual(report.invalidCompletions, []);
});
test('one provider result can unblock its own ticket while another remains unverified', () => {
  const evidence = passingEvidence(); evidence['05'].fireflies.status = 'unverified';
  const report = evaluate(completeTickets(), evidence);
  assert.ok(report.completed.includes('12'));
  assert.ok(!report.completed.includes('15'));
  assert.equal(report.ready, false);
});
test('user-authorized scheduled task alternative still requires observed invocation, visible notification, and offline evidence', () => {
  const evidence = passingEvidence(); evidence['01'] = { ...live(['scheduledTaskLocalInvocation', 'visibleScheduledTaskNotification', 'offlineUnavailable']), surface: 'scheduled-task' };
  assert.equal(evaluate(completeTickets(), evidence).ready, true);
  for (const name of ['scheduledTaskLocalInvocation', 'visibleScheduledTaskNotification', 'offlineUnavailable']) {
    const incomplete = structuredClone(evidence); delete incomplete['01'].checks[name];
    assert.equal(evaluate(completeTickets(), incomplete).ready, false);
  }
  evidence['04'].status = 'unverified'; assert.equal(evaluate(completeTickets(), evidence).ready, false);
});
