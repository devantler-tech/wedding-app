import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getAdminSession } from '$lib/server/auth.js';
import { buildRsvpCsv } from '$lib/server/export.js';
import type { RequestHandler } from './$types.js';

/**
 * GET /api/admin/export — download all RSVP rows as CSV.
 * Requires a valid admin session (same gate as the /admin page); the DEV_SKIP_AUTH
 * bypass mirrors the rest of the admin surface for local development.
 */
export const GET: RequestHandler = async ({ cookies }) => {
	if (env.DEV_SKIP_AUTH !== 'true') {
		const adminSessionId = cookies.get('admin_session');
		if (!adminSessionId || !(await getAdminSession(adminSessionId))) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}
	}

	const csv = await buildRsvpCsv();
	return new Response(csv, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': 'attachment; filename="rsvps.csv"'
		}
	});
};
