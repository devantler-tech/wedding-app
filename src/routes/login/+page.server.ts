import { fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import {
	validateCode,
	createSession,
	validateAdminCode,
	createAdminSession,
	getAdminSession,
	getSession
} from '$lib/server/auth.js';
import {
	setSessionCookie,
	setAdminSessionCookie,
	setDevSessionCookie,
	setDevAdminSessionCookie
} from '$lib/server/cookies.js';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ cookies }) => {
	const adminSessionId = cookies.get('admin_session');
	if (adminSessionId) {
		if (env.DEV_SKIP_AUTH === 'true' || (await getAdminSession(adminSessionId))) {
			throw redirect(302, '/admin');
		}
	}

	const sessionId = cookies.get('session');
	if (sessionId) {
		if (env.DEV_SKIP_AUTH === 'true') {
			throw redirect(302, '/');
		}
		const session = await getSession(sessionId);
		if (session) {
			throw redirect(302, '/');
		}
	}
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const code = data.get('code')?.toString().trim().toUpperCase() ?? '';

		if (!code) {
			return fail(400, { error: 'Indtast venligst en kode', code });
		}

		if (env.DEV_SKIP_AUTH === 'true') {
			const upper = code.toUpperCase().trim();
			if (upper === 'ADMIN' || validateAdminCode(code)) {
				setDevAdminSessionCookie(cookies);
				throw redirect(303, '/admin');
			}
			if (upper === 'MOCK1') {
				setDevSessionCookie(cookies);
				throw redirect(303, '/');
			}
			return fail(400, { error: 'Dev mode: brug koden MOCK1 eller ADMIN', code });
		}

		if (validateAdminCode(code)) {
			const adminSessionId = await createAdminSession();
			setAdminSessionCookie(cookies, adminSessionId);
			throw redirect(303, '/admin');
		}

		let pair;
		try {
			pair = await validateCode(code);
		} catch (err) {
			console.error('Failed to validate guest code:', err);
			return fail(500, {
				error: 'Der opstod en serverfejl. Prøv igen senere.',
				code
			});
		}
		if (!pair) {
			return fail(400, { error: 'Ugyldig kode. Prøv igen.', code });
		}

		let sessionId;
		try {
			sessionId = await createSession(pair.id);
		} catch (err) {
			console.error('Failed to create session:', err);
			return fail(500, {
				error: 'Der opstod en serverfejl. Prøv igen senere.',
				code
			});
		}

		setSessionCookie(cookies, sessionId);
		throw redirect(303, '/');
	}
};
