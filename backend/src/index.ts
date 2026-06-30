import { serve } from '@hono/node-server';
import app from './app.js';
import { loadHubConfig } from './config.js';

const cfg = loadHubConfig();
serve({ fetch: app.fetch, port: cfg.port }, () => {
  console.log(`\n[wisp-hub] 🟣 Wisp Hub ready`);
  console.log(`[wisp-hub]   URL:     http://localhost:${cfg.port}`);
  console.log(`[wisp-hub]   Network: ${cfg.network}`);
  console.log(`[wisp-hub]   Asset:   ${cfg.asset.symbol} (${cfg.asset.package})`);
  console.log(`[wisp-hub]   API:     ${cfg.apiUrl}\n`);
});

export default app;
