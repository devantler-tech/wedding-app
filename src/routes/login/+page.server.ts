import { fail, redirect } from '@sveltejs/kit';
import { validateCode, createSession } from '$lib/server/auth.js';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ cookies }) => {
	const sessionId = cookies.get('session');
	if (sessionId) {
		// Dev mode: skip DB lookup, just redirect if cookie exists
		if (process.env.DEV_SKIP_AUTH === 'true') {
			throw redirect(302, '/');
		}
		const { getSession } = await import('$lib/server/auth.js');
		const session = await getSession(sessionId);
		if (session) {
			throw redirect(302, '/');
		}
	}
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const code = data.get('code')?.toString() ?? '';

		if (!code) {
			return fail(400, { error: 'Indtast venligst en kode', code });
		}

		// Dev mode: accept TEST01 without hitting the database
		if (process.env.DEV_SKIP_AUTH === 'true') {
			if (code.toUpperCase() !== 'TEST01') {
				return fail(400, { error: 'Dev mode: brug koden TEST01', code });
			}
			cookies.set('session', 'dev-session', {
				path: '/',
				httpOnly: true,
				secure: false,
				sameSite: 'lax',
				maxAge: 60 * 60 * 24 * 30
			});
			throw redirect(303, '/');
		}

		const pair = await validateCode(code);
		if (!pair) {
			return fail(400, { error: 'Ugyldig kode. Prøv igen.', code });
		}

		const sessionId = await createSession(pair.id);

		cookies.set('session', sessionId, {
			path: '/',
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 30
		});

		throw redirect(303, '/');
	}
};
