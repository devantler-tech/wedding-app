import { redirect } from '@sveltejs/kit';
import { getSession } from '$lib/server/auth.js';
import { db } from '$lib/server/db.js';
import { guests, roomBookings } from '$lib/server/schema.js';
import { eq } from 'drizzle-orm';
import type { LayoutServerLoad } from './$types.js';

function getMockData() {
	return {
		guestPair: { id: 1, name: 'Test1 og Test2', code: 'TEST01' },
		guests: [
			{ id: 1, name: 'Test1', attending: null, dietaryNotes: null },
			{ id: 2, name: 'Test2', attending: null, dietaryNotes: null }
		],
		booking: null
	};
}

export const load: LayoutServerLoad = async ({ cookies }) => {
	// Dev mode: skip auth when no database is available
	if (process.env.DEV_SKIP_AUTH === 'true') {
		return getMockData();
	}

	const sessionId = cookies.get('session');
	if (!sessionId) {
		redirect(302, '/login');
	}

	const session = await getSession(sessionId);
	if (!session) {
		cookies.delete('session', { path: '/' });
		redirect(302, '/login');
	}

	const guestList = await db
		.select()
		.from(guests)
		.where(eq(guests.guestPairId, session.guestPairId));

	const [booking] = await db
		.select()
		.from(roomBookings)
		.where(eq(roomBookings.guestPairId, session.guestPairId))
		.limit(1);

	return {
		guestPair: {
			id: session.guestPairId,
			name: session.pairName,
			code: session.pairCode
		},
		guests: guestList.map((g) => ({
			id: g.id,
			name: g.name,
			attending: g.attending,
			dietaryNotes: g.dietaryNotes
		})),
		booking: booking
			? {
					requested: booking.requested,
					nights: booking.nights,
					notes: booking.notes
				}
			: null
	};
};
