import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { deleteAdminSession, deleteSession } from '$lib/server/auth.js';
import { clearSessionCookies } from '$lib/server/cookies.js';
import type { Actions } from './$types.js';

export const actions: Actions = {
	default: async ({ cookies }) => {
		const sessionId = cookies.get('session');
		if (sessionId && env.DEV_SKIP_AUTH !== 'true') {
			await deleteSession(sessionId);
		}
		const adminSessionId = cookies.get('admin_session');
		if (adminSessionId && env.DEV_SKIP_AUTH !== 'true') {
			await deleteAdminSession(adminSessionId);
		}
		clearSessionCookies(cookies);
		throw redirect(303, '/login');
	}
};
