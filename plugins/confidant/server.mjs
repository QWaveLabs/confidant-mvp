// This dependency-free MCP probe implements only the handshake-era stdio
// tools subset. It has no worker, source, filesystem, network, or AI adapter.
import { randomUUID } from 'node:crypto';

const PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18'];
const MAX_LINE_BYTES = 16_384;
const instanceId = randomUUID();
let sequence = 0;
let initialized = false;
let ready = false;
let pending = Buffer.alloc(0);

const statusSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    challenge: { type: 'string' },
    observed_at: { type: 'string', format: 'date-time' },
    instance_id: { type: 'string', format: 'uuid' },
    call_sequence: { type: 'integer', minimum: 1 },
    data_mode: { type: 'string', const: 'synthetic' },
    worker_state: { type: 'string', const: 'probe_only' },
    proof_scope: { type: 'string', const: 'local_process_response' },
    dot_invocation: { type: 'string', const: 'unverified' },
    scheduled_run: { type: 'string', const: 'unverified' },
    notification: { type: 'string', const: 'unverified' },
    offline_behavior: { type: 'string', const: 'unverified' }
  },
  required: [
    'challenge', 'observed_at', 'instance_id', 'call_sequence', 'data_mode',
    'worker_state', 'proof_scope', 'dot_invocation', 'scheduled_run',
    'notification', 'offline_behavior'
  ]
};

const tool = {
  name: 'confidant_probe_status',
  title: 'Read the synthetic Confidant probe status',
  description: 'Return a fresh synthetic local status value and echo a non-sensitive challenge. Reads no communications. This response cannot verify Dot invocation, scheduling, notifications, or a real worker.',
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      challenge: { type: 'string', minLength: 1, maxLength: 128, pattern: '^[A-Za-z0-9][A-Za-z0-9_.:-]*$' }
    },
    required: ['challenge']
  },
  outputSchema: statusSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false
  }
};

function send(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

function fail(id, code, message) {
  send({ jsonrpc: '2.0', id, error: { code, message } });
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function request(line) {
  let message;
  try { message = JSON.parse(line); }
  catch { return fail(null, -32700, 'Invalid JSON.'); }
  if (!isObject(message) || message.jsonrpc !== '2.0' || typeof message.method !== 'string') {
    return fail(null, -32600, 'Invalid JSON-RPC request.');
  }
  if (!Object.hasOwn(message, 'id')) {
    if (message.method === 'notifications/initialized' && initialized) ready = true;
    return;
  }
  const id = message.id;
  if (!(typeof id === 'string' || (typeof id === 'number' && Number.isFinite(id)))) {
    return fail(null, -32600, 'Request ID must be a string or number.');
  }
  const result = value => send({ jsonrpc: '2.0', id, result: value });
  if (message.method === 'ping') return result({});
  if (message.method === 'initialize') {
    if (initialized) return fail(id, -32600, 'The probe is already initialized.');
    const params = message.params;
    if (!isObject(params) || typeof params.protocolVersion !== 'string'
      || !isObject(params.capabilities) || !isObject(params.clientInfo)
      || typeof params.clientInfo.name !== 'string' || typeof params.clientInfo.version !== 'string') {
      return fail(id, -32602, 'Initialization parameters are incomplete.');
    }
    initialized = true;
    return result({
      protocolVersion: PROTOCOL_VERSIONS.includes(params.protocolVersion) ? params.protocolVersion : PROTOCOL_VERSIONS[0],
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: 'confidant-probe', version: '0.1.0' },
      instructions: 'Synthetic feasibility probe only. Never infer Dot, scheduled, notification, source, or worker readiness from this response. On disconnection, report unavailable and never reuse an earlier result.'
    });
  }
  if (!ready) return fail(id, -32600, 'Initialize the probe and send notifications/initialized first.');
  if (message.method === 'tools/list') return result({ tools: [tool] });
  if (message.method !== 'tools/call') return fail(id, -32601, 'Unsupported method.');
  const params = message.params;
  if (!isObject(params) || params.name !== tool.name) return fail(id, -32602, 'Unknown tool.');
  const args = params.arguments;
  if (!isObject(args) || Object.keys(args).length !== 1 || !Object.hasOwn(args, 'challenge')
    || typeof args.challenge !== 'string' || args.challenge.length > 128
    || !/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/.test(args.challenge)) {
    return fail(id, -32602, 'Provide one non-sensitive challenge of 1 to 128 ASCII letters, digits, periods, underscores, colons, or hyphens, beginning with a letter or digit.');
  }
  const status = {
    challenge: args.challenge,
    observed_at: new Date().toISOString(),
    instance_id: instanceId,
    call_sequence: ++sequence,
    data_mode: 'synthetic',
    worker_state: 'probe_only',
    proof_scope: 'local_process_response',
    dot_invocation: 'unverified',
    scheduled_run: 'unverified',
    notification: 'unverified',
    offline_behavior: 'unverified'
  };
  return result({ content: [{ type: 'text', text: JSON.stringify(status) }], structuredContent: status });
}

// Buffer only bounded JSON lines. Errors never echo untrusted input to logs.
process.stdin.on('data', chunk => {
  pending = Buffer.concat([pending, chunk]);
  let newline;
  while ((newline = pending.indexOf(10)) !== -1) {
    const line = pending.subarray(0, newline);
    pending = pending.subarray(newline + 1);
    if (line.length > MAX_LINE_BYTES) {
      fail(null, -32600, 'Request exceeds the probe size limit.');
      process.stdin.pause();
      process.exitCode = 1;
      process.stdin.destroy();
      return;
    }
    request(line.toString('utf8'));
  }
  if (pending.length > MAX_LINE_BYTES) {
    fail(null, -32600, 'Request exceeds the probe size limit.');
    process.exitCode = 1;
    process.stdin.destroy();
  }
});
process.stdin.on('end', () => {
  if (pending.length) {
    fail(null, -32600, 'Incomplete newline-delimited request.');
    process.exitCode = 1;
  }
});
process.stdin.on('error', () => { process.exitCode = 1; });
