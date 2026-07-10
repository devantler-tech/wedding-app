import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { env } from '$env/dynamic/private';
import { bootstrapDatabase } from '$lib/server/db-bootstrap.js';

if (env.NODE_ENV === 'production' && !env.ADMIN_CODE?.trim() && env.DEV_SKIP_AUTH !== 'true') {
	throw new Error('ADMIN_CODE environment variable is required in production');
}

if (env.DATABASE_URL) {
	// Start migrations + seed in the BACKGROUND (intentionally not awaited). A
	// database that is unreachable at boot must not crash the server or fail the
	// `/login` startup probe — otherwise a transient DB outage becomes a
	// CrashLoopBackOff that also wedges the rollout (the new ReplicaSet can never
	// pass its probe), leaving the app unable to recover even after the DB
	// returns. The schema self-applies once the DB is reachable; the DB-free
	// login page stays available meanwhile.
	void bootstrapDatabase();
}

const securityHeaders: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	// Kept for old browsers; superseded by the CSP frame-ancestors directive
	// (svelte.config.js kit.csp).
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
	// TLS terminates at the platform gateway (which does not set HSTS — dedupe
	// decided in issue #172); the browser associates the header with the https
	// origin it fetched from, so setting it at the app layer is correct.
	response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	return response;
};

export const handle = sequence(securityHeaders);
