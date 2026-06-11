/**
 * RSVP export — flattens the guest / booking data model into the CSV the couple
 * shares with the caterer and venue. Mirrors the admin page's DEV_SKIP_AUTH mock
 * fallback so a local/dev run produces a valid file without a database.
 */
import { env } from '$env/dynamic/private';
import { asc, eq } from 'drizzle-orm';
import { db } from './db.js';
import { guestPairs, guests, roomBookings } from './schema.js';
import { GUEST_PAIRS, parseGuestNames } from './seed.js';
import { toCsv } from './csv.js';

/** CSV column headers, in export order (matches the documented contract). */
export const RSVP_EXPORT_HEADERS = [
	'name',
	'attendance',
	'dietary_notes',
	'booking_requested',
	'submitted_at'
] as const;

type RsvpRow = {
	name: string;
	attending: boolean | null;
	dietaryNotes: string | null;
	bookingRequested: boolean;
	submittedAt: Date | null;
};

/** Human-readable attendance value for a nullable boolean (null = not yet answered). */
export function formatAttendance(attending: boolean | null): string {
	if (attending === true) return 'yes';
	if (attending === false) return 'no';
	return 'no_response';
}

function rowToFields(row: RsvpRow): string[] {
	return [
		row.name,
		formatAttendance(row.attending),
		row.dietaryNotes ?? '',
		row.bookingRequested ? 'yes' : 'no',
		row.submittedAt ? row.submittedAt.toISOString() : ''
	];
}

/** Mock rows for DEV_SKIP_AUTH (no DB) — one per seeded guest, all unanswered. */
function getMockRows(): RsvpRow[] {
	return GUEST_PAIRS.flatMap((pairName) =>
		parseGuestNames(pairName).map((name) => ({
			name,
			attending: null,
			dietaryNotes: null,
			bookingRequested: false,
			submittedAt: null
		}))
	);
}

async function getDbRows(): Promise<RsvpRow[]> {
	const rows = await db
		.select({
			name: guests.name,
			attending: guests.attending,
			dietaryNotes: guests.dietaryNotes,
			submittedAt: guests.updatedAt,
			bookingRequested: roomBookings.requested
		})
		.from(guests)
		.innerJoin(guestPairs, eq(guests.guestPairId, guestPairs.id))
		.leftJoin(roomBookings, eq(roomBookings.guestPairId, guestPairs.id))
		.orderBy(asc(guestPairs.name), asc(guests.id));

	return rows.map((r) => ({
		name: r.name,
		attending: r.attending,
		dietaryNotes: r.dietaryNotes,
		bookingRequested: r.bookingRequested ?? false,
		submittedAt: r.submittedAt ?? null
	}));
}

/** Build the full RSVP export as a CSV string. Uses mock data when DEV_SKIP_AUTH is on. */
export async function buildRsvpCsv(): Promise<string> {
	const rows = env.DEV_SKIP_AUTH === 'true' ? getMockRows() : await getDbRows();
	return toCsv(RSVP_EXPORT_HEADERS, rows.map(rowToFields));
}
