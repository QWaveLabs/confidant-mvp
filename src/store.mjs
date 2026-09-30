import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, existsSync, chmodSync, readFileSync, writeFileSync, rmSync, lstatSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

export const hash = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const STORE_IDENTITY = 'confidant-synthetic-evaluation-v1';
const RUNTIME_IDENTITY = 'confidant-assisted-local-v1';
export class BrainStore {
  constructor(directory, { resetDeleted = false, mode = 'synthetic' } = {}) {
    if (!['synthetic', 'assisted-local'].includes(mode)) throw new Error('Unknown brain mode.');
    this.identity = mode === 'synthetic' ? STORE_IDENTITY : RUNTIME_IDENTITY;
    this.directory = resolve(directory);
    this.tombstone = resolve(this.directory, 'disabled.json');
    this.path = resolve(this.directory, 'brain.sqlite');
    for (const path of [this.directory, this.path, this.tombstone, this.path + '-wal', this.path + '-shm']) {
      try { if (lstatSync(path).isSymbolicLink()) throw new Error('Evaluation storage must not use symlinks.'); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    const tombstone = existsSync(this.tombstone) ? JSON.parse(readFileSync(this.tombstone, 'utf8')) : null;
    if (tombstone && tombstone.storeIdentity !== this.identity) throw new Error('Unrecognized existing directory. Choose a fresh dedicated directory.');
    if (!existsSync(this.path) && existsSync(this.directory) && readdirSync(this.directory).some(name => name !== 'disabled.json')) throw new Error('Choose an empty, dedicated evaluation directory. Existing files will not be modified.');
    if (existsSync(this.path)) {
      const existing = new DatabaseSync(this.path, { readOnly: true });
      try {
        existing.exec('PRAGMA busy_timeout=5000');
        const identity = existing.prepare("SELECT value FROM meta WHERE key='storeIdentity'").get();
        if (!identity || JSON.parse(identity.value) !== this.identity) throw new Error();
      } catch { throw new Error('This is not a recognized brain for the selected mode. Refusing to modify it.'); }
      finally { existing.close(); }
    }
    if (tombstone && !resetDeleted) throw new Error('Local brain deleted. Start setup explicitly to create a new brain.');
    mkdirSync(this.directory, { recursive: true, mode: 0o700 });
    chmodSync(this.directory, 0o700);
    if (resetDeleted && tombstone) rmSync(this.tombstone);
    this.db = new DatabaseSync(this.path);
    chmodSync(this.path, 0o600);
    this.db.exec(`PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA secure_delete=ON;
      CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sources (id TEXT PRIMARY KEY, state TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS records (key TEXT PRIMARY KEY, source TEXT NOT NULL, fingerprint TEXT NOT NULL, processing TEXT NOT NULL, body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS coverage_items (key TEXT PRIMARY KEY, source TEXT NOT NULL, state TEXT NOT NULL, reason TEXT, timestamp TEXT);
      CREATE TABLE IF NOT EXISTS windows (key TEXT PRIMARY KEY, source TEXT NOT NULL, state TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS facts (id TEXT PRIMARY KEY, record_key TEXT NOT NULL REFERENCES records(key) ON DELETE CASCADE, body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS feedback (id TEXT PRIMARY KEY, body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS drafts (id TEXT PRIMARY KEY, body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS deliveries (id TEXT PRIMARY KEY, body TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS records_source_processing ON records(source,processing);
      CREATE INDEX IF NOT EXISTS records_timestamp ON records(json_extract(body,'$.timestamp') DESC);
      CREATE INDEX IF NOT EXISTS coverage_source_timestamp ON coverage_items(source,timestamp);
    `);
    if (!this.get('salt')) this.set('salt', randomUUID());
    if (!this.get('storeIdentity')) { this.set('storeIdentity', this.identity); this.set('mode', mode); }
    for (const suffix of ['-wal', '-shm']) if (existsSync(this.path + suffix)) chmodSync(this.path + suffix, 0o600);
  }
  transaction(callback) {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = callback(); this.db.exec('COMMIT'); return result; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  get(key, fallback = null) { const row = this.db.prepare('SELECT value FROM meta WHERE key = ?').get(key); return row ? JSON.parse(row.value) : fallback; }
  set(key, value) { this.db.prepare('INSERT INTO meta VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, JSON.stringify(value)); }
  source(id) { const row = this.db.prepare('SELECT state FROM sources WHERE id = ?').get(id); return row ? JSON.parse(row.state) : null; }
  saveSource(source) { const state = { ...source, revision: (this.source(source.id)?.revision ?? 0) + 1 }; this.db.prepare('INSERT INTO sources VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET state=excluded.state').run(source.id, JSON.stringify(state)); }
  sources() { return this.db.prepare('SELECT state FROM sources ORDER BY id').all().map(row => JSON.parse(row.state)); }
  records({ source, processing, query = '', limit = 100, activeOnly = false } = {}) {
    const clauses = []; const values = [];
    if (source) { clauses.push('source = ?'); values.push(source); }
    if (processing) { clauses.push('processing = ?'); values.push(processing); }
    if (activeOnly) clauses.push("source IN (SELECT id FROM sources WHERE json_extract(state,'$.disabled') IS NOT 1 AND json_extract(state,'$.authorized') = 1)");
    // Search locally; no embeddings or remote API. LIKE parameters are escaped.
    if (query) { clauses.push("body LIKE ? ESCAPE '\\'"); values.push(`%${query.replace(/[\\%_]/g, '\\$&')}%`); }
    values.push(Math.max(1, Math.min(1000, limit)));
    return this.db.prepare(`SELECT * FROM records ${clauses.length ? 'WHERE ' + clauses.join(' AND ') : ''} ORDER BY json_extract(body, '$.timestamp') DESC, key LIMIT ?`).all(...values)
      .map(row => ({ ...JSON.parse(row.body), key: row.key, fingerprint: row.fingerprint, processing: row.processing }));
  }
  record(key) { const row = this.db.prepare('SELECT * FROM records WHERE key = ?').get(key); return row ? { ...JSON.parse(row.body), key, fingerprint: row.fingerprint, processing: row.processing } : null; }
  putRecord(record) {
    const key = `${record.source}:${record.id}`; const fingerprint = hash(record);
    this.db.prepare('DELETE FROM coverage_items WHERE key = ?').run(`excluded:${hash(this.get('salt') + key)}`);
    const existing = this.db.prepare('SELECT fingerprint FROM records WHERE key = ?').get(key);
    if (existing?.fingerprint === fingerprint) return { key, changed: false };
    this.db.prepare('DELETE FROM facts WHERE record_key = ?').run(key);
    this.db.prepare('INSERT INTO records VALUES (?, ?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET fingerprint=excluded.fingerprint, processing=excluded.processing, body=excluded.body')
      .run(key, record.source, fingerprint, 'pending', JSON.stringify(record));
    this.coverage(key, record.source, 'committed', null, record.timestamp);
    return { key, changed: true };
  }
  coverage(key, source, state, reason = null, timestamp = null) {
    this.db.prepare('INSERT INTO coverage_items VALUES (?, ?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET state=excluded.state, reason=excluded.reason, timestamp=excluded.timestamp').run(key, source, state, reason, timestamp);
  }
  exclude(record, reason) {
    const identity = `${record.source}:${record.id}`;
    // No excluded text, identity, or participants are stored. The salted token is a reconciliation tombstone.
    const token = hash(this.get('salt') + identity);
    this.db.prepare('DELETE FROM records WHERE key = ?').run(identity);
    this.db.prepare('DELETE FROM coverage_items WHERE key = ?').run(identity);
    for (const table of ['feedback', 'drafts', 'deliveries']) {
      for (const row of this.db.prepare(`SELECT id,body FROM ${table}`).all()) {
        if (row.body.includes(JSON.stringify(record.sourceRef).slice(1, -1))) this.db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(row.id);
      }
    }
    this.coverage(`excluded:${token}`, record.source, 'excluded', reason, record.timestamp);
  }
  saveWindow(source, key, state) {
    this.db.prepare('INSERT INTO windows VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET state=excluded.state').run(`${source}:${key}`, source, JSON.stringify(state));
  }
  windows(source) { return this.db.prepare('SELECT state FROM windows WHERE source = ? ORDER BY key').all(source).map(row => JSON.parse(row.state)); }
  facts() { return this.db.prepare('SELECT body FROM facts ORDER BY id').all().map(row => JSON.parse(row.body)); }
  saveFact(fact) { this.db.prepare('INSERT INTO facts VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET body=excluded.body').run(fact.id, fact.recordKey, JSON.stringify(fact)); }
  setProcessing(key, processing) { this.db.prepare('UPDATE records SET processing = ? WHERE key = ?').run(processing, key); }
  rows(table) {
    if (!['feedback', 'drafts', 'deliveries'].includes(table)) throw new Error('Unsupported store view.');
    return this.db.prepare(`SELECT body FROM ${table} ORDER BY id`).all().map(row => JSON.parse(row.body));
  }
  saveRow(table, item) {
    if (!['feedback', 'drafts', 'deliveries'].includes(table)) throw new Error('Unsupported store view.');
    this.db.prepare(`INSERT INTO ${table} VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET body=excluded.body`).run(item.id, JSON.stringify(item));
  }
  counts(source) {
    const coverage = this.db.prepare('SELECT state, COUNT(*) AS count FROM coverage_items WHERE source = ? GROUP BY state').all(source);
    const processing = this.db.prepare('SELECT processing, COUNT(*) AS count FROM records WHERE source = ? GROUP BY processing').all(source);
    return { coverage: Object.fromEntries(coverage.map(row => [row.state, row.count])), processing: Object.fromEntries(processing.map(row => [row.processing, row.count])) };
  }
  exportBrain() {
    return { format: 'confidant-local-brain-v1', mode: this.get('mode', 'synthetic'), profile: this.get('profile'), sources: this.sources(),
      records: this.db.prepare('SELECT * FROM records').all().map(row => ({ ...JSON.parse(row.body), key: row.key, processing: row.processing })),
      coverage: this.db.prepare('SELECT source,state,COUNT(*) AS count FROM coverage_items GROUP BY source,state').all(),
      windows: this.db.prepare('SELECT source,state FROM windows').all().map(row => ({ source: row.source, ...JSON.parse(row.state) })),
      facts: this.facts(), feedback: this.rows('feedback'), drafts: this.rows('drafts'), deliveries: this.rows('deliveries') };
  }
  close() { if (this.db) { this.db.close(); this.db = null; } }
  writeArtifact(name, value) {
    if (!['brain-export.json', 'classification-batch.json', 'classification-output.json'].includes(name)) throw new Error('Unsupported evaluation artifact.');
    const path = resolve(this.directory, name); const owned = this.get('ownedArtifacts', []);
    if (existsSync(path) && (!owned.includes(name) || lstatSync(path).isSymbolicLink())) throw new Error('Refusing to overwrite an unowned artifact.');
    writeFileSync(path, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
    chmodSync(path, 0o600);
    this.set('ownedArtifacts', [...new Set([...owned, name])]); return path;
  }
  purgeArtifacts() {
    for (const name of this.get('ownedArtifacts', [])) {
      const path = resolve(this.directory, name);
      if (existsSync(path) && !lstatSync(path).isSymbolicLink()) rmSync(path);
    }
    this.set('ownedArtifacts', []);
    this.db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
  }
  deleteLocalBrain() {
    this.purgeArtifacts();
    this.close();
    for (const suffix of ['', '-wal', '-shm']) if (existsSync(this.path + suffix)) rmSync(this.path + suffix);
    writeFileSync(this.tombstone, JSON.stringify({ storeIdentity: this.identity, deleted: true, sourcesDisabled: true }) + '\n', { mode: 0o600 });
    return { deleted: true, externalData: 'This does not erase chat history or data retained by source plugins. Disconnect those integrations separately.' };
  }
}
