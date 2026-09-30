import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync, statSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createTestVault, writeGenerated } from '../src/vault.mjs';

test('separate synthetic vault contains truthful gaps and does not alter other files', t => {
  const root = mkdtempSync(join(tmpdir(), 'confidant-vault-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  const other = join(root, 'existing-vault.md'); writeFileSync(other, 'Do not change.');
  const vault = createTestVault(root, { now: '2026-09-30T03:30:00Z' });
  assert.equal(readFileSync(other, 'utf8'), 'Do not change.');
  assert.ok(existsSync(join(vault, '.obsidian/app.json')));
  assert.match(readFileSync(join(vault, 'Home.md'), 'utf8'), /synthetic/);
  assert.match(readFileSync(join(vault, '_System/Coverage.md'), 'utf8'), /Counts and historical date ranges are unknown/);
  assert.match(readFileSync(join(vault, '_System/Scheduled Test.md'), 'utf8'), /Actual scheduled trigger: pending/);
  assert.equal(statSync(vault).mode & 0o777, 0o700);
});
test('generated notes preserve handwritten content rather than overwrite it', t => {
  const root = mkdtempSync(join(tmpdir(), 'confidant-write-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  const path = join(root, 'personal.md'); writeFileSync(path, 'My own text.');
  assert.throws(() => writeGenerated(path, 'generated'), /Refusing/);
  assert.equal(readFileSync(path, 'utf8'), 'My own text.');
  const generated = join(root, 'generated.md'); writeGenerated(generated, 'Synthetic note.');
  writeFileSync(generated, readFileSync(generated, 'utf8') + 'Handwritten addition.');
  assert.throws(() => writeGenerated(generated, 'replacement'), /Refusing/);
  assert.match(readFileSync(generated, 'utf8'), /Handwritten addition/);
});
