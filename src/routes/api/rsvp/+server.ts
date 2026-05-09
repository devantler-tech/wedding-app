import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db.js';
import { guests } from '$lib/server/schema.js';
import { eq, and } from 'drizzle-orm';
import { validateApiSession } from '$lib/server/validate-session.js';
import type { RequestHandler } from './$types.js';

const MAX_GUEST_COUNT = 10;
const MAX_DIETARY_LENGTH = 500;

export const POST: RequestHandler = async ({ request, cookies }) => {
	const { session, error } = await validateApiSession(cookies);
	if (error) return error;

	const formData = await request.formData();
	const guestCount = parseInt(formData.get('guestCount')?.toString() ?? '0');

	if (isNaN(guestCount) || guestCount < 0 || guestCount > MAX_GUEST_COUNT) {
		return json({ error: 'Invalid guest count' }, { status: 400 });
	}

	await db.transaction(async (tx) => {
		for (let i = 0; i < guestCount; i++) {
			const guestId = parseInt(formData.get(`guestId_${i}`)?.toString() ?? '0');
			const attendingStr = formData.get(`attending_${i}`)?.toString();
			const dietary = formData.get(`dietary_${i}`)?.toString()?.slice(0, MAX_DIETARY_LENGTH) ?? null;

			if (!guestId) continue;

			const [guest] = await tx
				.select({ id: guests.id })
				.from(guests)
				.where(and(eq(guests.id, guestId), eq(guests.guestPairId, session.guestPairId)))
				.limit(1);

			if (!guest) continue;

			const attending = attendingStr === 'true' ? true : attendingStr === 'false' ? false : null;

			await tx
				.update(guests)
				.set({
					attending,
					dietaryNotes: dietary || null,
					updatedAt: new Date()
				})
				.where(eq(guests.id, guestId));
		}
	});

	return json({ success: true });
};
