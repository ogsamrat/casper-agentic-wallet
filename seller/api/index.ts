// Vercel serverless entry. The Express app from ../src/index.ts does not call
// listen() when process.env.VERCEL is set; Vercel invokes this default export
// with (req, res), which an Express app handles directly.
import app from '../src/index.js';

export const config = { runtime: 'nodejs' };

export default app;
