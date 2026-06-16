import { error, isRedirect, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getSession } from '$lib/server/auth.js';
import { db } from '$lib/server/db.js';
import { guests, roomBookings } from '$lib/server/schema.js';
import { eq } from 'drizzle-orm';
import { GUEST_PAIRS, parseGuestNames } from '$lib/server/seed.js';
import { DEV_SESSION_SINGLE } from '$lib/server/cookies.js';
import { isRsvpClosed } from '$lib/server/rsvp-deadline.js';
import type { LayoutServerLoad } from './$types.js';

function getMockData(single = false) {
	const pairName = single
		? (GUEST_PAIRS.find((p) => parseGuestNames(p).length === 1) ?? GUEST_PAIRS[0])
		: GUEST_PAIRS[0];
	const names = parseGuestNames(pairName);
	return {
		guestPair: { id: 1, name: pairName, code: 'MOCK01' },
		guests: names.map((name, i) => ({
			id: i + 1,
			name,
			attending: null,
			dietaryNotes: null
		})),
		booking: null
	};
}

export const load: LayoutServerLoad = async ({ cookies }) => {
	const sessionId = cookies.get('session');
	if (!sessionId) {
		throw redirect(302, '/login');
	}

	const rsvpClosed = isRsvpClosed(env.RSVP_DEADLINE);

	// Dev mode: require session cookie but skip DB lookup
	if (env.DEV_SKIP_AUTH === 'true') {
		return { ...getMockData(sessionId === DEV_SESSION_SINGLE), rsvpClosed };
	}

	try {
		const session = await getSession(sessionId);
		if (!session) {
			cookies.delete('session', { path: '/' });
			throw redirect(302, '/login');
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
						notes: booking.notes
					}
				: null,
			rsvpClosed
		};
	} catch (err) {
		// Preserve the redirect thrown above when there is no valid session.
		if (isRedirect(err)) throw err;
		// The database is unreachable (or a query failed): surface a controlled
		// 503 "try again later" rather than a raw, bug-looking 500, and keep the
		// guest's session cookie so they stay logged in once the DB recovers.
		console.error('Failed to load guest data (database unavailable?):', err);
		throw error(503, 'Der opstod en serverfejl. Prøv igen senere.');
	}
};
