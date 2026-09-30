import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import test from 'node:test';

const serverPath = fileURLToPath(new URL('../server.mjs', import.meta.url));

function client(t) {
  const process = spawn(globalThis.process.execPath, [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe'], env: {}
  });
  t.after(() => { if (process.exitCode === null) process.kill(); });
  let buffer = '';
  let nextId = 1;
  let stderr = '';
  const waiting = new Map();
  const unsolicited = [];
  process.stderr.on('data', chunk => { stderr += chunk.toString(); });
  process.stdout.on('data', chunk => {
    buffer += chunk.toString();
    let newline;
    while ((newline = buffer.indexOf('\n')) !== -1) {
      const message = JSON.parse(buffer.slice(0, newline));
      buffer = buffer.slice(newline + 1);
      const resolve = waiting.get(message.id);
      if (resolve) { waiting.delete(message.id); resolve(message); }
      else unsolicited.push(message);
    }
  });
  process.on('exit', () => {
    for (const resolve of waiting.values()) resolve({ unavailable: true });
    waiting.clear();
  });
  function send(method, params) {
    if (process.exitCode !== null || process.signalCode !== null) return Promise.resolve({ unavailable: true });
    const id = nextId++;
    return new Promise(resolve => {
      waiting.set(id, resolve);
      process.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
    });
  }
  return {
    process, send, unsolicited,
    stderr: () => stderr,
    async initialize(version = '2025-11-25') {
      const response = await send('initialize', {
        protocolVersion: version, capabilities: {}, clientInfo: { name: 'synthetic-test', version: '1.0.0' }
      });
      process.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);
      return response;
    }
  };
}

test('packaged entry point resolves to the locally tested server and one skill', async () => {
  const manifest = JSON.parse(await readFile(new URL('../plugin.json', import.meta.url)));
  const config = JSON.parse(await readFile(new URL('../mcp.json', import.meta.url)));
  assert.equal(manifest.name, 'confidant-probe');
  assert.equal(manifest.$schema, 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json');
  assert.deepEqual(Object.keys(config.mcpServers), ['confidant-probe']);
  const connection = config.mcpServers['confidant-probe'];
  assert.equal(connection.type, 'stdio');
  assert.equal(connection.command, 'node');
  assert.deepEqual(connection.args, ['${PLUGIN_ROOT}/server.mjs']);
  assert.equal(connection.cwd, '${PLUGIN_ROOT}');
  assert.equal(connection.env, undefined);
  const skill = await readFile(new URL('../skills/probe-status/SKILL.md', import.meta.url), 'utf8');
  assert.ok(skill.includes('confidant_probe_status'));
});

test('fresh stdio results echo separate challenges and preserve every live gate as unverified', { timeout: 5000 }, async t => {
  const c = client(t);
  const before = Date.now();
  const initialization = await c.initialize();
  assert.equal(initialization.result.protocolVersion, '2025-11-25');
  assert.deepEqual(Object.keys(initialization.result.capabilities), ['tools']);
  const listing = await c.send('tools/list', {});
  assert.deepEqual(listing.result.tools.map(tool => tool.name), ['confidant_probe_status']);
  assert.equal(listing.result.tools[0].annotations.readOnlyHint, true);
  assert.equal(listing.result.tools[0].annotations.openWorldHint, false);
  const first = await c.send('tools/call', { name: 'confidant_probe_status', arguments: { challenge: 'CMVP-001-MANUAL-fixture' } });
  const second = await c.send('tools/call', { name: 'confidant_probe_status', arguments: { challenge: 'CMVP-001-SCHEDULE-fixture' } });
  const a = first.result.structuredContent;
  const b = second.result.structuredContent;
  assert.equal(a.challenge, 'CMVP-001-MANUAL-fixture');
  assert.equal(b.challenge, 'CMVP-001-SCHEDULE-fixture');
  assert.equal(a.instance_id, b.instance_id);
  assert.match(a.instance_id, /^[0-9a-f-]{36}$/);
  assert.equal(a.call_sequence, 1);
  assert.equal(b.call_sequence, 2);
  for (const status of [a, b]) {
    assert.ok(Date.parse(status.observed_at) >= before);
    assert.ok(Date.parse(status.observed_at) <= Date.now());
    assert.equal(status.data_mode, 'synthetic');
    assert.equal(status.worker_state, 'probe_only');
    assert.equal(status.proof_scope, 'local_process_response');
    for (const gate of ['dot_invocation', 'scheduled_run', 'notification', 'offline_behavior']) {
      assert.equal(status[gate], 'unverified');
    }
  }
  assert.deepEqual(JSON.parse(first.result.content[0].text), a);
  assert.equal(c.stderr(), '');
});

test('no source or outbound tool exists and rejected input is never echoed', { timeout: 5000 }, async t => {
  const c = client(t);
  await c.initialize();
  const secret = 'private-content-sentinel@invalid.example';
  for (const args of [{}, { challenge: secret }, { challenge: 'a'.repeat(129) }, { challenge: 'OK', path: secret }]) {
    const response = await c.send('tools/call', { name: 'confidant_probe_status', arguments: args });
    assert.equal(response.error.code, -32602);
    assert.ok(!JSON.stringify(response).includes(secret));
  }
  for (const name of ['read_messages', 'send_email', 'classify_batch']) {
    const response = await c.send('tools/call', { name, arguments: { challenge: 'SAFE' } });
    assert.equal(response.error.code, -32602);
  }
  const resource = await c.send('resources/read', { uri: 'file:///synthetic-unavailable' });
  assert.equal(resource.error.code, -32601);
  const status = await c.send('tools/call', { name: 'confidant_probe_status', arguments: { challenge: 'SAFE' } });
  assert.equal(status.result.structuredContent.call_sequence, 1);
  assert.equal(c.stderr(), '');
});

test('handshake is required and unsupported versions negotiate a declared version', { timeout: 5000 }, async t => {
  const c = client(t);
  const early = await c.send('tools/list', {});
  assert.equal(early.error.code, -32600);
  const init = await c.initialize('unsupported-fixture-version');
  assert.equal(init.result.protocolVersion, '2025-11-25');
  const listing = await c.send('tools/list', {});
  assert.equal(listing.result.tools.length, 1);
  const older = client(t);
  const oldInit = await older.initialize('2025-06-18');
  assert.equal(oldInit.result.protocolVersion, '2025-06-18');
});

test('termination cannot yield a cached successful response; restart creates a new instance', { timeout: 5000 }, async t => {
  const c = client(t);
  await c.initialize();
  const first = await c.send('tools/call', { name: 'confidant_probe_status', arguments: { challenge: 'ONLINE' } });
  const exited = once(c.process, 'exit');
  c.process.kill('SIGTERM');
  await exited;
  assert.deepEqual(await c.send('tools/call', { name: 'confidant_probe_status', arguments: { challenge: 'OFFLINE' } }), { unavailable: true });
  const restarted = client(t);
  await restarted.initialize();
  const next = await restarted.send('tools/call', { name: 'confidant_probe_status', arguments: { challenge: 'RESTARTED' } });
  assert.notEqual(next.result.structuredContent.instance_id, first.result.structuredContent.instance_id);
  assert.equal(next.result.structuredContent.call_sequence, 1);
});

test('oversize stdio input exits with a bounded error without logging the payload', { timeout: 5000 }, async t => {
  const c = client(t);
  const closed = once(c.process, 'close');
  c.process.stdin.end('Z'.repeat(16_385));
  const [code] = await closed;
  assert.equal(code, 1);
  assert.equal(c.unsolicited.length, 1);
  assert.equal(c.unsolicited[0].error.code, -32600);
  assert.ok(JSON.stringify(c.unsolicited[0]).length < 200);
  assert.equal(c.stderr(), '');
});
