import { defineConfig } from 'tsup';

// Deps listed in package.json "dependencies" are externalized by tsup and shipped
// in the .mcpb's server/node_modules; only our own src is bundled into dist/index.js.
export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm'],
  target: 'node20',
  dts: false,
  clean: true,
  splitting: false,
  sourcemap: false,
});
