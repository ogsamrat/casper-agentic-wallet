#!/usr/bin/env node
import './silence.js'; // must be first — redirects console.* off stdout
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';

const server = createServer();
await server.connect(new StdioServerTransport());
console.error('[wisp-wallet] ready (MCP over stdio)');
