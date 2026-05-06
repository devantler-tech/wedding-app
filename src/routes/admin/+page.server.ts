import { db } from '$lib/server/db.js';
import { guestPairs, guests, roomBookings } from '$lib/server/schema.js';
import { asc } from 'drizzle-orm';
import type { PageServerLoad } from './$types.js';

type AdminGuest = {
	id: number;
	name: string;
	attending: boolean | null;
	dietaryNotes: string | null;
};

type AdminBooking = {
	requested: boolean;
	notes: string | null;
};

type AdminPair = {
	id: number;
	name: string;
	code: string;
	guests: AdminGuest[];
	booking: AdminBooking | null;
};

function getMockAdminData(): { pairs: AdminPair[] } {
	const pairNames = [
		'Charlotte og Orla',
		'Alette og Sunny',
		'Mathias og Ane Kirstine',
		'Kurt og Trine',
		'Karen Lise',
		'Birgit og Tage',
		'Gerda',
		'Monica og Lasse',
		'Louise og Matias',
		'Clara og Frederik',
		'Monica og Philip',
		'Linnea og Malthe',
		'Louise og Maja'
	];

	const pairs: AdminPair[] = pairNames.map((name, idx) => {
		const names = name.includes(' og ') ? name.split(' og ').map((n) => n.trim()) : [name.trim()];
		return {
			id: idx + 1,
			name,
			code: `MOCK${String(idx + 1).padStart(2, '0')}`,
			guests: names.map((n, i) => ({
				id: idx * 10 + i + 1,
				name: n,
				attending: null,
				dietaryNotes: null
			})),
			booking: null
		};
	});

	return { pairs };
}

export const load: PageServerLoad = async () => {
	if (process.env.DEV_SKIP_AUTH === 'true') {
		return getMockAdminData();
	}

	const pairs = await db.select().from(guestPairs).orderBy(asc(guestPairs.name));
	const allGuests = await db.select().from(guests);
	const allBookings = await db.select().from(roomBookings);

	const guestsByPair = new Map<number, AdminGuest[]>();
	for (const g of allGuests) {
		const list = guestsByPair.get(g.guestPairId) ?? [];
		list.push({
			id: g.id,
			name: g.name,
			attending: g.attending,
			dietaryNotes: g.dietaryNotes
		});
		guestsByPair.set(g.guestPairId, list);
	}

	const bookingByPair = new Map<number, AdminBooking>();
	for (const b of allBookings) {
		bookingByPair.set(b.guestPairId, {
			requested: b.requested,
			notes: b.notes
		});
	}

	return {
		pairs: pairs.map((p) => ({
			id: p.id,
			name: p.name,
			code: p.code,
			guests: (guestsByPair.get(p.id) ?? []).sort((a, b) => a.id - b.id),
			booking: bookingByPair.get(p.id) ?? null
		})) satisfies AdminPair[]
	};
};
