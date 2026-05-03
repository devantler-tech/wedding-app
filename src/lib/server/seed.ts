import { db } from './db.js';
import { guestPairs, guests } from './schema.js';
import { eq } from 'drizzle-orm';

const GUEST_PAIRS = [
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
	'Monica og Phillip',
	'Linnea og Malthe',
	'Louise og Maja',
	'Test1 og Test2'
];

function generateCode(): string {
	const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
	let code = '';
	for (let i = 0; i < 6; i++) {
		code += chars[Math.floor(Math.random() * chars.length)];
	}
	return code;
}

function parseGuestNames(pairName: string): string[] {
	if (pairName.includes(' og ')) {
		return pairName.split(' og ').map((n) => n.trim());
	}
	return [pairName.trim()];
}

async function seed() {
	console.log('🌱 Seeding database...');

	for (const pairName of GUEST_PAIRS) {
		const existing = await db
			.select()
			.from(guestPairs)
			.where(eq(guestPairs.name, pairName))
			.limit(1);

		if (existing.length > 0) {
			console.log(`  ⏭  ${pairName} (already exists)`);
			continue;
		}

		const code = generateCode();
		const [pair] = await db.insert(guestPairs).values({ code, name: pairName }).returning();

		const names = parseGuestNames(pairName);
		for (const name of names) {
			await db.insert(guests).values({ guestPairId: pair.id, name });
		}

		console.log(`  ✅ ${pairName} → [code hidden]`);
	}

	console.log('✨ Seeding complete!');
	process.exit(0);
}

seed().catch((err) => {
	console.error('❌ Seed failed:', err);
	process.exit(1);
});
