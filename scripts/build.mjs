import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readTickets } from '../src/gates.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}
const files = ['src', 'scripts', 'tests', 'plugins/confidant'].flatMap(name => walk(resolve(root, name)));
for (const path of files.filter(path => /\.(mjs|js)$/.test(path))) {
  const result = spawnSync(process.execPath, ['--check', path], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`Syntax check failed: ${path}\n${result.stderr}`);
}
for (const path of files.filter(path => path.endsWith('.json'))) JSON.parse(readFileSync(path, 'utf8'));
JSON.parse(readFileSync(resolve(root, 'docs/evidence/gates.json'), 'utf8'));
if (readTickets(root).length !== 24) throw new Error('Expected 24 tracked tickets');
console.log(`Build passed: ${files.length} source, test, and plugin files checked. No installation or deployment performed.`);
