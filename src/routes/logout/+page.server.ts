import { redirect } from '@sveltejs/kit';
import { deleteSession } from '$lib/server/auth.js';
import type { Actions } from './$types.js';

export const actions: Actions = {
	default: async ({ cookies }) => {
		const sessionId = cookies.get('session');
		if (sessionId && process.env.DEV_SKIP_AUTH !== 'true') {
			await deleteSession(sessionId);
		}
		cookies.delete('session', { path: '/' });
		cookies.delete('admin_session', { path: '/' });
		throw redirect(303, '/login');
	}
};
