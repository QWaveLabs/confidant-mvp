import { hash } from './store.mjs';

const categories = ['People', 'Projects', 'Commitments', 'Opportunities', 'Goals'];
const requiredAnswers = ['role', 'goals', 'people', 'projects', 'categories', 'briefTime', 'timezone', 'exclusions'];
const recovery = {
  permission_denied: ['Permission denied', 'Grant only the required source permission, then retry from the saved cursor.'],
  offline: ['Source offline', 'Bring the source and Mac online, then retry.'],
  rate_limited: ['Rate limit reached', 'Wait for the provider limit to reset, then retry the same page.'],
  connection_expired: ['Sign-in expired', 'Reconnect the existing plugin, then retry the same page.'],
  provider_proof_required: ['Provider history proof required', 'Verify this provider through its connected plugin and record its reviewed history/privacy evidence. No API or manual export fallback is available.'],
  unsupported_schema: ['Unsupported source schema', 'Ask the operator to review the actual source schema before retrying. No cursor advanced.'],
  transcript_unavailable: ['Apple transcript unavailable', 'Keep call content unknown. Check Apple Call Recordings sync; no alternate transcription is used.'],
  malformed_page: ['Malformed source page', 'Inspect the source adapter and retry the same page; no cursor advanced.'],
  stale_cursor: ['Source changed during pagination', 'Restart this source window and deduplicate already committed identities.'],
};
const iso = value => new Date(value).toISOString();
const identifierOnlySources = ['messages', 'whatsapp', 'calls'];
const isIdentifier = (value, source) => /^(?:tel:)?\+?\d[\d ()-]{5,}$/.test(value) || /^(?:mailto:)?[^\s@]+@[^\s@]+$/.test(value) && !/@(?:lid|g\.us)$/i.test(value) || source === 'whatsapp' && /^\d+@lid$/i.test(value);
const unresolvedPeople = (policy, source) => (policy.people ?? []).some(person => !isIdentifier(person, source) && !(policy.peopleAliases?.[person] ?? []).some(alias => isIdentifier(alias, source)));
function windowStart(now) {
  const date = new Date(now); const day = date.getUTCDate();
  date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() - 36);
  date.setUTCDate(Math.min(day, new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()));
  return date.toISOString();
}
function monthWindows(from, to) {
  const windows = []; const cursor = new Date(from); cursor.setUTCDate(1); cursor.setUTCHours(0, 0, 0, 0);
  while (cursor <= new Date(to)) {
    const begin = cursor.toISOString(); cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    windows.push({ key: begin.slice(0, 7), from: begin < from ? from : begin, to: cursor.toISOString() > to ? to : cursor.toISOString() });
  }
  return windows;
}
function safeSourceError(error) {
  const rawCode = String(error?.code ?? '').toLowerCase();
  const alias = { denied: 'permission_denied', rate_limit: 'rate_limited', malformed: 'malformed_page', expired: 'connection_expired' };
  const code = alias[rawCode] ?? rawCode;
  const [reason, action] = recovery[code] ?? ['Source read failed', 'Retry the saved page; ask the operator to check the adapter if it fails again.'];
  return { code: Object.hasOwn(recovery, code) ? code : 'read_failed', reason, action };
}
function excluded(record, policy) {
  const lower = value => String(value ?? '').toLowerCase();
  const identifier = value => { const normalized = lower(value).replace(/^(?:tel:|mailto:)/, '').replace(/@s\.whatsapp\.net$/, ''); return /^[+\d ()-]+$/.test(normalized) ? normalized.replace(/\D/g, '') : normalized; };
  if (policy.sources?.includes(record.source)) return 'source exclusion';
  if ((policy.people ?? []).some(person => [person, ...(policy.peopleAliases?.[person] ?? [])].some(alias => [...record.participants, record.metadata?.title, record.metadata?.chatTitle].some(participant => identifier(participant).includes(identifier(alias)))))) return 'person exclusion';
  if ((policy.chats ?? []).some(chat => [record.metadata?.chatId, record.metadata?.chatTitle].some(value => lower(value).includes(lower(chat))))) return 'chat exclusion';
  if ((policy.topics ?? []).some(topic => [record.content, record.metadata?.title, record.metadata?.chatTitle, record.metadata?.company].some(value => lower(value).includes(lower(topic))))) return 'topic exclusion';
  return null;
}

export class ConfidantEngine {
  constructor(store, adapters, { now = () => new Date().toISOString(), mode = 'synthetic' } = {}) {
    if (!['synthetic', 'assisted-local'].includes(mode)) throw new Error('Unknown ingestion mode.');
    if (Object.values(adapters).some(adapter => adapter.fixture !== (mode === 'synthetic'))) throw new Error('Sources must match the selected brain mode. Evaluation sources must be explicitly synthetic fixtures.');
    if (store.get('mode', 'synthetic') !== mode) throw new Error('The selected mode cannot open this brain.');
    this.store = store; this.adapters = adapters; this.now = now; this.mode = mode;
    store.set('mode', mode);
  }
  setup() {
    const answers = this.store.get('profile', {});
    return { answers, nextQuestion: requiredAnswers.find(key => answers[key] === undefined) ?? 'source consent',
      privacy: 'Local exclusions apply before classification. Cloud results may reach chat before local filtering; verified source-side filters or exposure consent are required.',
      mode: this.mode, customerSourceAccess: this.mode === 'assisted-local', releaseReadiness: 'Required live gates remain unverified. Assisted local access requires separate explicit source approval.' };
  }
  answer(key, value) {
    if (!requiredAnswers.includes(key)) throw new Error('Unknown setup question.');
    if (['goals', 'people', 'projects', 'categories'].includes(key) && (!Array.isArray(value) || value.some(item => typeof item !== 'string'))) throw new Error('Provide a list of strings.');
    if (['role', 'briefTime', 'timezone'].includes(key) && (typeof value !== 'string' || !value.trim())) throw new Error('Provide a nonempty setup answer.');
    if (key === 'briefTime' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error('Brief time must be HH:MM.');
    if (key === 'timezone') { try { new Intl.DateTimeFormat('en', { timeZone: value }); } catch { throw new Error('Unknown timezone.'); } }
    if (key === 'exclusions') {
      if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(item => !['sources', 'people', 'chats', 'topics', 'peopleAliases'].includes(item))
        || Object.entries(value).some(([key, items]) => key !== 'peopleAliases' && (!Array.isArray(items) || items.some(item => typeof item !== 'string' || !item.trim())))) throw new Error('Exclusions must contain lists of nonempty sources, people, chats, or topics.');
      if (value.peopleAliases !== undefined && (!value.peopleAliases || typeof value.peopleAliases !== 'object' || Array.isArray(value.peopleAliases) || Object.keys(value.peopleAliases).length > 100
        || Object.entries(value.peopleAliases).some(([name, aliases]) => !(value.people ?? []).includes(name) || !Array.isArray(aliases) || !aliases.length || aliases.length > 20 || aliases.some(alias => typeof alias !== 'string' || alias.length > 512 || !alias.trim())))) throw new Error('People aliases must map an excluded name to a bounded list of approved identifiers.');
      // Tightening privacy purges matching accepted records and their derived facts in the same transaction.
      this.store.transaction(() => {
        this.store.set('profile', { ...this.store.get('profile', {}), [key]: value });
        const blockedForIdentity = source => this.mode === 'assisted-local' && identifierOnlySources.includes(source) && unresolvedPeople(value, source);
        for (const source of this.store.sources()) if (value.sources?.includes(source.id) || blockedForIdentity(source.id)) this.store.saveSource({ ...source, authorized: false, disabled: true, status: value.sources?.includes(source.id) ? 'excluded by privacy policy' : 'excluded person identifiers required before further reads' });
        for (const record of this.store.exportBrain().records) { const reason = blockedForIdentity(record.source) ? 'Unresolved person exclusion; source data removed until safe identifiers are supplied.' : excluded(record, value); if (reason) this.store.exclude(record, reason); }
      });
      this.store.purgeArtifacts();
    } else this.store.set('profile', { ...this.store.get('profile', {}), [key]: value });
    return this.setup();
  }
  configure(profile) { for (const key of requiredAnswers) this.answer(key, profile[key]); return this.setup(); }
  consent(sourceId, { approved = false, cloudExposureConsent = false, queryFilteringVerified = false } = {}) {
    const adapter = this.adapters[sourceId];
    if (!adapter) throw new Error('Unknown source.');
    if (requiredAnswers.some(key => this.store.get('profile', {})[key] === undefined)) throw new Error('Finish setup and exclusions before source access.');
    if (!approved) throw new Error('Explicit source consent is required.');
    if (this.store.get('profile').exclusions.sources?.includes(sourceId)) throw new Error('Source is excluded.');
    if (this.mode === 'assisted-local' && identifierOnlySources.includes(sourceId)) {
      const policy = this.store.get('profile').exclusions;
      if (unresolvedPeople(policy, sourceId)) throw new Error('Excluded names need approved phone/email/JID aliases before this source can be read. Supply those identifiers or exclude the entire source.');
    }
    if (adapter.kind === 'cloud' && !cloudExposureConsent && !queryFilteringVerified) throw new Error('Cloud pre-read privacy is unverified. Source remains blocked without exposure consent.');
    const previous = this.store.source(sourceId);
    if (previous?.disabled) throw new Error('Source disabled. Explicitly enable it before consenting again.');
    const now = this.now();
    const source = previous ?? { id: sourceId, kind: adapter.kind, cursor: null, exhausted: false, connected: false, oldest: null, newest: null, seen: 0, attempts: 0, from: windowStart(now), to: now, mode: this.mode, gaps: [] };
    Object.assign(source, { authorized: true, cloudExposureConsent, queryFilteringVerified, status: 'authorized, not yet read', failedStep: null });
    this.store.transaction(() => { this.store.saveSource(source); for (const window of monthWindows(source.from, source.to)) this.store.saveWindow(sourceId, window.key, { ...window, state: 'pending', processing: 'pending', reason: 'No committed page yet.' }); });
    return source;
  }
  async importPage(sourceId, { limit = 20, interruptBeforeCommit = false, refresh = false } = {}) {
    const source = this.store.source(sourceId); const adapter = this.adapters[sourceId];
    if (!source?.authorized || source.disabled || !adapter || this.store.get('profile', {}).exclusions?.sources?.includes(sourceId)) throw new Error('Source access is not enabled.');
    if (this.mode === 'assisted-local' && identifierOnlySources.includes(sourceId) && unresolvedPeople(this.store.get('profile', {}).exclusions ?? {}, sourceId)) throw new Error('Excluded person identifiers are unresolved; source access is blocked.');
    if (this.store.get('paused', false)) return { state: 'paused', cursor: source.cursor };
    if (source.attempts >= 3 && source.failedStep && !refresh) return { state: 'blocked after bounded retries', cursor: source.cursor };
    if (source.exhausted && !refresh) return { state: 'already exhausted', cursor: source.cursor };
    let page; const from = refresh ? windowStart(this.now()) : source.from; const to = refresh ? this.now() : source.to;
    const stillAllowed = () => { const current = this.store.source(sourceId); return current?.authorized && !current.disabled && current.revision === source.revision && !this.store.get('profile', {}).exclusions?.sources?.includes(sourceId) && !this.store.get('paused', false); };
    const cancelled = () => ({ state: 'cancelled because source state changed', cursor: this.store.source(sourceId)?.cursor ?? null });
    const fail = failure => this.store.transaction(() => {
      if (!stillAllowed()) return cancelled();
      this.store.saveSource({ ...source, status: failure.reason, failedStep: failure, attempts: source.attempts + 1 });
      return { state: 'failed', failure, cursor: source.cursor };
    });
    try { page = await adapter.readPage({ cursor: refresh ? null : source.cursor, from, to, limit }); }
    catch (error) {
      return fail(safeSourceError(error));
    }
    if (!page || !Array.isArray(page.items) || typeof page.exhausted !== 'boolean' || (!page.exhausted && (page.nextCursor === undefined || page.nextCursor === null || page.nextCursor === source.cursor))) {
      const failure = { code: 'malformed_page', reason: 'Malformed or nonadvancing source page', action: 'Retry the same saved page.' };
      return fail(failure);
    }
    if (page.items.some(item => item.metadata?.fixture !== (this.mode === 'synthetic') || item.source !== sourceId)) throw new Error('Source records must match this brain mode. Synthetic and real records cannot be mixed.');
    const observedDates = page.items.map(item => item.timestamp).filter(value => Number.isFinite(Date.parse(value))).sort();
    let changed = 0; let excludedCount = 0;
    const outcome = this.store.transaction(() => {
      if (!stillAllowed()) return cancelled();
      const policy = this.store.get('profile').exclusions;
      for (const record of page.items) {
        const reason = excluded(record, policy);
        if (reason) { this.store.exclude(record, reason); excludedCount++; }
        else if (this.store.putRecord(record).changed) changed++;
      }
      if (interruptBeforeCommit) throw new Error('Synthetic interruption before page commit.');
      source.oldest = [source.oldest, observedDates[0]].filter(Boolean).sort()[0] ?? null;
      source.newest = [source.newest, observedDates.at(-1)].filter(Boolean).sort().at(-1) ?? null;
      Object.assign(source, { connected: true, cursor: page.nextCursor ?? null, exhausted: page.exhausted, seen: source.seen + page.items.length,
        lastRefresh: this.now(), status: page.exhausted ? 'available source pages committed' : 'history import in progress', failedStep: null, attempts: 0,
        gaps: Array.from(new Map([...(source.gaps ?? []), ...(page.gaps ?? [])].map(gap => [hash(gap), gap])).values()) });
      if (refresh) { source.from = from; source.to = to; }
      this.store.saveSource(source);
      for (const window of monthWindows(source.from, source.to)) {
        const endComparison = window.to === source.to ? '<=' : '<';
        const counts = this.store.db.prepare(`SELECT state,COUNT(*) AS count FROM coverage_items WHERE source = ? AND timestamp >= ? AND timestamp ${endComparison} ? GROUP BY state`).all(sourceId, window.from, window.to);
        const pending = this.store.db.prepare(`SELECT COUNT(*) AS count FROM records WHERE source = ? AND processing != 'classified' AND json_extract(body,'$.timestamp') >= ? AND json_extract(body,'$.timestamp') ${endComparison} ?`).get(sourceId, window.from, window.to).count;
        const outsideVerifiedRange = source.exhausted && (!source.oldest || window.to < source.oldest || window.from > source.newest);
        this.store.saveWindow(sourceId, window.key, { ...window, state: source.exhausted ? outsideVerifiedRange ? 'unavailable' : 'committed' : 'pending',
          processing: pending ? 'pending' : source.exhausted ? 'committed' : 'unknown', counts: Object.fromEntries(counts.map(row => [row.state, row.count])),
          reason: outsideVerifiedRange ? 'Outside verified available source dates; no full 36-month claim.' : source.exhausted ? 'Available pages committed; classification and source gaps are separate.' : 'Older pages remain pending.' });
      }
    });
    if (outcome) return outcome;
    if (!this.store.get('firstConnectionAt')) this.store.set('firstConnectionAt', this.now());
    return { state: 'committed', changed, excluded: excludedCount, cursor: source.cursor, exhausted: source.exhausted, fixture: this.mode === 'synthetic' };
  }
  pause(paused = true) { this.store.set('paused', paused); return { paused }; }
  retry(sourceId) { const source = this.store.source(sourceId); if (!source || source.disabled) throw new Error('Source is disabled or unknown.');
    if (source.failedStep?.code === 'stale_cursor') { source.cursor = null; source.exhausted = false; }
    this.store.saveSource({ ...source, attempts: 0 }); return { cursor: source.cursor }; }
  disable(sourceId) {
    const source = this.store.source(sourceId); if (!source) throw new Error('Unknown source.');
    this.store.saveSource({ ...source, disabled: true, authorized: false, status: 'disabled by user' });
    return { disabled: true, schedulerCancellation: 'External task cancellation must be confirmed separately. Local reads are disabled immediately.' };
  }
  enable(sourceId) { const source = this.store.source(sourceId); if (!source) throw new Error('Unknown source.'); this.store.saveSource({ ...source, disabled: false, authorized: false, status: 'source consent required' }); }
  nextBatch(limit = 12) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 20) throw new Error('Classification batch must contain 1 to 20 items.');
    if (this.store.get('paused', false)) return [];
    return this.store.records({ processing: 'pending', limit, activeOnly: true }).map(record => ({
      recordKey: record.key, fingerprint: record.fingerprint, source: record.source, timestamp: record.timestamp, direction: record.direction,
      participants: record.participants, sourceRef: record.sourceRef, excerpt: record.content?.slice(0, 4000) ?? null,
      contentMissing: record.content === null,
    }));
  }
  commitClassifications(batch, outputs, { processor = 'scheduled-plan', interruptBeforeCommit = false } = {}) {
    if (this.store.get('paused', false)) throw new Error('Classification is paused.');
    if (!Array.isArray(batch) || batch.length > 20 || !Array.isArray(outputs) || outputs.length !== batch.length) throw new Error('Classification output must reconcile exactly one result per batch record.');
    const byKey = new Map(batch.map(record => [record.recordKey, record]));
    if (byKey.size !== batch.length || new Set(outputs.map(output => output.recordKey)).size !== outputs.length) throw new Error('Duplicate classification identity.');
    const validated = [];
    for (const output of outputs) {
      const request = byKey.get(output.recordKey); const record = this.store.record(output.recordKey);
      if (!request || !record || record.fingerprint !== request.fingerprint || record.processing !== 'pending') throw new Error('Stale or unknown classification record.');
      if (!Array.isArray(output.facts) || output.facts.length > 10) throw new Error('Bounded facts required.');
      for (const fact of output.facts) {
        if (!categories.includes(fact.category) || typeof fact.label !== 'string' || !fact.label.trim() || fact.label.length > 250
          || typeof fact.quote !== 'string' || !fact.quote || !record.content?.includes(fact.quote)
          || fact.quote.length > 1000 || !Number.isFinite(fact.confidence) || fact.confidence < 0 || fact.confidence > 1) throw new Error('Fact requires a supported category and exact source quote.');
        for (const field of ['person', 'project']) if (fact[field] !== undefined && fact[field] !== null && (typeof fact[field] !== 'string' || fact[field].length > 250)) throw new Error('Invalid entity label.');
        if (fact.inference === false && !record.content.includes(fact.label)) throw new Error('A source fact label must be present in the source.');
        let deadlinePrecision = null;
        if (fact.dueAt !== undefined) {
          if (typeof fact.dueAt !== 'string' || !Number.isFinite(Date.parse(fact.dueAt))) throw new Error('Deadline must be present in the source.');
          const sourceDates = record.content.match(/\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2}))?/g) ?? [];
          const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(fact.dueAt);
          if (!sourceDates.some(value => dateOnly ? value === fact.dueAt : value.length > 10 && Date.parse(value) === Date.parse(fact.dueAt))) throw new Error('Deadline time and precision must match the source.');
          deadlinePrecision = dateOnly ? 'date' : 'time';
        }
        const inference = fact.inference !== false;
        // Source facts remain immutable. Reviewed interpretations are stored separately.
        validated.push({ id: hash([record.key, record.fingerprint, fact.category, fact.label]), recordKey: record.key, fingerprint: record.fingerprint,
          category: fact.category, label: fact.label, quote: fact.quote, confidence: fact.confidence, inference, dueAt: fact.dueAt ?? null, deadlinePrecision,
          person: fact.person ?? null, project: fact.project ?? null, sourceRef: record.sourceRef, source: record.source, timestamp: record.timestamp, processor });
      }
    }
    this.store.transaction(() => {
      if (this.store.get('paused', false)) throw new Error('Classification is paused.');
      for (const request of batch) {
        const current = this.store.record(request.recordKey); const source = current && this.store.source(current.source);
        if (!current || current.fingerprint !== request.fingerprint || current.processing !== 'pending' || !source?.authorized || source.disabled) throw new Error('Stale or disabled classification record.');
      }
      for (const fact of validated) this.store.saveFact(fact);
      for (const output of outputs) this.store.setProcessing(output.recordKey, 'classified');
      if (interruptBeforeCommit) throw new Error('Synthetic interruption before classification commit.');
      this.store.set('lastClassification', { processor, at: this.now(), recordCount: batch.length });
      for (const sourceId of new Set(batch.map(item => item.source))) {
        const source = this.store.source(sourceId);
        for (const window of this.store.windows(sourceId)) {
          const endComparison = window.to === source.to ? '<=' : '<';
          const pending = this.store.db.prepare(`SELECT COUNT(*) AS count FROM records WHERE source = ? AND processing != 'classified' AND json_extract(body,'$.timestamp') >= ? AND json_extract(body,'$.timestamp') ${endComparison} ?`).get(sourceId, window.from, window.to).count;
          this.store.saveWindow(sourceId, window.key, { ...window, processing: pending ? 'pending' : window.state === 'unavailable' ? 'unavailable' : source.exhausted ? 'committed' : 'unknown' });
        }
      }
    });
    return { processed: outputs.length, facts: validated.length, processor };
  }
  health() {
    return { mode: this.mode, readyForCustomerData: false, paused: this.store.get('paused', false), setup: this.setup().nextQuestion,
      sources: this.store.sources().map(source => ({ ...source, counts: this.store.counts(source.id), windows: this.store.windows(source.id),
        complete: source.exhausted && !source.failedStep && !source.disabled && !this.store.get('paused', false)
          && !source.gaps.length && !Object.entries(this.store.counts(source.id).processing).some(([state, count]) => state !== 'classified' && count > 0)
          && !this.store.windows(source.id).some(window => ['pending', 'unknown', 'failed', 'unavailable'].includes(window.state)),
      })), privacy: 'Operator health omits raw communication content. Cloud pre-read privacy and live source coverage remain unverified.' };
  }
  query(text, { limit = 10 } = {}) {
    const records = this.store.records({ query: text, limit, activeOnly: true });
    return { answer: records.length ? records.map(record => ({ text: record.content ?? 'Call metadata only; content and commitments are unknown.', timestamp: record.timestamp,
      participants: record.participants, citation: record.sourceRef, source: record.source, interpretation: 'source record' })) : [],
      unknown: records.length === 0, coverage: this.health().sources.map(source => ({ source: source.id, oldest: source.oldest, newest: source.newest, lastRefresh: source.lastRefresh, gaps: source.gaps })) };
  }
  sourceRecord(source, id) {
    const state = this.store.source(source); const record = this.store.record(`${source}:${id}`);
    if (!state?.authorized || state.disabled || !record) return { unknown: true, reason: 'Record unavailable, excluded, or source disabled.' };
    return { record: { source: record.source, id: record.id, timestamp: record.timestamp, direction: record.direction, participants: record.participants, content: record.content, metadata: record.metadata },
      citation: record.sourceRef, lastRefresh: state.lastRefresh, limitation: 'This is the locally imported source receipt, not proof that the originating app can deep-link to the item.' };
  }
  views() { const views = Object.fromEntries(categories.map(category => [category, this.store.facts().filter(fact => fact.category === category && !this.store.source(fact.source)?.disabled)]));
    views.Goals = [...views.Goals, ...(this.store.get('profile', {}).goals ?? []).map(label => ({ label, sourceRef: 'setup://goals', inference: false, origin: 'explicit setup answer' }))];
    return { ...views, identityNote: 'Names are not automatically merged. Entity links are provisional and reviewable.' }; }
  meetingPrep(person) { return { person, interactions: this.query(person), commitments: this.views().Commitments.filter(fact => fact.person?.toLowerCase().includes(person.toLowerCase())), freshness: this.health().sources.map(source => ({ source: source.id, lastRefresh: source.lastRefresh })), inference: 'Open commitment status is a recommendation and requires checking later evidence.' }; }
}

// A deliberately limited, labelled fixture processor. This never claims to be a plan-backed AI.
export function classifySynthetic(batch) {
  return batch.map(record => {
    const text = record.excerpt ?? ''; const facts = [];
    const person = record.participants[0] ?? null;
    if (text.includes('Alex Example')) facts.push({ category: 'People', label: 'Alex Example', quote: 'Alex Example', confidence: 1, inference: false });
    if (text.includes('Project Atlas')) facts.push({ category: 'Projects', label: 'Project Atlas', quote: 'Project Atlas', confidence: 1, inference: false });
    const deadline = text.match(/by (\d{4}-\d{2}-\d{2}(?:T[0-9:.]+Z)?)/)?.[1];
    if (/I will send (?:the )?Project Atlas proposal/.test(text) && deadline && ['outgoing', null].includes(record.direction)) {
      facts.push({ category: 'Commitments', label: 'Send the Project Atlas proposal', quote: text.slice(text.indexOf('I will send')), confidence: 0.95,
        inference: true, dueAt: deadline.length === 10 ? deadline : iso(deadline), person, project: 'Project Atlas' });
    }
    if (text.includes('Can you introduce me to Project Atlas?')) facts.push({ category: 'Opportunities', label: 'Review the Project Atlas introduction request', quote: 'Can you introduce me to Project Atlas?', confidence: 0.9, inference: true, person, project: 'Project Atlas' });
    return { recordKey: record.recordKey, facts };
  });
}
