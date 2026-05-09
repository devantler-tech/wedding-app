import { randomBytes } from 'node:crypto';
import { db } from './db.js';
import { guestPairs, guests } from './schema.js';

export const GUEST_PAIRS = [
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

function generateCode(): string {
	const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
	const bytes = randomBytes(6);
	let code = '';
	for (let i = 0; i < 6; i++) {
		code += chars[bytes[i] % chars.length];
	}
	return code;
}

export function parseGuestNames(pairName: string): string[] {
	if (pairName.includes(' og ')) {
		return pairName.split(' og ').map((n) => n.trim());
	}
	return [pairName.trim()];
}

export async function runSeed(): Promise<void> {
	const existing = await db.select().from(guestPairs).limit(1);
	if (existing.length > 0) {
		console.log('🌱 Seed data already exists, skipping.');
		return;
	}

	console.log('🌱 Seeding database...');

	for (const pairName of GUEST_PAIRS) {
		const code = generateCode();
		const [pair] = await db
			.insert(guestPairs)
			.values({ code, name: pairName })
			.onConflictDoNothing()
			.returning();

		if (!pair) continue;

		const names = parseGuestNames(pairName);
		for (const name of names) {
			await db.insert(guests).values({ guestPairId: pair.id, name });
		}

		console.log(`  ✅ ${pairName} → [code hidden]`);
	}

	console.log('✨ Seeding complete!');
}

// CLI entrypoint
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
	runSeed()
		.then(() => process.exit(0))
		.catch((err) => {
			console.error('❌ Seed failed:', err);
			process.exit(1);
		});
}
