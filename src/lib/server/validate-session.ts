import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getSession } from '$lib/server/auth.js';
import type { Cookies } from '@sveltejs/kit';

type SessionResult =
	| { session: { guestPairId: number }; earlyResponse: null }
	| { session: null; earlyResponse: Response };

export async function validateApiSession(cookies: Cookies): Promise<SessionResult> {
	if (env.DEV_SKIP_AUTH === 'true') {
		return { session: null, earlyResponse: json({ success: true }) };
	}

	const sessionId = cookies.get('session');
	if (!sessionId) {
		return { session: null, earlyResponse: json({ error: 'Unauthorized' }, { status: 401 }) };
	}

	const session = await getSession(sessionId);
	if (!session) {
		return { session: null, earlyResponse: json({ error: 'Unauthorized' }, { status: 401 }) };
	}

	return { session: { guestPairId: session.guestPairId }, earlyResponse: null };
}
