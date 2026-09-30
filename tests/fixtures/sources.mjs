// Entirely invented records. These are not copies of a Mac or provider schema.
export const FIXTURE_NOW = '2026-09-29T12:00:00.000Z';
export const FIXTURE_SOURCES = ['messages', 'whatsapp', 'calls', 'notes', 'calendar', 'contacts', 'gmail', 'outlook', 'fathom', 'fireflies'];

export function fixtureRecords(source, { now = FIXTURE_NOW, months = 36, scenario = {} } = {}) {
  const clock = new Date(now);
  if (!Number.isFinite(clock.getTime()) || !Number.isInteger(months) || months < 1 || months > 36) throw new TypeError('Invalid synthetic fixture window.');
  const records = [];
  if (scenario.empty) return records;
  if (scenario.partialHistoryMonths !== undefined && (!Number.isInteger(scenario.partialHistoryMonths) || scenario.partialHistoryMonths < 0)) throw new TypeError('Invalid partial fixture window.');
  const availableMonths = Math.min(months, scenario.partialHistoryMonths ?? months);
  for (let month = 0; month < availableMonths; month++) {
    const lastDay = new Date(Date.UTC(clock.getUTCFullYear(), clock.getUTCMonth() - month + 1, 0)).getUTCDate();
    const day = Math.min(clock.getUTCDate(), lastDay);
    const anchor = Date.UTC(clock.getUTCFullYear(), clock.getUTCMonth() - month, day, clock.getUTCHours(), clock.getUTCMinutes());
    const due = new Date(anchor + 86_400_000).toISOString();
    for (let side = 0; side < 2; side++) {
      const id = `${source}:fixture-${month}-${side}`;
      let content = side === 0
        ? `[Synthetic] Alex Example: Please send Project Atlas proposal by ${due}.`
        : `[Synthetic] I will send Project Atlas proposal by ${due}.`;
      const metadata = { fixture: true, monthOffset: month };
      if (source === 'calls') {
        content = null;
        Object.assign(metadata, { durationSeconds: 120, callType: side ? 'facetime' : 'phone', contentAvailable: false });
      }
      if (source === 'notes') {
        metadata.appleTranscriptSupplied = !(scenario.missingTranscript && side === 1);
        metadata.callId = `calls:fixture-${month}-${side}`;
        content = metadata.appleTranscriptSupplied ? `[Synthetic Apple-supplied transcript] I will send Project Atlas proposal by ${due}.` : null;
      }
      if (source === 'calendar') content = '[Synthetic] Project Atlas meeting with Alex Example.';
      if (source === 'contacts') content = '[Synthetic] Alex Example, Project Atlas contact.';
      if (source === 'fathom' || source === 'fireflies') {
        metadata.transcriptAvailable = true;
        content = `[Synthetic transcript] I will send Project Atlas proposal by ${due}.`;
      }
      metadata.expectedSignals = [];
      if (month === 0 && ((['messages', 'gmail', 'outlook'].includes(source) && side === 1)
        || (['fathom', 'fireflies', 'notes'].includes(source) && side === 0 && content !== null))) {
        metadata.expectedSignals.push({ kind: 'commitment', text: 'Send Project Atlas proposal', person: 'Alex Example', project: 'Project Atlas', dueAt: new Date(clock.getTime() + 86_400_000).toISOString() });
      }
      if (source === 'whatsapp' && month === 0 && side === 0) {
        content = `[Synthetic] Can you introduce me to Project Atlas? Needed by ${new Date(clock.getTime() + 2 * 86_400_000).toISOString()}.`;
        metadata.expectedSignals.push({ kind: 'opportunity', text: 'Discuss Project Atlas referral', person: 'Alex Example', project: 'Project Atlas', dueAt: new Date(clock.getTime() + 2 * 86_400_000).toISOString() });
      }
      if (source === 'contacts') metadata.relationshipImportance = 'high';
      const record = {
        id, source, timestamp: new Date(anchor - (side + 1) * 60_000).toISOString(),
        direction: ['messages', 'whatsapp', 'calls', 'gmail', 'outlook'].includes(source) ? (side ? 'outgoing' : 'incoming') : null,
        participants: [side === 1 && scenario.excludedParticipant ? 'Excluded Example' : 'Alex Example'],
        content, sourceRef: `fixture://${source}/${encodeURIComponent(id)}`, metadata,
        version: scenario.changedLatest && month === 0 && side === 0 ? '2' : '1'
      };
      if (record.version === '2') record.content = '[Synthetic changed item] Project Atlas deadline moved; review the updated proposal.';
      records.push(record);
    }
  }
  return records;
}

export function fixtureHistory(source, records, { now = FIXTURE_NOW, months = 36, scenario = {} } = {}) {
  const dates = records.map(record => record.timestamp).sort();
  const gaps = [];
  if (scenario.partialHistoryMonths !== undefined && scenario.partialHistoryMonths < months) {
    gaps.push({ code: 'partial_history', source, availableMonths: scenario.partialHistoryMonths, requestedMonths: months, reason: 'Synthetic older local history is unavailable.' });
  }
  if (source === 'notes') {
    for (const record of records.filter(record => !record.metadata.appleTranscriptSupplied)) {
      gaps.push({ code: 'missing_apple_transcript', source, recordId: record.id, timestamp: record.timestamp, reason: 'Apple has not supplied a transcript in this fixture.' });
    }
  }
  return { oldest: dates[0] ?? null, newest: dates.at(-1) ?? null, gaps, fixture: true, requestedAt: now };
}

export async function writeFixtureDatabase(path, source, options = {}) {
  const { DatabaseSync } = await import('node:sqlite');
  const database = new DatabaseSync(path);
  try {
    database.exec('CREATE TABLE confidant_fixture_meta (source TEXT NOT NULL, history_json TEXT NOT NULL); CREATE TABLE confidant_fixture_records (id TEXT PRIMARY KEY, timestamp TEXT NOT NULL, record_json TEXT NOT NULL);');
    const records = fixtureRecords(source, options);
    const history = fixtureHistory(source, records, options);
    database.prepare('INSERT INTO confidant_fixture_meta VALUES (?, ?)').run(source, JSON.stringify(history));
    const insert = database.prepare('INSERT INTO confidant_fixture_records VALUES (?, ?, ?)');
    database.exec('BEGIN');
    for (const record of records) insert.run(record.id, record.timestamp, JSON.stringify(record));
    database.exec('COMMIT');
    return { records, history };
  } finally { database.close(); }
}
