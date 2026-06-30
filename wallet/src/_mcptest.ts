// In-process MCP smoke test: spawn the built server, list tools, call a few.
// Run after build: node dist/index.js exists. Usage: npx tsx src/_mcptest.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({ command: 'node', args: ['dist/index.js'] });
const client = new Client({ name: 'wisp-mcptest', version: '0.0.0' });
await client.connect(transport);

const { tools } = await client.listTools();
console.log('tools:', tools.map((t) => t.name).join(', '));

const bal = await client.callTool({ name: 'check_balance', arguments: {} });
console.log('\ncheck_balance →\n', (bal.content as any)[0].text);

const rep = await client.callTool({ name: 'spending_report', arguments: {} });
console.log('\nspending_report →\n', (rep.content as any)[0].text);

const fetched = await client.callTool({
  name: 'x402_fetch',
  arguments: { url: process.env.SELLER_URL ?? 'http://localhost:4021/fx/rates' },
});
console.log('\nx402_fetch →\n', (fetched.content as any)[0].text.slice(0, 700));

await client.close();
process.exit(0);
