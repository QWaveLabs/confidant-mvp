import { randomUUID } from 'node:crypto';
import { hash } from './store.mjs';

export class ActionService {
  constructor(engine) { this.engine = engine; this.store = engine.store; }
  suggestions() {
    const now = Date.parse(this.engine.now()); const groups = new Map();
    for (const fact of this.store.facts()) {
      if (!['Commitments', 'Opportunities', 'People'].includes(fact.category) || fact.confidence < 0.8 || now - Date.parse(fact.timestamp) > 30 * 86400000) continue;
      const source = this.store.source(fact.source);
      if (!source?.connected || source.disabled) continue;
      const kind = fact.category === 'Commitments' ? 'follow-up' : fact.category === 'Opportunities' ? 'opportunity' : 'relationship reminder';
      if (kind === 'relationship reminder' && fact.source !== 'contacts') continue;
      const identity = hash([kind, fact.label.toLowerCase(), fact.person, fact.project]);
      if (!groups.has(identity)) groups.set(identity, { id: identity, kind, label: fact.label, person: fact.person, project: fact.project, dueAt: fact.dueAt, deadlinePrecision: fact.deadlinePrecision,
        confidence: fact.confidence, evidence: [], fresh: true, lastRefresh: source.lastRefresh, factIds: [] });
      const suggestion = groups.get(identity);
      suggestion.evidence.push({ citation: fact.sourceRef, quote: fact.quote, timestamp: fact.timestamp, fingerprint: fact.fingerprint });
      suggestion.factIds.push(fact.id);
      suggestion.fresh &&= !source.failedStep && now - Date.parse(source.lastRefresh) <= 6 * 3600000;
      if (source.lastRefresh < suggestion.lastRefresh) suggestion.lastRefresh = source.lastRefresh;
    }
    const feedback = this.store.rows('feedback');
    return [...groups.values()].map(item => {
      item.evidenceHash = hash(item.evidence.map(evidence => evidence.fingerprint).sort());
      item.nextAction = item.kind === 'follow-up' ? item.label : item.kind === 'opportunity' ? item.label : 'Review the recent interaction before deciding whether to reconnect.';
      const hours = item.dueAt ? (Date.parse(item.dueAt) - now) / 3600000 : Infinity;
      item.whyNow = item.dueAt ? `Source states a deadline of ${item.dueAt}; check whether later evidence resolved it.` : item.kind === 'opportunity' ? 'A recent source contains an introduction request.' : 'A recent contact source supports a relationship check; no obligation is inferred.';
      item.score = (item.kind === 'follow-up' ? 100 : item.kind === 'opportunity' ? 60 : 20) + (hours <= 48 ? 30 : 0) + item.confidence * 10 - (item.fresh ? 0 : 40);
      item.score -= feedback.filter(response => response.kind === item.kind && response.person === item.person && response.project === item.project && ['wrong', 'irrelevant'].includes(response.type)).length * 10;
      item.interpretation = 'suggested action, not a verified unresolved obligation';
      return item;
    }).filter(item => !feedback.some(response => response.suggestionId === item.id && response.evidenceHash === item.evidenceHash && ['done', 'irrelevant', 'wrong', 'correction'].includes(response.type)))
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  }
  brief({ limit = 5 } = {}) {
    const items = this.suggestions().slice(0, Math.max(1, Math.min(10, limit)));
    const at = this.engine.now();
    if (items.length && !this.store.get('firstUsefulBriefAt')) this.store.set('firstUsefulBriefAt', at);
    const firstConnection = this.store.get('firstConnectionAt');
    return { mode: this.engine.mode === 'synthetic' ? 'synthetic evaluation' : 'assisted local preview', at, items, summary: items.length ? 'Review these sourced actions.' : 'No defensible action found in the available classified data.',
      coverage: this.engine.health().sources.map(source => ({ source: source.id, connected: source.connected, lastRefresh: source.lastRefresh, pending: source.counts.processing.pending ?? 0, gaps: source.gaps, complete: source.complete })),
      firstValueSeconds: firstConnection && this.store.get('firstUsefulBriefAt') ? (Date.parse(this.store.get('firstUsefulBriefAt')) - Date.parse(firstConnection)) / 1000 : null,
      measurementScope: this.engine.mode === 'synthetic' ? 'Synthetic fixture timing only; representative Mac first-value target is unverified.' : 'Observed local timestamps; representative pilot quality and unattended throughput remain unverified.', delivery: 'not sent' };
  }
  feedback(suggestionId, type, correction = null) {
    if (!['done', 'irrelevant', 'wrong', 'correction'].includes(type)) throw new Error('Unsupported feedback.');
    const suggestion = this.suggestions().find(item => item.id === suggestionId);
    if (!suggestion) throw new Error('Suggestion is missing, suppressed, or stale.');
    if (type === 'correction' && (typeof correction !== 'string' || !correction.trim() || correction.length > 250)) throw new Error('Correction text required.');
    const result = { id: randomUUID(), suggestionId, evidenceHash: suggestion.evidenceHash, evidence: suggestion.evidence, factIds: suggestion.factIds,
      type, correction, kind: suggestion.kind, person: suggestion.person, project: suggestion.project, review: type === 'correction' ? 'pending' : 'not required', at: this.engine.now() };
    this.store.saveRow('feedback', result); return result;
  }
  reviewCorrection(id, approve) {
    const response = this.store.rows('feedback').find(item => item.id === id);
    if (!response || response.type !== 'correction' || response.review !== 'pending') throw new Error('No pending correction found.');
    this.store.transaction(() => {
      if (approve) for (const fact of this.store.facts().filter(item => response.factIds.includes(item.id))) this.store.saveFact({ ...fact, label: response.correction, inference: true, reviewedCorrection: true, originalLabel: fact.label });
      response.review = approve ? 'approved' : 'rejected'; this.store.saveRow('feedback', response);
    });
    return { review: response.review, sourceFactsUnchanged: true };
  }
  urgentAlerts() {
    const now = Date.parse(this.engine.now());
    const prior = this.store.rows('deliveries');
    return this.suggestions().filter(item => item.kind === 'follow-up' && item.fresh && item.confidence >= 0.95 && item.dueAt && item.deadlinePrecision === 'time'
      && Date.parse(item.dueAt) > now && Date.parse(item.dueAt) - now <= 24 * 3600000
      && !prior.some(delivery => delivery.id === `urgent:${item.id}:${item.evidenceHash}` && delivery.state === 'delivered'))
      .map(item => ({ ...item, whyCannotWait: `The cited deadline is within 24 hours: ${item.dueAt}. Verify it is still open before acting.`, delivery: 'not sent' }));
  }
  coaching() {
    const commitments = this.suggestions().filter(item => item.kind === 'follow-up' && item.fresh);
    const uniqueRecords = new Map();
    for (const commitment of commitments) for (const evidence of commitment.evidence) uniqueRecords.set(evidence.fingerprint, evidence);
    if (commitments.length < 3 || uniqueRecords.size < 3) return { observation: null, reason: 'Insufficient distinct commitments for a recurring work pattern; duplicate source mentions are not independent events.', delivery: 'not sent' };
    const evidence = [...uniqueRecords.values()].slice(0, 5);
    const evidenceHash = hash(evidence.map(item => item.fingerprint).sort());
    const dismissed = this.store.rows('feedback').some(item => item.suggestionId === 'weekly-coaching' && item.evidenceHash === evidenceHash);
    return dismissed ? { observation: null, reason: 'Observation dismissed for this evidence.', delivery: 'not sent' }
      : { observation: 'Several recent records contain explicit follow-through promises. Check their status together before making another commitment.',
        improvement: 'Reserve a short review of these sourced promises; do not infer a personality trait or missed delivery from silence.', evidence, evidenceHash, coverage: 'Available classified recent records only; historical and live-source gaps remain.', delivery: 'not sent' };
  }
  dismissCoaching() { const coaching = this.coaching(); if (!coaching.evidenceHash) throw new Error('No coaching observation to dismiss.'); this.store.saveRow('feedback', { id: randomUUID(), suggestionId: 'weekly-coaching', evidenceHash: coaching.evidenceHash, type: 'irrelevant', at: this.engine.now() }); }
  draft(suggestionId, recipient) {
    const item = this.suggestions().find(suggestion => suggestion.id === suggestionId);
    if (!item) throw new Error('Suggestion is missing or stale.');
    if (typeof recipient !== 'string' || !recipient.trim() || recipient.length > 250) throw new Error('An exact recipient is required.');
    const draft = { id: randomUUID(), suggestionId, evidenceHash: item.evidenceHash, evidence: item.evidence, recipient,
      text: `Hi, following up on ${item.project ?? item.label}. Could you confirm the next step?`, status: 'review', revision: 1,
      note: 'Draft wording is a proposal. Review recipient and text before approving; no message has been sent.', at: this.engine.now() };
    this.store.saveRow('drafts', draft); return draft;
  }
  editDraft(id, { recipient, text }) {
    const draft = this.store.rows('drafts').find(item => item.id === id);
    if (!draft || ['sent', 'discarded', 'sending', 'outcome unknown'].includes(draft.status)) throw new Error('Draft is not editable.');
    if (typeof recipient !== 'string' || !recipient.trim() || recipient.length > 250 || typeof text !== 'string' || !text.trim() || text.length > 4000) throw new Error('Exact bounded recipient and text required.');
    Object.assign(draft, { recipient, text, status: 'review', revision: draft.revision + 1, approvedHash: null });
    this.store.saveRow('drafts', draft); return draft;
  }
  discardDraft(id) { const draft = this.store.rows('drafts').find(item => item.id === id); if (!draft || draft.status === 'sent') throw new Error('Draft unavailable.'); this.store.saveRow('drafts', { ...draft, status: 'discarded', approvedHash: null }); }
  approveDraft(id, { recipient, text }) {
    const draft = this.store.rows('drafts').find(item => item.id === id);
    if (!draft || draft.status !== 'review' || draft.recipient !== recipient || draft.text !== text) throw new Error('Approval must match this exact draft recipient and text.');
    draft.approvedHash = hash([draft.id, draft.revision, recipient, text]); draft.status = 'approved'; this.store.saveRow('drafts', draft); return draft;
  }
  async sendFakeDraft(id, outbound) {
    // Test seam only: no live outbound adapter can be plugged into this evaluation build.
    if (!outbound || outbound.mode !== 'synthetic-test') throw new Error('Only a fake outbound test adapter is allowed.');
    const draft = this.store.rows('drafts').find(item => item.id === id);
    if (!draft || draft.status !== 'approved' || draft.approvedHash !== hash([draft.id, draft.revision, draft.recipient, draft.text])) throw new Error('Exact draft approval is required.');
    const current = this.suggestions().find(item => item.id === draft.suggestionId && item.evidenceHash === draft.evidenceHash);
    if (!current) throw new Error('Draft evidence is stale or suggestion was dismissed; regenerate and review.');
    // Persist before external invocation. An unknown outcome must not automatically retry and duplicate a send.
    this.store.saveRow('drafts', { ...draft, status: 'sending' });
    try {
      const receipt = await outbound.send({ recipient: draft.recipient, text: draft.text, idempotencyKey: draft.approvedHash });
      this.store.saveRow('drafts', { ...draft, status: 'sent', receipt }); return receipt;
    } catch {
      this.store.saveRow('drafts', { ...draft, status: 'outcome unknown', approvedHash: null });
      throw new Error('Fake send outcome unknown; reconcile rather than retry automatically.');
    }
  }
  async deliverSynthetic(kind, notifier) {
    if (!['daily', 'urgent', 'weekly'].includes(kind) || notifier?.mode !== 'synthetic-test') throw new Error('Only a fake notification adapter is allowed.');
    const output = kind === 'daily' ? this.brief() : kind === 'urgent' ? this.urgentAlerts() : this.coaching();
    const items = kind === 'urgent' ? output : [output];
    for (const item of items) {
      const week = new Date(this.engine.now()); week.setUTCDate(week.getUTCDate() - ((week.getUTCDay() + 6) % 7));
      const id = kind === 'urgent' ? `urgent:${item.id}:${item.evidenceHash}` : `${kind}:${kind === 'weekly' ? week.toISOString().slice(0, 10) : this.engine.now().slice(0, 10)}`;
      if (kind === 'weekly' && !item.observation) continue;
      if (this.store.rows('deliveries').some(delivery => delivery.id === id && delivery.state === 'delivered')) continue;
      if (this.store.get('paused', false) || !this.engine.health().sources.some(source => source.connected && !source.disabled && !source.failedStep)) {
        this.store.saveRow('deliveries', { id, state: 'unavailable', at: this.engine.now() }); continue;
      }
      try { await notifier.notify(item); this.store.saveRow('deliveries', { id, state: 'delivered', channel: 'synthetic fake notification', at: this.engine.now() }); }
      catch { this.store.saveRow('deliveries', { id, state: 'delivery failed', at: this.engine.now() }); }
    }
    return output;
  }
}
