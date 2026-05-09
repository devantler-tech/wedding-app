import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { env } from '$env/dynamic/private';
import { runMigrations } from '$lib/server/migrate.js';
import { runSeed } from '$lib/server/seed.js';

if (env.NODE_ENV === 'production' && !env.ADMIN_CODE) {
	throw new Error('ADMIN_CODE environment variable is required in production');
}

if (env.DATABASE_URL) {
	await runMigrations();
	try {
		await runSeed();
	} catch (err) {
		console.warn('⚠️ Seed skipped (likely already seeded by another replica):', (err as Error).message);
	}
}

const securityHeaders: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
	return response;
};

export const handle = sequence(securityHeaders);
