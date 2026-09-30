import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('../src/cli.mjs', import.meta.url));
test('fresh external CLI setup pauses and resumes full 36-month fixtures, exports and deletes without creating a vault', t => {
  const directory = mkdtempSync(join(tmpdir(), 'confidant-cli-')); t.after(() => rmSync(directory, { recursive: true, force: true }));
  function run(command, args = [], ok = true) {
    const result = spawnSync(process.execPath, ['--experimental-sqlite', cli, command, '--data', directory, ...args], { encoding: 'utf8', env: {}, timeout: 45000 });
    assert.ifError(result.error);
    assert.equal(result.status === 0, ok, result.stderr); return ok ? JSON.parse(result.stdout) : result.stderr;
  }
  const recent = run('demo'); assert.equal(recent.mode, 'synthetic-only'); assert.equal(recent.noVaultCreated, true); assert.ok(recent.firstBrief.items.length);
  assert.equal(run('health').paused, true); assert.match(run('demo', [], false), /Existing/);
  const resumed = run('resume'); assert.equal(resumed.noVaultCreated, true); assert.equal(resumed.reconciliation.sources.length, 10);
  let committed = 0; let excluded = 0;
  for (const source of resumed.reconciliation.sources) {
    assert.equal(source.exhausted, true); assert.equal(source.counts.processing.pending ?? 0, 0);
    committed += source.counts.coverage.committed ?? 0; excluded += source.counts.coverage.excluded ?? 0;
  }
  assert.equal(committed, 636); assert.equal(excluded, 36);
  assert.ok(run('query', ['--text', 'Project Atlas']).answer.every(item => item.citation.startsWith('fixture://')));
  const exported = run('export').exported; assert.ok(existsSync(exported));
  assert.match(run('delete', [], false), /Confirm/);
  assert.equal(run('delete', ['--confirm-synthetic-delete']).deleted, true); assert.equal(existsSync(exported), false);
  assert.match(run('health', [], false), /deleted/);
});
