/**
 * Local CORS proxy for web development.
 * Forwards all requests to the real API and adds CORS headers so the browser
 * running at http://localhost:8081 can reach https://hrisapi.clms.in.
 *
 * Run:  node scripts/dev-proxy.cjs
 * Then: set EXPO_PUBLIC_API_BASE_URL=http://localhost:8010 in .env.local
 */

const http = require('http');
const https = require('https');

const TARGET_HOST = 'hrisapi.clms.in';
const TARGET_PORT = 443;
const PROXY_PORT = 8010;
const ALLOWED_ORIGIN = 'http://localhost:8081';

const server = http.createServer((req, res) => {
  // ── CORS headers ─────────────────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-XSRF-TOKEN, Cookie, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Expose-Headers', 'Set-Cookie');

  // Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  console.log(`[proxy] ${req.method} ${req.url}`);

  // ── Forward to real API ───────────────────────────────────────────────────
  const options = {
    hostname: TARGET_HOST,
    port: TARGET_PORT,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: TARGET_HOST,
    },
  };

  const proxyReq = https.request(options, (proxyRes) => {
    console.log(`[proxy] ← ${proxyRes.statusCode} ${req.url}`);

    // Forward Set-Cookie but strip Secure + fix SameSite so localhost can store it
    const rawCookies = proxyRes.headers['set-cookie'];
    if (rawCookies) {
      const patched = rawCookies.map((c) =>
        c.replace(/;\s*Secure/gi, '').replace(/SameSite=None/gi, 'SameSite=Lax')
      );
      res.setHeader('Set-Cookie', patched);
    }

    // Forward all other headers
    Object.entries(proxyRes.headers).forEach(([key, value]) => {
      if (key.toLowerCase() !== 'set-cookie') res.setHeader(key, value);
    });

    res.writeHead(proxyRes.statusCode);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('[proxy] error:', err.message);
    res.writeHead(502);
    res.end(`Proxy error: ${err.message}`);
  });

  req.pipe(proxyReq);
});

server.listen(PROXY_PORT, '127.0.0.1', () => {
  console.log(`\n✅ Dev proxy running on http://localhost:${PROXY_PORT}`);
  console.log(`   Forwarding → https://${TARGET_HOST}\n`);
  console.log(`   Make sure .env.local has:`);
  console.log(`   EXPO_PUBLIC_API_BASE_URL=http://localhost:${PROXY_PORT}\n`);
});
