import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createFixtureSqliteAdapter } from '../../src/adapters.mjs';
import { writeFixtureDatabase } from './sources.mjs';

const [path, source] = process.argv.slice(2);
const expected = await writeFixtureDatabase(path, source, { months: 36 });
const hash = async () => createHash('sha256').update(await readFile(path)).digest('hex');
const before = await hash();
const adapter = await createFixtureSqliteAdapter({ id: source, path });
const probe = await adapter.probe();
assert.equal(probe.verifiedRead, false);
const records = [];
let cursor = null;
do {
  const page = await adapter.readPage({ cursor, limit: 13 });
  records.push(...page.items);
  cursor = page.nextCursor;
} while (cursor);
assert.equal(records.length, expected.records.length);
assert.deepEqual(new Set(records.map(record => record.id)), new Set(expected.records.map(record => record.id)));
assert.equal(await hash(), before);
await assert.rejects(createFixtureSqliteAdapter({ id: source, path: `${path}.missing` }), error => error.code === 'fixture_unavailable');
console.log(JSON.stringify({ source, records: records.length, readonly: true, synthetic: true }));
