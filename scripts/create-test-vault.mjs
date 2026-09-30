import { fileURLToPath } from 'node:url';
import { createTestVault } from '../src/vault.mjs';
if (!process.argv.includes('--create-synthetic-vault')) throw new Error('Vault creation is deferred. Run this optional utility only after explicitly deciding to create a synthetic vault.');
console.log(createTestVault(fileURLToPath(new URL('..', import.meta.url))));
