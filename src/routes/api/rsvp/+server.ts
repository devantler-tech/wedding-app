import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db.js';
import { guests } from '$lib/server/schema.js';
import { eq } from 'drizzle-orm';
import { getSession } from '$lib/server/auth.js';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ request, cookies }) => {
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

	for (let i = 0; i < guestCount; i++) {
		const guestId = parseInt(formData.get(`guestId_${i}`)?.toString() ?? '0');
		const attendingStr = formData.get(`attending_${i}`)?.toString();
		const dietary = formData.get(`dietary_${i}`)?.toString() ?? null;

		if (!guestId) continue;

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
