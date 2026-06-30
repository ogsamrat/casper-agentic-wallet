// MCP speaks JSON-RPC over stdout; any stray stdout write corrupts the protocol.
// Redirect console.* to stderr. Imported first in index.ts, before anything logs.
const toErr = (...args: unknown[]) => process.stderr.write(args.map(String).join(' ') + '\n');
console.log = toErr as typeof console.log;
console.info = toErr as typeof console.info;
console.debug = toErr as typeof console.debug;
console.warn = toErr as typeof console.warn;
export {};
