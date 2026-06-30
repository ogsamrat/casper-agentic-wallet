// Verify the packaged wallet works exactly as Claude would launch it: spawn the
// server with INJECTED env (no .env reliance), then exercise the MCP tools across
// both chains. Point MCPB_SERVER at the extracted .mcpb's server/index.js.
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
loadEnv({ path: resolve(process.cwd(), '../.env') }); // read secrets from the repo .env

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const SERVER = process.env.MCPB_SERVER ?? './dist/index.js';

// The env Claude injects from manifest mcp_config.env, resolved with real values.
const env: Record<string, string> = {
  WISP_MNEMONIC: process.env.WISP_MNEMONIC ?? '',
  WISP_KEY_ALGO: 'secp256k1',
  WISP_ACCOUNT_INDEX: '0',
  CASPER_NETWORK: 'casper:casper-test',
  CASPER_CHAIN_NAME: 'casper-test',
  CASPER_NODE_URL: 'https://node.testnet.cspr.cloud/rpc',
  CSPR_CLOUD_API_KEY: process.env.CSPR_CLOUD_API_KEY ?? '',
  CSPR_CLOUD_REST_URL: 'https://api.testnet.cspr.cloud',
  X402_FACILITATOR_URL: 'https://x402-facilitator.cspr.cloud',
  X402_FACILITATOR_API_KEY: process.env.CSPR_CLOUD_API_KEY ?? '',
  WISP_ASSET_PACKAGE: '65bedddde009284db1bd62614afc8bbeb405590ddec1669eca3db38b5e18810f',
  WISP_ASSET_NAME: 'Wisp Dollar', WISP_ASSET_SYMBOL: 'WISP', WISP_ASSET_VERSION: '1', WISP_ASSET_DECIMALS: '9',
  WISP_MAX_PER_CALL: '0.10', WISP_MAX_PER_DAY: '20.00',
  WISP_API_URL: 'https://casper-api.vercel.app',
  WISP_HUB_URL: 'https://casper-backend-one.vercel.app',
  BASE_PRIVATE_KEY: process.env.BASE_PRIVATE_KEY ?? '',
  BASE_NETWORK: 'eip155:84532',
  BASE_RPC_URL: 'https://sepolia.base.org',
  BASE_USDC_CONTRACT: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  PATH: process.env.PATH ?? '',
};

const txt = (r: any) => (r.content as any)[0].text as string;
const fail = (m: string) => { console.error('❌', m); process.exitCode = 1; };

// Merge with the real environment so the spawned node has OS essentials
// (SystemRoot, TEMP, …); the injected vars simulate what Claude provides.
const fullEnv: Record<string, string> = {};
for (const [k, v] of Object.entries(process.env)) if (v != null) fullEnv[k] = v;
Object.assign(fullEnv, env);
const transport = new StdioClientTransport({ command: 'node', args: [SERVER], env: fullEnv });
const client = new Client({ name: 'wisp-verify', version: '0.0.0' });
await client.connect(transport);

const { tools } = await client.listTools();
console.log(`TOOLS (${tools.length}):`, tools.map((t) => t.name).join(', '));
if (tools.length < 8) fail('expected 8 tools');

const bal = JSON.parse(txt(await client.callTool({ name: 'check_balance', arguments: {} })));
console.log('check_balance: CSPR', bal.casper?.cspr, '| WISP', bal.casper?.token?.balance, '| USDC', bal.base?.usdc);
if (!bal.casper?.token || !bal.base) fail('check_balance missing a chain');

const sb = JSON.parse(txt(await client.callTool({ name: 'search_bazaar', arguments: { query: 'weather' } })));
console.log('search_bazaar:', sb.count, 'services');

for (const [label, url] of [['casper', 'https://casper-api.vercel.app/fx/rates'], ['base', 'https://casper-api.vercel.app/base/dice']] as const) {
  const r = JSON.parse(txt(await client.callTool({ name: 'x402_fetch', arguments: { url } })));
  const okp = r.status === 200 && r.paid;
  console.log(`x402_fetch ${label}:`, r.status, okp ? `paid ${r.payment?.amount} ${r.payment?.asset} (tx ${r.payment?.settlement?.transaction?.slice(0, 12)}…)` : '(unpaid)');
  if (!okp) fail(`x402_fetch ${label} did not settle`);
}

const rep = JSON.parse(txt(await client.callTool({ name: 'spending_report', arguments: {} })));
console.log('spending_report: spent today', rep.spentToday, rep.asset);

await client.close();
console.log(process.exitCode ? '\nVERIFY: FAILED' : '\n✅ VERIFY: all tools work across both chains');
process.exit(process.exitCode ?? 0);
