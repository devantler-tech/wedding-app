import { redirect } from '@sveltejs/kit';
import { getAdminSession } from '$lib/server/auth.js';
import type { LayoutServerLoad } from './$types.js';

export const load: LayoutServerLoad = async ({ cookies }) => {
	if (process.env.DEV_SKIP_AUTH === 'true') {
		return {};
	}

	const adminSessionId = cookies.get('admin_session');
	if (!adminSessionId || !getAdminSession(adminSessionId)) {
		cookies.delete('admin_session', { path: '/' });
		throw redirect(302, '/login');
	}

	return {};
};
