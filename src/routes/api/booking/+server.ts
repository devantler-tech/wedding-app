import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db.js';
import { roomBookings } from '$lib/server/schema.js';
import { validateApiSession } from '$lib/server/validate-session.js';
import type { RequestHandler } from './$types.js';

const MAX_NOTES_LENGTH = 500;

export const POST: RequestHandler = async ({ request, cookies }) => {
	const { session, error } = await validateApiSession(cookies);
	if (error) return error;

	const formData = await request.formData();
	const requested = formData.get('requested') === 'on';
	const rawNotes = formData.get('notes')?.toString()?.slice(0, MAX_NOTES_LENGTH) ?? null;
	const notes = requested ? rawNotes : null;

	await db
		.insert(roomBookings)
		.values({
			guestPairId: session.guestPairId,
			requested,
			notes
		})
		.onConflictDoUpdate({
			target: roomBookings.guestPairId,
			set: {
				requested,
				notes,
				updatedAt: new Date()
			}
		});

	return json({ success: true });
};
