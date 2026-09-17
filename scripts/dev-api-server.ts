import { createServer } from 'node:http';
import handler from '../api/indicators.ts';

/**
 * Minimal local stand-in for `vercel dev` — mirrors DealGap's
 * scripts/dev-api-server.ts exactly. Vite's dev server proxies /api/* here.
 */
const PORT = 3101;

createServer((req, res) => {
  if (req.url?.startsWith('/api/indicators')) {
    void handler(req, res);
    return;
  }
  res.statusCode = 404;
  res.end('Not found');
}).listen(PORT, () => {
  console.log(`[dev-api-server] listening on http://localhost:${PORT}`);
});
