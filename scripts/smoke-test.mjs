// E2E smoke test against locally running web (4321) + mcp (3001) + postgres (5434).
// Logs in with the validated test merchant, opens an MCP SSE session, lists tools,
// and calls export_categories (Node-backed, exercises NodeTokenRefresher path).
//
//   node scripts/smoke-test.mjs

const WEB = 'http://localhost:4321';
const MCP = 'http://localhost:3001';
const EMAIL = 'super.daniel@komercia.co';
const PASSWORD = 'J=EfYD9C,U%iM9nqJfVEAYEx5zdC@H';

function log(label, value) {
  console.log(`\n--- ${label} ---`);
  console.log(typeof value === 'string' ? value : JSON.stringify(value, null, 2));
}

function fail(msg) {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
}

// 1) Get a CSRF cookie from the homepage (Astro middleware sets it).
const homeRes = await fetch(WEB);
const setCookie = homeRes.headers.getSetCookie?.() ?? [];
const csrfCookie = setCookie.find((c) => c.startsWith('csrf_token='));
if (!csrfCookie) fail('No csrf_token cookie set by /');
const csrfValue = csrfCookie.split(';')[0].split('=')[1];
log('CSRF cookie', csrfValue.slice(0, 16) + '...');

// 2) POST /api/login.
const loginRes = await fetch(`${WEB}/api/login`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfValue,
    Cookie: `csrf_token=${csrfValue}`,
  },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
if (!loginRes.ok) fail(`Login failed: ${loginRes.status} ${await loginRes.text()}`);
const loginBody = await loginRes.json();
log('Login response', { ...loginBody, token: loginBody.token.slice(0, 30) + '...' });
const TOKEN = loginBody.token;
if (!TOKEN || loginBody.store_id !== '1559') fail('Unexpected login response');

// 3) Open MCP SSE connection (detached read).
const sseRes = await fetch(`${MCP}/sse`, {
  headers: { Authorization: `Bearer ${TOKEN}` },
});
if (!sseRes.ok) fail(`SSE connect failed: ${sseRes.status}`);
const reader = sseRes.body.getReader();
const decoder = new TextDecoder();

// Parse the initial SSE event to extract the messages endpoint with sessionId.
let sessionEndpoint = null;
const incoming = [];
const responseQueue = [];
const pendingByRequestId = new Map();

(async function readSse() {
  let buf = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf('\n\n')) !== -1) {
      const event = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      const dataLine = event.split('\n').find((l) => l.startsWith('data:'));
      if (!dataLine) continue;
      const data = dataLine.slice(5).trim();
      const eventLine = event.split('\n').find((l) => l.startsWith('event:'));
      const evType = eventLine ? eventLine.slice(6).trim() : 'message';
      if (evType === 'endpoint') {
        sessionEndpoint = data;
      } else {
        try {
          const msg = JSON.parse(data);
          incoming.push(msg);
          if (msg.id !== undefined && pendingByRequestId.has(msg.id)) {
            const resolver = pendingByRequestId.get(msg.id);
            pendingByRequestId.delete(msg.id);
            resolver(msg);
          }
        } catch {
          /* ignore */
        }
      }
    }
  }
})().catch((err) => console.error('SSE reader error:', err));

// Wait until we got the endpoint.
const start = Date.now();
while (!sessionEndpoint && Date.now() - start < 5000) {
  await new Promise((r) => setTimeout(r, 50));
}
if (!sessionEndpoint) fail('Did not receive SSE endpoint event');
log('SSE endpoint', sessionEndpoint);

const messagesUrl = sessionEndpoint.startsWith('http') ? sessionEndpoint : `${MCP}${sessionEndpoint}`;

async function rpc(method, params, id) {
  const body = { jsonrpc: '2.0', id, method, params };
  const responsePromise = new Promise((resolve, reject) => {
    pendingByRequestId.set(id, resolve);
    setTimeout(() => {
      pendingByRequestId.delete(id);
      reject(new Error(`RPC ${method} #${id} timed out after 30s`));
    }, 30000);
  });
  const r = await fetch(messagesUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify(body),
  });
  if (r.status !== 202 && r.status !== 200) {
    fail(`POST ${messagesUrl} returned ${r.status}: ${await r.text()}`);
  }
  return responsePromise;
}

// 4) initialize
const initResp = await rpc(
  'initialize',
  {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'smoke-test', version: '0.1.0' },
  },
  1,
);
log('initialize result', initResp.result);

// 5) tools/list
const toolsList = await rpc('tools/list', {}, 2);
log(
  'tools/list',
  toolsList.result.tools.map((t) => t.name),
);

// 6) tools/call → export_categories
const callResp = await rpc(
  'tools/call',
  {
    name: 'export_categories',
    arguments: {},
  },
  3,
);
const callResult = callResp.result;
log('export_categories preview', {
  isError: callResult.isError ?? false,
  content_first_500: callResult.content[0].text.slice(0, 500),
});

// 7) tools/call → list_payment_gateways (Laravel-only, no refresh path)
const gwResp = await rpc('tools/call', { name: 'list_payment_gateways', arguments: {} }, 4);
const gwResult = gwResp.result;
log('list_payment_gateways preview', {
  isError: gwResult.isError ?? false,
  content_first_500: gwResult.content[0].text.slice(0, 500),
});

console.log('\n✓ Smoke test passed end-to-end');
process.exit(0);
