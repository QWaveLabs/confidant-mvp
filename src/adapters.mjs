import { createHash } from 'node:crypto';
import { isAbsolute } from 'node:path';
import { fixtureRecords, fixtureHistory, FIXTURE_NOW } from '../tests/fixtures/sources.mjs';

export const SOURCES = Object.freeze(['messages', 'whatsapp', 'calls', 'notes', 'calendar', 'contacts', 'gmail', 'outlook', 'fathom', 'fireflies']);
const CLOUD = new Set(['gmail', 'outlook', 'fathom', 'fireflies']);
const DIRECTIONS = new Set(['incoming', 'outgoing', null]);
const PROVIDER_CHECKS = ['historicalEnumeration', 'pagination', 'stableIdentifiers', 'verifiedDateRange', 'privacyBoundary'];

export class AdapterError extends Error {
  constructor(code, message, { retryable = false } = {}) {
    super(message);
    this.name = 'AdapterError';
    this.code = code;
    this.retryable = retryable;
  }
}

function validDate(value) { return typeof value === 'string' && Number.isFinite(Date.parse(value)); }
function knownSource(id) {
  if (!SOURCES.includes(id)) throw new AdapterError('unsupported_source', 'Unknown Confidant source.');
}
function object(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }

export function normalizeRecord(source, raw) {
  knownSource(source);
  if (!object(raw) || typeof raw.id !== 'string' || raw.id.length === 0 || raw.id.length > 512
    || !validDate(raw.timestamp) || !Array.isArray(raw.participants)
    || raw.participants.some(person => typeof person !== 'string' || person.length > 512)
    || !DIRECTIONS.has(raw.direction ?? null) || !(typeof raw.content === 'string' || raw.content === null)
    || typeof raw.sourceRef !== 'string' || !raw.sourceRef.length || !object(raw.metadata ?? {})
    || (raw.source !== undefined && raw.source !== source)
    || (raw.version !== undefined && !(typeof raw.version === 'string' || typeof raw.version === 'number' && Number.isFinite(raw.version)))) {
    throw new AdapterError('malformed_record', 'A source record does not satisfy the normalized record contract.');
  }
  const record = {
    id: raw.id, source, timestamp: new Date(raw.timestamp).toISOString(),
    direction: raw.direction ?? null, participants: [...raw.participants],
    content: raw.content, sourceRef: raw.sourceRef, metadata: structuredClone(raw.metadata ?? {}),
    version: String(raw.version ?? '1')
  };
  // Call metadata cannot become an invented transcript. Notes must be explicitly Apple-supplied.
  if (source === 'calls') { record.content = null; record.metadata.contentAvailable = false; }
  if (source === 'notes' && record.metadata.appleTranscriptSupplied !== true) {
    record.content = null;
    record.metadata.transcriptGap = 'missing_apple_transcript';
  }
  return record;
}

function windowOptions({ from, to, limit = 50 } = {}) {
  if (from !== undefined && !validDate(from) || to !== undefined && !validDate(to)
    || !Number.isInteger(limit) || limit < 1 || limit > 100
    || from && to && Date.parse(from) > Date.parse(to)) {
    throw new AdapterError('invalid_page_request', 'Use a valid date window and page limit from 1 to 100.');
  }
  return { from: from ? new Date(from).toISOString() : null, to: to ? new Date(to).toISOString() : null, limit };
}

function cursorOffset(cursor, { id, snapshot, from, to }) {
  if (cursor === null || cursor === undefined) return 0;
  let value;
  try {
    if (typeof cursor !== 'string' || cursor.length > 2048) throw new Error();
    value = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch { throw new AdapterError('invalid_cursor', 'The page cursor is invalid.'); }
  if (!object(value) || value.source !== id || value.snapshot !== snapshot || value.from !== from || value.to !== to
    || !Number.isSafeInteger(value.offset) || value.offset < 0) {
    throw new AdapterError('stale_cursor', 'The source snapshot or date window changed. Restart this source window without advancing coverage.');
  }
  return value.offset;
}

function makeMemoryAdapter(id, rawRecords, history, scenario = {}) {
  knownSource(id);
  const records = rawRecords.map(raw => normalizeRecord(id, raw));
  records.sort((a, b) => b.timestamp.localeCompare(a.timestamp) || a.id.localeCompare(b.id));
  const snapshot = createHash('sha256').update(JSON.stringify(records)).digest('hex');
  let transientFailures = 0;
  function available() {
    if (scenario.denied) throw new AdapterError('permission_denied', 'Synthetic source access was denied.');
    if (scenario.offline) throw new AdapterError('offline', 'Synthetic source is offline.', { retryable: true });
  }
  return {
    id, kind: CLOUD.has(id) ? 'cloud' : 'local', fixture: true,
    sourceHistory: structuredClone(history),
    async probe() {
      available();
      return { available: true, fixture: true, source: id, verifiedRead: false, reason: 'Access probe only; a successful page read is required for a connection receipt.' };
    },
    async readPage(options = {}) {
      available();
      const { from, to, limit } = windowOptions(options);
      const context = { id, snapshot, from, to };
      const offset = cursorOffset(options.cursor, context);
      const eligible = records.filter(record => (!from || record.timestamp >= from) && (!to || record.timestamp <= to));
      if (offset > eligible.length) throw new AdapterError('invalid_cursor', 'The page cursor points beyond the source window.');
      const pageIndex = Math.floor(offset / limit);
      if (scenario.rateLimitAtPage === pageIndex && (!scenario.rateLimitOnce || transientFailures === 0)) {
        transientFailures++;
        throw new AdapterError('rate_limited', 'Synthetic provider rate limit; retry this same cursor.', { retryable: true });
      }
      if (scenario.malformedAtPage === pageIndex) throw new AdapterError('malformed_page', 'Synthetic source returned a malformed page.');
      const repeatPrevious = scenario.duplicateAcrossPages && offset > 0 && limit > 1;
      const capacity = repeatPrevious ? limit - 1 : limit;
      let items = eligible.slice(offset, offset + capacity);
      const end = offset + items.length;
      if (repeatPrevious && items.length) items = [eligible[offset - 1], ...items];
      const exhausted = end >= eligible.length;
      const nextCursor = exhausted ? null : Buffer.from(JSON.stringify({ source: id, snapshot, from, to, offset: end })).toString('base64url');
      const timestamps = items.map(item => item.timestamp).sort();
      return {
        items: structuredClone(items), nextCursor, exhausted,
        oldest: timestamps[0] ?? null, newest: timestamps.at(-1) ?? null,
        gaps: structuredClone(history.gaps ?? []), fixture: true
      };
    }
  };
}

export function makeSyntheticAdapters({ now = FIXTURE_NOW, months = 36, scenarios = {}, cloudMode = 'synthetic' } = {}) {
  if (cloudMode !== 'synthetic') throw new AdapterError('synthetic_only', 'This factory supplies invented records only. It cannot create a live provider connection.');
  return Object.fromEntries(SOURCES.map(id => {
    const scenario = scenarios[id] ?? {};
    const records = fixtureRecords(id, { now, months, scenario });
    const history = fixtureHistory(id, records, { now, months, scenario });
    return [id, makeMemoryAdapter(id, records, history, scenario)];
  }));
}

function requireProviderProof(source, mode, proof) {
  if (mode === 'synthetic') return;
  if (mode !== 'live' || !object(proof) || proof.status !== 'pass' || proof.mode !== 'live-pilot'
    || proof.consent !== true || proof.reviewedByOperator !== true || !validDate(proof.observedAt)
    || !PROVIDER_CHECKS.every(name => proof.checks?.[name]?.passed === true
      && typeof proof.checks[name].artifact === 'string' && proof.checks[name].artifact.trim())) {
    throw new AdapterError('provider_proof_required', `${source} requires its own reviewed history and privacy proof before live page normalization.`);
  }
}

// Caller supplies a bounded canonical envelope after the separately authorized
// connector read. This function does not discover accounts or invoke a plugin.
export function normalizePluginPage({ source, page, mode = 'synthetic', providerProof } = {}) {
  knownSource(source);
  if (!CLOUD.has(source)) throw new AdapterError('not_cloud_source', 'Use a local adapter for this source.');
  // Proof is selected by provider ID; one provider cannot lift another gate.
  const proof = providerProof?.[source];
  if (proof?.provider !== undefined && proof.provider !== source) throw new AdapterError('provider_proof_required', 'The proof belongs to a different provider.');
  requireProviderProof(source, mode, proof);
  if (!object(page) || !Array.isArray(page.items) || page.items.length > 100
    || typeof page.exhausted !== 'boolean'
    || !(page.nextCursor === null || typeof page.nextCursor === 'string' && page.nextCursor.length > 0)
    || page.exhausted !== (page.nextCursor === null) || !Array.isArray(page.gaps ?? [])) {
    throw new AdapterError('malformed_page', 'A plugin page does not satisfy the canonical page contract.');
  }
  if (mode === 'synthetic' && page.items.some(raw => raw?.metadata?.fixture !== true)) {
    throw new AdapterError('synthetic_only', 'Synthetic normalization requires explicitly marked invented fixture records.');
  }
  const items = page.items.map(raw => normalizeRecord(source, raw));
  const timestamps = items.map(item => item.timestamp).sort();
  return {
    items, nextCursor: page.nextCursor, exhausted: page.exhausted,
    oldest: timestamps[0] ?? null, newest: timestamps.at(-1) ?? null,
    gaps: structuredClone(page.gaps ?? []), fixture: mode === 'synthetic'
  };
}

// Explicit fixture path only. The canonical fixture tables cannot match real
// Messages, WhatsApp, Notes, Calendar, or Contacts schemas by accident.
export async function createFixtureSqliteAdapter({ id, path } = {}) {
  knownSource(id);
  if (CLOUD.has(id)) throw new AdapterError('not_local_source', 'SQLite fixtures are for local sources only.');
  if (typeof path !== 'string' || !isAbsolute(path)) throw new AdapterError('explicit_path_required', 'Provide an explicit absolute synthetic fixture database path.');
  let DatabaseSync;
  try { ({ DatabaseSync } = await import('node:sqlite')); }
  catch { throw new AdapterError('sqlite_runtime_unavailable', 'This Node runtime requires SQLite support, including its experimental flag where applicable.'); }
  let database;
  try {
    database = new DatabaseSync(path, { readOnly: true });
    const meta = database.prepare('SELECT source, history_json FROM confidant_fixture_meta').get();
    if (!meta || meta.source !== id) throw new AdapterError('fixture_schema_mismatch', 'The fixture database source does not match the requested adapter.');
    const history = JSON.parse(meta.history_json);
    if (history.fixture !== true) throw new AdapterError('fixture_schema_mismatch', 'The database is not marked as a synthetic fixture.');
    const records = database.prepare('SELECT record_json FROM confidant_fixture_records ORDER BY timestamp DESC, id ASC').all().map(row => JSON.parse(row.record_json));
    return makeMemoryAdapter(id, records, history);
  } catch (error) {
    if (error instanceof AdapterError) throw error;
    throw new AdapterError('fixture_unavailable', 'Cannot read the canonical synthetic fixture database; verify its path and schema.');
  } finally { database?.close(); }
}
