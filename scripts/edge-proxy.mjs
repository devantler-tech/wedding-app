// A minimal compressing reverse proxy that makes CI lanes measure the app the
// way guests actually receive it (issue #176).
//
// Why this exists: `adapter-node`'s `precompress: true` compresses build-time
// STATIC assets only — it serves `_app/immutable/**` with `Content-Encoding: br`
// — but a server-rendered document is produced per request and adapter-node
// ships no runtime compression, so `node build/index.js` returns the HTML
// uncompressed. Production does not: the site is fronted by Cloudflare, which
// returns `content-encoding: br` for the document.
//
// The gap is not academic. The program page ("/") server-renders every gallery
// slide with its full AVIF/WebP/JPEG srcset, so its document is ~105 kB raw but
// ~12 kB brotli — an ~8.7x transfer difference on exactly the resource that
// gates first paint. The login page is ~7 kB raw, small enough that the
// difference is immaterial, which is precisely why it met its budgets while "/"
// did not. Pointing Lighthouse at the bare adapter-node server therefore
// measured a transport no guest ever gets and charged the difference to the app.
//
// This proxy restores that one production property — and nothing else. It does
// not touch the application or its production entrypoint: `node build/index.js`
// still runs unchanged behind it, so the boot-smoke guarantee is unaffected.
import { createServer, request as httpRequest } from 'node:http';
import { createBrotliCompress, createGzip } from 'node:zlib';

/** Response content types worth compressing — text-shaped payloads only.
 *  Images and fonts are already compressed formats; re-compressing them costs
 *  CPU and gains nothing (Cloudflare makes the same distinction). */
const COMPRESSIBLE = /^(?:text\/|application\/(?:json|javascript|xml)|image\/svg\+xml)/i;

/** Hop-by-hop headers that must not be forwarded between connections
 *  (RFC 9110 §7.6.1). `connection` is dropped so keep-alive state stays local
 *  to each hop rather than leaking upstream. */
const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade'
]);

/**
 * Copy headers, dropping the hop-by-hop ones that must not cross a connection
 * boundary.
 * @param {import('node:http').IncomingHttpHeaders} headers the source headers
 * @returns {import('node:http').IncomingHttpHeaders} a forwardable copy
 */
function forwardableHeaders(headers) {
  return Object.fromEntries(
    Object.entries(headers).filter(([name]) => !HOP_BY_HOP.has(name.toLowerCase()))
  );
}

/**
 * Pick the best encoding the client accepts, preferring brotli — the encoding
 * production actually returns.
 * @param {string | undefined} acceptEncoding the client's Accept-Encoding header
 * @returns {'br' | 'gzip' | null} the chosen encoding, or null to pass through
 */
export function negotiateEncoding(acceptEncoding) {
  if (!acceptEncoding) return null;
  // `br;q=0` (and `gzip;q=0`) explicitly REFUSE an encoding, so a substring
  // test would compress a response the client just rejected.
  const offers = new Map(
    acceptEncoding.split(',').map((part) => {
      const [name, ...params] = part.trim().split(';');
      const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
      return [name.toLowerCase(), q ? Number.parseFloat(q.slice(2)) : 1];
    })
  );
  for (const encoding of /** @type {const} */ (['br', 'gzip'])) {
    const q = offers.get(encoding);
    if (q !== undefined && q > 0) return encoding;
  }
  return null;
}

/**
 * Decide whether a proxied response should be compressed on the way out.
 * An upstream response that already carries `Content-Encoding` is passed
 * through untouched — that is how adapter-node's precompressed static assets
 * keep their own brotli bytes instead of being double-encoded.
 * @param {import('node:http').IncomingHttpHeaders} headers upstream response headers
 * @param {number} statusCode upstream response status
 * @returns {boolean} true when the body should be compressed
 */
export function shouldCompress(headers, statusCode) {
  if (headers['content-encoding']) return false;
  // 204/304 carry no body; compressing them would emit a body where the status
  // forbids one.
  if (statusCode === 204 || statusCode === 304) return false;
  return COMPRESSIBLE.test(String(headers['content-type'] ?? ''));
}

/**
 * Start the compressing proxy in front of an already-running app server.
 *
 * `host` is the address of the UPSTREAM app, not the proxy's own bind address:
 * the proxy deliberately listens on every interface, mirroring the app's own
 * `0.0.0.0` bind. Binding it to `127.0.0.1` instead makes headless Chrome hang
 * on `http://localhost:<port>` — Chrome resolves `localhost` to `::1` first and
 * does not fall back to IPv4 the way curl does, so the page never loads and
 * Lighthouse waits forever on a proxy that answers every curl you throw at it.
 * @param {{targetPort: number, listenPort: number, host?: string}} opts
 * @returns {Promise<import('node:http').Server>} the listening proxy
 */
export function startEdgeProxy({ targetPort, listenPort, host = '127.0.0.1' }) {
  const proxy = createServer((clientReq, clientRes) => {
    const headers = { ...forwardableHeaders(clientReq.headers), host: `${host}:${targetPort}` };

    const upstream = httpRequest(
      { host, port: targetPort, method: clientReq.method, path: clientReq.url, headers },
      (upstreamRes) => {
        const outHeaders = forwardableHeaders(upstreamRes.headers);

        const encoding = shouldCompress(upstreamRes.headers, upstreamRes.statusCode ?? 200)
          ? negotiateEncoding(clientReq.headers['accept-encoding'])
          : null;

        if (!encoding) {
          clientRes.writeHead(upstreamRes.statusCode ?? 502, outHeaders);
          upstreamRes.pipe(clientRes);
          return;
        }

        // The compressed length is not known until the stream ends, so the
        // upstream Content-Length must go — leaving it would describe the
        // uncompressed body and truncate the response.
        delete outHeaders['content-length'];
        outHeaders['content-encoding'] = encoding;
        // Caches must key on the request encoding once the body varies by it.
        outHeaders.vary = outHeaders.vary ? `${outHeaders.vary}, Accept-Encoding` : 'Accept-Encoding';

        clientRes.writeHead(upstreamRes.statusCode ?? 502, outHeaders);
        const compressor = encoding === 'br' ? createBrotliCompress() : createGzip();
        upstreamRes.pipe(compressor).pipe(clientRes);
      }
    );

    upstream.on('error', () => {
      if (!clientRes.headersSent) clientRes.writeHead(502);
      clientRes.end('edge-proxy: upstream request failed');
    });
    clientReq.pipe(upstream);
  });

  return new Promise((resolve, reject) => {
    proxy.once('error', reject);
    proxy.listen(listenPort, () => resolve(proxy));
  });
}
