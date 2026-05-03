import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db.js';
import { roomBookings } from '$lib/server/schema.js';
import { eq } from 'drizzle-orm';
import { getSession } from '$lib/server/auth.js';
import type { RequestHandler } from './$types.js';

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
	const requested = formData.get('requested') === 'on';
	const nights = parseInt(formData.get('nights')?.toString() ?? '1');
	const notes = formData.get('notes')?.toString() ?? null;

	if (isNaN(nights) || nights < 1 || nights > 2) {
		return json({ error: 'Invalid nights value' }, { status: 400 });
	}

	const existing = await db
		.select()
		.from(roomBookings)
		.where(eq(roomBookings.guestPairId, session.guestPairId))
		.limit(1);

	if (existing.length > 0) {
		await db
			.update(roomBookings)
			.set({
				requested,
				nights: requested ? nights : null,
				notes: requested ? notes : null,
				updatedAt: new Date()
			})
			.where(eq(roomBookings.guestPairId, session.guestPairId));
	} else {
		await db.insert(roomBookings).values({
			guestPairId: session.guestPairId,
			requested,
			nights: requested ? nights : null,
			notes: requested ? notes : null
		});
	}

	return json({ success: true });
};
