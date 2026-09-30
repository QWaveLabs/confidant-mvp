import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync, mkdirSync, writeFileSync, renameSync } from 'node:fs';

const root = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const option = (key, fallback) => { const index = args.indexOf(key); return index < 0 ? fallback : args[index + 1]; };
const challenge = option('--challenge', 'CMVP-MANUAL-SYNTHETIC');
const trigger = option('--trigger', 'manual');
if (!['manual', 'scheduled'].includes(trigger)) throw new Error('Trigger must be manual or scheduled.');
if (!/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(challenge)) throw new Error('Invalid synthetic challenge.');
const receipts = resolve(root, '.confidant/probes');
const requests = [
  { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'confidant-synthetic-runner', version: '0.1.0' } } },
  { jsonrpc: '2.0', method: 'notifications/initialized' },
  { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'confidant_probe_status', arguments: { challenge } } },
];
const result = await new Promise((resolveResult, reject) => {
  const child = spawn(process.execPath, [resolve(root, 'plugins/confidant/server.mjs')], { env: {}, stdio: ['pipe', 'pipe', 'pipe'] });
  let stdout = ''; let stderr = ''; let settled = false;
  const finish = (error, value) => { if (settled) return; settled = true; clearTimeout(timer); error ? reject(error) : resolveResult(value); };
  const timer = setTimeout(() => { child.kill(); finish(new Error('Private probe unavailable: timed out.')); }, 5000);
  child.on('error', () => finish(new Error('Private probe unavailable: launch failed.')));
  child.stdout.on('data', chunk => { stdout += chunk.toString(); if (stdout.length > 32768) { child.kill(); finish(new Error('Private probe returned oversized output.')); } });
  child.stderr.on('data', chunk => { stderr += chunk.toString(); });
  child.on('close', code => {
    if (code !== 0 || stderr) return finish(new Error('Private probe unavailable: failed run.'));
    try {
      const messages = stdout.trim().split('\n').map(line => JSON.parse(line));
      const response = messages.find(message => message.id === 2);
      const status = response?.result?.structuredContent;
      if (!status || status.challenge !== challenge || status.data_mode !== 'synthetic') throw new Error();
      finish(null, status);
    } catch { finish(new Error('Private probe unavailable: invalid result.')); }
  });
  child.stdin.end(requests.map(request => JSON.stringify(request)).join('\n') + '\n');
});
const receipt = {
  trigger, triggerIsSelfReported: true, needsSchedulerActivityEvidence: true,
  recordedAt: new Date().toISOString(), challenge, operation: 'confidant_probe_status', result,
  communicationsRead: false, customerData: false, notificationDelivered: 'unverified',
};
const receiptPath = resolve(receipts, `${trigger}-probe-receipt.json`);
mkdirSync(dirname(receiptPath), { recursive: true, mode: 0o700 });
const temporary = receiptPath + '.tmp';
writeFileSync(temporary, JSON.stringify(receipt, null, 2) + '\n', { mode: 0o600 });
renameSync(temporary, receiptPath);
console.log(JSON.stringify(receipt, null, 2));
