'use strict';

/**
 * Minimal Strapi MCP client (Streamable HTTP, JSON-RPC over POST /mcp).
 * Useful to inspect the MCP server without an AI client.
 *
 *   STRAPI_MCP_TOKEN=<admin token> node scripts/mcp-call.js tools/list
 *   STRAPI_MCP_TOKEN=<admin token> node scripts/mcp-call.js list_doctor '{"pageSize":3}'
 *
 * Docs: https://docs.strapi.io/cms/features/strapi-mcp-server
 */

const url = process.env.STRAPI_MCP_URL || 'http://localhost:1337/mcp';
const token = process.env.STRAPI_MCP_TOKEN;
if (!token) {
  console.error('Set STRAPI_MCP_TOKEN to an admin token (Settings → Admin tokens).');
  process.exit(1);
}

const [, , method = 'tools/list', rawArgs = '{}'] = process.argv;
let id = 0;

async function rpc(rpcMethod, params) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method: rpcMethod, params }),
  });
  const text = await res.text();
  // Responses may be plain JSON or a single SSE `data:` event.
  const payload = text.trim().startsWith('{') ? text : text.split('\n').find((l) => l.startsWith('data:'))?.slice(5);
  if (!payload) throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(payload);
}

async function main() {
  await rpc('initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'fertiva-mcp-cli', version: '1.0.0' },
  });
  const result =
    method === 'tools/list' ? await rpc('tools/list', {}) : await rpc('tools/call', { name: method, arguments: JSON.parse(rawArgs) });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
