import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db.js';
import { guests } from '$lib/server/schema.js';
import { eq, and } from 'drizzle-orm';
import { getSession } from '$lib/server/auth.js';
import type { RequestHandler } from './$types.js';

const MAX_GUEST_COUNT = 10;

export const POST: RequestHandler = async ({ request, cookies }) => {
	if (process.env.DEV_SKIP_AUTH === 'true') {
		return json({ success: true });
	}

	const sessionId = cookies.get('session');
	if (!sessionId) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const session = await getSession(sessionId);
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const formData = await request.formData();
	const guestCount = parseInt(formData.get('guestCount')?.toString() ?? '0');

	if (isNaN(guestCount) || guestCount < 0 || guestCount > MAX_GUEST_COUNT) {
		return json({ error: 'Invalid guest count' }, { status: 400 });
	}

	for (let i = 0; i < guestCount; i++) {
		const guestId = parseInt(formData.get(`guestId_${i}`)?.toString() ?? '0');
		const attendingStr = formData.get(`attending_${i}`)?.toString();
		const dietary = formData.get(`dietary_${i}`)?.toString() ?? null;

		if (!guestId) continue;

		// Verify guest belongs to the authenticated session's guest pair
		const [guest] = await db
			.select({ id: guests.id })
			.from(guests)
			.where(and(eq(guests.id, guestId), eq(guests.guestPairId, session.guestPairId)))
			.limit(1);

		if (!guest) continue;

		const attending = attendingStr === 'true' ? true : attendingStr === 'false' ? false : null;

		await db
			.update(guests)
			.set({
				attending,
				dietaryNotes: dietary || null,
				updatedAt: new Date()
			})
			.where(eq(guests.id, guestId));
	}

	return json({ success: true });
};
