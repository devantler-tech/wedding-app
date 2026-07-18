import { createServer, request as httpRequest, type Server } from 'node:http';
import { brotliDecompressSync, gunzipSync } from 'node:zlib';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { negotiateEncoding, shouldCompress, startEdgeProxy } from '../../scripts/edge-proxy.mjs';

/** Fetch over raw `node:http` rather than `fetch`, because undici transparently
 *  decodes `Content-Encoding` — which would decompress the very bytes these
 *  tests exist to inspect, and would make a pass-through bug indistinguishable
 *  from a correct re-encode. */
function rawGet(
	path: string,
	headers: Record<string, string>
): Promise<{ status: number; headers: Record<string, string | string[] | undefined>; body: Buffer }> {
	return new Promise((resolve, reject) => {
		const req = httpRequest(
			{ host: '127.0.0.1', port: PROXY_PORT, path, headers },
			(res) => {
				const chunks: Buffer[] = [];
				res.on('data', (c) => chunks.push(c));
				res.on('end', () =>
					resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks) })
				);
			}
		);
		req.on('error', reject);
		req.end();
	});
}

/** A stand-in upstream so the proxy can be tested without building the app.
 *  Each path exercises one branch the Lighthouse lane depends on. */
function startUpstream(port: number): Promise<Server> {
	const server = createServer((req, res) => {
		if (req.url === '/html') {
			const body = 'x'.repeat(50_000); // compresses far below any transport floor
			res.writeHead(200, { 'content-type': 'text/html', 'content-length': String(body.length) });
			res.end(body);
		} else if (req.url === '/precompressed') {
			// Mirrors adapter-node's `precompress: true` static assets.
			res.writeHead(200, { 'content-type': 'text/css', 'content-encoding': 'br' });
			res.end(Buffer.from('already-brotli-bytes'));
		} else if (req.url === '/image') {
			res.writeHead(200, { 'content-type': 'image/avif' });
			res.end(Buffer.alloc(5_000, 1));
		} else if (req.url === '/echo-cookie') {
			res.writeHead(200, { 'content-type': 'text/plain' });
			res.end(String(req.headers.cookie ?? 'none'));
		} else {
			res.writeHead(404, { 'content-type': 'text/plain' });
			res.end('nope');
		}
	});
	return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

const UPSTREAM_PORT = 34_871;
const PROXY_PORT = 34_872;

let upstream: Server;
let proxy: Server;

beforeAll(async () => {
	upstream = await startUpstream(UPSTREAM_PORT);
	proxy = await startEdgeProxy({ targetPort: UPSTREAM_PORT, listenPort: PROXY_PORT });
});

afterAll(async () => {
	await new Promise((r) => proxy.close(r));
	await new Promise((r) => upstream.close(r));
});

describe('negotiateEncoding', () => {
	it('prefers brotli — the encoding production returns', () => {
		expect(negotiateEncoding('gzip, deflate, br')).toBe('br');
	});

	it('falls back to gzip when brotli is not offered', () => {
		expect(negotiateEncoding('gzip, deflate')).toBe('gzip');
	});

	it('passes through when the client accepts no encoding we emit', () => {
		expect(negotiateEncoding(undefined)).toBeNull();
		expect(negotiateEncoding('deflate')).toBeNull();
	});

	// Negative control: a `q=0` offer is an explicit REFUSAL. A substring match
	// (`accept.includes('br')`) would compress a body the client just rejected.
	it('honours q=0 as a refusal rather than an offer', () => {
		expect(negotiateEncoding('br;q=0, gzip')).toBe('gzip');
		expect(negotiateEncoding('br;q=0, gzip;q=0')).toBeNull();
	});
});

describe('shouldCompress', () => {
	it('compresses server-rendered documents', () => {
		expect(shouldCompress({ 'content-type': 'text/html; charset=utf-8' }, 200)).toBe(true);
	});

	// Negative control: without this guard the proxy would double-encode the
	// precompressed static assets adapter-node already serves as brotli.
	it('never re-encodes an already-encoded upstream response', () => {
		expect(shouldCompress({ 'content-type': 'text/css', 'content-encoding': 'br' }, 200)).toBe(
			false
		);
	});

	it('skips already-compressed binary formats', () => {
		expect(shouldCompress({ 'content-type': 'image/avif' }, 200)).toBe(false);
	});

	it('skips bodiless statuses', () => {
		expect(shouldCompress({ 'content-type': 'text/html' }, 304)).toBe(false);
	});
});

describe('edge proxy end to end', () => {
	it('serves the document brotli-compressed and byte-identical once decoded', async () => {
		const res = await rawGet('/html', { 'accept-encoding': 'br' });
		expect(res.headers['content-encoding']).toBe('br');
		expect(String(res.headers.vary)).toContain('Accept-Encoding');
		// Content-Length must be dropped — keeping the uncompressed length here is
		// what truncates a compressed response.
		expect(res.headers['content-length']).toBeUndefined();

		expect(brotliDecompressSync(res.body).toString()).toBe('x'.repeat(50_000));
		// The whole point of the lane fix: the wire form is far smaller than the
		// document adapter-node would have returned on its own.
		expect(res.body.length).toBeLessThan(1_000);
	});

	it('serves gzip when that is all the client accepts', async () => {
		const res = await rawGet('/html', { 'accept-encoding': 'gzip' });
		expect(res.headers['content-encoding']).toBe('gzip');
		expect(gunzipSync(res.body).toString()).toBe('x'.repeat(50_000));
	});

	it('passes a precompressed asset through untouched', async () => {
		const res = await rawGet('/precompressed', { 'accept-encoding': 'br' });
		expect(res.headers['content-encoding']).toBe('br');
		// Untouched means the upstream's own bytes, not a re-compression of them.
		expect(res.body.toString()).toBe('already-brotli-bytes');
	});

	it('leaves the body alone when the client accepts no encoding', async () => {
		const res = await rawGet('/html', { 'accept-encoding': 'identity' });
		expect(res.headers['content-encoding']).toBeUndefined();
		expect(res.body.toString()).toBe('x'.repeat(50_000));
	});

	// The program page is only reachable with a session cookie, so a proxy that
	// dropped request headers would silently scan a redirect instead of the page.
	it('forwards request headers upstream', async () => {
		const res = await rawGet('/echo-cookie', {
			cookie: 'session=dev-session',
			'accept-encoding': 'identity'
		});
		expect(res.body.toString()).toBe('session=dev-session');
	});

	it('preserves upstream status codes', async () => {
		const res = await rawGet('/missing', { 'accept-encoding': 'identity' });
		expect(res.status).toBe(404);
	});

	// Regression guard: binding the proxy to 127.0.0.1 makes headless Chrome hang
	// on `http://localhost:<port>`, because it resolves `localhost` to ::1 first
	// and does not fall back to IPv4 the way curl does. The failure is unusually
	// nasty — every curl probe succeeds while Lighthouse waits forever — so the
	// bind must stay dual-stack.
	it('accepts connections over the IPv6 loopback', async () => {
		const body = await new Promise<string>((resolve, reject) => {
			const req = httpRequest(
				{ host: '::1', port: PROXY_PORT, path: '/echo-cookie', headers: { cookie: 'v6=yes' } },
				(res) => {
					const chunks: Buffer[] = [];
					res.on('data', (c) => chunks.push(c));
					res.on('end', () => resolve(Buffer.concat(chunks).toString()));
				}
			);
			req.on('error', reject);
			req.end();
		});
		expect(body).toBe('v6=yes');
	});
});
